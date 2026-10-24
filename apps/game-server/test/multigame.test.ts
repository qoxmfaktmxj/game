import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { JsonTableRepository, decodeTableRecord } from "@moyeotable/db";
import type { GameKey, RoomView, UserIdentity } from "@moyeotable/contracts";
import type { Entropy } from "@moyeotable/game-core/multigame";
import { TableService } from "../src/service.js";

async function setup(gameKey: GameKey, count: number, entropy?: Entropy) {
  const directory = await mkdtemp(join(tmpdir(), "ringuringu-multi-"));
  let fail = false;
  const repository = new JsonTableRepository(directory, () => { if (fail) throw new Error("Storage unavailable"); });
  const service = new TableService(repository, entropy);
  const users: UserIdentity[] = Array.from({ length: count }, (_, index) => ({ id: randomUUID(), nickname: `친구 ${index + 1}` }));
  const created = await service.create(users[0]!, { title: "다섯 게임 테이블", gameKey });
  for (const user of users.slice(1)) await service.join(created.table.id, user, { inviteToken: created.inviteToken });
  const tableId = created.table.id;
  const table = async (user: UserIdentity, type: string, extra = {}) => service.tableCommand(tableId, user.id, {
    commandId: randomUUID(), expectedRevision: (await service.view(tableId, user.id)).table.revision, type, ...extra,
  });
  const start = async () => {
    for (const user of users) service.connected(tableId, user.id, 1);
    for (const user of users) await table(user, "READY", { ready: true });
    await table(users[0]!, "START");
  };
  return { directory, repository, service, users, tableId, table, start, created, fail: (value: boolean) => { fail = value; } };
}
function envelope(view: RoomView, type: string, payload = {}) {
  return { protocolVersion: 1, tableId: view.table.id, sessionId: view.table.sessionId, commandId: randomUUID(), expectedVersion: view.game!.version, type, payload };
}

test("one invitation seats four distinct workshop players and cannot overfill the table", async () => {
  const f = await setup("workshop", 4);
  const view = await f.service.view(f.tableId, f.users[0]!.id);
  assert.deepEqual(view.table.members.map((member) => member.seat), [0, 1, 2, 3]);
  assert.equal((await f.repository.read(f.tableId))!.invite.remainingUses, 0);
  await assert.rejects(f.service.join(f.tableId, { id: randomUUID(), nickname: "다섯째" }, { inviteToken: f.created.inviteToken }), { code: "INVITE_EXPIRED" });
  await f.start();
  const started = await f.service.view(f.tableId, f.users[0]!.id);
  assert.equal(started.gameKey, "workshop");
  assert.equal(started.table.status, "PLAYING");
  assert.equal(started.paused, false);
  assert.equal((await f.repository.read(f.tableId))!.session!.state.playerIds.length, 4);
  await assert.rejects(f.service.gameCommand(f.tableId, f.users[0]!.id, envelope(started, "STAR_DRAW_DECK")), { code: "INVALID_INPUT" });
  await assert.rejects(f.service.gameCommand(f.tableId, f.users[0]!.id, envelope(started, "RESIGN")), { code: "UNSUPPORTED_ACTION" });
});

test("game selection retains the table, resets readiness and blocks nonhost, capacity and active-game changes", async () => {
  const f = await setup("workshop", 3);
  await f.table(f.users[1]!, "READY", { ready: true });
  await assert.rejects(f.table(f.users[1]!, "SELECT_GAME", { gameKey: "garden" }), { code: "NOT_HOST" });
  await assert.rejects(f.table(f.users[0]!, "SELECT_GAME", { gameKey: "star-trails" }), { code: "GAME_CAPACITY" });
  await f.table(f.users[0]!, "SELECT_GAME", { gameKey: "garden" });
  const view = await f.service.view(f.tableId, f.users[0]!.id);
  assert.equal(view.table.id, f.tableId);
  assert.equal(view.gameKey, "garden");
  assert.equal(view.game, null);
  assert.ok(view.table.members.every((member) => !member.ready));
  assert.deepEqual(view.table.members.map((member) => member.userId), f.users.map((user) => user.id));
  assert.equal((await f.repository.read(f.tableId))!.invite.remainingUses, 0);
  await f.start();
  await assert.rejects(f.table(f.users[0]!, "SELECT_GAME", { gameKey: "workshop" }), { code: "GAME_RUNNING" });
});

test("signal enforces its four-player minimum without silently excluding ready members", async () => {
  const f = await setup("signal", 3);
  for (const user of f.users) { f.service.connected(f.tableId, user.id, 1); await f.table(user, "READY", { ready: true }); }
  await assert.rejects(f.table(f.users[0]!, "START"), { code: "NOT_READY" });
  assert.equal((await f.service.view(f.tableId, f.users[0]!.id)).table.status, "LOBBY");
});

test("legacy Star snapshots upcast in memory and preserve receipts through subsequent commits", async () => {
  const f = await setup("star-trails", 2); await f.start();
  const initial = await f.service.view(f.tableId, f.users[0]!.id);
  assert.equal(initial.gameKey, "star-trails");
  if (initial.gameKey !== "star-trails") throw new Error("Star expected");
  const actor = initial.game!.activePlayerId;
  const active = await f.service.view(f.tableId, actor);
  if (active.gameKey !== "star-trails") throw new Error("Star expected");
  const command = envelope(active, "STAR_DISCARD", { cardId: active.game!.yourHand[0]!.id });
  await f.service.gameCommand(f.tableId, actor, command);
  const path = join(f.directory, `${f.tableId}.json`);
  const raw = JSON.parse(await readFile(path, "utf8"));
  delete raw.session.gameKey;
  await writeFile(path, JSON.stringify(raw));
  const before = await readFile(path, "utf8");
  assert.equal(decodeTableRecord(raw).session!.gameKey, "star-trails");
  const restored = new TableService(new JsonTableRepository(f.directory));
  const view = await restored.view(f.tableId, actor);
  assert.equal(view.gameKey, "star-trails");
  assert.equal(view.game!.phase, "DRAW");
  assert.equal(await readFile(path, "utf8"), before);
  assert.equal((await restored.gameCommand(f.tableId, actor, command)).status, "duplicate");
  assert.equal(JSON.parse(await readFile(path, "utf8")).session.gameKey, "star-trails");
  raw.session.gameKey = "garden";
  assert.throws(() => decodeTableRecord(raw));
});

test("finished Star switches games on the same table while retaining history and using a fresh session", async () => {
  const f = await setup("star-trails", 2); await f.start();
  const active = await f.service.view(f.tableId, f.users[0]!.id);
  await f.service.gameCommand(f.tableId, f.users[0]!.id, envelope(active, "RESIGN"));
  await f.table(f.users[0]!, "SELECT_GAME", { gameKey: "workshop" });
  for (const user of f.users) await f.table(user, "READY", { ready: true });
  await f.table(f.users[0]!, "START");
  const next = await f.service.view(f.tableId, f.users[0]!.id);
  assert.equal(next.gameKey, "workshop");
  assert.notEqual(next.table.sessionId, active.table.sessionId);
  const stored = (await f.repository.read(f.tableId))!;
  assert.equal(stored.history.length, 1);
  assert.equal(stored.history[0]!.gameKey, "star-trails");
});

test("garden server clock pauses remaining time, resumes it, and persists a three-tile editing timeout", async () => {
  let now = 10_000;
  const f = await setup("garden", 2, { now: () => now, randomInt: (max) => max - 1, createId: randomUUID });
  await f.start();
  const first = await f.service.view(f.tableId, f.users[0]!.id);
  if (first.gameKey !== "garden") throw new Error("Garden expected");
  const actor = first.game!.activePlayerId;
  const before = await f.service.view(f.tableId, actor);
  await f.service.gameCommand(f.tableId, actor, envelope(before, "GARDEN_BEGIN"));
  now += 15_000;
  f.service.connected(f.tableId, f.users[0]!.id, -1);
  await f.service.tick();
  const paused = await f.service.view(f.tableId, actor);
  if (paused.gameKey !== "garden") throw new Error("Garden expected");
  assert.equal(paused.paused, true);
  assert.equal(paused.game!.remainingMs, 45_000);
  assert.deepEqual(paused.game!.legalActions, []);
  now += 100_000;
  await f.service.tick();
  assert.equal((await f.service.view(f.tableId, actor)).game!.version, paused.game!.version);
  f.service.connected(f.tableId, f.users[0]!.id, 1);
  await f.service.tick();
  const resumed = await f.service.view(f.tableId, actor);
  if (resumed.gameKey !== "garden") throw new Error("Garden expected");
  assert.equal(resumed.game!.deadline, now + 45_000);
  const record = (await f.repository.read(f.tableId))!;
  if (record.session?.gameKey !== "garden") throw new Error("Garden expected");
  const rack = record.session.state.racks[record.session.state.activePlayerIndex]!.length;
  now += 45_000;
  f.fail(true); await f.service.tick();
  assert.equal((await f.service.view(f.tableId, actor)).game!.version, resumed.game!.version);
  f.fail(false); await f.service.tick();
  const timed = (await f.repository.read(f.tableId))!;
  if (timed.session?.gameKey !== "garden") throw new Error("Garden expected");
  assert.equal(timed.session.state.racks[timed.session.state.playerIds.indexOf(actor)]!.length, rack + 3);
  assert.notEqual(timed.session.state.playerIds[timed.session.state.activePlayerIndex], actor);
  assert.equal(timed.session.state.version, resumed.game!.version + 1);
});
