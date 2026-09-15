import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQuickCard} from '../dist/quick-add.js';

test('quick card uses one original image for question and answer',()=>{
  const image='data:image/webp;base64,AAAA',mask={version:1,width:800,height:600,strokes:[]};
  const state={categories:['數學'],cards:[]};
  const card=buildQuickCard(state,{category:'數學',question:image,questionOriginal:image,questionMask:mask,answer:image,answerMask:mask,answerText:''},{id:'card-1',now:123});
  assert.equal(card.title,'數學錯題 1');
  assert.equal(card.question,card.answer);
  assert.equal(card.questionOriginal,image);
  assert.equal(card.created,123);
});

test('quick card can be saved without an answer',()=>{
  const card=buildQuickCard({categories:['自然'],cards:[{}]},{category:'自然',question:'data:image/jpeg;base64,AA',answer:null,answerText:''},{id:'card-2',now:456});
  assert.equal(card.title,'自然錯題 2');
  assert.equal(card.answer,null);
  assert.equal(card.stage,-1);
});
