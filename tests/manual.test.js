import test from 'node:test';
import assert from 'node:assert/strict';
import {MANUAL_VERSION,needsManual,acknowledgeManual,manualContent} from '../dist/manual.js';
test('首次與舊版本顯示說明，閱讀後同版本不再顯示',()=>{
 let value=null;const storage={getItem(){return value;},setItem(key,next){value=next;}};
 assert.equal(needsManual(storage),true);acknowledgeManual(storage);
 assert.equal(value,MANUAL_VERSION);assert.equal(needsManual(storage),false);
 value='old-version';assert.equal(needsManual(storage),true);
});
test('閱讀狀態無法儲存時仍可查看說明',()=>{
 const storage={getItem(){throw Error();},setItem(){throw Error();}};
 assert.equal(needsManual(storage),true);assert.equal(acknowledgeManual(storage),false);
});
test('說明包含快速新增、考卷、Markdown、AI 分享與資料管理',()=>{
 const content=manualContent();
 for(const text of ['快速新增','使用題目原圖','Markdown','分享圖片＋指令','自動產生考卷','間隔複習','重置資料庫'])assert.ok(content.includes(text));
});
