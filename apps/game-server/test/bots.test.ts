import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import type { GameKey, RoomView } from "@moyeotable/contracts";
import { GAME_CATALOG } from "@moyeotable/game-core/catalog";
import { decodeTableRecord, JsonTableRepository } from "@moyeotable/db";
import { chooseBotCommand } from "../src/bots/index.js";
import { TableService } from "../src/service.js";

async function setup(gameKey: GameKey = "star-trails", botDelay = 25) {
  const directory = await mkdtemp(join(tmpdir(), "ringuringu-bots-"));
  let failed = false;
  const repository = new JsonTableRepository(directory, () => { if (failed) throw new Error("Storage offline"); });
  const entropy = { randomInt: () => 0, createId: randomUUID, now: Date.now };
  const service = new TableService(repository, entropy, { delayMs: () => botDelay });
  const host = { id: randomUUID(), nickname: "연습하는 친구" };
  const created = await service.create(host, { title: "연습 테이블", gameKey });
  const tableId = created.table.id;
  const command = async (type: string, extra = {}, userId: string = host.id) => service.tableCommand(tableId, userId, { commandId: randomUUID(), expectedRevision: (await repository.read(tableId))!.table.revision, type, ...extra });
  const start = async () => {
    for (let i = 1; i < GAME_CATALOG[gameKey].minPlayers; i++) await command("ADD_BOT");
    service.connected(tableId, host.id, 1);
    await command("READY", { ready: true });
    await command("START");
  };
  return { directory, repository, service, host, created, tableId, command, start, entropy, fail: (value: boolean) => { failed = value; } };
}
function envelope(view: RoomView, choice: { type: string; payload: Record<string, unknown> }) {
  return { protocolVersion: 1, tableId: view.table.id, sessionId: view.table.sessionId, commandId: randomUUID(), expectedVersion: view.game!.version, ...choice };
}
async function until(check: () => Promise<boolean>, timeout = 4_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await delay(8); }
  assert.fail("Timed out waiting for a persisted bot action");
}
async function humanStarTurn(f: Awaited<ReturnType<typeof setup>>) {
  for (let i = 0; i < 2; i++) {
    const view = await f.service.view(f.tableId, f.host.id);
    assert.equal(view.gameKey, "star-trails");
    if (view.gameKey !== "star-trails") throw new Error("Star expected");
    const choice = i === 0 ? { type: "STAR_DISCARD", payload: { cardId: view.game!.yourHand[0]!.id } } : { type: "STAR_DRAW_DECK", payload: {} };
    await f.service.gameCommand(f.tableId, f.host.id, envelope(view, choice));
  }
}

test("only the host manages bot seats; bots are ready, persistent and cannot be authenticated players", async (t) => {
  const f = await setup("workshop"); t.after(() => f.service.close());
  const friend = { id: randomUUID(), nickname: "진짜 친구" };
  await f.service.join(f.tableId, friend, { inviteToken: f.created.inviteToken });
  await assert.rejects(f.command("ADD_BOT", {}, friend.id), { code: "NOT_HOST" });
  await assert.rejects(f.command("ADD_BOT", { userId: randomUUID() }), { code: "INVALID_INPUT" });
  await f.command("ADD_BOT"); await f.command("ADD_BOT");
  const view = await f.service.view(f.tableId, f.host.id), bots = view.table.members.filter((member) => member.control === "bot");
  assert.equal(bots.length, 2); assert.ok(bots.every((member) => member.connected && member.ready));
  await assert.rejects(f.command("ADD_BOT"), { code: "TABLE_FULL" });
  await assert.rejects(f.command("REMOVE_BOT", { userId: friend.id }), { code: "NOT_BOT" });
  await assert.rejects(f.service.view(f.tableId, bots[0]!.userId), { code: "NOT_MEMBER" });
  await assert.rejects(f.command("READY", { ready: false }, bots[0]!.userId), { code: "NOT_MEMBER" });
  await assert.rejects(f.service.join(f.tableId, { id: bots[0]!.userId, nickname: "위조" }, { inviteToken: f.created.inviteToken }), { code: "NOT_MEMBER" });
  assert.deepEqual(await f.service.list(bots[0]!.userId), []);
  await assert.rejects(f.service.join(f.tableId, { id: randomUUID(), nickname: "다섯째" }, { inviteToken: f.created.inviteToken }), { code: "TABLE_FULL" });
  await f.command("REMOVE_BOT", { userId: bots[0]!.userId });
  await f.service.join(f.tableId, { id: randomUUID(), nickname: "새 친구" }, { inviteToken: f.created.inviteToken });
  const saved = (await f.repository.read(f.tableId))!;
  assert.equal(saved.table.members.filter((member) => member.control === "bot").length, 1);
  assert.ok(saved.table.members.filter((member) => member.control === "human").every((member) => !member.ready));
  const corrupt = structuredClone(saved); corrupt.table.hostId = bots[1]!.userId;
  assert.throws(() => decodeTableRecord(corrupt), /damaged/);
});

test("legacy humans upcast and the last human leaving clears unattended bot seats", async (t) => {
  const f = await setup("workshop"); t.after(() => f.service.close());
  const path = join(f.directory, `${f.tableId}.json`), raw = JSON.parse(await readFile(path, "utf8"));
  delete raw.table.members[0].control; await writeFile(path, JSON.stringify(raw));
  assert.equal((await f.service.view(f.tableId, f.host.id)).table.members[0]!.control, "human");
  assert.equal(JSON.parse(await readFile(path, "utf8")).table.members[0].control, undefined);
  await f.command("ADD_BOT"); await f.command("LEAVE");
  const saved = (await f.repository.read(f.tableId))!; assert.deepEqual(saved.table.members, []); assert.equal(saved.session, null);
});

test("a delayed bot turn pauses when the human disconnects and resumes from its persisted membership after restart", async (t) => {
  const f = await setup("star-trails", 65); t.after(() => f.service.close()); await f.start();
  await assert.rejects(f.command("REMOVE_BOT", { userId: (await f.repository.read(f.tableId))!.table.members[1]!.userId }), { code: "GAME_RUNNING" });
  await humanStarTurn(f);
  // Disconnect in the continuation of the accepted human move, before any
  // asynchronous reads can let the bot finish half its turn on a busy runner.
  f.service.connected(f.tableId, f.host.id, -1);
  const before = (await f.repository.read(f.tableId))!, bot = before.table.members.find((member) => member.control === "bot")!;
  const humanView = await f.service.view(f.tableId, f.host.id);
  await assert.rejects(f.service.gameCommand(f.tableId, bot.userId, envelope(humanView, { type: "STAR_DRAW_DECK", payload: {} })), { code: "NOT_MEMBER" });
  await delay(150);
  assert.equal((await f.repository.read(f.tableId))!.session!.state.version, before.session!.state.version);
  assert.equal((await f.service.view(f.tableId, f.host.id)).paused, true);
  await f.service.close();
  const resumed = new TableService(new JsonTableRepository(f.directory), f.entropy, { delayMs: () => 12 }); t.after(() => resumed.close());
  // The real server ticks once a second, including retries after a transient
  // local-file rename failure. A reopened service needs that scheduler too.
  const scheduler = setInterval(() => { void resumed.tick(); }, 1_000);
  t.after(() => clearInterval(scheduler));
  const restored = await resumed.view(f.tableId, f.host.id);
  assert.equal(restored.paused, true); assert.equal(restored.table.members[1]!.control, "bot");
  resumed.connected(f.tableId, f.host.id, 1);
  await until(async () => (await f.repository.read(f.tableId))!.session!.state.version >= before.session!.state.version + 2);
  const next = await resumed.view(f.tableId, f.host.id);
  assert.equal(next.paused, false); assert.equal(next.game!.activePlayerId, f.host.id);
  const receipts = (await f.repository.read(f.tableId))!.receipts;
  assert.equal(Object.keys(receipts).filter((key) => key.includes(`:${bot.userId}:`)).length, 2);
});

test("bot storage failures leave no published or durable move and the scheduler retries through the command path", async (t) => {
  const f = await setup("star-trails", 35); t.after(() => f.service.close()); await f.start(); await humanStarTurn(f);
  const version = (await f.repository.read(f.tableId))!.session!.state.version;
  let changes = 0; const off = f.service.subscribe(f.tableId, () => changes++); t.after(off);
  f.fail(true); await delay(100);
  assert.equal((await f.repository.read(f.tableId))!.session!.state.version, version); assert.equal(changes, 0);
  f.fail(false); await f.service.tick();
  await until(async () => (await f.repository.read(f.tableId))!.session!.state.version >= version + 2);
  assert.equal(changes, 2);
});

for (const gameKey of ["star-trails", "workshop", "council", "signal", "garden"] as const) {
  test(`one human and medium bots make legal saved progress in ${gameKey}`, async (t) => {
    const f = await setup(gameKey, 2); t.after(() => f.service.close()); await f.start();
    let botActions = 0;
    for (let i = 0; i < 180 && botActions < 5; i++) {
      const view = await f.service.view(f.tableId, f.host.id);
      if (view.result) break;
      const choice = chooseBotCommand(view.gameKey, view.game!, () => 0);
      if (choice) {
        try { await f.service.gameCommand(f.tableId, f.host.id, envelope(view, choice)); }
        catch (error) { if ((error as { code: string }).code !== "VERSION_CONFLICT") throw error; }
      }
      await f.service.tick(); await delay(5);
      const record = (await f.repository.read(f.tableId))!;
      const bots = record.table.members.filter((member) => member.control === "bot");
      botActions = Object.keys(record.receipts).filter((key) => key.startsWith("game:") && bots.some((bot) => key.includes(`:${bot.userId}:`))).length;
    }
    const completed = (await f.repository.read(f.tableId))!.session!.result !== null;
    assert.ok(botActions >= 5 || completed && botActions > 0, `${gameKey} saved bot actions: ${botActions}`);
    f.service.connected(f.tableId, f.host.id, -1); await delay(15);
    const stopped = (await f.repository.read(f.tableId))!.session!.state.version;
    await delay(50); await f.service.tick();
    assert.equal((await f.repository.read(f.tableId))!.session!.state.version, stopped);
  });
}
