/**
 * 별길 탐험 rules reference 1.0.0.
 * Pure rules only. No authentication, persistence, sockets or production hosting.
 * Server must inject a securely shuffled deck with opaque IDs.
 */
export const SUITS = Object.freeze(['aurora', 'ember', 'tide', 'moss', 'dusk']);
export const RULES_VERSION = '1.0.0';
export class RuleError extends Error {
  constructor(code, message = code) { super(message); this.name = 'RuleError'; this.code = code; }
}
const fail = (code) => { throw new RuleError(code); };
const blankLanes = () => Object.fromEntries(SUITS.map(s => [s, []]));
const clone = value => structuredClone(value);

/** Default IDs are deterministic TEST IDs. Override for production. */
export function createDeck(idFactory = ({suit, kind, value, copy}) => `TEST-${suit}-${kind}-${value ?? copy}`) {
  if (typeof idFactory !== 'function') fail('BAD_ID_FACTORY');
  const result = [];
  for (const suit of SUITS) {
    for (let value = 2; value <= 10; value++) {
      result.push({ id: idFactory({suit, kind: 'number', value, copy: 0}), suit, kind: 'number', value });
    }
    for (let copy = 0; copy < 3; copy++) {
      result.push({ id: idFactory({suit, kind: 'support', value: null, copy}), suit, kind: 'support', value: null });
    }
  }
  validateCardSet(result);
  return result;
}

/** Fisher-Yates. randomInt(maxExclusive) is supplied by the server/test adapter. */
export function shuffleDeck(deck, randomInt) {
  if (typeof randomInt !== 'function') fail('RNG_REQUIRED');
  const result = clone(deck);
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) fail('INVALID_RNG');
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function validateCardSet(cards) {
  if (!Array.isArray(cards) || cards.length !== 60) fail('CARD_COUNT');
  const ids = new Set();
  const counts = new Map();
  for (const card of cards) {
    if (!card || typeof card.id !== 'string' || !card.id || ids.has(card.id)) fail('DUPLICATE_OR_BAD_ID');
    ids.add(card.id);
    if (!SUITS.includes(card.suit)) fail('INVALID_SUIT');
    if (card.kind === 'number') {
      if (!Number.isInteger(card.value) || card.value < 2 || card.value > 10) fail('INVALID_VALUE');
    } else if (card.kind === 'support') {
      if (card.value !== null) fail('INVALID_SUPPORT_VALUE');
    } else fail('INVALID_KIND');
    const key = `${card.suit}:${card.kind}:${card.value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const suit of SUITS) {
    for (let n = 2; n <= 10; n++) if (counts.get(`${suit}:number:${n}`) !== 1) fail('INVALID_DECK_DISTRIBUTION');
    if (counts.get(`${suit}:support:null`) !== 3) fail('INVALID_DECK_DISTRIBUTION');
  }
}

export function createInitialState({playerIds, deck, firstPlayerIndex = 0}) {
  if (!Array.isArray(playerIds) || playerIds.length !== 2 || playerIds.some(x => typeof x !== 'string' || !x) || playerIds[0] === playerIds[1]) fail('INVALID_PLAYERS');
  if (![0, 1].includes(firstPlayerIndex)) fail('INVALID_FIRST_PLAYER');
  validateCardSet(deck);
  const state = {
    rulesVersion: RULES_VERSION, version: 0, playerIds: [...playerIds], activePlayerIndex: firstPlayerIndex,
    phase: 'PLACE', hands: [[], []], lanes: [blankLanes(), blankLanes()], discards: blankLanes(),
    deck: clone(deck), justDiscardedId: null,
  };
  for (let n = 0; n < 8; n++) for (let player = 0; player < 2; player++) state.hands[player].push(state.deck.pop());
  assertInvariants(state);
  return state;
}

export function scoreLane(cards) {
  if (!Array.isArray(cards)) fail('INVALID_LANE');
  if (cards.length === 0) return {sum: 0, cost: 0, supports: 0, multiplier: 1, bonus: 0, count: 0, total: 0};
  const sum = cards.filter(c => c.kind === 'number').reduce((a,c) => a + c.value, 0);
  const supports = cards.filter(c => c.kind === 'support').length;
  const multiplier = supports + 1;
  const bonus = cards.length >= 8 ? 20 : 0;
  return {sum, cost: -20, supports, multiplier, bonus, count: cards.length, total: (sum - 20) * multiplier + bonus};
}
export function scorePlayer(state, playerIndex) {
  if (![0,1].includes(playerIndex)) fail('INVALID_PLAYER');
  const lanes = Object.fromEntries(SUITS.map(suit => [suit, scoreLane(state.lanes[playerIndex][suit])]));
  return {playerId: state.playerIds[playerIndex], lanes, total: Object.values(lanes).reduce((a,x)=>a+x.total,0)};
}
export function getResult(state) {
  if (state.phase !== 'FINISHED') fail('NOT_FINISHED');
  const scores = state.playerIds.map((_,i)=>scorePlayer(state,i));
  const best = Math.max(...scores.map(x=>x.total));
  const winners = scores.filter(x=>x.total===best).map(x=>x.playerId);
  return {scores, winners, tied: winners.length > 1, reason: 'DECK_EXHAUSTED'};
}
function canPlace(lane, card) {
  const numbers = lane.filter(x => x.kind === 'number');
  if (card.kind === 'support') return numbers.length === 0;
  return !numbers.length || card.value > numbers.at(-1).value;
}

/** Actor comes from authenticated server connection, NEVER from untrusted JSON. */
export function applyCommand(state, actorId, command) {
  assertInvariants(state);
  if (state.phase === 'FINISHED') fail('GAME_FINISHED');
  const actor = state.playerIds.indexOf(actorId);
  if (actor < 0) fail('NOT_MEMBER');
  if (actor !== state.activePlayerIndex) fail('NOT_YOUR_TURN');
  if (!command || typeof command.type !== 'string' || !command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload)) fail('BAD_PAYLOAD');
  const next = clone(state);
  if (['STAR_PLAY', 'STAR_DISCARD'].includes(command.type)) {
    if (state.phase !== 'PLACE') fail('WRONG_PHASE');
    if (typeof command.payload.cardId !== 'string') fail('BAD_PAYLOAD');
    const index = next.hands[actor].findIndex(c => c.id === command.payload.cardId);
    if (index === -1) fail('CARD_NOT_OWNED');
    const card = next.hands[actor][index];
    if (command.type === 'STAR_PLAY') {
      const lane = next.lanes[actor][card.suit];
      if (!canPlace(lane, card)) fail(card.kind === 'support' ? 'SUPPORT_AFTER_NUMBER' : 'LOWER_OR_EQUAL');
      lane.push(card); next.justDiscardedId = null;
    } else {
      next.discards[card.suit].push(card); next.justDiscardedId = card.id;
    }
    next.hands[actor].splice(index, 1);
    next.phase = 'DRAW';
  } else if (['STAR_DRAW_DECK', 'STAR_DRAW_DISCARD'].includes(command.type)) {
    if (state.phase !== 'DRAW') fail('WRONG_PHASE');
    let card;
    if (command.type === 'STAR_DRAW_DECK') {
      if (!next.deck.length) fail('EMPTY_DECK');
      card = next.deck.pop();
    } else {
      const suit = command.payload.suit;
      if (!SUITS.includes(suit)) fail('INVALID_SUIT');
      const pile = next.discards[suit];
      if (!pile.length) fail('EMPTY_DISCARD');
      if (pile.at(-1).id === next.justDiscardedId) fail('JUST_DISCARDED');
      card = pile.pop();
    }
    next.hands[actor].push(card);
    next.justDiscardedId = null;
    if (next.deck.length === 0) next.phase = 'FINISHED';
    else { next.activePlayerIndex = 1 - actor; next.phase = 'PLACE'; }
  } else fail('UNKNOWN_COMMAND');
  next.version++;
  assertInvariants(next);
  return next;
}

/** Legal suggestions for the authenticated viewer; still revalidate on commit. */
export function listLegalCommands(state, actorId) {
  if (state.phase === 'FINISHED' || state.playerIds[state.activePlayerIndex] !== actorId) return [];
  const i = state.activePlayerIndex;
  if (state.phase === 'PLACE') {
    return state.hands[i].flatMap(card => [
      ...(canPlace(state.lanes[i][card.suit],card) ? [{type:'STAR_PLAY',payload:{cardId:card.id}}] : []),
      {type:'STAR_DISCARD',payload:{cardId:card.id}},
    ]);
  }
  return [
    ...(state.deck.length ? [{type:'STAR_DRAW_DECK',payload:{}}] : []),
    ...SUITS.filter(s=>state.discards[s].length && state.discards[s].at(-1).id!==state.justDiscardedId).map(s=>({type:'STAR_DRAW_DISCARD',payload:{suit:s}})),
  ];
}

export function toPlayerView(state, viewerId) {
  const viewer = state.playerIds.indexOf(viewerId);
  if (viewer < 0) fail('NOT_MEMBER');
  return clone({
    rulesVersion: state.rulesVersion, version: state.version, phase: state.phase,
    activePlayerId: state.playerIds[state.activePlayerIndex], you: viewerId, deckCount: state.deck.length,
    players: state.playerIds.map((id,i)=>({id, handCount:state.hands[i].length, lanes:state.lanes[i], score:scorePlayer(state,i)})),
    yourHand: state.hands[viewer],
    discards: Object.fromEntries(SUITS.map(s=>[s,{count:state.discards[s].length,top:state.discards[s].at(-1)??null}])),
    result: state.phase==='FINISHED'?getResult(state):null,
  });
}

export function assertInvariants(state) {
  if (!state || state.rulesVersion !== RULES_VERSION || !Number.isInteger(state.version) || state.version < 0) fail('BAD_STATE');
  if (!Array.isArray(state.playerIds) || state.playerIds.length!==2 || new Set(state.playerIds).size!==2 || ![0,1].includes(state.activePlayerIndex)) fail('BAD_PLAYERS');
  if (!['PLACE','DRAW','FINISHED'].includes(state.phase)) fail('BAD_PHASE');
  if (state.hands.length!==2 || state.lanes.length!==2) fail('BAD_PLAYERS');
  const all = [...state.deck, ...state.hands.flat()];
  for (let p = 0; p < 2; p++) {
    const expected = state.phase==='DRAW' && p===state.activePlayerIndex ? 7 : 8;
    if (state.hands[p].length !== expected) fail('HAND_COUNT');
    for (const suit of SUITS) {
      const lane = state.lanes[p][suit];
      let last=1, numeric=false;
      for (const card of lane) {
        if (card.suit!==suit) fail('LANE_SUIT');
        if (card.kind==='number') { if (card.value<=last) fail('LANE_ORDER'); last=card.value; numeric=true; }
        else if (numeric) fail('LANE_SUPPORT_ORDER');
      }
      all.push(...lane);
    }
  }
  for (const suit of SUITS) {
    if (state.discards[suit].some(c=>c.suit!==suit)) fail('DISCARD_SUIT');
    all.push(...state.discards[suit]);
  }
  validateCardSet(all);
  if (state.phase==='FINISHED' && state.deck.length!==0) fail('END_CONDITION');
  if (state.phase!=='FINISHED' && state.deck.length===0) fail('END_CONDITION');
  if (state.justDiscardedId!==null && (state.phase!=='DRAW' || !SUITS.some(s=>state.discards[s].at(-1)?.id===state.justDiscardedId))) fail('BAD_JUST_DISCARDED');
  return true;
}
