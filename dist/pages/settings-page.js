import {AI_PROMPT} from '../ai-copy.js?v=share1';
import {exportArchive,readBackup} from '../backup.js';
import {storageDescription} from '../storage.js';
import {esc,pageHeading} from '../ui.js';

export function createSettingsPage({
  getState,
  getRoot,
  categoryService,
  settingsService,
  dialog,
  modal,
  toast,
  safely,
  onCategoryRenamed,
  onCategoryRemoved,
  onDataReplaced
}){
  let backupBusy=false;

  function addResetControl(){
    const state=getState(),root=getRoot();
    const section=document.createElement('section');
    section.className='panel';
    section.innerHTML='<h2>重置資料庫</h2><p>清除這個瀏覽器中的所有題目、照片與練習紀錄，並將分類及熟練門檻恢復預設值。</p><button class="danger" id="reset-database">重置資料庫</button>';
    root.append(section);
    root.querySelector('#reset-database').onclick=()=>{
      dialog('確定重置資料庫？',`<p>將永久清除目前的 <strong>${state.cards.length} 道題目</strong>（含題目與答案照片）、<strong>${state.history.length} 筆作答紀錄</strong>及所有熟練進度。</p><p>分類恢復為國文、英文、數學、自然、社會，連續答對門檻恢復為 3 次。只影響目前瀏覽器，已匯出的備份不受影響。</p><p class="hint">此操作無法復原。需要保留資料時，請先匯出備份。</p><label class="field" for="reset-confirmation">請輸入「重置」以確認</label><input id="reset-confirmation" autocomplete="off" placeholder="重置"><div class="actions"><button id="backup-before-reset">先匯出備份</button><button id="cancel-reset">取消</button><button class="danger" id="confirm-reset" disabled>清除全部資料</button></div>`);
      modal.querySelector('#backup-before-reset').onclick=()=>root.querySelector('#export-data').click();
      modal.querySelector('#cancel-reset').onclick=()=>modal.close();
      modal.querySelector('#reset-confirmation').oninput=event=>{modal.querySelector('#confirm-reset').disabled=event.target.value.trim()!=='重置';};
      modal.querySelector('#confirm-reset').onclick=safely(async()=>{
        if(modal.querySelector('#reset-confirmation').value.trim()!=='重置')throw Error('請輸入「重置」以確認。');
        await settingsService.reset();
        modal.close();
        onDataReplaced();
        toast('資料庫已重置，所有題目與練習紀錄已清除');
      });
    };
  }

  function renderContent(){
    const state=getState(),root=getRoot();
    root.innerHTML=pageHeading('MAKE IT YOURS','設定與資料','調整練習節奏，讓題庫跟著你走。')+`<div class="split"><div><section class="panel"><h2>自訂分類</h2><div>${state.categories.map(category=>`<div class="row between category-row"><span>${esc(category)} <small class="muted">${state.cards.filter(card=>card.category===category).length} 題</small></span><div class="row"><button data-rename="${esc(category)}" style="padding:6px 10px;font-size:14px">更名</button><button data-remove="${esc(category)}" style="padding:6px 10px;font-size:14px" ${state.categories.length===1||state.cards.some(card=>card.category===category)?'disabled':''}>刪除</button></div></div>`).join('')}</div><form id="category-form" class="row" style="margin-top:20px"><input id="new-category" aria-label="新增分類名稱" placeholder="例如：自然、社會" maxlength="30" required><button class="primary" type="submit" style="white-space:nowrap">新增</button></form><p class="muted">有題目的分類需先移動或刪除題目，才能刪除分類。</p></section><section class="panel"><h2>熟練門檻</h2><label class="field" for="target-count">連續答對幾次後，進入間隔複習？</label><div class="row"><input id="target-count" type="number" min="1" max="10" value="${state.target}"><button id="save-target" style="white-space:nowrap">儲存</button></div><p class="muted">調整套用在下一次作答；已進入間隔複習的題目不受影響。答錯一律歸零。30 天階段後持續每 30 天複習。</p></section><section class="panel"><h2>AI 辨識指令</h2><label class="field" for="ai-prompt-setting">分享或複製圖片時使用的指令</label><textarea id="ai-prompt-setting" rows="9" maxlength="10000">${esc(state.aiPrompt||AI_PROMPT)}</textarea><div class="actions"><button id="reset-ai-prompt">恢復預設</button><button class="primary" id="save-ai-prompt">儲存指令</button></div></section></div><section class="panel" style="align-self:start"><span class="tag">資料搬移</span><h2 style="margin-top:16px">把你的努力，一起帶走。</h2><p>備份包含題目與答案照片、分類、熟練度和所有練習紀錄。</p><div class="form-row"><button class="primary wide" id="export-data">↓ 匯出完整備份</button></div><div class="form-row"><button class="wide" id="import-data">↑ 匯入備份檔案</button><input type="file" id="import-file" accept=".zip,.json,application/zip,application/json" hidden></div><p class="hint">在另一台裝置開啟拾題，選擇「匯入備份檔案」即可搬移。匯入前會顯示摘要，確認後取代目前資料。</p><p class="muted">${storageDescription}</p></section></div>`;

    root.querySelector('#category-form').onsubmit=safely(async event=>{
      event.preventDefault();
      await categoryService.add(root.querySelector('#new-category').value);
      render();
      toast('分類已新增');
    });
    root.querySelectorAll('[data-rename]').forEach(button=>button.onclick=()=>{
      const oldName=button.dataset.rename;
      dialog('更改分類名稱',`<label class="field" for="rename-category">分類名稱</label><input id="rename-category" maxlength="30" value="${esc(oldName)}"><div class="actions"><button class="primary" id="confirm-rename">儲存名稱</button></div>`);
      modal.querySelector('#confirm-rename').onclick=safely(async()=>{
        const {name}=await categoryService.rename(oldName,modal.querySelector('#rename-category').value);
        onCategoryRenamed(oldName,name);
        modal.close();
        render();
      });
    });
    root.querySelectorAll('[data-remove]').forEach(button=>button.onclick=safely(async()=>{
      const category=button.dataset.remove;
      await categoryService.remove(category);
      onCategoryRemoved(category);
      render();
    }));
    root.querySelector('#save-target').onclick=safely(async()=>{
      await settingsService.setTarget(root.querySelector('#target-count').value);
      toast('熟練門檻已儲存');
    });
    root.querySelector('#save-ai-prompt').onclick=safely(async()=>{
      await settingsService.setAiPrompt(root.querySelector('#ai-prompt-setting').value);
      toast('AI 辨識指令已儲存');
    });
    root.querySelector('#reset-ai-prompt').onclick=()=>{root.querySelector('#ai-prompt-setting').value=AI_PROMPT;};
    root.querySelector('#export-data').onclick=safely(async()=>{
      if(backupBusy)throw Error('備份處理中。');
      backupBusy=true;
      const exportButton=root.querySelector('#export-data');
      exportButton.textContent='準備備份…';
      try{
        const blob=await exportArchive(getState(),(current,total)=>exportButton.textContent=`準備備份 ${current} / ${total}`);
        const url=URL.createObjectURL(blob),link=document.createElement('a');
        link.href=url;
        link.download=`拾題備份-${new Date().toISOString().slice(0,10)}.zip`;
        link.click();
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        toast('備份檔案已準備下載');
      }finally{
        backupBusy=false;
        if(exportButton.isConnected)exportButton.textContent='↓ 匯出完整備份';
      }
    });
    root.querySelector('#import-data').onclick=()=>root.querySelector('#import-file').click();
    root.querySelector('#import-file').onchange=safely(async event=>{
      const file=event.target.files[0];
      event.target.value='';
      if(!file)return;
      const {data:next,assets}=await readBackup(file);
      dialog('確認匯入這份備份？',`<p>備份包含 <strong>${next.cards.length} 道題目</strong>、${next.categories.length} 個分類、${next.history.length} 次練習紀錄。</p><p class="hint">將取代目前 ${getState().cards.length} 道題目與練習紀錄。建議先匯出目前資料，避免遺失。</p><div class="actions"><button id="cancel-import">取消</button><button class="primary" id="confirm-import">取代並匯入</button></div>`);
      modal.querySelector('#cancel-import').onclick=()=>modal.close();
      modal.querySelector('#confirm-import').onclick=safely(async()=>{
        await settingsService.replace(next,assets);
        modal.close();
        onDataReplaced();
        toast('匯入完成，照片與練習進度已還原');
      });
    });
  }

  function render(){
    renderContent();
    const state=getState(),root=getRoot();
    const importButton=root.querySelector('#import-data');
    const note=document.createElement('p');
    note.className='hint';
    note.textContent='新版備份為 ZIP（上限 512 MB），共用照片只存一份；也可匯入舊 JSON 備份（上限 200 MB）。';
    importButton.parentElement.after(note);
    const capacity=document.createElement('p');
    capacity.className='muted';
    const slots=state.cards.flatMap(card=>[card.question,card.answer]).filter(Boolean),unique=new Set(slots).size;
    capacity.textContent=`${slots.length} 個照片位置，共用 ${unique} 份圖片。`;
    note.after(capacity);
    navigator.storage?.estimate?.().then(result=>{
      if(capacity.isConnected&&Number.isFinite(result.usage))capacity.textContent+=` 此網站來源使用約 ${(result.usage/1048576).toFixed(1)} MB（含快取等資料）。`;
    }).catch(()=>{});
    addResetControl();
  }

  return {render,get busy(){return backupBusy;}};
}
