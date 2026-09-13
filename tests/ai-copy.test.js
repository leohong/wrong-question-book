import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_PROMPT,copyCardWithPrompt,copyPrompt,cardPng} from '../dist/ai-copy.js';
test('一次複製 PNG 圖片與辨識指令，圖片準備前已呼叫剪貼簿',async()=>{
 let item,closed=false,writeCalled=false;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{write(items){writeCalled=true;item=items[0];return Promise.resolve();},writeText(text){assert.equal(text,AI_PROMPT);return Promise.resolve();}}}});
 globalThis.ClipboardItem=class{constructor(data){this.data=data;}};
 globalThis.createImageBitmap=async()=>({width:20,height:10,close(){closed=true;}});
 globalThis.document={createElement(){return {getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback,type){callback(new Blob(['png'],{type}));}};}};
 await copyCardWithPrompt({question:'data:image/png;base64,YQ=='},'question');
 assert.ok(writeCalled);assert.equal((await item.data['image/png']).type,'image/png');
 assert.equal(await item.data['text/plain'].text(),AI_PROMPT);assert.ok(closed);
 await copyPrompt();assert.ok(AI_PROMPT.includes('是否需要解題'));
 await assert.rejects(cardPng({question:null},'question'),/沒有圖片/);
});
