import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { Client, type Room } from "@colyseus/sdk";
import type {
  CommandAck,
  CommandError,
  RoomView as AnyRoomView,
  UserIdentity,
} from "@moyeotable/contracts";
type RoomView = AnyRoomView<"star-trails">;

async function unusedPort() {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = (listener.address() as { port: number }).port;
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  return port;
}
async function launch(port: number, directory: string) {
  let output = "";
  const entry =
    globalThis.process.env.GAME_TEST_BUILT === "true"
      ? [fileURLToPath(new URL("../dist/index.mjs", import.meta.url))]
      : [
          "--import",
          "tsx",
          fileURLToPath(new URL("../src/index.ts", import.meta.url)),
        ];
  const process = spawn(globalThis.process.execPath, entry, {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    windowsHide: true,
    env: {
      ...globalThis.process.env,
      AUTH_MODE: "local",
      ALLOW_LOCAL_GUEST: "true",
      NODE_ENV: "test",
      GAME_HOST: "127.0.0.1",
      GAME_PORT: String(port),
      LOCAL_DATA_DIR: directory,
      WEB_ORIGIN: "http://localhost:3000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout!.on("data", (chunk) => {
    output = `${output}${chunk}`.slice(-8000);
  });
  process.stderr!.on("data", (chunk) => {
    output = `${output}${chunk}`.slice(-8000);
  });
  for (let attempt = 0; attempt < 200; attempt++) {
    if (process.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return process;
    } catch {}
    await delay(50);
  }
  process.kill();
  throw new Error(`Server did not start: ${output}`);
}
async function stop(process: ChildProcess) {
  if (process.exitCode !== null || process.signalCode) return;
  const ended = once(process, "exit");
  process.kill();
  await ended;
}
class Peer {
  view: RoomView | undefined;
  private readonly waiting = new Set<() => void>();
  private readonly pending = new Map<
    string,
    { resolve(value: CommandAck): void; reject(error: Error): void }
  >();
  constructor(readonly room: Room) {
    room.onMessage("view", (view: AnyRoomView) => {
      if (view.gameKey !== "star-trails") throw new Error("Expected Star room view");
      this.view = view;
      this.waiting.forEach((callback) => callback());
    });
    room.onMessage("ack", (ack: CommandAck) => {
      this.pending.get(ack.commandId)?.resolve(ack);
    });
    room.onMessage("error", (error: CommandError) => {
      if (error.commandId)
        this.pending
          .get(error.commandId)
          ?.reject(
            Object.assign(new Error(error.message), { code: error.code }),
          );
    });
    room.send("sync", {});
  }
  async wait(predicate: (view: RoomView) => boolean): Promise<RoomView> {
    if (this.view && predicate(this.view)) return this.view;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.delete(check);
        reject(
          new Error(
            `Timed out waiting for room view: ${JSON.stringify(this.view?.table)}`,
          ),
        );
      }, 10_000);
      const check = () => {
        if (this.view && predicate(this.view)) {
          clearTimeout(timer);
          this.waiting.delete(check);
          resolve(this.view);
        }
      };
      this.waiting.add(check);
    });
  }
  async send(
    type: "table_command" | "game_command",
    command: Record<string, unknown>,
  ): Promise<CommandAck> {
    const commandId = String(command.commandId ?? randomUUID());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(commandId);
        reject(new Error("Command timeout"));
      }, 10_000);
      this.pending.set(commandId, {
        resolve: (value) => {
          clearTimeout(timer);
          this.pending.delete(commandId);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          this.pending.delete(commandId);
          reject(error);
        },
      });
      this.room.send(type, { ...command, commandId });
    });
  }
  async table(type: string, ready?: boolean) {
    const ack = await this.send("table_command", {
      expectedRevision: this.view!.table.revision,
      type,
      ...(ready === undefined ? {} : { ready }),
    });
    await this.wait((view) => view.table.revision >= ack.revision!);
    return ack;
  }
  async game(command: { type: string; payload: object }) {
    const view = this.view!;
    const ack = await this.send("game_command", {
      protocolVersion: 1,
      tableId: view.table.id,
      sessionId: view.table.sessionId,
      expectedVersion: view.game!.version,
      ...command,
    });
    await this.wait((item) => item.game!.version >= ack.acceptedVersion!);
    return ack;
  }
}

test(
  "real two-client Colyseus: invitation, private views, process death in DRAW, durable recovery, natural result and rematch",
  { timeout: 90_000 },
  async (t) => {
    const port = await unusedPort(),
      directory = await mkdtemp(join(tmpdir(), "moyeo-network-"));
    const base = `http://127.0.0.1:${port}`;
    let child = await launch(port, directory);
    const rooms: Room[] = [];
    t.after(async () => {
      for (const room of rooms) {
        if (room.connection.isOpen) {
          try {
            await room.leave();
          } catch {}
        }
      }
      await stop(child);
    });
    const api = async (path: string, token?: string, body?: object) => {
      const response = await fetch(`${base}${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(json));
      return json;
    };
    const one = (await api("/auth/guest", undefined, {
      nickname: "별 하나",
    })) as { accessToken: string; user: UserIdentity };
    const two = (await api("/auth/guest", undefined, {
      nickname: "별 둘",
    })) as typeof one;
    const created = await api("/tables", one.accessToken, {
      title: "진짜 소켓 테스트",
    });
    const tableId = created.table.id as string;
    await api(`/tables/${tableId}/join`, two.accessToken, {
      inviteToken: created.inviteToken,
    });
    const intruder = (await api("/auth/guest", undefined, {
      nickname: "외부 친구",
    })) as typeof one;
    await assert.rejects(
      new Client(base).joinOrCreate("table", {
        tableId,
        accessToken: intruder.accessToken,
      }),
    );
    const connect = async () => {
      const result: Peer[] = [];
      for (const user of [one, two]) {
        const room = await new Client(base).joinOrCreate("table", {
          tableId,
          accessToken: user.accessToken,
        });
        rooms.push(room);
        result.push(new Peer(room));
      }
      await Promise.all(
        result.map((peer) =>
          peer.wait((view) =>
            view.table.members.every((member) => member.connected),
          ),
        ),
      );
      return result as [Peer, Peer];
    };
    let peers = await connect();
    await peers[0].table("READY", true);
    await peers[1].wait((view) => view.table.members[0]!.ready);
    await peers[1].table("READY", true);
    await peers[0].wait((view) =>
      view.table.members.every((member) => member.ready),
    );
    await peers[0].table("START");
    await Promise.all(
      peers.map((peer) => peer.wait((view) => view.table.status === "PLAYING")),
    );
    for (const card of peers[1].view!.game!.yourHand)
      assert.equal(JSON.stringify(peers[0].view).includes(card.id), false);
    const firstSession = peers[0].view!.table.sessionId;
    let actor = peers.find(
      (peer) => peer.view!.game!.you === peer.view!.game!.activePlayerId,
    )!;
    await actor.game({
      type: "STAR_DISCARD",
      payload: { cardId: actor.view!.game!.yourHand[0]!.id },
    });
    await Promise.all(
      peers.map((peer) => peer.wait((view) => view.game!.version === 1)),
    );
    const savedViews = peers.map((peer) => structuredClone(peer.view!.game));
    // Kill the actual server process with the seven-card DRAW state on disk.
    await stop(child);
    child = await launch(port, directory);
    peers = await connect();
    assert.deepEqual(
      peers.map((peer) => peer.view!.game),
      savedViews,
    );
    assert.equal(peers[0].view!.table.sessionId, firstSession);
    let count = 1;
    while (peers[0].view!.table.status !== "RESULT") {
      const currentVersion = peers[0].view!.game!.version;
      await Promise.all(
        peers.map((peer) =>
          peer.wait((view) => view.game!.version === currentVersion),
        ),
      );
      actor = peers.find(
        (peer) => peer.view!.game!.you === peer.view!.game!.activePlayerId,
      )!;
      const game = actor.view!.game!;
      const command =
        game.phase === "PLACE"
          ? (game.legalCommands.find((item) => item.type === "STAR_PLAY") ??
            game.legalCommands.find((item) => item.type === "STAR_DISCARD")!)
          : { type: "STAR_DRAW_DECK", payload: {} };
      const ack = await actor.game(command);
      await Promise.all(
        peers.map((peer) =>
          peer.wait((view) => view.game!.version >= ack.acceptedVersion!),
        ),
      );
      count++;
    }
    assert.equal(count, 88);
    assert.equal(peers[0].view!.result!.reason, "DECK_EXHAUSTED");
    assert.equal(peers[0].view!.game!.deckCount, 0);
    assert.deepEqual(peers[0].view!.result, peers[1].view!.result);
    await peers[0].table("READY", true);
    await peers[1].wait((view) => view.table.members[0]!.ready);
    await peers[1].table("READY", true);
    await peers[0].wait((view) =>
      view.table.members.every((member) => member.ready),
    );
    await peers[0].table("REMATCH");
    await Promise.all(
      peers.map((peer) => peer.wait((view) => view.table.status === "PLAYING")),
    );
    assert.notEqual(peers[0].view!.table.sessionId, firstSession);
    assert.equal(peers[0].view!.table.id, tableId);
    assert.equal(peers[0].view!.game!.deckCount, 44);
  },
);
