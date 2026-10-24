import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { JsonTableRepository } from "@moyeotable/db";
import type { RoomView, UserIdentity } from "@moyeotable/contracts";
import { localAuthenticator, supabaseAuthenticator } from "../src/auth.js";
import { TableService } from "../src/service.js";

class StarTableService extends TableService {
  override async view(tableId: string, userId: string): Promise<RoomView<"star-trails">> {
    const view = await super.view(tableId, userId);
    if (view.gameKey !== "star-trails") throw new Error("Expected the legacy Star game");
    return view;
  }
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "moyeo-service-"));
  let fail = false;
  const repository = new JsonTableRepository(directory, () => {
    if (fail) throw new Error("injected storage outage");
  });
  const service = new StarTableService(repository);
  const users: [UserIdentity, UserIdentity] = [
    { id: randomUUID(), nickname: "별 하나" },
    { id: randomUUID(), nickname: "별 둘" },
  ];
  const { table, inviteToken } = await service.create(users[0], {
    title: "테스트 테이블",
  });
  await service.join(table.id, users[1], { inviteToken });
  users.forEach((user) => service.connected(table.id, user.id, 1));
  for (const user of users)
    await service.tableCommand(table.id, user.id, {
      commandId: randomUUID(),
      expectedRevision: (await service.view(table.id, user.id)).table.revision,
      type: "READY",
      ready: true,
    });
  await service.tableCommand(table.id, users[0].id, {
    commandId: randomUUID(),
    expectedRevision: (await service.view(table.id, users[0].id)).table
      .revision,
    type: "START",
  });
  return {
    directory,
    repository,
    service,
    users,
    tableId: table.id,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}
function envelope(
  view: RoomView,
  command: { type: string; payload: object },
  commandId = randomUUID(),
) {
  return {
    protocolVersion: 1,
    tableId: view.table.id,
    sessionId: view.table.sessionId,
    commandId,
    expectedVersion: view.game!.version,
    ...command,
  };
}

test("authenticated membership and per-player projections exclude deck and opponent hand, even after finish", async () => {
  const f = await fixture();
  const one = await f.service.view(f.tableId, f.users[0].id),
    two = await f.service.view(f.tableId, f.users[1].id);
  assert.equal(one.game!.yourHand.length, 8);
  assert.equal(two.game!.yourHand.length, 8);
  assert.equal("deck" in one.game!, false);
  for (const card of two.game!.yourHand)
    assert.equal(JSON.stringify(one).includes(card.id), false);
  assert.equal(JSON.stringify(one).includes("tokenHash"), false);
  await assert.rejects(f.service.view(f.tableId, randomUUID()), {
    code: "NOT_MEMBER",
  });
  await f.service.gameCommand(
    f.tableId,
    f.users[0].id,
    envelope(one, { type: "RESIGN", payload: {} }),
  );
  const result = await f.service.view(f.tableId, f.users[0].id);
  assert.equal(result.game!.phase, "FINISHED");
  assert.equal(result.result!.reason, "RESIGN");
  assert.deepEqual(result.result!.winners, [f.users[1].id]);
  for (const card of two.game!.yourHand)
    assert.equal(JSON.stringify(result).includes(card.id), false);
});

test("command replay survives reload; mismatch, stale versions and forged identity reject without mutation", async () => {
  const f = await fixture();
  const first = await f.service.view(f.tableId, f.users[0].id);
  const actor = first.game!.activePlayerId;
  const view = await f.service.view(f.tableId, actor);
  const command = envelope(view, {
    type: "STAR_DISCARD",
    payload: { cardId: view.game!.yourHand[0]!.id },
  });
  const ack = await f.service.gameCommand(f.tableId, actor, command);
  assert.equal(ack.acceptedVersion, 1);
  assert.equal(
    (await f.service.gameCommand(f.tableId, actor, command)).status,
    "duplicate",
  );
  await assert.rejects(
    f.service.gameCommand(f.tableId, actor, {
      ...command,
      payload: { cardId: view.game!.yourHand[1]!.id },
    }),
    { code: "DUPLICATE_COMMAND_MISMATCH" },
  );
  await assert.rejects(
    f.service.gameCommand(f.tableId, actor, {
      ...command,
      commandId: randomUUID(),
    }),
    { code: "VERSION_CONFLICT" },
  );
  await assert.rejects(
    f.service.gameCommand(f.tableId, actor, {
      ...command,
      actorId: f.users[1].id,
    }),
    { code: "INVALID_INPUT" },
  );
  const restored = new StarTableService(new JsonTableRepository(f.directory));
  const recovered = await restored.view(f.tableId, actor);
  assert.equal(recovered.game!.phase, "DRAW");
  assert.equal(recovered.game!.yourHand.length, 7);
  assert.equal(
    (await restored.gameCommand(f.tableId, actor, command)).status,
    "duplicate",
  );
  assert.deepEqual(
    (await restored.view(f.tableId, actor)).game,
    recovered.game,
  );
  // Once a new process claims ownership the old process cannot commit.
  await assert.rejects(
    f.service.gameCommand(
      f.tableId,
      actor,
      envelope(recovered, { type: "STAR_DRAW_DECK", payload: {} }),
    ),
    { code: "VERSION_CONFLICT" },
  );
});

test("failed persistence emits no update or receipt; retry commits once; concurrent commands serialize", async () => {
  const f = await fixture();
  const initial = await f.service.view(f.tableId, f.users[0].id),
    actor = initial.game!.activePlayerId;
  const before = await f.service.view(f.tableId, actor);
  const command = envelope(before, {
    type: "STAR_DISCARD",
    payload: { cardId: before.game!.yourHand[0]!.id },
  });
  let updates = 0;
  f.service.subscribe(f.tableId, () => {
    updates++;
  });
  f.fail(true);
  await assert.rejects(f.service.gameCommand(f.tableId, actor, command), {
    code: "SAVE_FAILED",
  });
  assert.equal(updates, 0);
  assert.deepEqual(await f.service.view(f.tableId, actor), before);
  f.fail(false);
  const results = await Promise.all([
    f.service.gameCommand(f.tableId, actor, command),
    f.service.gameCommand(f.tableId, actor, command),
  ]);
  assert.deepEqual(
    results.map((result) => result.status),
    ["accepted", "duplicate"],
  );
  assert.equal(updates, 1);
  assert.equal((await f.service.view(f.tableId, actor)).game!.version, 1);
});

test("natural full game, result and ready/rematch preserve members and use a new session", async () => {
  const f = await fixture();
  const initial = await f.service.view(f.tableId, f.users[0].id);
  let commands = 0;
  while (true) {
    const state = await f.service.view(f.tableId, f.users[0].id);
    if (state.table.status === "RESULT") break;
    const view = await f.service.view(f.tableId, state.game!.activePlayerId);
    const command =
      view.game!.phase === "PLACE"
        ? (view.game!.legalCommands.find((item) => item.type === "STAR_PLAY") ??
          view.game!.legalCommands.find(
            (item) => item.type === "STAR_DISCARD",
          )!)
        : { type: "STAR_DRAW_DECK", payload: {} };
    await f.service.gameCommand(
      f.tableId,
      view.game!.you,
      envelope(view, command),
    );
    commands++;
  }
  assert.equal(commands, 88);
  const finished = await f.service.view(f.tableId, f.users[0].id);
  assert.equal(finished.game!.deckCount, 0);
  assert.equal(finished.result!.reason, "DECK_EXHAUSTED");
  for (const user of f.users)
    await f.service.tableCommand(f.tableId, user.id, {
      commandId: randomUUID(),
      expectedRevision: (await f.service.view(f.tableId, user.id)).table
        .revision,
      type: "READY",
      ready: true,
    });
  await f.service.tableCommand(f.tableId, f.users[0].id, {
    commandId: randomUUID(),
    expectedRevision: (await f.service.view(f.tableId, f.users[0].id)).table
      .revision,
    type: "REMATCH",
  });
  const rematch = await f.service.view(f.tableId, f.users[0].id);
  assert.notEqual(rematch.table.sessionId, initial.table.sessionId);
  assert.deepEqual(rematch.table.members, initial.table.members);
  assert.equal(rematch.game!.deckCount, 44);
  assert.equal(rematch.game!.version, 0);
  assert.equal((await f.repository.read(f.tableId))!.history.length, 1);
});

test("local tokens persist across auth restart, reject modification and remain separate from Supabase mode", async () => {
  const directory = await mkdtemp(join(tmpdir(), "moyeo-auth-"));
  const one = await localAuthenticator(directory);
  const issued = one.issueGuest!("친구 하나");
  assert.deepEqual(
    await (await localAuthenticator(directory)).verify(issued.accessToken),
    issued.user,
  );
  await assert.rejects(one.verify(`${issued.accessToken}x`), {
    code: "UNAUTHENTICATED",
  });
  await assert.rejects(one.verify(JSON.stringify(issued.user)), {
    code: "UNAUTHENTICATED",
  });
  assert.equal(
    supabaseAuthenticator("https://example.supabase.co", "anon-test-key")
      .issueGuest,
    undefined,
  );
});

test("leave is idempotent after membership removal and transferred host can invite a replacement", async () => {
  const f = await fixture();
  const playing = await f.service.view(f.tableId, f.users[0].id);
  await f.service.gameCommand(
    f.tableId,
    f.users[0].id,
    envelope(playing, { type: "RESIGN", payload: {} }),
  );
  const command = {
    commandId: randomUUID(),
    expectedRevision: (await f.service.view(f.tableId, f.users[0].id)).table
      .revision,
    type: "LEAVE",
  };
  assert.equal(
    (await f.service.tableCommand(f.tableId, f.users[0].id, command)).status,
    "accepted",
  );
  assert.equal(
    (await f.service.tableCommand(f.tableId, f.users[0].id, command)).status,
    "duplicate",
  );
  const remaining = await f.service.view(f.tableId, f.users[1].id);
  assert.equal(remaining.table.hostId, f.users[1].id);
  assert.equal(remaining.game, null);
  const { inviteToken } = await f.service.invite(f.tableId, f.users[1].id);
  const newcomer = { id: randomUUID(), nickname: "새 친구" };
  const joined = await f.service.join(f.tableId, newcomer, { inviteToken });
  assert.equal(joined.table.members.length, 2);
  assert.equal((await f.service.view(f.tableId, newcomer.id)).game, null);
});

test("joining a new member clears earlier readiness and invitation tokens contain 32 random bytes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "moyeo-join-"));
  const service = new StarTableService(new JsonTableRepository(directory));
  const host = { id: randomUUID(), nickname: "테이블 호스트" };
  const { table, inviteToken } = await service.create(host, {
    title: "멤버 변경 준비 확인",
  });
  assert.equal(Buffer.from(inviteToken, "base64url").length, 32);
  await service.tableCommand(table.id, host.id, {
    commandId: randomUUID(),
    expectedRevision: 0,
    type: "READY",
    ready: true,
  });
  const joined = await service.join(
    table.id,
    { id: randomUUID(), nickname: "새로운 친구" },
    { inviteToken },
  );
  assert.equal(
    joined.table.members.every((member) => !member.ready),
    true,
  );
  assert.equal(
    Buffer.from(
      (await service.invite(table.id, host.id)).inviteToken,
      "base64url",
    ).length,
    32,
  );
});

test("server pauses commands when a participant disconnects, resumes unchanged state, and preserves accepted replay", async () => {
  const f = await fixture();
  const first = await f.service.view(f.tableId, f.users[0].id);
  const actorId = first.game!.activePlayerId;
  const opponentId = f.users.find((user) => user.id !== actorId)!.id;
  const active = await f.service.view(f.tableId, actorId);
  const command = envelope(active, {
    type: "STAR_DISCARD",
    payload: { cardId: active.game!.yourHand[0]!.id },
  });
  f.service.connected(f.tableId, opponentId, -1);
  let commits = 0;
  f.service.subscribe(f.tableId, () => {
    commits++;
  });
  const paused = await f.service.view(f.tableId, actorId);
  assert.deepEqual(paused.game!.legalCommands, []);
  await assert.rejects(f.service.gameCommand(f.tableId, actorId, command), {
    code: "PLAYER_DISCONNECTED",
  });
  assert.equal(commits, 0);
  assert.equal(
    (await f.service.view(f.tableId, actorId)).game!.version,
    active.game!.version,
  );
  f.service.connected(f.tableId, opponentId, 1);
  assert.equal(
    (await f.service.gameCommand(f.tableId, actorId, command)).status,
    "accepted",
  );
  f.service.connected(f.tableId, opponentId, -1);
  assert.equal(
    (await f.service.gameCommand(f.tableId, actorId, command)).status,
    "duplicate",
  );
  const draw = await f.service.view(f.tableId, actorId);
  assert.equal(draw.game!.phase, "DRAW");
  await assert.rejects(
    f.service.gameCommand(
      f.tableId,
      actorId,
      envelope(draw, { type: "STAR_DRAW_DECK", payload: {} }),
    ),
    { code: "PLAYER_DISCONNECTED" },
  );
  // Choosing to concede is still explicit and available; disconnection alone
  // never awards a win or creates a disconnect-forfeit result.
  await f.service.gameCommand(
    f.tableId,
    actorId,
    envelope(draw, { type: "RESIGN", payload: {} }),
  );
  assert.equal(
    (await f.service.view(f.tableId, actorId)).result!.reason,
    "RESIGN",
  );
});

test("closing only one of a member’s connected tabs does not pause their game", async () => {
  const f = await fixture();
  const initial = await f.service.view(f.tableId, f.users[0].id);
  const actor = initial.game!.activePlayerId;
  const opponent = f.users.find((user) => user.id !== actor)!.id;
  f.service.connected(f.tableId, opponent, 1);
  f.service.connected(f.tableId, opponent, -1);
  const view = await f.service.view(f.tableId, actor);
  assert.ok(view.game!.legalCommands.length > 0);
  await f.service.gameCommand(
    f.tableId,
    actor,
    envelope(view, {
      type: "STAR_DISCARD",
      payload: { cardId: view.game!.yourHand[0]!.id },
    }),
  );
  assert.equal((await f.service.view(f.tableId, actor)).game!.version, 1);
});
