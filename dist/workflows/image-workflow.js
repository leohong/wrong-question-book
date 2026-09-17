import {maskedBlob} from '../mask-layer.js?v=pick1';
import {getImage} from '../storage.js';
import {blobToDataUrl,dataUrlToBlob,isImageRef} from '../media.js';
import {manualErase} from '../manual-erase.js?v=average1';
import {mountCropSelection} from '../crop-selection.js';
import {compressCanvas} from '../compression.js';

export function validateImageFile(file){
  if(!file?.type?.startsWith('image/'))throw Error('請選擇照片檔案。');
  if(file.size>35*1024*1024)throw Error('照片太大，請選擇 35 MB 以下的圖片。');
}

export function createImageWorkflow({dialog,modal,safely,renderAnswers,query=document.querySelector.bind(document)}){
  function previewCompression(canvas,onSave,onBack,mask=null){
    dialog('檢查照片清晰度','<label class="field" for="compression-mode">儲存品質</label><select id="compression-mode"><option value="clear">清晰：小字、公式與密集解答</option><option value="balanced" selected>平衡：一般題目（預設）</option><option value="small">省空間：字大、內容簡單</option></select><p class="hint">請放大檢查負號、小數點與指數。確認後才會使用這個版本。</p><p id="compression-size" aria-live="polite">正在產生預覽…</p><div style="overflow:auto;max-height:45vh"><img id="compression-preview" alt="壓縮後的實際照片" style="display:block;max-width:100%"></div><div class="actions"><button id="compression-zoom">以原始像素檢查</button><button id="compression-back">返回抹除</button><button id="compression-save" class="primary" disabled>使用這張照片</button></div>');
    let sequence=0,result=null,url=null,zoom=false;
    const cleanup=()=>{sequence++;if(url)URL.revokeObjectURL(url);modal.removeEventListener('close',cleanup);};
    modal.addEventListener('close',cleanup,{once:true});
    async function update(){
      const seq=++sequence;result=null;query('#compression-save').disabled=true;query('#compression-size').textContent='正在產生預覽…';
      try{
        const next=await compressCanvas(canvas,query('#compression-mode').value);
        if(seq!==sequence||!query('#compression-preview'))return;
        if(url)URL.revokeObjectURL(url);
        const display=await maskedBlob(next.blob,mask);if(seq!==sequence)return;
        url=URL.createObjectURL(display);result=next;query('#compression-preview').src=url;
        query('#compression-size').textContent=`${Math.round(next.blob.size/1024)} KB · ${next.width} × ${next.height} · ${next.blob.type==='image/webp'?'WebP':'JPEG'}`;
        query('#compression-save').disabled=false;
      }catch(error){if(seq===sequence)query('#compression-size').textContent=error.message;}
    }
    query('#compression-mode').onchange=update;
    query('#compression-zoom').onclick=()=>{zoom=!zoom;query('#compression-preview').style.maxWidth=zoom?'none':'100%';query('#compression-zoom').textContent=zoom?'縮放至視窗':'以原始像素檢查';};
    query('#compression-back').onclick=()=>{cleanup();onBack();};
    query('#compression-save').onclick=safely(async()=>{if(!result)throw Error('請等待預覽完成。');const seq=sequence,data=await blobToDataUrl(result.blob);if(seq!==sequence||!modal.open)return;cleanup();onSave(data);});
    update();
  }

  async function edit(ref,mask,onSave,onBack){
    const blob=isImageRef(ref)?await getImage(ref):dataUrlToBlob(ref),img=await createImageBitmap(blob),base=document.createElement('canvas');
    base.width=img.width;base.height=img.height;base.getContext('2d').drawImage(img,0,0);img.close();
    manualErase(base,dialog,(_edited,_back,nextMask)=>onSave(nextMask),onBack,mask);
  }

  async function crop(file,onSave,onCancel){
    validateImageFile(file);
    const objectUrl=URL.createObjectURL(file),img=new Image();
    try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('無法讀取這張照片，請改用 JPG、PNG 或 WebP。'));img.src=objectUrl;});}
    catch(error){URL.revokeObjectURL(objectUrl);throw error;}
    dialog('框選要保留的範圍','<p class="hint">拖曳畫出方框；拉動四邊調整大小，按住框內移動。點框上的 × 可清除，再重新框選。</p><div class="crop-wrap"><canvas id="crop" aria-label="拖曳框選照片範圍"></canvas></div><p class="muted" id="crop-state" aria-live="polite">目前保留整張照片</p><div class="actions"><button id="cancel-crop">取消</button><button id="full-crop">選取全圖</button><button class="primary" id="use-crop">使用這個範圍</button></div>');
    const canvas=query('#crop'),scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
    canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
    const selection=mountCropSelection(canvas,img,query('#crop-state'));
    const cancel=()=>{selection.destroy();onCancel();};
    query('#full-crop').onclick=()=>selection.selectAll();query('#cancel-crop').onclick=cancel;
    renderAnswers(modal);modal.querySelector('.close').onclick=cancel;modal.addEventListener('close',()=>selection.destroy(),{once:true});
    query('#use-crop').onclick=safely(()=>{
      const box=selection.getBox();if(box.w<15||box.h<15)throw Error('範圍太小，請重新框選。');
      const out=document.createElement('canvas');out.width=Math.round(box.w);out.height=Math.round(box.h);
      const context=out.getContext('2d');context.fillStyle='white';context.fillRect(0,0,out.width,out.height);context.drawImage(img,box.x/scale,box.y/scale,box.w/scale,box.h/scale,0,0,out.width,out.height);
      selection.destroy();manualErase(out,dialog,(_edited,back,mask)=>previewCompression(out,url=>onSave(url,url,mask),back,mask),()=>crop(file,onSave,onCancel));
    });
    URL.revokeObjectURL(objectUrl);
  }

  return {crop,edit};
}
