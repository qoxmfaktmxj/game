/** Real HTTP/Colyseus clients. Defaults to an isolated local server and private temporary data. */
import { randomInt } from "node:crypto";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { Client, type Room } from "@colyseus/sdk";
import { Peer, launch, stop, unusedPort } from "../tests/helpers/network.js";
import { chooseBotCommand } from "../apps/game-server/src/bots/index.js";

const count = Number(process.env.LOAD_CLIENTS ?? 100);
const seconds = Number(process.env.LOAD_SECONDS ?? 60);
const paceMs = Number(process.env.LOAD_PACE_MS ?? 600);
if (
  !Number.isInteger(count) ||
  count < 2 ||
  count > 500 ||
  count % 2 ||
  !Number.isFinite(seconds) ||
  seconds < 1 ||
  !Number.isFinite(paceMs) ||
  paceMs < 0
)
  throw new Error(
    "Use an even LOAD_CLIENTS (2–500), positive LOAD_SECONDS, nonnegative LOAD_PACE_MS.",
  );
const external = process.env.LOAD_URL;
const port = external ? 0 : await unusedPort();
const child = external
  ? null
  : await launch(port, await mkdtemp(join(tmpdir(), "ringuringu-load-")));
const base = external ?? `http://127.0.0.1:${port}`;
const rooms: Room[] = [],
  tables: Peer[][] = [],
  latencies: number[] = [];
let errors = 0,
  finished = 0,
  unexpectedDisconnects = 0,
  actions = 0;
const startedAt = new Date().toISOString();
const api = async (path: string, token?: string, body?: object) => {
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(15000),
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};
try {
  const health = await api("/health");
  if (!["local", "guest"].includes(health.authMode))
    throw new Error("Load harness requires nickname guest authentication.");
  // Ramp in groups so an intentional burst does not simply measure the HTTP rate limiter.
  for (let tableIndex = 0; tableIndex < count / 2; tableIndex++) {
    const users = await Promise.all(
      [0, 1].map((seat) =>
        api("/auth/guest", undefined, {
          nickname: `부하 ${tableIndex}-${seat}`,
        }),
      ),
    );
    const created = await api("/tables", users[0].accessToken, {
      title: `load-${startedAt}-${tableIndex}`,
      gameKey: "star-trails",
    });
    await api(`/tables/${created.table.id}/join`, users[1].accessToken, {
      inviteToken: created.inviteToken,
    });
    const peers: Peer[] = [];
    for (const user of users) {
      const room = await new Client(base).joinOrCreate("table", {
        tableId: created.table.id,
        accessToken: user.accessToken,
      });
      room.onLeave(() => {
        unexpectedDisconnects++;
      });
      rooms.push(room);
      peers.push(new Peer(room));
    }
    await Promise.all(
      peers.map((p) =>
        p.wait((v) => v.table.members.every((m) => m.connected)),
      ),
    );
    tables.push(peers);
    if (tableIndex + 1 < count / 2) {
      // Production guest issuance allows 20 identities/minute from one IP.
      if (health.authMode === "guest" && (tableIndex + 1) % 10 === 0)
        await delay(61000);
      else if (health.authMode === "local" && (tableIndex + 1) % 20 === 0)
        await delay(5500);
    }
  }
  // Keep all sockets connected before starting simultaneous active play.
  await Promise.all(
    tables.map(async (peers) => {
      for (const peer of peers) {
        const ack = await peer.table("READY", true);
        await Promise.all(
          peers.map((p) => p.wait((v) => v.table.revision >= ack.revision!)),
        );
      }
      await peers[0].table("START");
      await Promise.all(
        peers.map((p) => p.wait((v) => v.table.status === "PLAYING")),
      );
    }),
  );
  const begin = performance.now(),
    deadline = begin + seconds * 1000;
  await Promise.all(
    tables.map(async (peers) => {
      try {
        while (
          performance.now() < deadline &&
          peers[0].view!.table.status !== "RESULT"
        ) {
          const version = peers[0].view!.game!.version;
          await Promise.all(
            peers.map((p) => p.wait((v) => v.game?.version === version)),
          );
          const peer = peers.find(
            (p) => p.view!.game!.activePlayerId === p.view!.game!.you,
          )!;
          const view = peer.view!,
            command = chooseBotCommand(view.gameKey, view.game!, randomInt);
          if (!command) throw new Error("No legal projected command");
          const start = performance.now();
          const ack = await peer.game(command);
          await Promise.all(
            peers.map((p) =>
              p.wait((v) => v.game!.version >= ack.acceptedVersion!),
            ),
          );
          latencies.push(performance.now() - start);
          actions++;
          if (paceMs) await delay(paceMs);
        }
        if (peers[0].view!.table.status === "RESULT") finished++;
      } catch (error) {
        errors++;
        console.error(
          error instanceof Error ? error.message : "Load worker failed",
        );
      }
    }),
  );
  const elapsed = (performance.now() - begin) / 1000;
  const sorted = [...latencies].sort((a, b) => a - b);
  const percentile = (p: number) =>
    Number(
      (
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0
      ).toFixed(2),
    );
  const report = {
    startedAt,
    target: external
      ? new URL(base).origin
      : "isolated local process / JSON snapshots",
    backend: external
      ? "verify target deployment separately"
      : "local JSON (not PostgreSQL)",
    clients: count,
    tables: tables.length,
    requestedSeconds: seconds,
    actualSeconds: Number(elapsed.toFixed(2)),
    paceMs,
    actions,
    finishedTables: finished,
    errors,
    unexpectedDisconnects,
    latencyMs: {
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
      max: sorted.at(-1) ?? 0,
    },
    limitation: `50 two-player rooms when LOAD_CLIENTS=100. Measures WebSocket command-to-all-views latency${external ? " including the network path to LOAD_URL" : " on localhost, excluding Internet latency"}; excludes web rendering and complex four-game/bot CPU load. Not a production capacity guarantee.`,
  };
  await mkdir("artifacts/verification", { recursive: true });
  await writeFile(
    "artifacts/verification/load-test.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (errors || unexpectedDisconnects || !actions) process.exitCode = 1;
} finally {
  for (const room of rooms) if (room.connection.isOpen) await room.leave();
  if (child) await stop(child);
}
