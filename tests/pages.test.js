import test from 'node:test';
import assert from 'node:assert/strict';
import {cardStatus,chaptersFor} from '../dist/pages/library-page.js';
import {cardCounts} from '../dist/pages/statistics-page.js';
import {esc} from '../dist/ui.js';

const card=(overrides={})=>({answer:'image:test',answerText:'',stage:-1,due:null,...overrides});

test('頁面共用的卡片狀態與統計採相同規則',()=>{
  const state={cards:[
    card({answer:null}),
    card(),
    card({stage:0,due:500}),
    card({stage:0,due:2000})
  ]};
  assert.equal(cardStatus(state.cards[0],1000),'待補答案');
  assert.equal(cardStatus(state.cards[1],1000),'待熟練');
  assert.equal(cardStatus(state.cards[2],1000),'今日待複習');
  assert.equal(cardStatus(state.cards[3],1000),'間隔複習中');
  assert.deepEqual(cardCounts(state,1000),{total:4,learning:2,spaced:2,due:1});
});

test('共用 HTML escaping 防止頁面模板插入標記',()=>{
  assert.equal(esc('<img src="x"> & test'), '&lt;img src=&quot;x&quot;&gt; &amp; test');
});

test('題庫章節依科目整理並去除重複',()=>{
  const cards=[{category:'數學',chapter:'幾何'},{category:'數學',chapter:'代數'},{category:'數學',chapter:'代數'},{category:'英文',chapter:'閱讀'},{category:'數學'}];
  assert.deepEqual(chaptersFor(cards,'數學'),['代數','幾何']);
  assert.deepEqual(chaptersFor(cards),['代數','幾何','閱讀']);
});
