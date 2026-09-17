import test from 'node:test';
import assert from 'node:assert/strict';
import {examPool,selectExamCards,paginateExamCards,examImageFilter,examZoom} from '../dist/exam.js';

const cards=[
  {id:'a',category:'數學',answer:'image:a',stage:-1,due:null},
  {id:'b',category:'數學',answerText:'B',stage:0,due:100},
  {id:'c',category:'英文',answer:'image:c',stage:0,due:999},
  {id:'d',category:'數學',answer:null,answerText:'',stage:-1,due:null}
];

test('考卷包含無答案題目並依分類與狀態篩選',()=>{
  assert.deepEqual(examPool(cards,'數學','all',500).map(card=>card.id),['a','b','d']);
  assert.deepEqual(examPool(cards,'','learning',500).map(card=>card.id),['a','d']);
  assert.deepEqual(examPool(cards,'','due',500).map(card=>card.id),['b']);
});

test('隨機組卷不重複並限制題數',()=>{
  const selected=selectExamCards(cards,{scope:'all',count:2,random:()=>0,now:500});
  assert.equal(selected.length,2);
  assert.equal(new Set(selected.map(card=>card.id)).size,2);
  assert.throws(()=>selectExamCards(cards,{count:0}),/1 到 200/);
});

test('雙欄考卷每頁最多十題',()=>{
  const source=Array.from({length:23},(_,index)=>({id:index})),pages=paginateExamCards(source);
  assert.deepEqual(pages.map(page=>page.length),[10,10,3]);
  assert.deepEqual(pages.flat(),source);
});

test('列印圖片模式可保留原圖或產生不同強度的黑白濾鏡',()=>{
  assert.equal(examImageFilter('original',100,100),'none');
  assert.match(examImageFilter('document',35,45),/^grayscale\(1\).*contrast\(/);
  assert.notEqual(examImageFilter('document',35,45),examImageFilter('high-contrast',35,45));
  assert.equal(examImageFilter('document',-20,200),examImageFilter('document',0,100));
});

test('考卷預覽縮放限制在可閱讀範圍',()=>{
  assert.equal(examZoom(.1),.3);
  assert.equal(examZoom(.85),.85);
  assert.equal(examZoom(2),1.6);
});
