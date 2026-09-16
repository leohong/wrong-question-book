import {getImage} from './storage.js';
import {isImageRef,dataUrlToBlob} from './media.js';
import {maskedBlob} from './mask-layer.js';
import {DEFAULT_AI_PROMPT} from './domain.js';
export const AI_PROMPT=DEFAULT_AI_PROMPT;
export async function cardPng(card,key){
  const ref=card[key];if(!ref)throw Error('這張卡片沒有圖片。');
  const blob=await maskedBlob(isImageRef(ref)?await getImage(ref):dataUrlToBlob(ref),card[key+'Mask']);
  const bitmap=await createImageBitmap(blob);
  try{
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('圖片轉換失敗。')),'image/png'));
  }finally{bitmap.close();}
}
export function copyCardImage(card,key){
  if(!navigator.clipboard?.write || typeof ClipboardItem==='undefined')throw Error('瀏覽器不支援複製圖片，請使用「下載圖片」與「複製指令」。');
  // Start the clipboard write within the click gesture; image preparation is asynchronous.
  return navigator.clipboard.write([new ClipboardItem({'image/png':cardPng(card,key)})]);
}
export function copyPrompt(prompt=AI_PROMPT){
  if(!navigator.clipboard?.writeText)throw Error('瀏覽器不支援複製，請手動選取下方指令。');
  return navigator.clipboard.writeText(prompt);
}
export async function shareCardWithPrompt(card,key,prompt=AI_PROMPT){
  if(!navigator.share)throw Error('這個瀏覽器不支援系統分享。');
  const blob=await cardPng(card,key);
  const file=new File([blob],`${key==='question'?'題目':'答案'}.png`,{type:'image/png'});
  if(navigator.canShare&&!navigator.canShare({files:[file]}))throw Error('這個瀏覽器不支援分享圖片檔案。');
  await navigator.share({title:'拾題 AI 辨識',text:prompt,files:[file]});
}
export async function downloadCard(card,key){
  const blob=await cardPng(card,key),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`${key==='question'?'題目':'答案'}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
