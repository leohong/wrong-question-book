import {Zip,ZipPassThrough,Unzip,UnzipInflate} from './vendor/fflate.js';
import {validateBackup} from './domain.js';
import {getImage} from './storage.js';
import {isImageRef} from './media.js';

const MAX=512*1024*1024,MAX_META=32*1024*1024;
const encoder=new TextEncoder();
export async function exportArchive(data,onProgress=()=>{},readImage=getImage){
 const chunks=[];let error,total=0;
 const zip=new Zip((err,chunk)=>{if(err){error=err;return;}total+=chunk.length;if(total>MAX){error=Error('備份超過單次 512 MB 上限，請分批整理題庫。');return;}chunks.push(chunk);});
 async function add(name,blob){
  const entry=new ZipPassThrough(name);zip.add(entry);
  const reader=blob.stream().getReader();
  try{while(true){const {value,done}=await reader.read();if(done)break;entry.push(value,false);if(error)throw error;}entry.push(new Uint8Array(),true);if(error)throw error;}finally{await reader.cancel();}
 }
 const ids=[...new Set(data.cards.flatMap(c=>[c.question,c.answer,c.questionOriginal]).filter(Boolean))];
 if(ids.some(id=>!isImageRef(id)))throw Error('請先儲存題庫後再備份。');
 const images={};
 // Determine MIME types while copying each image, with no thumbnail duplication.
 for(let i=0;i<ids.length;i++){
  const id=ids[i],blob=await readImage(id);images[id]=blob.type;
  await add(`images/${id.slice(6)}`,blob);onProgress(i+1,ids.length);
 }
 const metadata=new Blob([JSON.stringify({format:'shiti',version:2,data,images})],{type:'application/json'});
 if(metadata.size>MAX_META)throw Error('題庫紀錄過大，超過備份資料上限。');
 await add('manifest.json',metadata);zip.end();if(error)throw error;
 return new Blob(chunks,{type:'application/zip'});
}
export async function readArchive(file,onProgress=()=>{}){
 if(file.size>MAX)throw Error('ZIP 備份超過單次 512 MB 上限。');
 // A missing central directory usually means the download was truncated.
 const tail=new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer());
 let end=-1;for(let i=tail.length-22;i>=0;i--)if(tail[i]===80&&tail[i+1]===75&&tail[i+2]===5&&tail[i+3]===6){const v=new DataView(tail.buffer);if(i+22+v.getUint16(i+20,true)===tail.length){end=i;break;}}
 if(end<0)throw Error('備份 ZIP 不完整，請重新匯出。');
 const eocd=new DataView(tail.buffer,tail.byteOffset+end),expected=eocd.getUint16(10,true);
 if(expected>20001||eocd.getUint16(4,true)||eocd.getUint16(6,true))throw Error('不支援此 ZIP 備份格式。');
 const entries=new Map(),seen=new Set();let failure,total=0;
 const unzip=new Unzip(entry=>{
  if(seen.has(entry.name)||!(entry.name==='manifest.json'||/^images\/[a-f0-9]{64}$/.test(entry.name))){failure=Error('備份含重複或不支援的檔案。');return;}
  seen.add(entry.name);if(seen.size>20001){failure=Error('備份檔案過多。');return;}
  const parts=[];let size=0;const limit=entry.name==='manifest.json'?MAX_META:12*1024*1024;
  if(entry.originalSize>limit){failure=Error('備份項目超過大小上限。');return;}
  entry.ondata=(err,chunk,final)=>{
   if(failure)return;if(err){failure=err;return;}size+=chunk.length;total+=chunk.length;
   if(size>limit||total>MAX){failure=Error('備份解壓縮後超過容量上限。');return;}
   parts.push(chunk);if(final)entries.set(entry.name,new Blob(parts));
  };entry.start();
 });unzip.register(UnzipInflate);
 const reader=file.stream().getReader();let read=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;unzip.push(value,false);if(failure)throw failure;read+=value.length;onProgress(read,file.size);}unzip.push(new Uint8Array(),true);if(failure)throw failure;}finally{await reader.cancel();}
 if(entries.size!==expected||entries.size!==seen.size||!entries.has('manifest.json'))throw Error('備份內容不完整。');
 let manifest;try{manifest=JSON.parse(await entries.get('manifest.json').text());}catch{throw Error('備份資料格式不正確。');}
 if(manifest.format!=='shiti'||manifest.version!==2||!manifest.images||typeof manifest.images!=='object')throw Error('不支援此備份版本。');
 const data=validateBackup(manifest.data,{allowImageRefs:true}),assets=new Map();
 for(const id of new Set(data.cards.flatMap(c=>[c.question,c.answer,c.questionOriginal]).filter(Boolean))){
  if(!isImageRef(id)||!entries.has(`images/${id.slice(6)}`)||!['image/jpeg','image/png','image/webp'].includes(manifest.images[id]))throw Error('題目照片缺漏，原題庫未變更。');
  assets.set(id,entries.get(`images/${id.slice(6)}`).slice(0,undefined,manifest.images[id]));
 }
 if(assets.size+1!==entries.size||Object.keys(manifest.images).length!==assets.size)throw Error('備份照片清單與內容不一致。');
 return {data,assets};
}
export async function readBackup(file,onProgress){
 const magic=new Uint8Array(await file.slice(0,4).arrayBuffer());
 if(magic[0]===80&&magic[1]===75)return readArchive(file,onProgress);
 if(file.size>200*1024*1024)throw Error('舊 JSON 備份超過 200 MB；新版請使用 ZIP 備份。');
 let data;try{data=JSON.parse(await file.text());}catch{throw Error('檔案不是有效的備份。');}
 return {data:validateBackup(data),assets:new Map()};
}
