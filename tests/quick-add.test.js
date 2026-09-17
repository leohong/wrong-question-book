import test from 'node:test';
import assert from 'node:assert/strict';
import {createCardService} from '../dist/application/card-service.js';

function serviceFor(state){
  let current=state;
  const service=createCardService({getState:()=>current,commit:async next=>{current=next;},randomUUID:()=> 'card-1',now:()=>123});
  return service;
}

test('quick card uses one original image for question and answer',async()=>{
  const image='data:image/webp;base64,AAAA',mask={version:1,width:800,height:600,strokes:[]};
  const state={categories:['數學'],cards:[]};
  const card=await serviceFor(state).save({category:'數學',question:image,questionOriginal:image,questionMask:mask,answer:image,answerMask:mask,answerText:''});
  assert.equal(card.title,'數學錯題 1');
  assert.equal(card.question,card.answer);
  assert.equal(card.questionOriginal,image);
  assert.equal(card.created,123);
});

test('quick card can be saved without an answer',async()=>{
  const card=await serviceFor({categories:['自然'],cards:[{}]}).save({category:'自然',question:'data:image/jpeg;base64,AA',answer:null,answerText:''});
  assert.equal(card.title,'自然錯題 2');
  assert.equal(card.answer,null);
  assert.equal(card.stage,-1);
});
