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
  RoomView,
  UserIdentity,
} from "@moyeotable/contracts";

export async function unusedPort() {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = (listener.address() as { port: number }).port;
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  return port;
}
export async function launch(port: number, directory: string) {
  let output = "";
  const entry =
    globalThis.process.env.GAME_TEST_BUILT === "true"
      ? [
          fileURLToPath(
            new URL("../../apps/game-server/dist/index.mjs", import.meta.url),
          ),
        ]
      : [
          "--import",
          "tsx",
          fileURLToPath(
            new URL("../../apps/game-server/src/index.ts", import.meta.url),
          ),
        ];
  const process = spawn(globalThis.process.execPath, entry, {
    cwd: fileURLToPath(new URL("../../apps/game-server", import.meta.url)),
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
export async function stop(process: ChildProcess) {
  if (process.exitCode !== null || process.signalCode) return;
  const ended = once(process, "exit");
  process.kill();
  await ended;
}
export class Peer {
  view: RoomView | undefined;
  private readonly waiting = new Set<() => void>();
  private readonly pending = new Map<
    string,
    { resolve(value: CommandAck): void; reject(error: Error): void }
  >();
  constructor(readonly room: Room) {
    room.onMessage("view", (view: RoomView) => {
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
