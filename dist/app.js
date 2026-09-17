import {needsManual} from './manual.js';
import {renderAnswers} from './math-answer.js?v=bare1';
import {initialState} from './domain.js';
import {load,save} from './storage.js';
import {observeImages} from './image-view.js?v=pick1';
import {startQuickAdd} from './quick-add.js?v=chapter1';
import {renderExam as renderExamPage} from './exam.js?v=iosscale1';
import {$,esc} from './ui.js';
import {createLibraryPage} from './pages/library-page.js';
import {createPracticePage} from './pages/practice-page.js';
import {renderStatisticsPage,cardCounts} from './pages/statistics-page.js';
import {renderManualPage} from './pages/manual-page.js';
import {createSettingsPage} from './pages/settings-page.js';
import {createCardService} from './application/card-service.js';
import {createCategoryService} from './application/category-service.js';
import {createPracticeService} from './application/practice-service.js';
import {createSettingsService} from './application/settings-service.js';
import {createAppStore} from './application/app-store.js';
import {createImageWorkflow} from './workflows/image-workflow.js';
import {createCardController} from './components/card-controller.js';

function quickAdd(){return startQuickAdd({dialog,getState:store.getState,saveCard:draft=>cardService.save(draft),render,toast,openFull:()=>cardController.edit(null,true)});}
function renderExam(){return renderExamPage({root:$('#main'),state:store.getState(),optionsHtml:opts('',true),toast});}
let tab='library',timer;
const app=$('#app'),modal=$('#modal');
const store=createAppStore({createInitialState:initialState,loadState:load,saveState:save});
const cardService=createCardService({getState:store.getState,commit:store.commit});
const categoryService=createCategoryService({getState:store.getState,commit:store.commit});
const practiceService=createPracticeService({getState:store.getState,commit:store.commit});
const settingsService=createSettingsService({getState:store.getState,commit:store.commit});
const imageWorkflow=createImageWorkflow({dialog,modal,safely,renderAnswers,query:$});
let libraryPage;
const cardController=createCardController({
 getState:store.getState,
 getDefaultCategory:()=>libraryPage.category,
 cardService,
 imageWorkflow,
 dialog,
 modal,
 toast,
 safely,
 renderApp:()=>render(),
 optionsHtml:opts,
 openQuickAdd:quickAdd,
 query:$
});
libraryPage=createLibraryPage({getState:store.getState,getRoot:()=>$('#main'),onAdd:()=>cardController.edit(),onOpen:cardController.view});
const practicePage=createPracticePage({
 getState:store.getState,
 getRoot:()=>$('#main'),
 practiceService,
 renderApp:nextTab=>render(nextTab),
 dialog,
 modal,
 toast,
 safely,
 optionsHtml:opts,
 questionContent:cardController.questionContent,
 answerContent:cardController.answerContent
});
const settingsPage=createSettingsPage({
 getState:store.getState,
 getRoot:()=>$('#main'),
 categoryService,
 settingsService,
 dialog,
 modal,
 toast,
 safely,
 onCategoryRenamed:(oldName,name)=>{if(libraryPage.category===oldName)libraryPage.category=name;},
 onCategoryRemoved:category=>{if(libraryPage.category===category)libraryPage.category='';},
 onDataReplaced:()=>{libraryPage.reset();practicePage.clear();render();}
});
store.setWriteGuard(()=>settingsPage.busy?'備份處理中，請完成後再修改題庫。':null);
async function init(){
 try{
  ($('#main')||$('main')).innerHTML='<section class="empty"><h2>正在讀取題庫…</h2><p>首次升級會轉換照片，完成前請保持此頁開啟。</p></section>';
  const {saved}=await store.initialize();if(needsManual())tab='manual';render();registerTools();
  if(!saved){dialog('開始使用拾題','<p>照片與進度保存在目前裝置的瀏覽器，可用 ZIP 備份在裝置間搬移。</p><p class="hint">沒有自動雲端同步，請定期匯出備份。</p><div class="actions"><button class="primary" id="accept-local">使用此裝置儲存</button></div>');$('#accept-local').onclick=safely(async()=>{await store.commit(store.getState());modal.close();navigator.storage?.persist?.().catch(()=>{});});}
 }catch(error){
  const main=$('#main')||$('main');main.innerHTML=`<section class="empty"><h2>暫時無法讀取題庫</h2><p>${esc(error.message)}</p><button onclick="location.reload()">重新載入</button>${error.legacyBackup?'<button id="rescue-backup">匯出原始題庫</button>':''}</section>`;
  if(error.legacyBackup)$('#rescue-backup').onclick=safely(()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(error.legacyBackup)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='拾題升級前備份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);});
 }
}
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});const tools=[{name:'get_question_book_summary',description:'讀取題目數量、熟練度、分類和練習次數。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>{const state=store.getState();return {...cardCounts(state),categories:state.categories,attempts:state.history.length,target:state.target};}},{name:'add_question_category',description:'新增錯題分類並更新畫面。',inputSchema:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:30}},required:['name'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(practicePage.active)throw Error('請先結束目前練習。');const result=await categoryService.add(input?.name);render();return result;}},{name:'start_question_practice',description:'開始練習並顯示第一道題目，不提交作答。',inputSchema:{type:'object',properties:{category:{type:'string'},count:{type:'integer',minimum:1,maximum:200},mode:{type:'string',enum:['recommended','due','all']}},required:['count','mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(practicePage.active)throw Error('請先完成或結束目前的練習。');return practicePage.start(input?.category||'',input?.mode,input?.count);}}];for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}}
window.addEventListener('beforeunload',e=>{if(store.busy){e.preventDefault();e.returnValue='';}});
let stopImages=observeImages();
window.addEventListener('pagehide',()=>stopImages());
window.addEventListener('pageshow',event=>{if(event.persisted)stopImages=observeImages();});
init();
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';if(modal.open){let note=modal.querySelector('.modal-status');if(!note){note=document.createElement('p');note.className='hint modal-status';note.setAttribute('role','status');modal.append(note);}note.textContent=message;}clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.display='none',4200);}
function dialog(title,body){modal.innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="close" aria-label="關閉">×</button></div>${body}`;renderAnswers(modal);modal.querySelector('.close').onclick=()=>modal.close();if(!modal.open)modal.showModal();}
function safely(fn){return async e=>{const b=e?.currentTarget;try{if(b?.tagName==='BUTTON')b.disabled=true;await fn(e);}catch(error){toast(error.message||'操作失敗，請再試一次。');}finally{if(b?.isConnected)b.disabled=false;}};}
function opts(selected='',all=false){return(all?'<option value="">全部分類</option>':'')+store.getState().categories.map(c=>`<option ${c===selected?'selected':''} value="${esc(c)}">${esc(c)}</option>`).join('');}
function render(nextTab){if(nextTab)tab=nextTab;app.innerHTML=`<header><a class="brand" href="#">▣ 拾題 <small>錯題本</small></a><span>每一道錯題，都有下一次進步。</span></header><nav aria-label="主要選單">${[['library','▦','我的題庫'],['practice','▹','開始練習'],['exam','▤','產生考卷'],['stats','◷','學習統計'],['settings','⚙','設定與資料'],['manual','?','使用說明']].map(([key,icon,label])=>`<button data-tab="${key}" class="${tab===key?'active':''}" aria-current="${tab===key?'page':'false'}">${icon}　${label}</button>`).join('')}</nav><main id="main"></main><footer>拾題 · 讓每次練習都算數</footer>`;app.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{const go=()=>render(button.dataset.tab);if(practicePage.active&&tab==='practice'&&button.dataset.tab!=='practice')practicePage.confirmLeave(go);else go();});$('.brand').onclick=event=>{event.preventDefault();const go=()=>render('library');practicePage.active?practicePage.confirmLeave(go):go();};if(tab==='library')libraryPage.render();else if(tab==='practice')practicePage.render();else if(tab==='exam')renderExam();else if(tab==='stats')renderStatisticsPage($('#main'),store.getState());else if(tab==='manual')renderManualPage($('#main'),{onDone:()=>render('library'),toast});else settingsPage.render();}
