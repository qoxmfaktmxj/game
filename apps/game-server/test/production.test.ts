import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Client, type Room } from "@colyseus/sdk";
import type { RoomView } from "@moyeotable/contracts";
import { JsonTableRepository, postgresConnectionOptions } from "@moyeotable/db";
import { supabaseAuthenticator } from "../src/auth.js";
import { startServer } from "../src/server.js";

test("database TLS validates certificates; insecure remote and URL overrides fail closed", () => {
  const url = "postgresql://runtime:example@database.example/postgres";
  const options = postgresConnectionOptions(url, { sslCa: "line1\\nline2" });
  assert.deepEqual(options.ssl, {
    rejectUnauthorized: true,
    ca: "line1\nline2",
  });
  assert.throws(() => postgresConnectionOptions(url, { sslMode: "disable" }));
  assert.throws(() => postgresConnectionOptions(`${url}?sslmode=no-verify`));
  assert.throws(() => postgresConnectionOptions(url, { poolSize: 0 }));
  assert.equal(
    postgresConnectionOptions("postgresql://localhost/test", {
      sslMode: "disable",
    }).ssl,
    false,
  );
});

test("Auth upstream outage is retryable; invalid tokens remain unauthorized; verified expiry is retained", async (t) => {
  let status = 200;
  const userId = randomUUID();
  const upstream = createServer((_request, response) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify(
        status === 200
          ? { id: userId, aud: "authenticated", user_metadata: {} }
          : {
              message:
                status === 401 ? "Invalid token" : "Temporarily unavailable",
            },
      ),
    );
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  t.after(
    () => new Promise<void>((resolve) => upstream.close(() => resolve())),
  );
  const url = `http://127.0.0.1:${(upstream.address() as { port: number }).port}`;
  const auth = supabaseAuthenticator(url, "test-public-key");
  const expiry = Math.floor(Date.now() / 1000) + 60;
  const token = `header.${Buffer.from(JSON.stringify({ iss: `${url}/auth/v1`, sub: userId, aud: "authenticated", exp: expiry })).toString("base64url")}.signature`;
  const identity = await auth.verify(token);
  assert.equal(identity.id, userId);
  assert.equal(identity.nickname, "링구 친구");
  assert.equal(identity.expiresAt, expiry * 1000);
  status = 503;
  await assert.rejects(auth.verify(token), { code: "AUTH_UNAVAILABLE" });
  status = 429;
  await assert.rejects(auth.verify(token), { code: "AUTH_UNAVAILABLE" });
  status = 401;
  await assert.rejects(auth.verify(token), { code: "UNAUTHENTICATED" });
});

test(
  "socket joins retry temporary storage failure and recover the same table member",
  { timeout: 15_000 },
  async (t) => {
    let unavailable = false;
    class TestRepository extends JsonTableRepository {
      override async read(tableId: string) {
        if (unavailable) throw new Error("private database connection detail");
        return super.read(tableId);
      }
    }
    const repository = new TestRepository(
      await mkdtemp(join(tmpdir(), "ringuringu-reconnect-")),
    );
    const user = { id: randomUUID(), nickname: "재접속 검증" };
    const running = await startServer({
      host: "127.0.0.1",
      port: 0,
      webOrigins: [],
      repository,
      auth: {
        mode: "local",
        async verify() {
          return user;
        },
      },
    });
    let room: Room | undefined;
    t.after(async () => {
      if (room?.connection.isOpen) await room.leave();
      await running.close();
    });
    const base = `http://127.0.0.1:${running.port}`;
    const { table } = await running.service.create(user, {
      title: "저장소 복구 검증",
    });
    const options = { tableId: table.id, accessToken: "verified-by-fixture" };

    unavailable = true;
    await assert.rejects(new Client(base).joinOrCreate("table", options), {
      code: 503,
      message: "SAVE_FAILED",
    });
    const failedProbe = await fetch(`${base}/tables`, {
      headers: { Authorization: "Bearer verified-by-fixture" },
    });
    assert.equal(failedProbe.status, 503);
    assert.equal(
      (await failedProbe.text()).includes("private database connection detail"),
      false,
    );

    unavailable = false;
    room = await new Client(base).joinOrCreate("table", options);
    const recoveredView = new Promise<RoomView>((resolve) => {
      room!.onMessage("view", resolve);
    });
    room.send("sync", {});
    const view = await recoveredView;
    assert.equal(view.table.id, table.id);
    assert.equal(view.table.members.length, 1);
    assert.equal(view.table.members[0]!.userId, user.id);
    assert.equal(view.table.members[0]!.connected, true);
    assert.equal(view.table.revision, table.revision);
  },
);

test(
  "readiness reports storage failure without leaking details and live sockets expire",
  { timeout: 15_000 },
  async (t) => {
    let unavailable = false;
    class TestRepository extends JsonTableRepository {
      override async checkHealth() {
        if (unavailable) throw new Error("private database configuration");
        return super.checkHealth();
      }
    }
    const repository = new TestRepository(
      await mkdtemp(join(tmpdir(), "ringuringu-ready-")),
    );
    const user = { id: randomUUID(), nickname: "운영 검증" };
    const running = await startServer({
      host: "127.0.0.1",
      port: 0,
      webOrigins: ["https://ringuringu.example"],
      repository,
      auth: {
        mode: "supabase",
        async verify() {
          return { ...user, expiresAt: Date.now() + 1200 };
        },
      },
    });
    t.after(() => running.close());
    const base = `http://127.0.0.1:${running.port}`;
    assert.equal((await fetch(`${base}/readyz`)).status, 200);
    unavailable = true;
    const failed = await fetch(`${base}/readyz`);
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { ok: false });
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal(
      (
        await fetch(`${base}/health`, {
          headers: { Origin: "https://untrusted.example" },
        })
      ).status,
      403,
    );
    unavailable = false;
    const { table } = await running.service.create(user, {
      title: "세션 만료 검증",
    });
    const room = await new Client(base).joinOrCreate("table", {
      tableId: table.id,
      accessToken: "verified-by-fixture",
    });
    room.onMessage("view", () => {});
    room.onMessage("error", () => {});
    const code = await new Promise<number>((resolve) => room.onLeave(resolve));
    assert.equal(code, 4001);
    assert.equal(
      (await running.service.view(table.id, user.id)).table.members[0]!
        .connected,
      false,
    );
  },
);
