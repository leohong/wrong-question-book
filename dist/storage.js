import {validateBackup,initialState} from './domain.js';
import {isImageRef,dataUrlToBlob,imageId,thumbnail,blobToDataUrl} from './media.js';

export const storageDescription='單機模式：照片分開儲存並自動去重，答題只更新進度。資料保存在目前瀏覽器，請定期匯出備份；更換網址需手動搬移。';
const STORES=['book','questions','images','thumbnails','reviewLogs','settings'];
const request = req => new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const complete = tx => new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('資料交易中止。'));});
const refs = cards => new Set(cards.flatMap(c=>[c.question,c.answer,c.questionOriginal]).filter(isImageRef));
const same = (a,b) => a===b || JSON.stringify(a)===JSON.stringify(b);

// Each instance owns a revision; stale tabs must reload rather than overwrite another tab.
export function createStorage(name='shiti-question-book') {
  let connection,revision=0,snapshot=initialState(),writing=false;
  function db(){
    if(!connection) connection=new Promise((resolve,reject)=>{
      const req=indexedDB.open(name,2);
      req.onupgradeneeded=()=>{
        const database=req.result;
        for(const name of STORES) if(!database.objectStoreNames.contains(name)) {
          const store=database.createObjectStore(name);
          if(name==='questions'){store.createIndex('category','category');store.createIndex('due','due');}
          if(name==='reviewLogs'){store.createIndex('at','at');store.createIndex('cardId','cardId');}
        }
      };
      req.onsuccess=()=>{const database=req.result;database.onversionchange=()=>{database.close();connection=null;};resolve(database);};
      req.onerror=()=>{connection=null;reject(Error('無法開啟題庫，請重新載入或確認瀏覽器允許儲存資料。'));};
      req.onblocked=()=>reject(Error('請先關閉其他拾題分頁，再重新載入以升級資料庫。'));
    });
    return connection;
  }
  async function load(){
    const database=await db(),tx=database.transaction(['settings','questions','reviewLogs','book'],'readonly');
    const done=complete(tx);
    const [meta,cards,history,legacy]=await Promise.all([
      request(tx.objectStore('settings').get('state')),request(tx.objectStore('questions').getAll()),
      request(tx.objectStore('reviewLogs').getAll()),request(tx.objectStore('book').get('state'))
    ]);await done;
    if(meta){revision=meta.revision;snapshot={version:1,categories:meta.categories,target:meta.target,cards:cards.sort((a,b)=>b.created-a.created),history};return snapshot;}
    revision=0;snapshot=initialState();
    if(!legacy)return null;
    // Validation/conversion happens before writes. Original v1 data remains until commit.
    try{return await save(validateBackup(legacy.data));}
    catch(error){error.legacyBackup=legacy.data;throw error;}
  }
  async function save(data,importedImages=new Map()){
    if(writing)throw Error('正在儲存，請稍候。');writing=true;
    try {
      const database=await db(),prepared=new Map(),convertedUrls=new Map(),known=refs(snapshot.cards),cards=[];
      const requested=refs(data.cards);
      for(const [id,blob] of importedImages)if(requested.has(id)){
        if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||await imageId(blob)!==id)throw Error('備份照片校驗失敗，原資料未變更。');
        if(!known.has(id))prepared.set(id,{blob,thumb:await thumbnail(blob)});
      }
      for(const card of data.cards){
        const converted={...card};
        for(const key of ['question','answer','questionOriginal']){
          const value=card[key];if(!value||isImageRef(value))continue;
          if(convertedUrls.has(value)){converted[key]=convertedUrls.get(value);continue;}
          const blob=dataUrlToBlob(value),id=await imageId(blob);converted[key]=id;convertedUrls.set(value,id);
          if(!known.has(id)&&!prepared.has(id))prepared.set(id,{blob,thumb:await thumbnail(blob)});
        }
        cards.push(same(card,converted)?card:converted);
      }
      const next={...data,cards},used=refs(cards),oldCards=new Map(snapshot.cards.map(c=>[c.id,c]));
      const nextIds=new Set(cards.map(c=>c.id));
      const tx=database.transaction(STORES,'readwrite');
      let conflict=false,missing=false;
      const done=complete(tx);
      const metaRequest=tx.objectStore('settings').get('state');
      metaRequest.onsuccess=()=>{
        if((metaRequest.result?.revision||0)!==revision){conflict=true;tx.abort();return;}
        for(const [id,{blob,thumb}] of prepared){tx.objectStore('images').put(blob,id);if(thumb)tx.objectStore('thumbnails').put(thumb,id);}
        for(const id of used)if(!known.has(id)&&!prepared.has(id)){
          const check=tx.objectStore('images').getKey(id);check.onsuccess=()=>{if(!check.result){missing=true;tx.abort();}};
        }
        for(const c of cards)if(!same(oldCards.get(c.id),c))tx.objectStore('questions').put(c,c.id);
        for(const id of oldCards.keys())if(!nextIds.has(id))tx.objectStore('questions').delete(id);
        for(const id of known)if(!used.has(id)){tx.objectStore('images').delete(id);tx.objectStore('thumbnails').delete(id);}
        // Append one row for a normal answer; replacement/import also removes obsolete rows.
        for(let i=0;i<data.history.length;i++)if(!same(snapshot.history[i],data.history[i]))tx.objectStore('reviewLogs').put(data.history[i],i);
        for(let i=data.history.length;i<snapshot.history.length;i++)tx.objectStore('reviewLogs').delete(i);
        tx.objectStore('settings').put({revision:revision+1,categories:data.categories,target:data.target},'state');
        tx.objectStore('book').delete('state');
      };
      try {await done;}catch(error){throw Error(conflict?'題庫已在其他分頁更新，請重新載入後再操作。':missing?'找不到題目照片，資料尚未儲存。':error?.name==='QuotaExceededError'?'裝置空間不足，原資料仍保留；請先備份並釋放空間。':'儲存失敗，原資料仍保留，請重試。');}
      revision++;snapshot=next;return next;
    } finally {writing=false;}
  }
  async function getImage(id,small=false){
    if(!isImageRef(id))return dataUrlToBlob(id);
    const database=await db();
    if(small){const thumb=await request(database.transaction('thumbnails').objectStore('thumbnails').get(id));if(thumb)return thumb;}
    const blob=await request(database.transaction('images').objectStore('images').get(id));
    if(!blob)throw Error('圖片遺失，請從備份還原。');return blob;
  }
  async function exportBackup(data,onProgress=()=>{}){
    // Build one card at a time; never concatenate the whole book into one giant string.
    const parts=[`{"version":1,"categories":${JSON.stringify(data.categories)},"target":${data.target},"cards":[`];
    for(let i=0;i<data.cards.length;i++){
      const c={...data.cards[i]};
      for(const key of ['question','answer','questionOriginal'])if(isImageRef(c[key]))c[key]=await blobToDataUrl(await getImage(c[key]));
      parts.push((i?',':'')+JSON.stringify(c));onProgress(i+1,data.cards.length);
    }
    parts.push('],"history":[');
    for(let i=0;i<data.history.length;i++)parts.push((i?',':'')+JSON.stringify(data.history[i]));
    parts.push(']}');return new Blob(parts,{type:'application/json'});
  }
  async function close(){if(connection)(await connection).close();connection=null;}
  return {load,save,getImage,exportBackup,close};
}
const storage=createStorage();
export const load=storage.load,save=storage.save,getImage=storage.getImage,exportBackup=storage.exportBackup;
