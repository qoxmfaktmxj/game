import test from 'node:test';
import assert from 'node:assert/strict';
import {SUITS,createDeck,shuffleDeck,createInitialState,scoreLane,scorePlayer,getResult,applyCommand,listLegalCommands,toPlayerView,assertInvariants,validateCardSet} from './engine.mjs';
import {createSecureGame} from './server-random-example.mjs';
const deck=()=>createDeck();
const id=(s,n)=>`TEST-${s}-${n==='s0'||n==='s1'||n==='s2'?'support-'+n.slice(1):'number-'+n}`;
const N=(n)=>({kind:'number',value:n}); const S=()=>({kind:'support',value:null});
const command=(type,payload={})=>({type,payload});
const throws=(f,code)=>assert.throws(f,e=>e.code===code);
function fixture({hand0=[],hand1=[],lanes0={},lanes1={},discards={}}={}) {
 const cards=deck(); const byId=new Map(cards.map(c=>[c.id,c])); const used=new Set();
 const take=ids=>ids.map(x=>{assert.ok(byId.has(x),x); assert.ok(!used.has(x),'duplicate fixture '+x);used.add(x);return byId.get(x);});
 const state={rulesVersion:'1.0.0',version:0,playerIds:['A','B'],activePlayerIndex:0,phase:'PLACE',hands:[take(hand0),take(hand1)],lanes:[{},{}],discards:{},deck:[],justDiscardedId:null};
 for (const suit of SUITS) {state.lanes[0][suit]=take(lanes0[suit]??[]);state.lanes[1][suit]=take(lanes1[suit]??[]);state.discards[suit]=take(discards[suit]??[]);}
 const rest=cards.filter(c=>!used.has(c.id));
 for(let p=0;p<2;p++)while(state.hands[p].length<8)state.hands[p].push(rest.shift());
 state.deck=rest;assertInvariants(state);return state;
}

test('01 deck has 60 unique cards and 12 per suit',()=>{const d=deck();assert.equal(d.length,60);assert.equal(new Set(d.map(x=>x.id)).size,60);for(const s of SUITS)assert.equal(d.filter(x=>x.suit===s).length,12);});
test('02 support cards total 15',()=>assert.equal(deck().filter(x=>x.kind==='support').length,15));
test('03 setup gives 8 cards each and 44 in deck',()=>{const s=createInitialState({playerIds:['A','B'],deck:deck()});assert.equal(s.hands[0].length,8);assert.equal(s.hands[1].length,8);assert.equal(s.deck.length,44);});
test('04 empty expedition is zero',()=>assert.equal(scoreLane([]).total,0));
test('05 support-only expedition is -40',()=>assert.equal(scoreLane([S()]).total,-40));
test('06 three support-only cards give -80',()=>assert.equal(scoreLane([S(),S(),S()]).total,-80));
test('07 numeric 5,8,10 gives 3',()=>assert.equal(scoreLane([N(5),N(8),N(10)]).total,3));
test('08 negative score is multiplied',()=>assert.equal(scoreLane([S(),N(3),N(5),N(7)]).total,-10));
test('09 support counts toward eight and bonus is not multiplied',()=>assert.equal(scoreLane([S(),S(),...[2,3,5,7,8,10].map(N)]).total,65));
test('10 full color maximum is 156',()=>assert.equal(scoreLane([S(),S(),S(),...[2,3,4,5,6,7,8,9,10].map(N)]).total,156));
test('11 seven cards have no bonus',()=>assert.equal(scoreLane([S(),...[2,3,4,5,6,7].map(N)]).bonus,0));
test('12 supplied-photo score example totals 18',()=>{const s=fixture({lanes0:{aurora:[5,8,10].map(n=>id('aurora',n)),ember:[id('ember','s0')],tide:['s0',3,5,7].map(n=>id('tide',n)),moss:['s0','s1',2,3,5,7,8,10].map(n=>id('moss',n))}});assert.equal(scorePlayer(s,0).total,18);});
test('13 wrong turn is rejected',()=>throws(()=>applyCommand(fixture(),'B',command('STAR_DRAW_DECK')),'NOT_YOUR_TURN'));
test('14 unknown user rejected',()=>throws(()=>applyCommand(fixture(),'C',command('STAR_DRAW_DECK')),'NOT_MEMBER'));
test('15 play moves one card to lane and phase DRAW',()=>{const s=fixture({hand0:[id('aurora',2)]});const n=applyCommand(s,'A',command('STAR_PLAY',{cardId:id('aurora',2)}));assert.equal(n.phase,'DRAW');assert.equal(n.hands[0].length,7);assert.equal(n.lanes[0].aurora.at(-1).value,2);assert.equal(n.version,1);});
test('16 lower card cannot follow higher card',()=>{const s=fixture({hand0:[id('aurora',3)],lanes0:{aurora:[id('aurora',5)]}});throws(()=>applyCommand(s,'A',command('STAR_PLAY',{cardId:id('aurora',3)})),'LOWER_OR_EQUAL');});
test('17 support cannot follow numeric card',()=>{const s=fixture({hand0:[id('aurora','s0')],lanes0:{aurora:[id('aurora',2)]}});throws(()=>applyCommand(s,'A',command('STAR_PLAY',{cardId:id('aurora','s0')})),'SUPPORT_AFTER_NUMBER');});
test('18 support can follow support',()=>{const s=fixture({hand0:[id('aurora','s1')],lanes0:{aurora:[id('aurora','s0')]}});assert.equal(applyCommand(s,'A',command('STAR_PLAY',{cardId:id('aurora','s1')})).lanes[0].aurora.length,2);});
test('19 player must own card',()=>throws(()=>applyCommand(fixture(),'A',command('STAR_PLAY',{cardId:'not-owned'})),'CARD_NOT_OWNED'));
test('20 draw before play is rejected',()=>throws(()=>applyCommand(fixture(),'A',command('STAR_DRAW_DECK')),'WRONG_PHASE'));
test('21 cannot play again in DRAW',()=>{const s=fixture();const n=applyCommand(s,'A',command('STAR_DISCARD',{cardId:s.hands[0][0].id}));throws(()=>applyCommand(n,'A',command('STAR_PLAY',{cardId:n.hands[0][0].id})),'WRONG_PHASE');});
test('22 cannot take just discarded card',()=>{const s=fixture({hand0:[id('aurora',3)]});const n=applyCommand(s,'A',command('STAR_DISCARD',{cardId:id('aurora',3)}));throws(()=>applyCommand(n,'A',command('STAR_DRAW_DISCARD',{suit:'aurora'})),'JUST_DISCARDED');});
test('23 may take another discard top',()=>{const s=fixture({hand0:[id('aurora',3)],discards:{ember:[id('ember',9)]}});const n=applyCommand(s,'A',command('STAR_DISCARD',{cardId:id('aurora',3)}));const x=applyCommand(n,'A',command('STAR_DRAW_DISCARD',{suit:'ember'}));assert.ok(x.hands[0].some(c=>c.id===id('ember',9)));assert.equal(x.deck.length,s.deck.length);assert.equal(x.activePlayerIndex,1);});
test('24 empty discard rejected',()=>{const s=fixture();const n=applyCommand(s,'A',command('STAR_PLAY',{cardId:s.hands[0][0].id}));throws(()=>applyCommand(n,'A',command('STAR_DRAW_DISCARD',{suit:'dusk'})),'EMPTY_DISCARD');});
test('25 successful deck draw restores 8 and changes turn',()=>{const s=fixture();const n=applyCommand(s,'A',command('STAR_DISCARD',{cardId:s.hands[0][0].id}));const x=applyCommand(n,'A',command('STAR_DRAW_DECK'));assert.equal(x.hands[0].length,8);assert.equal(x.activePlayerIndex,1);assert.equal(x.deck.length,s.deck.length-1);assert.equal(x.justDiscardedId,null);});
test('26 last deck draw finishes immediately',()=>{let s=fixture();const move=s.deck.splice(0,s.deck.length-1);for(const suit of SUITS)s.lanes[1][suit]=move.filter(c=>c.suit===suit).sort((a,b)=>(a.value??0)-(b.value??0));assertInvariants(s);s=applyCommand(s,'A',command('STAR_DISCARD',{cardId:s.hands[0][0].id}));s=applyCommand(s,'A',command('STAR_DRAW_DECK'));assert.equal(s.phase,'FINISHED');assert.equal(s.deck.length,0);assert.equal(s.activePlayerIndex,0);assert.ok(getResult(s).winners.length);throws(()=>applyCommand(s,'A',command('STAR_DISCARD',{cardId:s.hands[0][0].id})),'GAME_FINISHED');});
test('27 scoring tie yields both winners',()=>{const s=fixture();for(const c of s.deck)s.discards[c.suit].push(c);s.deck=[];s.phase='FINISHED';assertInvariants(s);assert.deepEqual(getResult(s).winners,['A','B']);assert.equal(getResult(s).tied,true);});
test('28 result before finish rejected',()=>throws(()=>getResult(fixture()),'NOT_FINISHED'));
test('29 successful command does not mutate original',()=>{const s=fixture();const copy=structuredClone(s);applyCommand(s,'A',command('STAR_DISCARD',{cardId:s.hands[0][0].id}));assert.deepEqual(s,copy);});
test('30 rejected command does not mutate original',()=>{const s=fixture();const copy=structuredClone(s);throws(()=>applyCommand(s,'A',command('STAR_DRAW_DECK')),'WRONG_PHASE');assert.deepEqual(s,copy);});
test('31 view omits opponent hand and deck IDs',()=>{const s=fixture();const v=toPlayerView(s,'A');const str=JSON.stringify(v);for(const c of [...s.hands[1],...s.deck])assert.ok(!str.includes(c.id));assert.equal(v.yourHand.length,8);assert.equal(v.players[1].handCount,8);assert.ok(!('deck'in v));});
test('32 discard view only contains top and count',()=>{const s=fixture({discards:{dusk:[id('dusk',2),id('dusk',4)]}});const str=JSON.stringify(toPlayerView(s,'A'));assert.ok(!str.includes(id('dusk',2)));assert.equal(toPlayerView(s,'A').discards.dusk.top.id,id('dusk',4));});
test('33 mutating view cannot mutate server state',()=>{const s=fixture();const v=toPlayerView(s,'A');v.yourHand.pop();assert.equal(s.hands[0].length,8);});
test('34 outsider cannot get player view',()=>throws(()=>toPlayerView(fixture(),'C'),'NOT_MEMBER'));
test('35 shuffle preserves cards and original input',()=>{const d=deck();const n=shuffleDeck(d,()=>0);assert.deepEqual(new Set(n.map(c=>c.id)),new Set(d.map(c=>c.id)));assert.notDeepEqual(n,d);assert.deepEqual(d,deck());});
test('36 invalid RNG rejected',()=>throws(()=>shuffleDeck(deck(),m=>m),'INVALID_RNG'));
test('37 duplicate card identity rejected',()=>{const d=deck();d[1].id=d[0].id;throws(()=>validateCardSet(d),'DUPLICATE_OR_BAD_ID');});
test('38 corrupted hand size detected',()=>{const s=fixture();s.hands[0].pop();throws(()=>assertInvariants(s),'HAND_COUNT');});
test('39 server random adapter uses opaque distinct IDs',()=>{const s=createSecureGame(['A','B']);assertInvariants(s);assert.ok(s.hands[0].every(c=>!c.id.includes(c.suit)));});
test('40 100 seeded full games preserve invariants and terminate',()=>{
 let r=20261023; const rng=max=>{r=(Math.imul(r,1664525)+1013904223)>>>0;return r%max;};
 for(let game=0;game<100;game++){
  let s=createInitialState({playerIds:['A','B'],deck:shuffleDeck(deck(),rng),firstPlayerIndex:rng(2)});let steps=0;
  while(s.phase!=='FINISHED'){
   const actor=s.playerIds[s.activePlayerIndex];const choices=listLegalCommands(s,actor);
   const cmd=s.phase==='DRAW'?command('STAR_DRAW_DECK'):choices[rng(choices.length)];
   s=applyCommand(s,actor,cmd);assertInvariants(s);steps++;assert.ok(steps<=88);
  }
  assert.equal(steps,88);assert.equal(s.deck.length,0);assert.ok(getResult(s).winners.length>=1);
 }
});
