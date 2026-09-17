import {mountCropSelection} from './crop-selection.js';
import {compressCanvas} from './compression.js';
import {blobToDataUrl} from './media.js';

const LAST_CATEGORY='shiti-quick-category';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const emptyMask=(width=1,height=1)=>({version:1,width,height,strokes:[]});

function rememberedCategory(categories){
  try{const value=localStorage.getItem(LAST_CATEGORY);if(categories.includes(value))return value;}catch{}
  return categories[0];
}

function rememberCategory(category){try{localStorage.setItem(LAST_CATEGORY,category);}catch{}}

async function quickCrop(file,dialog,onDone,onBack,toast){
  if(!file.type.startsWith('image/'))throw Error('請選擇照片檔案。');
  if(file.size>35*1024*1024)throw Error('照片太大，請選擇 35 MB 以下的圖片。');
  const objectUrl=URL.createObjectURL(file),image=new Image();
  try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('無法讀取這張照片，請改用 JPG、PNG 或 WebP。'));image.src=objectUrl;});}
  catch(error){URL.revokeObjectURL(objectUrl);throw error;}
  dialog('快速框選題目','<p class="hint">只保留這一道題。可拖曳方框、拉動四邊，或直接保留全圖。</p><div class="crop-wrap"><canvas id="quick-crop"></canvas></div><p class="muted" id="quick-crop-state" aria-live="polite">目前保留整張照片</p><div class="actions"><button id="quick-crop-back">返回</button><button id="quick-crop-full">選取全圖</button><button class="primary" id="quick-crop-use">使用這個範圍</button></div>');
  const canvas=document.querySelector('#quick-crop'),scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
  const selection=mountCropSelection(canvas,image,document.querySelector('#quick-crop-state'));
  const cleanup=()=>{selection.destroy();URL.revokeObjectURL(objectUrl);};
  document.querySelector('#modal .close').onclick=()=>{cleanup();onBack();};
  document.querySelector('#quick-crop-full').onclick=()=>selection.selectAll();
  document.querySelector('#quick-crop-back').onclick=()=>{cleanup();onBack();};
  document.querySelector('#quick-crop-use').onclick=async()=>{
    try{
      const box=selection.getBox();if(box.w<15||box.h<15)throw Error('範圍太小，請重新框選。');
      const button=document.querySelector('#quick-crop-use');button.disabled=true;button.textContent='正在處理…';
      const output=document.createElement('canvas');output.width=Math.round(box.w);output.height=Math.round(box.h);
      const context=output.getContext('2d');context.fillStyle='white';context.fillRect(0,0,output.width,output.height);
      context.drawImage(image,box.x/scale,box.y/scale,box.w/scale,box.h/scale,0,0,output.width,output.height);
      const result=await compressCanvas(output,'balanced'),url=await blobToDataUrl(result.blob);
      cleanup();onDone(url,emptyMask(result.width,result.height));
    }catch(error){toast(error.message);const button=document.querySelector('#quick-crop-use');if(button){button.disabled=false;button.textContent='使用這個範圍';}}
  };
}

export function startQuickAdd({dialog,getState,saveCard,render,toast,openFull}){
  let draft={category:rememberedCategory(getState().categories),question:null,questionOriginal:null,questionMask:null,answer:null,answerText:'',answerMask:null};
  let saving=false;
  const selectFile=(camera,onFile)=>{const input=document.createElement('input');input.type='file';input.accept='image/*';if(camera)input.setAttribute('capture','environment');input.onchange=()=>input.files[0]&&onFile(input.files[0]);input.click();};
  const options=()=>getState().categories.map(category=>`<option value="${esc(category)}" ${category===draft.category?'selected':''}>${esc(category)}</option>`).join('');
  const preview=source=>`<img class="quick-preview" src="${source}" alt="裁切圖片預覽">`;

  function showQuestion(){
    dialog('快速新增',`<div class="quick-steps"><strong>1 題目</strong><span>2 答案</span><span>3 儲存</span></div><label class="field" for="quick-category">分類</label><select id="quick-category">${options()}</select><section class="quick-capture"><span class="empty-icon">＋</span><h3>拍下這一道錯題</h3><p>拍照或選圖後，只要框選題目，不需先命名或調整進階設定。</p><div class="quick-choice"><button class="primary" id="quick-camera">拍照</button><button id="quick-file">選擇圖片</button></div></section><div class="actions"><button id="quick-full">改用完整新增</button><button id="quick-cancel">取消</button></div>`);
    document.querySelector('#quick-category').onchange=event=>{draft.category=event.target.value;rememberCategory(draft.category);};
    const choose=camera=>selectFile(camera,file=>quickCrop(file,dialog,(url,mask)=>{draft.question=url;draft.questionOriginal=url;draft.questionMask=mask;showAnswer();},showQuestion,toast).catch(error=>toast(error.message)));
    document.querySelector('#quick-camera').onclick=()=>choose(true);document.querySelector('#quick-file').onclick=()=>choose(false);
    document.querySelector('#quick-full').onclick=openFull;document.querySelector('#quick-cancel').onclick=()=>document.querySelector('#modal').close();
  }

  function showAnswer(){
    dialog('選擇答案來源',`<div class="quick-steps"><span>1 題目</span><strong>2 答案</strong><span>3 儲存</span></div>${preview(draft.question)}<div class="quick-answer-grid"><button class="primary" id="quick-same">使用題目原圖</button><button id="quick-answer-camera">另拍答案</button><button id="quick-answer-file">選擇答案圖片</button><button id="quick-later">稍後補答案</button></div><label class="field" for="quick-answer-text">或直接輸入答案</label><textarea id="quick-answer-text" rows="4" maxlength="10000" placeholder="支援 Markdown 與 $...$ 公式">${esc(draft.answerText)}</textarea><div class="actions"><button id="quick-question-back">重拍題目</button><button id="quick-use-text" disabled>使用文字答案</button></div>`);
    const text=document.querySelector('#quick-answer-text'),useText=document.querySelector('#quick-use-text');
    text.oninput=()=>{draft.answerText=text.value;useText.disabled=!text.value.trim();};
    useText.onclick=()=>{draft.answer=null;draft.answerText=text.value;showReview();};
    document.querySelector('#quick-same').onclick=()=>{draft.answer=draft.questionOriginal;draft.answerMask=emptyMask(draft.questionMask.width,draft.questionMask.height);showReview();};
    document.querySelector('#quick-later').onclick=()=>{draft.answer=null;draft.answerText='';showReview();};
    const choose=camera=>selectFile(camera,file=>quickCrop(file,dialog,(url,mask)=>{draft.answer=url;draft.answerMask=mask;showReview();},showAnswer,toast).catch(error=>toast(error.message)));
    document.querySelector('#quick-answer-camera').onclick=()=>choose(true);document.querySelector('#quick-answer-file').onclick=()=>choose(false);
    document.querySelector('#quick-question-back').onclick=showQuestion;
  }

  function showReview(){
    const hasAnswer=draft.answer||draft.answerText.trim();
    dialog('準備儲存',`<div class="quick-steps"><span>1 題目</span><span>2 答案</span><strong>3 儲存</strong></div><div class="quick-review"><div><span class="tag">${esc(draft.category)}</span>${preview(draft.question)}</div><div><span class="tag green">${hasAnswer?'答案已加入':'稍後補答案'}</span>${draft.answer?preview(draft.answer):draft.answerText?`<div class="answer-text">${esc(draft.answerText)}</div>`:'<p class="muted">儲存後可從題目卡補上答案。</p>'}</div></div><p class="hint">題目名稱會自動產生。需要抹除、AI 指令或詳細文字時，再開啟題目卡編輯。</p><div class="actions"><button id="quick-answer-back">返回答案</button><button id="quick-save">儲存並完成</button><button class="primary" id="quick-save-next">儲存並繼續</button></div>`);
    document.querySelector('#quick-answer-back').onclick=showAnswer;
    const save=async continued=>{if(saving)return;saving=true;document.querySelectorAll('#quick-save,#quick-save-next').forEach(button=>button.disabled=true);try{const card=await saveCard(draft);rememberCategory(card.category);toast('題目已收藏');if(continued){draft={category:card.category,question:null,questionOriginal:null,questionMask:null,answer:null,answerText:'',answerMask:null};showQuestion();}else{document.querySelector('#modal').close();render();}}catch(error){toast(error.message);}finally{saving=false;}};
    document.querySelector('#quick-save').onclick=()=>save(false);document.querySelector('#quick-save-next').onclick=()=>save(true);
  }

  showQuestion();
}
