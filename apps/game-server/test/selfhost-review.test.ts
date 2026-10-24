import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { Client, type Room } from "@colyseus/sdk";
import type { RoomView } from "@moyeotable/contracts";
import {
  JsonTableRepository,
  PostgresTableRepository,
  PersistenceConflict,
  postgresConnectionOptions,
} from "@moyeotable/db";
import { guestAuthenticator } from "../src/auth.js";
import { startServer } from "../src/server.js";
import { TableService } from "../src/service.js";

test("guest bearer tokens require exactly three nonempty segments", async () => {
  const auth = guestAuthenticator(randomBytes(32).toString("hex"));
  const issued = auth.issueGuest!("토큰 문법");
  for (const suffix of [".", "..ignored", ".extra", "..."])
    await assert.rejects(auth.verify(issued.accessToken + suffix), {
      code: "UNAUTHENTICATED",
    });
  assert.equal((await auth.verify(issued.accessToken)).id, issued.user.id);
});

test("PostgreSQL URL query selectors cannot bypass the private-network TLS boundary", () => {
  for (const host of ["localhost", "postgres", "10.0.0.2"])
    for (const query of [
      "host=public.example",
      "host=127.0.0.1&host=public.example",
      "hostaddr=8.8.8.8",
      "port=6543",
      "HOST=public.example",
      "%68ost=public.example",
    ])
      assert.throws(() =>
        postgresConnectionOptions(
          `postgresql://runtime:secret@${host}/game?${query}`,
          { sslMode: "disable", allowPrivateNetwork: true },
        ),
      );
  assert.equal(
    postgresConnectionOptions(
      "postgresql://runtime:secret@postgres:5432/game",
      { sslMode: "disable", allowPrivateNetwork: true },
    ).ssl,
    false,
  );
  assert.deepEqual(
    postgresConnectionOptions("postgresql://runtime:secret@public.example/game")
      .ssl,
    { rejectUnauthorized: true },
  );
  for (const query of [
    "options=-c%20statement_timeout%3D0",
    "statement_timeout=0",
    "query_timeout=0",
    "connectionTimeoutMillis=0",
    "user=postgres",
    "password=override",
  ])
    assert.throws(() =>
      postgresConnectionOptions(
        `postgresql://runtime:secret@postgres/game?${query}`,
        { sslMode: "disable", allowPrivateNetwork: true },
      ),
    );
});

test(
  "real guest HTTP and sockets enforce human membership even for an otherwise valid signed bot identity",
  { timeout: 15_000 },
  async (t) => {
    const secret = randomBytes(32).toString("hex");
    const auth = guestAuthenticator(secret);
    const repository = new JsonTableRepository(
      await mkdtemp(join(tmpdir(), "ringuringu-review-")),
    );
    const running = await startServer({
      host: "127.0.0.1",
      port: 0,
      webOrigins: ["https://game.example"],
      auth,
      repository,
    });
    let room: Room | undefined;
    t.after(async () => {
      if (room?.connection.isOpen) await room.leave();
      await running.close();
    });
    const base = `http://127.0.0.1:${running.port}`;
    const host = auth.issueGuest!("인증 리뷰"),
      outsider = auth.issueGuest!("외부 친구");
    const created = await running.service.create(host.user, {
      title: "멤버십 경계",
      gameKey: "workshop",
    });
    await running.service.tableCommand(created.table.id, host.user.id, {
      type: "ADD_BOT",
      commandId: randomUUID(),
      expectedRevision: created.table.revision,
    });
    const stored = (await repository.read(created.table.id))!;
    const bot = stored.table.members.find(
      (member) => member.control === "bot",
    )!;
    const claims = {
      v: 1,
      aud: "ringuringu",
      id: bot.userId,
      nickname: bot.nickname,
      iat: Date.now(),
      exp: Date.now() + 60_000,
    };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const signature = createHmac("sha256", Buffer.from(secret, "hex"))
      .update(payload)
      .digest("base64url");
    const signedBot = `guest.${payload}.${signature}`;
    assert.equal(
      (await auth.verify(signedBot)).id,
      bot.userId,
      "membership rejection must be distinct from a bad signature",
    );
    for (const accessToken of [outsider.accessToken, signedBot]) {
      const result = await fetch(`${base}/tables/${created.table.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.equal(result.status, 400);
      assert.equal((await result.json()).error.code, "NOT_MEMBER");
      await assert.rejects(
        new Client(base).joinOrCreate("table", {
          tableId: created.table.id,
          accessToken,
        }),
        { code: 401 },
      );
      const listing = await fetch(`${base}/tables`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.deepEqual(await listing.json(), { tables: [] });
    }
    const spoof = await fetch(`${base}/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "멤버 위조", id: host.user.id }),
    });
    assert.equal(spoof.status, 400);
    assert.equal((await spoof.json()).error.code, "INVALID_INPUT");

    room = await new Client(base).joinOrCreate("table", {
      tableId: created.table.id,
      accessToken: host.accessToken,
    });
    room.onMessage("error", () => {});
    const views: RoomView[] = [];
    room.onMessage<RoomView>("view", (view) => views.push(view));
    const ready = await running.service.tableCommand(
      created.table.id,
      host.user.id,
      {
        type: "READY",
        ready: true,
        commandId: randomUUID(),
        expectedRevision: stored.table.revision,
      },
    );
    await running.service.tableCommand(created.table.id, host.user.id, {
      type: "START",
      commandId: randomUUID(),
      expectedRevision: ready.revision,
    });
    const view = await running.service.view(created.table.id, host.user.id);
    assert.equal(view.gameKey, "workshop");
    if (view.gameKey !== "workshop" || !view.game)
      throw new Error("Expected running workshop");
    const serialized = JSON.stringify(view);
    assert.equal("decks" in view.game, false);
    assert.equal(serialized.includes(stored.invite.tokenHash), false);
    assert.equal(serialized.includes(secret), false);
    assert.equal(
      view.game.players.some((player) => "reserved" in player),
      false,
    );
  },
);

test(
  "readiness, matchmaker and application routes share one IP budget while liveness stays available",
  { timeout: 15_000 },
  async (t) => {
    let checks = 0;
    class CountingRepository extends JsonTableRepository {
      override async checkHealth() {
        checks++;
        await super.checkHealth();
      }
    }
    const repository = new CountingRepository(
      await mkdtemp(join(tmpdir(), "ringuringu-http-rate-review-")),
    );
    const running = await startServer({
      host: "127.0.0.1",
      port: 0,
      webOrigins: [],
      repository,
      auth: guestAuthenticator(randomBytes(32).toString("hex")),
    });
    t.after(() => running.close());
    const base = `http://127.0.0.1:${running.port}`;
    for (let i = 0; i < 299; i++) {
      const response = await fetch(`${base}/readyz`);
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }
    const lastAllowed = await fetch(`${base}/tables`);
    assert.equal(
      lastAllowed.status,
      401,
      "a route wrapper must not count this request a second time",
    );
    const before = checks;
    const matchmaker = await fetch(`${base}/matchmake/joinOrCreate/table`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(matchmaker.status, 429);
    assert.equal((await matchmaker.json()).error.code, "RATE_LIMITED");
    assert.equal((await fetch(`${base}/readyz`)).status, 429);
    assert.equal(
      checks,
      before,
      "a blocked readiness request must not reach PostgreSQL",
    );
    assert.equal((await fetch(`${base}/health`)).status, 200);
  },
);

test(
  "sync reads and commands share a user budget across authenticated sockets",
  { timeout: 15_000 },
  async (t) => {
    const repository = new JsonTableRepository(
      await mkdtemp(join(tmpdir(), "ringuringu-sync-rate-review-")),
    );
    const auth = guestAuthenticator(randomBytes(32).toString("hex"));
    const running = await startServer({
      host: "127.0.0.1",
      port: 0,
      webOrigins: [],
      repository,
      auth,
    });
    const rooms: Room[] = [];
    t.after(async () => {
      for (const room of rooms) if (room.connection.isOpen) await room.leave();
      await running.close();
    });
    const guest = auth.issueGuest!("다중 창 검증");
    const created = await running.service.create(guest.user, {
      title: "동기화 제한",
    });
    const base = `http://127.0.0.1:${running.port}`;
    let limited = 0;
    let syncViews = 0;
    for (let i = 0; i < 2; i++) {
      const room = await new Client(base).joinOrCreate("table", {
        tableId: created.table.id,
        accessToken: guest.accessToken,
      });
      room.onMessage("view", () => {
        syncViews++;
      });
      room.onMessage<{ code: string }>("error", (error) => {
        if (error.code === "RATE_LIMITED") limited++;
      });
      rooms.push(room);
    }
    // Each socket remains below Colyseus' 200 messages/second guard. Together
    // they must still use the same authenticated-user quota of 300/10 seconds.
    for (let i = 0; i < 160; i++)
      for (const room of rooms) room.send("sync", {});
    const until = Date.now() + 4000;
    while (limited < 20 && Date.now() < until) await delay(10);
    assert.equal(limited, 20);
    assert.ok(syncViews > 0);
    rooms[0]!.send("table_command", {
      commandId: randomUUID(),
      type: "READY",
      ready: true,
      expectedRevision: created.table.revision,
    });
    const commandDeadline = Date.now() + 1000;
    while (limited < 21 && Date.now() < commandDeadline) await delay(10);
    assert.equal(
      limited,
      21,
      "changing message kind must not create a fresh budget",
    );
    assert.equal(
      (await repository.read(created.table.id))!.table.revision,
      created.table.revision,
    );
  },
);

// Opt in only against a disposable/staging database with migrations applied.
// The runtime role intentionally has no DELETE permission, so this leaves one
// clearly named review aggregate in that staging database.
test(
  "operator PostgreSQL integration: runtime readiness, restart read and atomic compare-and-swap",
  { skip: !process.env.TEST_DATABASE_URL, timeout: 30_000 },
  async (t) => {
    const repository = new PostgresTableRepository(
      process.env.TEST_DATABASE_URL!,
      {
        sslMode:
          process.env.TEST_DATABASE_SSL_MODE === "disable"
            ? "disable"
            : "verify-full",
        sslCa: process.env.TEST_DATABASE_SSL_CA,
        allowPrivateNetwork:
          process.env.TEST_DATABASE_ALLOW_PRIVATE_NETWORK === "true",
        poolSize: 3,
      },
    );
    const service = new TableService(repository);
    t.after(async () => {
      await service.close();
      await repository.close();
    });
    await repository.checkHealth();
    const user = { id: randomUUID(), nickname: "PostgreSQL 검증" };
    const created = await service.create(user, {
      title: "selfhost-review staging",
      gameKey: "workshop",
    });
    const original = (await repository.read(created.table.id))!;
    const changes = [structuredClone(original), structuredClone(original)];
    changes.forEach((record, index) => {
      record.table.revision++;
      record.table.title = `selfhost-review CAS ${index}`;
    });
    const outcomes = await Promise.allSettled(
      changes.map((record) =>
        repository.commit(record, original.table.revision, original.ownerEpoch),
      ),
    );
    assert.equal(
      outcomes.filter((outcome) => outcome.status === "fulfilled").length,
      1,
    );
    const failed = outcomes.find((outcome) => outcome.status === "rejected");
    assert.ok(
      failed?.status === "rejected" &&
        failed.reason instanceof PersistenceConflict,
    );
    const restarted = new PostgresTableRepository(
      process.env.TEST_DATABASE_URL!,
      {
        sslMode:
          process.env.TEST_DATABASE_SSL_MODE === "disable"
            ? "disable"
            : "verify-full",
        sslCa: process.env.TEST_DATABASE_SSL_CA,
        allowPrivateNetwork:
          process.env.TEST_DATABASE_ALLOW_PRIVATE_NETWORK === "true",
      },
    );
    t.after(() => restarted.close());
    const durable = (await restarted.read(created.table.id))!;
    assert.equal(durable.table.revision, original.table.revision + 1);
    assert.equal(
      (await restarted.listByUser(user.id)).some(
        (record) => record.table.id === created.table.id,
      ),
      true,
    );
  },
);
