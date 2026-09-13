import {getImage} from './storage.js';
import {isImageRef,dataUrlToBlob} from './media.js';
import {maskedBlob} from './mask-layer.js';
export const AI_PROMPT='忽略手寫筆跡、作答、圈選與塗改，將印刷題目、選項、公式及圖表資訊辨識為文字，保留原本順序。公式用 LaTeX，以 $...$ 包住；選項各占一行。遮住或不確定的內容標示【無法辨識】，不要猜測。\n\n先不解題，最後詢問：「是否需要解題並提供步驟？」';
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
export function copyCardWithPrompt(card,key){
  if(!navigator.clipboard?.write || typeof ClipboardItem==='undefined')throw Error('瀏覽器不支援複製圖片，請使用「下載圖片」與「複製指令」。');
  // Start the clipboard write within the click gesture; image preparation is asynchronous.
  return navigator.clipboard.write([new ClipboardItem({'image/png':cardPng(card,key),'text/plain':new Blob([AI_PROMPT],{type:'text/plain'})})]);
}
export function copyPrompt(){
  if(!navigator.clipboard?.writeText)throw Error('瀏覽器不支援複製，請手動選取下方指令。');
  return navigator.clipboard.writeText(AI_PROMPT);
}
export async function downloadCard(card,key){
  const blob=await cardPng(card,key),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`${key==='question'?'題目':'答案'}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
