import {maskedBlob} from './mask-layer.js?v=mask2';
import {dataUrlToBlob} from './media.js';
import {getImage} from './storage.js';
import {isImageRef} from './media.js';

export function photoAttributes(value,small=false,mask=null){
  if(mask?.strokes?.length)return `data-photo="${value}" data-small="${small}" data-mask="${encodeURIComponent(JSON.stringify(mask))}"`;
  if(isImageRef(value))return `data-photo="${value}" data-small="${small}"`;
  // Only our image encoder/validated backups may provide inline images.
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value||'')?`src="${value}"`:'';
}
export function observeImages(root=document.body){
  const tracked=new Map(),pending=[],active=new Set();let stopped=false;
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);enqueue(e.target);}
  },{rootMargin:'200px'}):null;
  function enqueue(img){pending.push(img);pump();}
  function pump(){while(!stopped&&active.size<4&&pending.length){const img=pending.shift();if(!img.isConnected||!tracked.has(img))continue;active.add(img);(isImageRef(img.dataset.photo)?getImage(img.dataset.photo,img.dataset.small==='true'):Promise.resolve(dataUrlToBlob(img.dataset.photo))).then(blob=>maskedBlob(blob,img.dataset.mask?JSON.parse(decodeURIComponent(img.dataset.mask)):null)).then(blob=>{
      if(stopped||!img.isConnected||!tracked.has(img))return;
      const url=URL.createObjectURL(blob);tracked.set(img,url);img.src=url;
    }).catch(()=>{if(img.isConnected)img.alt='圖片無法載入，請從備份還原。';}).finally(()=>{active.delete(img);pump();});}}
  function scan(){
    for(const [img,url] of tracked)if(!img.isConnected){if(url)URL.revokeObjectURL(url);observer?.unobserve(img);tracked.delete(img);}
    for(const img of root.querySelectorAll('img[data-photo]'))if(!tracked.has(img)){
      tracked.set(img,null);
      if(observer&&img.dataset.small==='true')observer.observe(img);else enqueue(img);
    }
  }
  const changes=new MutationObserver(records=>{
    for(const record of records)if(record.type==='attributes'){
      const img=record.target,url=tracked.get(img);if(url)URL.revokeObjectURL(url);
      observer?.unobserve(img);tracked.delete(img);img.removeAttribute('src');
    }
    scan();
  });changes.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-photo','data-mask','data-small']});scan();
  return ()=>{stopped=true;changes.disconnect();observer?.disconnect();for(const url of tracked.values())if(url)URL.revokeObjectURL(url);tracked.clear();pending.length=0;};
}
