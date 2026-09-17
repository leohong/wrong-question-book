import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initialState} from '../dist/domain.js';
import {createSettingsPage} from '../dist/pages/settings-page.js';
import {createSettingsService} from '../dist/application/settings-service.js';

function setup(fail=false){
  const dom=new JSDOM('<main id="main"></main><dialog id="modal"></dialog>');
  globalThis.document=dom.window.document;
  Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true,writable:true});
  const root=document.querySelector('#main'),modal=document.querySelector('#modal');
  modal.close=()=>{};
  let state={...initialState(),cards:[{id:'one'}],history:[{cardId:'one'}]},writes=0,rendered=0;
  const commit=async next=>{if(fail)throw Error('storage failed');state=next;writes++;};
  const page=createSettingsPage({
    getState:()=>state,
    getRoot:()=>root,
    categoryService:{add:async()=>{},rename:async()=>{},remove:async()=>{}},
    settingsService:createSettingsService({getState:()=>state,commit}),
    dialog(_title,body){modal.innerHTML=body;},
    modal,
    toast(){},
    safely:fn=>fn,
    onCategoryRenamed(){},
    onCategoryRemoved(){},
    onDataReplaced(){rendered++;}
  });
  page.render();
  root.querySelector('#reset-database').onclick();
  return {root,modal,get state(){return state;},get writes(){return writes;},get rendered(){return rendered;}};
}

test('取消或未輸入確認文字不會清除，確認後恢復預設資料',async()=>{
  const context=setup();
  context.modal.querySelector('#cancel-reset').onclick();
  assert.equal(context.writes,0);
  await assert.rejects(context.modal.querySelector('#confirm-reset').onclick());
  assert.equal(context.writes,0);
  context.modal.querySelector('#reset-confirmation').value='重置';
  await context.modal.querySelector('#confirm-reset').onclick();
  assert.deepEqual(context.state,initialState());
  assert.equal(context.writes,1);
  assert.equal(context.rendered,1);
});

test('重置儲存失敗時保留原資料與畫面狀態',async()=>{
  const context=setup(true);
  context.modal.querySelector('#reset-confirmation').value='重置';
  await assert.rejects(context.modal.querySelector('#confirm-reset').onclick(),/storage failed/);
  assert.equal(context.state.cards.length,1);
  assert.equal(context.rendered,0);
});
