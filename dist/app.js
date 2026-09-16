import {needsManual} from './manual.js';
import {AI_PROMPT,copyCardImage,copyPrompt,shareCardWithPrompt,downloadCard} from './ai-copy.js?v=share1';
import {renderAnswers,previewAnswer} from './math-answer.js?v=markdown1';
import {maskedBlob} from './mask-layer.js?v=pick1';
import {getImage} from './storage.js';
import {dataUrlToBlob,isImageRef,blobToDataUrl} from './media.js';
import {manualErase} from './manual-erase.js?v=average1';
import {mountCropSelection} from './crop-selection.js';
import {initialState,hasQuestion,hasAnswer} from './domain.js';
import {load,save} from './storage.js';
import {photoAttributes,observeImages} from './image-view.js?v=pick1';
import {compressCanvas} from './compression.js';
import {startQuickAdd} from './quick-add.js?v=quick1';
import {renderExam as renderExamPage} from './exam.js?v=print6';
import {$,esc,formatDate} from './ui.js';
import {createLibraryPage,cardStatus} from './pages/library-page.js';
import {createPracticePage} from './pages/practice-page.js';
import {renderStatisticsPage,cardCounts} from './pages/statistics-page.js';
import {renderManualPage} from './pages/manual-page.js';
import {createSettingsPage} from './pages/settings-page.js';

function quickAdd(){return startQuickAdd({dialog,getState:()=>state,commit,render,toast,openFull:()=>editCard(null,true)});}
function renderExam(){return renderExamPage({root:$('#main'),state,optionsHtml:opts('',true),toast});}

function previewCompression(canvas,onSave,onBack,mask=null){
 dialog('檢查照片清晰度', '<label class="field" for="compression-mode">儲存品質</label><select id="compression-mode"><option value="clear">清晰：小字、公式與密集解答</option><option value="balanced" selected>平衡：一般題目（預設）</option><option value="small">省空間：字大、內容簡單</option></select><p class="hint">請放大檢查負號、小數點與指數。確認後才會使用這個版本。</p><p id="compression-size" aria-live="polite">正在產生預覽…</p><div style="overflow:auto;max-height:45vh"><img id="compression-preview" alt="壓縮後的實際照片" style="display:block;max-width:100%"></div><div class="actions"><button id="compression-zoom">以原始像素檢查</button><button id="compression-back">返回抹除</button><button id="compression-save" class="primary" disabled>使用這張照片</button></div>');
 let sequence=0,result=null,url=null,zoom=false;
 const cleanup=()=>{sequence++;if(url)URL.revokeObjectURL(url);modal.removeEventListener('close',cleanup);};
 modal.addEventListener('close',cleanup,{once:true});
 async function update(){
  const seq=++sequence;result=null;$('#compression-save').disabled=true;$('#compression-size').textContent='正在產生預覽…';
  try{const next=await compressCanvas(canvas,$('#compression-mode').value);if(seq!==sequence||!$('#compression-preview'))return;
   if(url)URL.revokeObjectURL(url);const display=await maskedBlob(next.blob,mask);if(seq!==sequence)return;url=URL.createObjectURL(display);result=next;
   $('#compression-preview').src=url;$('#compression-size').textContent=`${Math.round(next.blob.size/1024)} KB · ${next.width} × ${next.height} · ${next.blob.type==='image/webp'?'WebP':'JPEG'}`;$('#compression-save').disabled=false;
  }catch(error){if(seq===sequence)$('#compression-size').textContent=error.message;}
 }
 $('#compression-mode').onchange=update;
 $('#compression-zoom').onclick=()=>{zoom=!zoom;$('#compression-preview').style.maxWidth=zoom?'none':'100%';$('#compression-zoom').textContent=zoom?'縮放至視窗':'以原始像素檢查';};
 $('#compression-back').onclick=()=>{cleanup();onBack();};
 $('#compression-save').onclick=safely(async()=>{if(!result)throw Error('請等待預覽完成。');const seq=sequence,data=await blobToDataUrl(result.blob);if(seq!==sequence||!modal.open)return;cleanup();onSave(data);});
 update();
}
async function addCategory(input){if(typeof input!=='string')throw Error('分類名稱必須是文字。');const name=input.trim();if(!name||name.length>30)throw Error('名稱請輸入 1 到 30 個字。');if(state.categories.includes(name))throw Error('已經有這個分類。');if(state.categories.length>=100)throw Error('分類最多 100 個。');await commit({...state,categories:[...state.categories,name]});return{name};}
let state=initialState(),tab='library',busy=false,timer;
const app=$('#app'),modal=$('#modal');
const libraryPage=createLibraryPage({getState:()=>state,getRoot:()=>$('#main'),onAdd:()=>editCard(),onOpen:viewCard});
const practicePage=createPracticePage({
 getState:()=>state,
 getRoot:()=>$('#main'),
 commit,
 renderApp:nextTab=>render(nextTab),
 dialog,
 modal,
 toast,
 safely,
 optionsHtml:opts,
 questionContent,
 answerContent
});
const settingsPage=createSettingsPage({
 getState:()=>state,
 getRoot:()=>$('#main'),
 commit,
 addCategory,
 dialog,
 modal,
 toast,
 safely,
 onCategoryRenamed:(oldName,name)=>{if(libraryPage.category===oldName)libraryPage.category=name;},
 onCategoryRemoved:category=>{if(libraryPage.category===category)libraryPage.category='';},
 onDataReplaced:()=>{libraryPage.reset();practicePage.clear();render();}
});
async function init(){
 try{
  ($('#main')||$('main')).innerHTML='<section class="empty"><h2>正在讀取題庫…</h2><p>首次升級會轉換照片，完成前請保持此頁開啟。</p></section>';
  const saved=await load();state=saved||initialState();if(needsManual())tab='manual';render();registerTools();
  if(!saved){dialog('開始使用拾題','<p>照片與進度保存在目前裝置的瀏覽器，可用 ZIP 備份在裝置間搬移。</p><p class="hint">沒有自動雲端同步，請定期匯出備份。</p><div class="actions"><button class="primary" id="accept-local">使用此裝置儲存</button></div>');$('#accept-local').onclick=safely(async()=>{await commit(state);modal.close();navigator.storage?.persist?.().catch(()=>{});});}
 }catch(error){
  const main=$('#main')||$('main');main.innerHTML=`<section class="empty"><h2>暫時無法讀取題庫</h2><p>${esc(error.message)}</p><button onclick="location.reload()">重新載入</button>${error.legacyBackup?'<button id="rescue-backup">匯出原始題庫</button>':''}</section>`;
  if(error.legacyBackup)$('#rescue-backup').onclick=safely(()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(error.legacyBackup)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='拾題升級前備份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);});
 }
}
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});const tools=[{name:'get_question_book_summary',description:'讀取題目數量、熟練度、分類和練習次數。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({...cardCounts(state),categories:state.categories,attempts:state.history.length,target:state.target})},{name:'add_question_category',description:'新增錯題分類並更新畫面。',inputSchema:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:30}},required:['name'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(practicePage.active)throw Error('請先結束目前練習。');const result=await addCategory(input?.name);render();return result;}},{name:'start_question_practice',description:'開始練習並顯示第一道題目，不提交作答。',inputSchema:{type:'object',properties:{category:{type:'string'},count:{type:'integer',minimum:1,maximum:200},mode:{type:'string',enum:['recommended','due','all']}},required:['count','mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(practicePage.active)throw Error('請先完成或結束目前的練習。');return practicePage.start(input?.category||'',input?.mode,input?.count);}}];for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}}
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
let stopImages=observeImages();
window.addEventListener('pagehide',()=>stopImages());
window.addEventListener('pageshow',event=>{if(event.persisted)stopImages=observeImages();});
init();
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';if(modal.open){let note=modal.querySelector('.modal-status');if(!note){note=document.createElement('p');note.className='hint modal-status';note.setAttribute('role','status');modal.append(note);}note.textContent=message;}clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.display='none',4200);}
function dialog(title,body){modal.innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="close" aria-label="關閉">×</button></div>${body}`;renderAnswers(modal);modal.querySelector('.close').onclick=()=>modal.close();if(!modal.open)modal.showModal();}
async function commit(next,assets){if(settingsPage.busy)throw Error('備份處理中，請完成後再修改題庫。');if(busy)throw Error('正在儲存，請稍候。');busy=true;try{state=await save(next,assets);}finally{busy=false;}}
function safely(fn){return async e=>{const b=e?.currentTarget;try{if(b?.tagName==='BUTTON')b.disabled=true;await fn(e);}catch(error){toast(error.message||'操作失敗，請再試一次。');}finally{if(b?.isConnected)b.disabled=false;}};}
function opts(selected='',all=false){return(all?'<option value="">全部分類</option>':'')+state.categories.map(c=>`<option ${c===selected?'selected':''} value="${esc(c)}">${esc(c)}</option>`).join('');}
function render(nextTab){if(nextTab)tab=nextTab;app.innerHTML=`<header><a class="brand" href="#">▣ 拾題 <small>錯題本</small></a><span>每一道錯題，都有下一次進步。</span></header><nav aria-label="主要選單">${[['library','▦','我的題庫'],['practice','▹','開始練習'],['exam','▤','產生考卷'],['stats','◷','學習統計'],['settings','⚙','設定與資料'],['manual','?','使用說明']].map(([key,icon,label])=>`<button data-tab="${key}" class="${tab===key?'active':''}" aria-current="${tab===key?'page':'false'}">${icon}　${label}</button>`).join('')}</nav><main id="main"></main><footer>拾題 · 讓每次練習都算數</footer>`;app.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{const go=()=>render(button.dataset.tab);if(practicePage.active&&tab==='practice'&&button.dataset.tab!=='practice')practicePage.confirmLeave(go);else go();});$('.brand').onclick=event=>{event.preventDefault();const go=()=>render('library');practicePage.active?practicePage.confirmLeave(go):go();};if(tab==='library')libraryPage.render();else if(tab==='practice')practicePage.render();else if(tab==='exam')renderExam();else if(tab==='stats')renderStatisticsPage($('#main'),state);else if(tab==='manual')renderManualPage($('#main'),{onDone:()=>render('library'),toast});else settingsPage.render();}
function aiCopyControls(card,key){return card[key]?`<details class="ai-copy card-tools"><summary>AI 工具（選用）</summary><div class="ai-copy-body"><div class="row" style="flex-wrap:wrap"><button data-ai-share="${key}">分享給 AI</button><button data-ai-image="${key}">複製圖片</button><button data-ai-prompt>複製指令</button><button data-ai-download="${key}">下載圖片</button></div></div></details>`:'';}
function bindAiCopy(card){
 modal.querySelectorAll('[data-ai-share]').forEach(b=>b.onclick=safely(async()=>{try{await shareCardWithPrompt(card,b.dataset.aiShare,state.aiPrompt||AI_PROMPT);toast('已開啟分享選單');}catch(error){if(error.name==='AbortError')return;throw error;}}));
 modal.querySelectorAll('[data-ai-image]').forEach(b=>b.onclick=safely(async()=>{try{await copyCardImage(card,b.dataset.aiImage);}catch{throw Error('圖片複製失敗，請改用「下載圖片」。');}toast('已複製圖片，接著複製 AI 指令。');}));
 modal.querySelectorAll('[data-ai-prompt]').forEach(b=>b.onclick=safely(async()=>{await copyPrompt(state.aiPrompt||AI_PROMPT);toast('辨識指令已複製');}));
 modal.querySelectorAll('[data-ai-download]').forEach(b=>b.onclick=safely(async()=>{await downloadCard(card,b.dataset.aiDownload);toast('圖片已準備下載');}));
}
function questionContent(c){return (c.question?`<img class="photo-preview" ${photoAttributes(c.question,false,c.questionMask)} alt="題目">`:'')+(c.questionText?.trim()?`<div class="question-text">${esc(c.questionText)}</div>`:'');}
function answerContent(c){return (c.answer?`<img class="photo-preview" ${photoAttributes(c.answer,false,c.answerMask)} alt="答案">`:'')+(c.answerText?.trim()?`<div class="answer-text">${esc(c.answerText)}</div>`:'');}
function viewCard(id){const c=state.cards.find(c=>c.id===id);if(!c)return;dialog(esc(c.title),`<div class="row between card-summary"><span class="tag">${esc(c.category)}</span><span class="muted">${cardStatus(c)}</span></div><section class="card-detail-section"><h3>題目</h3>${questionContent(c)}${aiCopyControls(c,'question')}</section><section class="card-detail-section"><h3>答案</h3>${hasAnswer(c)?answerContent(c):'<p class="hint">還沒有答案，補上後就可以加入練習。</p>'}${aiCopyControls(c,'answer')}</section><p class="muted card-history">練習 ${c.attempts} 次 · 答錯 ${c.mistakes} 次 · 建立於 ${formatDate(c.created)}</p><div class="actions"><button class="danger" id="delete-card">刪除</button><button class="primary" id="edit-card">${hasAnswer(c)?'編輯':'補上答案'}</button></div>`);bindAiCopy(c);$('#edit-card').onclick=()=>editCard(c);$('#delete-card').onclick=()=>{dialog('刪除這道題目？',`<p>「${esc(c.title)}」的照片將被刪除。過去的練習次數會保留在統計中。</p><div class="actions"><button id="cancel-delete">取消</button><button class="danger" id="confirm-delete">刪除題目</button></div>`);$('#cancel-delete').onclick=()=>viewCard(c.id);$('#confirm-delete').onclick=safely(async()=>{await commit({...state,cards:state.cards.filter(x=>x.id!==c.id)});modal.close();render();toast('題目已刪除');});};}
function editCard(existing,full=false){if(!existing&&!full)return quickAdd();const draft=existing?{...existing}:{title:'',category:libraryPage.category||state.categories[0],question:null,answer:null};function show(){dialog(existing?'編輯題目卡':'新增題目卡',`<div class="form-row"><label class="field" for="card-title">題目名稱</label><input id="card-title" maxlength="100" placeholder="例如：一元二次方程式・第 5 題" value="${esc(draft.title)}"></div><label class="field" for="card-category">分類</label><select id="card-category">${opts(draft.category)}</select>${['question','answer'].map((key,i)=>`<div class="upload"><h3>${i?'02 答案卡 <span class="muted">（可稍後補上）</span>':'01 題目卡'}</h3>${draft[key]?`<img class="photo-preview" ${photoAttributes(draft[key],false,draft[key+'Mask'])} alt="${i?'答案':'題目'}預覽">`:`<p>${i?'拍下解答，和這道題目配對。':'拍照或選取照片，拖曳框選題目範圍。'}</p>`}<div class="row" style="justify-content:center;flex-wrap:wrap"><button data-upload="${key}" data-camera="true">${draft[key]?'重拍':'拍照'}</button><button data-upload="${key}">選擇圖片</button>${draft[key]?`<button data-erase="${key}">編輯抹除</button><button class="danger" data-remove-image="${key}">刪除圖片</button>`:''}${i?`<button id="answer-from-question" ${!draft.questionOriginal?'disabled':''}>使用題目卡原始圖片</button>`:''}</div>${aiCopyControls(draft,key)}<details class="manual-answer card-tools" ${draft[key+'Text']?.trim()||!draft[key]?'open':''}><summary>手動輸入${i?'答案':'題目'}（選用）</summary><div class="manual-answer-body"><textarea id="card-${key}-text" rows="5" maxlength="10000" aria-label="手動輸入${i?'答案':'題目'}" placeholder="輸入${i?'答案與解題步驟':'題目與選項'}，支援 Markdown 與 $...$ 公式。">${esc(draft[key+'Text']||'')}</textarea><label class="field">${i?'答案':'題目'}預覽</label><div id="${key}-text-preview" class="${key}-text"></div></div></details>${i?'<p class="muted">使用裁切後、抹除前的圖片。舊卡若未保留原圖，請重新選圖。</p>':''}</div>`).join('')}<div class="actions"><button id="cancel-edit">取消</button><button class="primary" id="save-card" ${!hasQuestion(draft)?'disabled':''}>儲存卡片</button></div>`);bindAiCopy(draft);const updateSaveButton=()=>$('#save-card').disabled=!hasQuestion(draft);['question','answer'].forEach(key=>{const update=()=>previewAnswer($('#'+key+'-text-preview'),draft[key+'Text']||'');$('#card-'+key+'-text').oninput=e=>{draft[key+'Text']=e.target.value;update();updateSaveButton();};update();});$('#card-title').oninput=e=>draft.title=e.target.value;$('#card-category').onchange=e=>draft.category=e.target.value;$('#cancel-edit').onclick=()=>modal.close();$('#answer-from-question').onclick=()=>{if(!draft.questionOriginal)return;draft.answer=draft.questionOriginal;draft.answerMask={version:1,width:1,height:1,strokes:[]};show();};modal.querySelectorAll('[data-remove-image]').forEach(b=>b.onclick=()=>{const key=b.dataset.removeImage;draft[key]=null;delete draft[key+'Mask'];if(key==='question')delete draft.questionOriginal;show();});modal.querySelectorAll('[data-erase]').forEach(b=>b.onclick=safely(async()=>{const key=b.dataset.erase,ref=draft[key],blob=isImageRef(ref)?await getImage(ref):dataUrlToBlob(ref),img=await createImageBitmap(blob),base=document.createElement('canvas');base.width=img.width;base.height=img.height;base.getContext('2d').drawImage(img,0,0);img.close();manualErase(base,dialog,(edited,back,mask)=>{draft[key+'Mask']=mask;show();},show,draft[key+'Mask']);}));modal.querySelectorAll('[data-upload]').forEach(b=>b.onclick=()=>{const input=document.createElement('input');input.type='file';input.accept='image/*';if(b.dataset.camera)input.setAttribute('capture','environment');input.onchange=safely(async()=>{if(input.files[0])await cropImage(input.files[0],(url,original,mask)=>{draft[b.dataset.upload]=url;draft[b.dataset.upload+'Mask']=mask;if(b.dataset.upload==='question')draft.questionOriginal=original;show();},show);});input.click();});$('#save-card').onclick=safely(async()=>{if(!hasQuestion(draft))throw Error('請先加入題目照片或輸入題目文字。');const c={...draft,questionText:(draft.questionText||'').trim(),answerText:(draft.answerText||'').trim(),title:draft.title.trim()||`${draft.category}錯題 ${state.cards.length+1}`};if(!existing)Object.assign(c,{id:crypto.randomUUID(),streak:0,stage:-1,due:null,attempts:0,mistakes:0,created:Date.now()});await commit({...state,cards:existing?state.cards.map(x=>x.id===c.id?c:x):[c,...state.cards]});modal.close();render();toast(existing?'卡片已更新':'題目已收藏');});}show();}
async function cropImage(file,onSave,onCancel){if(!file.type.startsWith('image/'))throw Error('請選擇照片檔案。');if(file.size>35*1024*1024)throw Error('照片太大，請選擇 35 MB 以下的圖片。');const url=URL.createObjectURL(file),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('無法讀取這張照片，請改用 JPG、PNG 或 WebP。'));img.src=url;});}catch(e){URL.revokeObjectURL(url);throw e;}dialog('框選要保留的範圍','<p class="hint">拖曳畫出方框；拉動四邊調整大小，按住框內移動。點框上的 × 可清除，再重新框選。</p><div class="crop-wrap"><canvas id="crop" aria-label="拖曳框選照片範圍"></canvas></div><p class="muted" id="crop-state" aria-live="polite">目前保留整張照片</p><div class="actions"><button id="cancel-crop">取消</button><button id="full-crop">選取全圖</button><button class="primary" id="use-crop">使用這個範圍</button></div>');const canvas=$('#crop'),ctx=canvas.getContext('2d'),scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);const selection=mountCropSelection(canvas,img,$('#crop-state'));$('#full-crop').onclick=()=>selection.selectAll();const cancel=()=>{selection.destroy();onCancel();};$('#cancel-crop').onclick=cancel;renderAnswers(modal);modal.querySelector('.close').onclick=cancel;modal.addEventListener('close',()=>selection.destroy(),{once:true});$('#use-crop').onclick=safely(()=>{const box=selection.getBox();if(box.w<15||box.h<15)throw Error('範圍太小，請重新框選。');const out=document.createElement('canvas');out.width=Math.round(box.w);out.height=Math.round(box.h);const context=out.getContext('2d');context.fillStyle='white';context.fillRect(0,0,out.width,out.height);context.drawImage(img,box.x/scale,box.y/scale,box.w/scale,box.h/scale,0,0,out.width,out.height);selection.destroy();manualErase(out,dialog,(edited,back,mask)=>previewCompression(out,url=>onSave(url,url,mask),back,mask),()=>cropImage(file,onSave,onCancel));});URL.revokeObjectURL(url);}
