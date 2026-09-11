import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {exportArchive,readBackup} from '../dist/backup.js';
import {createStorage} from '../dist/storage.js';
import {initialState} from '../dist/domain.js';
globalThis.indexedDB=indexedDB;
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
const card=id=>({id,title:'測試',category:'數學',question:photo,answer:photo,streak:2,stage:-1,due:null,attempts:2,mistakes:0,created:1000});
test('ZIP 共用照片只存一次，另一裝置可完整還原並重建備份',async()=>{
 const source=createStorage('zip-source');await source.load();const data=await source.save({...initialState(),cards:[card('a'),card('b')]});
 const zip=await exportArchive(data,()=>{},source.getImage);const backup=await readBackup(zip);
 assert.equal(backup.assets.size,1);assert.deepEqual(backup.data,data);
 const destination=createStorage('zip-destination');await destination.load();const result=await destination.save(backup.data,backup.assets);
 assert.deepEqual(result,data);assert.equal((await destination.getImage(data.cards[0].question)).size,68);
 await source.close();await destination.close();
});
test('舊 JSON 備份保持相容',async()=>{const data={...initialState(),cards:[card('old')]};assert.deepEqual((await readBackup(new Blob([JSON.stringify(data)]))).data,data);});
test('截斷的 ZIP 與錯誤圖片校驗不得覆寫資料',async()=>{
 const source=createStorage('zip-corrupt');await source.load();const data=await source.save({...initialState(),cards:[card('a')]});
 const zip=await exportArchive(data,()=>{},source.getImage);await assert.rejects(readBackup(zip.slice(0,zip.size-10)),/不完整/);
 const backup=await readBackup(zip);backup.assets.set(data.cards[0].question,new Blob(['bad'],{type:'image/png'}));
 await assert.rejects(source.save(backup.data,backup.assets),/校驗/);assert.deepEqual(await source.load(),data);await source.close();
});

test('題目答案共用一張原圖，獨立遮罩在 ZIP 還原後保留',async()=>{
 const source=createStorage('mask-source');await source.load();
 const mask={version:1,width:100,height:100,strokes:[{size:10,points:[{x:20,y:30},{x:40,y:50}]}]};
 const data=await source.save({...initialState(),cards:[{...card('mask'),questionOriginal:photo,questionMask:mask,answerMask:{...mask,strokes:[]}}]});
 assert.equal(data.cards[0].question,data.cards[0].answer);assert.equal(data.cards[0].question,data.cards[0].questionOriginal);
 const backup=await readBackup(await exportArchive(data,()=>{},source.getImage));assert.equal(backup.assets.size,1);assert.deepEqual(backup.data.cards[0].questionMask,mask);
 const dest=createStorage('mask-dest');await dest.load();await dest.save(backup.data,backup.assets);const loaded=await dest.load();assert.deepEqual(loaded.cards[0].questionMask,mask);assert.deepEqual(loaded.cards[0].answerMask.strokes,[]);
 await source.close();await dest.close();
});
