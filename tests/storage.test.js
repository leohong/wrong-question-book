import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBObjectStore} from 'fake-indexeddb';
import {createStorage} from '../dist/storage.js';
import {initialState,grade,validateBackup} from '../dist/domain.js';
globalThis.indexedDB=indexedDB;
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
const card=id=>({id,title:'測試',category:'數學',question:photo,answer:photo,streak:0,stage:-1,due:null,attempts:0,mistakes:0,created:1000});
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function raw(name,store){const db=await request(indexedDB.open(name,2));try{return await request(db.transaction(store).objectStore(store).getAll());}finally{db.close();}}
test('舊題庫原子遷移成 Blob，保留照片配對、分類與進度，備份仍可還原',async()=>{
 const name='migration',legacy={...initialState(),cards:[card('a'),card('b')]};
 const open=indexedDB.open(name,1);open.onupgradeneeded=()=>open.result.createObjectStore('book');const old=await request(open);
 await request(old.transaction('book','readwrite').objectStore('book').put({revision:9,data:legacy},'state'));old.close();
 const store=createStorage(name);const data=await store.load();
 assert.match(data.cards[0].question,/^image:/);assert.equal(data.cards[0].question,data.cards[1].answer);
 const images=await raw(name,'images');assert.equal(images.length,1);assert.ok(images[0] instanceof Blob);
 assert.equal((await raw(name,'book')).length,0);
 const backup=JSON.parse(await(await store.exportBackup(data)).text());assert.deepEqual(validateBackup(backup),legacy);await store.close();
});
test('千題共用照片只存一份，答一題只寫一題一筆紀錄，不寫照片',async()=>{
 const store=createStorage('large');await store.load();let data=await store.save({...initialState(),cards:Array.from({length:1000},(_,i)=>card(String(i)))});
 assert.equal((await raw('large','images')).length,1);
 const writes=[];const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){writes.push(this.name);return original.apply(this,args);};
 try{data=await store.save({...data,cards:data.cards.map((c,i)=>i===0?grade(c,true,3):c),history:[{cardId:'0',category:'數學',correct:true,at:1000}]});}finally{IDBObjectStore.prototype.put=original;}
 assert.deepEqual(writes.sort(),['questions','reviewLogs','settings']);assert.equal(data.cards[0].streak,1);await store.close();
});
test('共用照片最後一題刪除後才清理，重置也清除紀錄',async()=>{
 const store=createStorage('cleanup');await store.load();let data=await store.save({...initialState(),cards:[card('a'),card('b')]});
 data=await store.save({...data,cards:data.cards.slice(1)});assert.equal((await raw('cleanup','images')).length,1);
 await store.save(initialState());assert.equal((await raw('cleanup','images')).length,0);assert.equal((await raw('cleanup','questions')).length,0);await store.close();
});
test('舊分頁不可覆寫另一分頁的更新，失敗不寫入新圖片',async()=>{
 const a=createStorage('tabs'),b=createStorage('tabs');await a.load();await b.load();await a.save({...initialState(),cards:[card('a')]});
 await assert.rejects(b.save({...initialState(),cards:[card('b')]}),/其他分頁/);
 assert.equal((await raw('tabs','questions'))[0].id,'a');assert.equal((await raw('tabs','images')).length,1);await a.close();await b.close();
});
test('格式錯誤的舊資料不刪除，遷移可安全重試',async()=>{
 const name='bad';const open=indexedDB.open(name,1);open.onupgradeneeded=()=>open.result.createObjectStore('book');const old=await request(open);
 await request(old.transaction('book','readwrite').objectStore('book').put({data:{...initialState(),cards:[{...card('x'),question:'broken'}]}},'state'));old.close();
 const store=createStorage(name);await assert.rejects(store.load());assert.equal((await raw(name,'book')).length,1);assert.equal((await raw(name,'images')).length,0);await store.close();
});
test('遷移交易中止時保留原始題庫，下一次可重試成功',async()=>{
 const name='migration-abort',data={...initialState(),cards:[card('a')]};
 const open=indexedDB.open(name,1);open.onupgradeneeded=()=>open.result.createObjectStore('book');const old=await request(open);
 await request(old.transaction('book','readwrite').objectStore('book').put({revision:1,data},'state'));old.close();
 const store=createStorage(name),original=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(...args){const result=original.apply(this,args);if(this.name==='settings')this.transaction.abort();return result;};
 try{await assert.rejects(store.load(),error=>{assert.deepEqual(error.legacyBackup,data);return true;});}finally{IDBObjectStore.prototype.put=original;}
 assert.equal((await raw(name,'book')).length,1);assert.equal((await raw(name,'images')).length,0);
 assert.equal((await store.load()).cards.length,1);assert.equal((await raw(name,'book')).length,0);await store.close();
});
