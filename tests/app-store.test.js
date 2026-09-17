import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppStore} from '../dist/application/app-store.js';

const initial=()=>({cards:[],target:3});

test('app store initializes saved state and commits the storage result',async()=>{
  const loaded={cards:[{id:'1'}],target:4},persisted={cards:[{id:'2'}],target:5};
  let assetsSeen;
  const store=createAppStore({createInitialState:initial,loadState:async()=>loaded,saveState:async(_next,assets)=>{assetsSeen=assets;return persisted;}});
  assert.equal(store.getState().target,3);
  assert.deepEqual(await store.initialize(),{state:loaded,saved:true});
  const assets=new Map();
  assert.equal(await store.commit({...loaded,target:5},assets),persisted);
  assert.equal(store.getState(),persisted);
  assert.equal(assetsSeen,assets);
});

test('app store retains current state after failure and blocks overlapping writes',async()=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  const store=createAppStore({createInitialState:initial,loadState:async()=>null,saveState:async next=>{await pending;return next;}});
  await store.initialize();
  const first=store.commit({cards:[],target:4});
  assert.equal(store.busy,true);
  await assert.rejects(()=>store.commit({cards:[],target:5}),/正在儲存/);
  assert.equal(store.getState().target,3);
  release();await first;
  assert.equal(store.getState().target,4);
});

test('app store write guard prevents mutations during an external critical section',async()=>{
  const store=createAppStore({createInitialState:initial,loadState:async()=>null,saveState:async next=>next});
  store.setWriteGuard(()=> '備份處理中，請完成後再修改題庫。');
  await assert.rejects(()=>store.commit({cards:[],target:4}),/備份處理中/);
  assert.equal(store.getState().target,3);
});
