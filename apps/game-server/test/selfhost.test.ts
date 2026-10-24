import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Client, type Room } from "@colyseus/sdk";
import { JsonTableRepository, postgresConnectionOptions } from "@moyeotable/db";
import { guestAuthenticator } from "../src/auth.js";
import { startServer } from "../src/server.js";

test("self-hosted guest identities survive secret reuse, expire, and reject tampering or mode confusion", async () => {
  const secret = randomBytes(32).toString("hex"); let now = 1_000_000;
  const auth = guestAuthenticator(secret, { ttlSeconds: 60, now: () => now });
  const issued = auth.issueGuest!("서버 친구"), identity = await auth.verify(issued.accessToken);
  assert.equal(identity.id, issued.user.id); assert.equal(identity.expiresAt, now + 60_000);
  const restarted = guestAuthenticator(secret, { now: () => now });
  assert.equal((await restarted.verify(issued.accessToken)).id, identity.id);
  const parts = issued.accessToken.split(".");
  const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8"));
  claims.id = "00000000-0000-4000-8000-000000000000";
  const forged = `guest.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${parts[2]}`;
  for (const bad of [forged, issued.accessToken.replace(/^guest/, "local"), `${issued.accessToken}.extra`, "", {}, `guest.${parts[1]}.x`])
    await assert.rejects(auth.verify(bad), { code: "UNAUTHENTICATED" });
  await assert.rejects(guestAuthenticator(randomBytes(32).toString("hex")).verify(issued.accessToken), { code: "UNAUTHENTICATED" });
  now += 60_000; await assert.rejects(auth.verify(issued.accessToken), { code: "UNAUTHENTICATED" });
  for (const badSecret of ["", "a".repeat(63), "z".repeat(64), "a".repeat(130)]) assert.throws(() => guestAuthenticator(badSecret), /GUEST_SIGNING_SECRET/);
  for (const ttlSeconds of [0, 59, 604_801, NaN]) assert.throws(() => guestAuthenticator(secret, { ttlSeconds }), /TTL/);
});

test("private database TLS exemption is explicit and cannot disable TLS for public hosts", () => {
  for (const host of ["postgres", "db-internal", "10.0.0.2", "172.16.0.3", "172.31.255.255", "192.168.0.3", "[fd12::3]"]) {
    assert.throws(() => postgresConnectionOptions(`postgresql://runtime:pw@${host}/game`, { sslMode: "disable" }));
    assert.equal(postgresConnectionOptions(`postgresql://runtime:pw@${host}/game`, { sslMode: "disable", allowPrivateNetwork: true }).ssl, false);
  }
  for (const host of ["database.example", "8.8.8.8", "172.15.0.1", "172.32.0.1", "192.169.0.1", "[2001:4860:4860::8888]"])
    assert.throws(() => postgresConnectionOptions(`postgresql://runtime:pw@${host}/game`, { sslMode: "disable", allowPrivateNetwork: true }));
  assert.deepEqual(postgresConnectionOptions("postgresql://runtime:pw@postgres/game", { allowPrivateNetwork: true }).ssl, { rejectUnauthorized: true });
});

test("production guest HTTP and real SDK joins work behind one proxy without trusting a prepended spoofed address", { timeout: 15_000 }, async (t) => {
  const auth = guestAuthenticator(randomBytes(32).toString("hex"));
  const repository = new JsonTableRepository(await mkdtemp(join(tmpdir(), "ringuringu-selfhost-")));
  const running = await startServer({ host: "0.0.0.0", port: 0, webOrigins: ["https://game.example"], auth, repository, trustProxy: 1 });
  let room: Room | undefined;
  t.after(async () => { if (room?.connection.isOpen) await room.leave(); await running.close(); });
  const base = `http://127.0.0.1:${running.port}`;
  const issue = (forwarded: string) => fetch(`${base}/auth/guest`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": forwarded, Origin: "https://game.example" }, body: JSON.stringify({ nickname: "자체 서버" }),
  });
  const first = await issue("198.51.100.11"); assert.equal(first.status, 200);
  const credentials = await first.json() as { accessToken: string; user: { id: string } };
  const created = await fetch(`${base}/tables`, { method: "POST", headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ title: "운영 게스트", gameKey: "workshop" }) });
  assert.equal(created.status, 201); const body = await created.json() as { table: { id: string } };
  room = await new Client(base).joinOrCreate("table", { tableId: body.table.id, accessToken: credentials.accessToken });
  room.onMessage("view", () => {}); room.onMessage("error", () => {});
  for (let i = 1; i < 20; i++) { const response = await issue("198.51.100.11"); assert.equal(response.status, 200); await response.arrayBuffer(); }
  assert.equal((await issue("198.51.100.11")).status, 429);
  // Express with one trusted hop uses the nearest forwarded address; the
  // untrusted, client-supplied leftmost address does not create another bucket.
  assert.equal((await issue("203.0.113.99, 198.51.100.11")).status, 429);
  assert.equal((await issue("198.51.100.12")).status, 200);
  assert.equal((await fetch(`${base}/health`)).status, 200);
  await assert.rejects(new Client(base).joinOrCreate("table", { tableId: body.table.id, accessToken: credentials.accessToken + "bad" }), { code: 401 });
});
