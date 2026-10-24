// Server-only adapter example. Never send deck order or RNG state to clients.
import {randomInt, randomUUID} from 'node:crypto';
import {createDeck, shuffleDeck, createInitialState} from './engine.mjs';
export function createSecureGame(playerIds) {
  const deck = shuffleDeck(createDeck(() => randomUUID()), max => randomInt(max));
  return createInitialState({playerIds, deck, firstPlayerIndex: randomInt(2)});
}
