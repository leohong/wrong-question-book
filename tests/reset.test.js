import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {initialState} from '../dist/domain.js';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const resetCode=source.slice(source.indexOf('function addResetControl(){'),source.indexOf('function dialog('));
function setup(fail=false){
 const nodes=new Map();const get=s=>{if(!nodes.has(s))nodes.set(s,{value:'',disabled:true,append(){},click(){this.onclick?.();}});return nodes.get(s);};
 const context={document:{createElement:()=>({})},$:get,state:{cards:[{}],history:[{}]},filter:'數學',statusFilter:'missing',session:{},initialState,safely:f=>f,dialog(){},modal:{close(){context.closed=true;}},render(){context.rendered=true;},toast(){},async commit(next){if(fail)throw Error('storage failed');context.state=next;context.writes++;},writes:0};
 vm.createContext(context);vm.runInContext(resetCode+';addResetControl();',context);get('#reset-database').onclick();return{context,get};
}
test('取消或未輸入確認文字不會清除，確認後恢復預設資料',async()=>{
 const {context:c,get}=setup();get('#cancel-reset').onclick();assert.equal(c.writes,0);
 await assert.rejects(get('#confirm-reset').onclick());assert.equal(c.writes,0);
 get('#reset-confirmation').value='重置';await get('#confirm-reset').onclick();
 assert.deepEqual(c.state,initialState());assert.equal(c.writes,1);assert.equal(c.filter,'');assert.equal(c.session,null);assert.equal(c.rendered,true);
});
test('重置儲存失敗時保留原資料與篩選狀態',async()=>{
 const {context:c,get}=setup(true);get('#reset-confirmation').value='重置';
 await assert.rejects(get('#confirm-reset').onclick(),/storage failed/);assert.equal(c.state.cards.length,1);assert.equal(c.filter,'數學');assert.equal(c.rendered,undefined);
});
