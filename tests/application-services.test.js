import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,DAY} from '../dist/domain.js';
import {createCardService} from '../dist/application/card-service.js';
import {createCategoryService} from '../dist/application/category-service.js';
import {createPracticeService} from '../dist/application/practice-service.js';
import {createSettingsService} from '../dist/application/settings-service.js';

function harness(seed=initialState()){
  let state=structuredClone(seed),assetsSeen;
  const commit=async(next,assets)=>{state=next;assetsSeen=assets;};
  return {getState:()=>state,commit,get assets(){return assetsSeen;}};
}

test('card service creates, updates, and removes cards with stable study fields',async()=>{
  const store=harness(),service=createCardService({getState:store.getState,commit:store.commit,randomUUID:()=> 'card-1',now:()=>123});
  const created=await service.save({category:'數學',question:null,questionText:'  1 + 1 = ?  ',answer:null,answerText:' 2 '});
  assert.equal(created.id,'card-1');
  assert.equal(created.title,'數學錯題 1');
  assert.equal(created.questionText,'1 + 1 = ?');
  assert.equal(created.answerText,'2');
  assert.equal(created.stage,-1);
  const updated=await service.save({...created,title:' 新名稱 ',answerText:'  兩  '},{existingId:'card-1'});
  assert.equal(updated.title,'新名稱');
  assert.equal(updated.created,123);
  assert.equal(store.getState().cards.length,1);
  await service.remove('card-1');
  assert.equal(store.getState().cards.length,0);
});

test('category service keeps cards and history aligned when renaming',async()=>{
  const seed={...initialState(),cards:[{id:'1',category:'數學'}],history:[{cardId:'1',category:'數學',correct:false,at:1}]};
  const store=harness(seed),service=createCategoryService({getState:store.getState,commit:store.commit});
  await service.rename('數學',' 數學加強 ');
  assert.ok(store.getState().categories.includes('數學加強'));
  assert.equal(store.getState().cards[0].category,'數學加強');
  assert.equal(store.getState().history[0].category,'數學加強');
  await service.add('地理');
  await service.remove('地理');
  assert.ok(!store.getState().categories.includes('地理'));
});

test('practice service selects eligible cards and records one answer atomically',async()=>{
  const card={id:'q1',title:'題目',category:'自然',question:null,questionText:'題目',answer:null,answerText:'答案',streak:0,stage:-1,due:null,attempts:0,mistakes:0,created:1};
  const store=harness({...initialState(),cards:[card]}),service=createPracticeService({getState:store.getState,commit:store.commit,now:()=>1000,random:()=>0});
  assert.deepEqual(service.createSession('自然','recommended',20),{ids:['q1']});
  await service.recordAnswer('q1',true);
  assert.equal(store.getState().cards[0].streak,1);
  assert.deepEqual(store.getState().history[0],{cardId:'q1',category:'自然',correct:true,at:1000});
  const mastered=harness({...store.getState(),target:2}),masteryService=createPracticeService({getState:mastered.getState,commit:mastered.commit,now:()=>2000});
  await masteryService.recordAnswer('q1',true);
  assert.equal(mastered.getState().cards[0].due,2000+DAY);
});

test('settings service validates preferences and passes imported assets to storage',async()=>{
  const store=harness(),service=createSettingsService({getState:store.getState,commit:store.commit});
  await service.setTarget('5');
  await service.setAiPrompt('  自訂指令  ');
  assert.equal(store.getState().target,5);
  assert.equal(store.getState().aiPrompt,'自訂指令');
  await assert.rejects(()=>service.setTarget(0),/1 到 10/);
  const replacement={...initialState(),categories:['物理']},assets=new Map([['image:test',new Blob()]]);
  await service.replace(replacement,assets);
  assert.equal(store.getState(),replacement);
  assert.equal(store.assets,assets);
});
