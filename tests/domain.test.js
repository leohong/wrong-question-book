import test from 'node:test';
import assert from 'node:assert/strict';
import {grade,eligible,shuffled,validateBackup,initialState,currentAiPrompt,DEFAULT_AI_PROMPT,DAY} from '../dist/domain.js';
const base=()=>({id:'one',title:'題目',category:'數學',question:'data:image/jpeg;base64,YQ==',answer:'data:image/jpeg;base64,YQ==',streak:0,stage:-1,due:null,attempts:0,mistakes:0,created:1000});
test('連續答對才進入間隔複習，所有階段答錯都重置',()=>{let c=base();c=grade(c,true,3,1000);assert.equal(c.streak,1);c=grade(c,false,3,1000);assert.equal(c.streak,0);assert.equal(c.mistakes,1);for(let i=0;i<3;i++)c=grade(c,true,3,1000);assert.equal(c.stage,0);assert.equal(c.due,1000+DAY);for(const interval of [3,7,14,30,30]){c=grade(c,true,3,c.due);assert.equal(c.due%DAY,1000);assert.equal(c.due>1000,true);assert.equal([1,3,7,14,30][c.stage],interval);}c=grade(c,false,3,2000);assert.equal(c.stage,-1);assert.equal(c.streak,0);assert.equal(c.due,null);assert.equal(c.mistakes,2);});
test('不出沒有答案或未到期的題目，全部範圍可提前練習',()=>{const cards=[base(),{...base(),id:'missing',answer:null},{...base(),id:'future',stage:0,due:2000},{...base(),id:'due',stage:0,due:500}];assert.deepEqual(eligible(cards,'','recommended',1000).map(c=>c.id),['one','due']);assert.deepEqual(eligible(cards,'','due',1000).map(c=>c.id),['due']);assert.equal(eligible(cards,'','all',1000).length,3);assert.equal(eligible(cards,'國文','all',1000).length,0);assert.equal(new Set(shuffled(cards).map(c=>c.id)).size,cards.length);});
test('備份保留照片與進度，拒絕格式錯誤、重複 ID 和不安全的圖片',()=>{const data={...initialState(),cards:[base()]};assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(data))),data);assert.throws(()=>validateBackup({...data,version:2}));assert.throws(()=>validateBackup({...data,cards:[base(),base()]}));assert.throws(()=>validateBackup({...data,cards:[{...base(),question:'javascript:alert(1)'}]}));assert.throws(()=>validateBackup({...data,cards:[{...base(),stage:7}]}));assert.throws(()=>validateBackup({...data,target:0}));assert.throws(()=>validateBackup({...data,history:[{cardId:'one',correct:true,at:1}]}));});
test('AI 辨識指令可隨備份保存且不得空白',()=>{const data={...initialState(),aiPrompt:'我的辨識指令'};assert.equal(validateBackup(data).aiPrompt,'我的辨識指令');assert.throws(()=>validateBackup({...data,aiPrompt:'  '}));});
test('章節可隨備份保存且舊備份不需要章節欄位',()=>{
 const data={...initialState(),cards:[{...base(),chapter:'  一元二次方程式  '}]};
 assert.equal(validateBackup(data).cards[0].chapter,'一元二次方程式');
 assert.equal(validateBackup({...data,cards:[base()]}).cards[0].chapter,undefined);
 assert.throws(()=>validateBackup({...data,cards:[{...base(),chapter:'x'.repeat(61)}]}));
});
test('舊版預設辨識指令自動更新，自訂指令維持不變',()=>{
 const previous='忽略手寫筆跡、作答、圈選與塗改，將印刷題目、選項、公式及圖表資訊辨識為文字，保留原本順序。公式用 LaTeX，以 $...$ 包住；選項各占一行。遮住或不確定的內容標示 ??，不要猜測。\n\n先不解題，最後詢問：「是否需要解題並提供觀念思考與速解步驟？」';
 assert.equal(currentAiPrompt(previous),DEFAULT_AI_PROMPT);
 assert.equal(currentAiPrompt('我的辨識指令'),'我的辨識指令');
});
test('不同熟練門檻在下次作答生效，原始卡片不被改動',()=>{const c=base();assert.equal(grade(c,true,1,0).stage,0);assert.equal(c.streak,0);assert.equal(grade({...c,streak:3},true,2,0).stage,0);});

 test('文字答案可參與練習且備份保留，空白與無效文字不接受',()=>{
 const card={...base(),answer:null,answerText:'B\n解題步驟：先移項。'};
 const data={...initialState(),cards:[card]};
 assert.deepEqual(eligible([card],'','recommended',1000),[card]);
 assert.equal(eligible([{...card,answerText:'  \n '}],'','all').length,0);
 assert.deepEqual(validateBackup(data),data);
 assert.throws(()=>validateBackup({...data,cards:[{...card,answerText:123}]}));
 assert.throws(()=>validateBackup({...data,cards:[{...card,answerText:'a'.repeat(10001)}]}));
 });

test('純文字題目備份相容，空白題目與無效文字拒絕',()=>{
 const card={...base(),question:null,questionText:'計算 $x+1$'};
 const data={...initialState(),cards:[card]};
 assert.deepEqual(validateBackup(data),data);
 for(const questionText of ['', '  ', 123, 'x'.repeat(10001)])assert.throws(()=>validateBackup({...data,cards:[{...card,questionText}]}));
});
