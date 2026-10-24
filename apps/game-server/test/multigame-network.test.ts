import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { Client, type Room } from "@colyseus/sdk";
import type { UserIdentity } from "@moyeotable/contracts";
import {
  Peer,
  launch,
  stop,
  unusedPort,
} from "../../../tests/helpers/network.js";
import { signalBotCommand } from "../../../tests/helpers/signal-bot.js";
import { councilBotCommand } from "../../../tests/helpers/council-bot.js";
import { workshopBotCommand } from "../../../tests/helpers/workshop-bot.js";

for (const key of ["workshop", "signal", "council"] as const)
  test(
    `real four-client ${key}: private projection, process recovery, natural finish, same-table game change`,
    { timeout: 180_000 },
    async (t) => {
      const port = await unusedPort(),
        directory = await mkdtemp(join(tmpdir(), `ringuringu-${key}-network-`)),
        base = `http://127.0.0.1:${port}`;
      let child = await launch(port, directory);
      const rooms: Room[] = [];
      t.after(async () => {
        for (const room of rooms)
          if (room.connection.isOpen) await room.leave();
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
        assert.equal(response.ok, true, JSON.stringify(json));
        return json;
      };
      const users: { accessToken: string; user: UserIdentity }[] = [];
      for (let i = 0; i < 4; i++)
        users.push(
          await api("/auth/guest", undefined, { nickname: `친구 ${i + 1}` }),
        );
      const created = await api("/tables", users[0].accessToken, {
          title: `실제 ${key}`,
          gameKey: key,
        }),
        tableId = created.table.id as string;
      for (const user of users.slice(1))
        await api(`/tables/${tableId}/join`, user.accessToken, {
          inviteToken: created.inviteToken,
        });
      const connect = async () => {
        const peers: Peer[] = [];
        for (const user of users) {
          const room = await new Client(base).joinOrCreate("table", {
            tableId,
            accessToken: user.accessToken,
          });
          rooms.push(room);
          peers.push(new Peer(room));
        }
        await Promise.all(
          peers.map((p) =>
            p.wait((v) => v.table.members.every((m) => m.connected)),
          ),
        );
        return peers;
      };
      let peers = await connect();
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
      let steps = 0,
        recovered = false;
      while (peers[0].view!.table.status !== "RESULT" && steps < 1800) {
        const reference = peers[0].view!,
          version = reference.game!.version;
        await Promise.all(
          peers.map((p) => p.wait((v) => v.game?.version === version)),
        );
        let actor: Peer | undefined,
          command: { type: string; payload: Record<string, unknown> } | null =
            null;
        for (const peer of peers) {
          const v = peer.view!;
          if (v.gameKey === "signal" && v.game)
            command = signalBotCommand(v.game);
          else if (v.gameKey === "council" && v.game)
            command = councilBotCommand(v.game);
          else if (v.gameKey === "workshop" && v.game)
            command = workshopBotCommand(v.game);
          if (command) {
            actor = peer;
            break;
          }
        }
        assert.ok(
          actor && command,
          `No actor at ${JSON.stringify(reference.game)}`,
        );
        const wire = {
          protocolVersion: 1,
          tableId,
          sessionId: reference.table.sessionId,
          expectedVersion: version,
          commandId: randomUUID(),
          ...command,
        };
        const ack = await actor.send("game_command", wire);
        await Promise.all(
          peers.map((p) =>
            p.wait((v) => v.game!.version >= ack.acceptedVersion!),
          ),
        );
        if (steps === 0) {
          const duplicate = await actor.send("game_command", wire);
          assert.equal(duplicate.status, "duplicate");
          assert.equal(actor.view!.game!.version, ack.acceptedVersion);
        }
        steps++;
        if (steps === 5 && !recovered) {
          const snapshots = peers.map((p) => JSON.stringify(p.view!.game));
          await stop(child);
          child = await launch(port, directory);
          peers = await connect();
          await Promise.all(
            peers.map((p) =>
              p.wait(
                (v) => !v.paused && v.game?.version === ack.acceptedVersion,
              ),
            ),
          );
          assert.deepEqual(
            peers.map((p) => JSON.stringify(p.view!.game)),
            snapshots,
          );
          recovered = true;
        }
      }
      assert.equal(peers[0].view!.table.status, "RESULT", `${steps} commands`);
      assert.ok(recovered);
      assert.ok(peers[0].view!.result!.winners.length);
      const host = peers[0];
      const next = key === "signal" ? "workshop" : "signal";
      const selected = await host.send("table_command", {
        type: "SELECT_GAME",
        gameKey: next,
        expectedRevision: host.view!.table.revision,
      });
      await Promise.all(
        peers.map((p) =>
          p.wait(
            (v) => v.table.revision >= selected.revision! && v.gameKey === next,
          ),
        ),
      );
      assert.equal(host.view!.table.id, tableId);
      assert.equal(host.view!.table.members.length, 4);
      assert.equal(host.view!.game, null);
      assert.equal(host.view!.result, null);
      assert.ok(host.view!.table.members.every((m) => !m.ready));
    },
  );
