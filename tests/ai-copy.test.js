import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_PROMPT,copyCardImage,copyCardWithPrompt,copyPrompt,cardPng} from '../dist/ai-copy.js';
test('分開複製 PNG 圖片與辨識指令，圖片準備前已呼叫剪貼簿',async()=>{
 let item,closed=false,writeCalled=false;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{write(items){writeCalled=true;item=items[0];return Promise.resolve();},writeText(text){assert.equal(text,AI_PROMPT);return Promise.resolve();}}}});
 globalThis.ClipboardItem=class{constructor(data){this.data=data;}};
 globalThis.createImageBitmap=async()=>({width:20,height:10,close(){closed=true;}});
 globalThis.document={createElement(){return {getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback,type){callback(new Blob(['png'],{type}));}};}};
 await copyCardImage({question:'data:image/png;base64,YQ=='},'question');
 assert.ok(writeCalled);assert.equal((await item.data['image/png']).type,'image/png');
 assert.equal(item.data['text/plain'],undefined);assert.ok(closed);
 await copyPrompt();assert.ok(AI_PROMPT.includes('是否需要解題'));
 assert.ok(AI_PROMPT.includes('保留原本題目解答順序與位置'));
 assert.ok(AI_PROMPT.includes('公式用 LaTeX格式'));
 assert.ok(AI_PROMPT.includes('標示???，不要猜測'));
 assert.ok(AI_PROMPT.includes('觀念思考與速解步驟'));
 await assert.rejects(cardPng({question:null},'question'),/沒有圖片/);
});
test('全部複製會在同一個 ClipboardItem 放入 PNG 與 AI 指令',async()=>{
 let item;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{write(items){item=items[0];return Promise.resolve();}}}});
 globalThis.ClipboardItem=class{constructor(data){this.data=data;}};
 globalThis.createImageBitmap=async()=>({width:20,height:10,close(){}});
 globalThis.document={createElement(){return {getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback,type){callback(new Blob(['png'],{type}));}};}};
 await copyCardWithPrompt({question:'data:image/png;base64,YQ=='},'question');
 assert.equal((await item.data['image/png']).type,'image/png');
 assert.equal(await item.data['text/plain'].text(),AI_PROMPT);
});

test('分開複製與全部複製可使用設定中的自訂辨識指令',async()=>{
 let copied='',item;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText(text){copied=text;return Promise.resolve();},write(items){item=items[0];return Promise.resolve();}}}});
 globalThis.ClipboardItem=class{constructor(data){this.data=data;}};
 globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
 const canvas={width:0,height:0,getContext(){return{fillRect(){},drawImage(){}};},toBlob(done){done(new Blob(['x'],{type:'image/png'}));}};
 globalThis.document={createElement(){return canvas;}};
 const card={question:'data:image/png;base64,eA=='};
 await copyPrompt('自訂指令');await copyCardWithPrompt(card,'question','自訂指令');
 assert.equal(copied,'自訂指令');assert.equal(await item.data['text/plain'].text(),'自訂指令');
});
