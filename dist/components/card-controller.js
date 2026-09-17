import {AI_PROMPT,copyCardImage,copyCardWithPrompt,copyPrompt,downloadCard} from '../ai-copy.js?v=copyall1';
import {previewAnswer} from '../math-answer.js?v=bare1';
import {hasQuestion,hasAnswer} from '../domain.js';
import {photoAttributes} from '../image-view.js?v=pick1';
import {esc,formatDate} from '../ui.js';
import {cardStatus} from '../pages/library-page.js';

export function createCardController({getState,getDefaultCategory,cardService,imageWorkflow,dialog,modal,toast,safely,renderApp,optionsHtml,openQuickAdd,query=document.querySelector.bind(document)}){
  function aiControls(card,key){return card[key]?`<details class="ai-copy card-tools"><summary>AI 工具（選用）</summary><div class="ai-copy-body"><div class="row" style="flex-wrap:wrap"><button data-ai-all="${key}">全部複製</button><button data-ai-image="${key}">複製圖片</button><button data-ai-prompt>複製指令</button><button data-ai-download="${key}">下載圖片</button></div></div></details>`:'';}
  function bindAi(card){
    const prompt=()=>getState().aiPrompt||AI_PROMPT;
    modal.querySelectorAll('[data-ai-all]').forEach(button=>button.onclick=safely(async()=>{try{await copyCardWithPrompt(card,button.dataset.aiAll,prompt());}catch{throw Error('全部複製失敗，請分別使用「複製圖片」及「複製指令」。');}toast('已複製圖片與 AI 指令');}));
    modal.querySelectorAll('[data-ai-image]').forEach(button=>button.onclick=safely(async()=>{try{await copyCardImage(card,button.dataset.aiImage);}catch{throw Error('圖片複製失敗，請改用「下載圖片」。');}toast('已複製圖片，接著複製 AI 指令。');}));
    modal.querySelectorAll('[data-ai-prompt]').forEach(button=>button.onclick=safely(async()=>{await copyPrompt(prompt());toast('辨識指令已複製');}));
    modal.querySelectorAll('[data-ai-download]').forEach(button=>button.onclick=safely(async()=>{await downloadCard(card,button.dataset.aiDownload);toast('圖片已準備下載');}));
  }
  const questionContent=card=>(card.question?`<img class="photo-preview" ${photoAttributes(card.question,false,card.questionMask)} alt="題目">`:'')+(card.questionText?.trim()?`<div class="question-text">${esc(card.questionText)}</div>`:'');
  const answerContent=card=>(card.answer?`<img class="photo-preview" ${photoAttributes(card.answer,false,card.answerMask)} alt="答案">`:'')+(card.answerText?.trim()?`<div class="answer-text">${esc(card.answerText)}</div>`:'');

  function view(id){
    const card=getState().cards.find(item=>item.id===id);if(!card)return;
    dialog(esc(card.title),`<div class="row between card-summary"><span class="tag">${esc(card.category)}${card.chapter?` · ${esc(card.chapter)}`:''}</span><span class="muted">${cardStatus(card)}</span></div><section class="card-detail-section"><h3>題目</h3>${questionContent(card)}${aiControls(card,'question')}</section><section class="card-detail-section"><h3>答案</h3>${hasAnswer(card)?answerContent(card):'<p class="hint">還沒有答案，補上後就可以加入練習。</p>'}${aiControls(card,'answer')}</section><p class="muted card-history">練習 ${card.attempts} 次 · 答錯 ${card.mistakes} 次 · 建立於 ${formatDate(card.created)}</p><div class="actions"><button class="danger" id="delete-card">刪除</button><button class="primary" id="edit-card">${hasAnswer(card)?'編輯':'補上答案'}</button></div>`);
    bindAi(card);query('#edit-card').onclick=()=>edit(card);query('#delete-card').onclick=()=>{
      dialog('刪除這道題目？',`<p>「${esc(card.title)}」的照片將被刪除。過去的練習次數會保留在統計中。</p><div class="actions"><button id="cancel-delete">取消</button><button class="danger" id="confirm-delete">刪除題目</button></div>`);
      query('#cancel-delete').onclick=()=>view(card.id);query('#confirm-delete').onclick=safely(async()=>{await cardService.remove(card.id);modal.close();renderApp();toast('題目已刪除');});
    };
  }

  function edit(existing,full=false){
    if(!existing&&!full)return openQuickAdd();
    const draft=existing?{...existing}:{title:'',category:getDefaultCategory()||getState().categories[0],chapter:'',question:null,answer:null};
    function show(){
      dialog(existing?'編輯題目卡':'新增題目卡',`<div class="form-row"><label class="field" for="card-title">題目名稱</label><input id="card-title" maxlength="100" placeholder="例如：一元二次方程式・第 5 題" value="${esc(draft.title)}"></div><div class="card-classification"><div><label class="field" for="card-category">科目</label><select id="card-category">${optionsHtml(draft.category)}</select></div><div><label class="field" for="card-chapter">章節（選填）</label><input id="card-chapter" list="card-chapters" maxlength="60" value="${esc(draft.chapter||'')}" placeholder="例如：一元二次方程式"><datalist id="card-chapters">${[...new Set(getState().cards.filter(card=>card.category===draft.category&&card.chapter).map(card=>card.chapter))].sort().map(chapter=>`<option value="${esc(chapter)}"></option>`).join('')}</datalist></div></div>${['question','answer'].map((key,index)=>`<div class="upload"><h3>${index?'02 答案卡 <span class="muted">（可稍後補上）</span>':'01 題目卡'}</h3>${draft[key]?`<img class="photo-preview" ${photoAttributes(draft[key],false,draft[key+'Mask'])} alt="${index?'答案':'題目'}預覽">`:`<p>${index?'拍下解答，和這道題目配對。':'拍照或選取照片，拖曳框選題目範圍。'}</p>`}<div class="row" style="justify-content:center;flex-wrap:wrap"><button data-upload="${key}" data-camera="true">${draft[key]?'重拍':'拍照'}</button><button data-upload="${key}">選擇圖片</button>${draft[key]?`<button data-erase="${key}">編輯抹除</button><button class="danger" data-remove-image="${key}">刪除圖片</button>`:''}${index?`<button id="answer-from-question" ${!draft.questionOriginal?'disabled':''}>使用題目卡原始圖片</button>`:''}</div>${aiControls(draft,key)}<details class="manual-answer card-tools" ${draft[key+'Text']?.trim()||!draft[key]?'open':''}><summary>手動輸入${index?'答案':'題目'}（選用）</summary><div class="manual-answer-body"><textarea id="card-${key}-text" rows="5" maxlength="10000" aria-label="手動輸入${index?'答案':'題目'}" placeholder="輸入${index?'答案與解題步驟':'題目與選項'}，支援 Markdown 與 $...$ 公式。">${esc(draft[key+'Text']||'')}</textarea><label class="field">${index?'答案':'題目'}預覽</label><div id="${key}-text-preview" class="${key}-text"></div></div></details>${index?'<p class="muted">使用裁切後、抹除前的圖片。舊卡若未保留原圖，請重新選圖。</p>':''}</div>`).join('')}<div class="actions"><button id="cancel-edit">取消</button><button class="primary" id="save-card" ${!hasQuestion(draft)?'disabled':''}>儲存卡片</button></div>`);
      bindAi(draft);const updateSave=()=>query('#save-card').disabled=!hasQuestion(draft);
      for(const key of ['question','answer']){const update=()=>previewAnswer(query(`#${key}-text-preview`),draft[key+'Text']||'');query(`#card-${key}-text`).oninput=event=>{draft[key+'Text']=event.target.value;update();updateSave();};update();}
      query('#card-title').oninput=event=>draft.title=event.target.value;query('#card-category').onchange=event=>{draft.category=event.target.value;draft.chapter='';show();};query('#card-chapter').oninput=event=>draft.chapter=event.target.value;query('#cancel-edit').onclick=()=>modal.close();
      query('#answer-from-question').onclick=()=>{if(!draft.questionOriginal)return;draft.answer=draft.questionOriginal;draft.answerMask={version:1,width:1,height:1,strokes:[]};show();};
      modal.querySelectorAll('[data-remove-image]').forEach(button=>button.onclick=()=>{const key=button.dataset.removeImage;draft[key]=null;delete draft[key+'Mask'];if(key==='question')delete draft.questionOriginal;show();});
      modal.querySelectorAll('[data-erase]').forEach(button=>button.onclick=safely(()=>imageWorkflow.edit(draft[button.dataset.erase],draft[button.dataset.erase+'Mask'],mask=>{draft[button.dataset.erase+'Mask']=mask;show();},show)));
      modal.querySelectorAll('[data-upload]').forEach(button=>button.onclick=()=>{const input=document.createElement('input');input.type='file';input.accept='image/*';if(button.dataset.camera)input.setAttribute('capture','environment');input.onchange=safely(async()=>{if(input.files[0])await imageWorkflow.crop(input.files[0],(url,original,mask)=>{draft[button.dataset.upload]=url;draft[button.dataset.upload+'Mask']=mask;if(button.dataset.upload==='question')draft.questionOriginal=original;show();},show);});input.click();});
      query('#save-card').onclick=safely(async()=>{await cardService.save(draft,{existingId:existing?.id||null});modal.close();renderApp();toast(existing?'卡片已更新':'題目已收藏');});
    }
    show();
  }

  return {view,edit,questionContent,answerContent};
}
