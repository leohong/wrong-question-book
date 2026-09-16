import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_PROMPT,copyCardImage,copyPrompt,shareCardWithPrompt,cardPng} from '../dist/ai-copy.js';
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
 assert.ok(AI_PROMPT.includes('標示 ??，不要猜測'));
 assert.ok(AI_PROMPT.includes('觀念思考與速解步驟'));
 await assert.rejects(cardPng({question:null},'question'),/沒有圖片/);
});
test('系統分享同時帶入 PNG 檔案與 AI 指令',async()=>{
 let payload;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{canShare:({files})=>files?.[0]?.type==='image/png',share:value=>{payload=value;return Promise.resolve();}}});
 globalThis.File=class extends Blob{constructor(parts,name,options){super(parts,options);this.name=name;}};
 globalThis.createImageBitmap=async()=>({width:20,height:10,close(){}});
 globalThis.document={createElement(){return {getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback,type){callback(new Blob(['png'],{type}));}};}};
 await shareCardWithPrompt({question:'data:image/png;base64,YQ=='},'question');
 assert.equal(payload.text,AI_PROMPT);assert.equal(payload.files[0].name,'題目.png');assert.equal(payload.files[0].type,'image/png');
});

test('複製與分享可使用設定中的自訂辨識指令',async()=>{
 let copied='',shared='';
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText(text){copied=text;return Promise.resolve();}},share(payload){shared=payload.text;return Promise.resolve();},canShare(){return true;}}});
 globalThis.File=class extends Blob{constructor(parts,name,options){super(parts,options);this.name=name;}};
 globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
 const canvas={width:0,height:0,getContext(){return{fillRect(){},drawImage(){}};},toBlob(done){done(new Blob(['x'],{type:'image/png'}));}};
 globalThis.document={createElement(){return canvas;}};
 const card={question:'data:image/png;base64,eA=='};
 await copyPrompt('自訂指令');await shareCardWithPrompt(card,'question','自訂指令');
 assert.equal(copied,'自訂指令');assert.equal(shared,'自訂指令');
});
