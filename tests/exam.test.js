import test from 'node:test';
import assert from 'node:assert/strict';
import {examPool,selectExamCards,paginateExamCards,examImageFilter,examZoom,practiceMatch,recommendedExamCards} from '../dist/exam.js';

const cards=[
  {id:'a',category:'數學',chapter:'代數',answer:'image:a',stage:-1,due:null},
  {id:'b',category:'數學',chapter:'幾何',answerText:'B',stage:0,due:100},
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

test('考卷可依一個或多個章節篩選',()=>{
  assert.deepEqual(examPool(cards,'數學','all',500,['代數']).map(card=>card.id),['a']);
  assert.deepEqual(selectExamCards(cards,{category:'數學',chapters:['幾何'],count:10,random:()=>0}).map(card=>card.id),['b']);
  assert.deepEqual(examPool(cards,'數學','all',500,['']).map(card=>card.id),['d']);
});

test('練習狀態可快速篩選，推薦題優先到期與常錯題',()=>{
  assert.equal(practiceMatch({attempts:0,mistakes:0},'unseen'),true);
  assert.equal(practiceMatch({attempts:2,mistakes:1},'low'),true);
  assert.equal(practiceMatch({attempts:5,mistakes:2},'frequent'),true);
  const source=[{id:'normal',attempts:3,mistakes:0,stage:-1},{id:'due',attempts:4,mistakes:0,stage:0,due:1},{id:'wrong',attempts:2,mistakes:3,stage:-1}];
  assert.equal(recommendedExamCards(source,1,()=>0,100)[0].id,'due');
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
