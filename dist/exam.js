import {shuffled} from './domain.js';
import {photoAttributes} from './image-view.js';
import {renderAnswers} from './math-answer.js?v=bare1';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let currentExam=null;

const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));
export const examZoom=value=>Math.max(.3,Math.min(1.6,Number(value)||1));
const touchDistance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);

export function examImageFilter(mode='document',background=35,ink=45){
  if(mode==='original')return 'none';
  const white=clamp(background),dark=clamp(ink);
  if(mode==='high-contrast')return `grayscale(1) brightness(${(1.02+white*.0025).toFixed(3)}) contrast(${(2+dark*.025).toFixed(3)})`;
  return `grayscale(1) brightness(${(1+white*.002).toFixed(3)}) contrast(${(1.15+dark*.012).toFixed(3)})`;
}

export function practiceMatch(card,practice='all'){
  return practice==='all'||practice==='unseen'&&card.attempts===0||practice==='low'&&card.attempts>=1&&card.attempts<=2||practice==='practiced'&&card.attempts>=3||practice==='wrong'&&card.mistakes>0||practice==='frequent'&&card.mistakes>=2;
}

export function examPool(cards,category='',scope='all',now=Date.now(),chapters=[],practice='all'){
  return cards.filter(card=>(!category||card.category===category)&&(!chapters.length||chapters.includes(card.chapter||''))&&practiceMatch(card,practice)&&(
    scope==='all'||
    scope==='learning'&&card.stage<0||
    scope==='due'&&card.stage>=0&&card.due<=now
  ));
}

export function selectExamCards(cards,{category='',chapters=[],scope='all',practice='all',count=20,random=Math.random,now=Date.now()}={}){
  if(!Number.isInteger(count)||count<1||count>200)throw Error('題數請輸入 1 到 200 的整數。');
  if(!['all','learning','due'].includes(scope))throw Error('無效的出題範圍。');
  return shuffled(examPool(cards,category,scope,now,chapters,practice),random).slice(0,count);
}

export function recommendedExamCards(cards,count=20,random=Math.random,now=Date.now()){
  return shuffled(cards,random).sort((a,b)=>{
    const score=card=>(card.stage>=0&&card.due<=now?100:0)+(card.mistakes||0)*12+(card.attempts===0?20:0)+(card.stage<0?10:0);
    return score(b)-score(a);
  }).slice(0,count);
}

export function paginateExamCards(cards,perPage=10){
  if(!Number.isInteger(perPage)||perPage<1)throw Error('每頁題數必須是正整數。');
  const pages=[];for(let index=0;index<cards.length;index+=perPage)pages.push(cards.slice(index,index+perPage));return pages;
}

const content=(card,key)=>{
  const image=card[key]?`<img class="exam-photo" ${photoAttributes(card[key],false,card[key+'Mask'])} alt="${key==='question'?'題目':'答案'}">`:'';
  const text=card[key+'Text']?.trim()?`<div class="${key}-text">${esc(card[key+'Text'])}</div>`:'';
  return image+text;
};

function examPage(exam,cards,pageIndex,totalPages,type){
  const start=pageIndex*10,split=Math.ceil(cards.length/2);
  const item=(card,offset)=>{const number=start+offset+1,hasAnswer=Boolean(card.answer||card.answerText?.trim());return type==='answer'?`<article class="exam-answer"><h3>${number}. ${esc(card.title)}</h3>${hasAnswer?content(card,'answer'):`<p class="exam-answer-note">尚未建立答案，以下顯示原題。</p>${content(card,'question')}`}</article>`:`<article class="exam-item"><h3><span>${number}.</span> ${esc(card.title)}</h3>${content(card,'question')}<div class="exam-workspace" aria-hidden="true"></div></article>`;};
  const column=(items,offset)=>`<div class="exam-column">${items.map((card,index)=>item(card,offset+index)).join('')}</div>`;
  return `<section class="exam-paper ${type==='answer'?'exam-answers':''}"><header><div class="exam-heading"><div><p>${type==='answer'?'ANSWER SHEET':'QUESTION PAPER'}</p><h1>${esc(exam.title)}${type==='answer'?'｜答案卷':''}</h1></div><strong>${pageIndex+1} / ${totalPages}</strong></div>${type==='question'?'<div class="exam-meta"><span>姓名：________________</span><span>日期：________________</span><span>得分：________</span></div>':''}</header><div class="exam-columns">${column(cards.slice(0,split),0)}${column(cards.slice(split),split)}</div></section>`;
}

function paper(exam){
  const pages=paginateExamCards(exam.cards,10),questions=pages.map((cards,index)=>examPage(exam,cards,index,pages.length,'question')).join('');
  const answers=exam.includeAnswers?pages.map((cards,index)=>examPage(exam,cards,index,pages.length,'answer')).join(''):'';
  return questions+answers;
}

export function renderExam({root,state,optionsHtml,toast}){
  if(currentExam){
    root.innerHTML=`<div class="exam-controls"><button id="exam-back">← 重新設定</button><div class="row">${currentExam.selectionMode==='manual'?'':'<button id="exam-reroll">重新抽題</button>'}<button class="primary" id="exam-print">直接列印</button></div></div><section class="exam-image-controls exam-screen-note" aria-label="列印圖片調整"><div class="exam-image-mode"><label class="field" for="exam-image-mode">列印圖片</label><select id="exam-image-mode"><option value="original">原圖</option><option value="document">黑白文件</option><option value="high-contrast">高對比黑白（測試）</option></select></div><label>背景更白 <input id="exam-background" type="range" min="0" max="100" value="${currentExam.background}"></label><label>文字更深 <input id="exam-ink" type="range" min="0" max="100" value="${currentExam.ink}"></label><p id="exam-image-note" class="muted" aria-live="polite"></p></section><section class="exam-zoom-controls exam-screen-note" aria-label="考卷預覽縮放"><button id="exam-zoom-out" aria-label="縮小考卷">−</button><input id="exam-zoom" type="range" min="30" max="160" step="5" aria-label="考卷縮放比例"><button id="exam-zoom-in" aria-label="放大考卷">＋</button><button id="exam-zoom-fit">符合螢幕</button><output id="exam-zoom-value"></output><span>可在考卷上雙指縮放</span></section><p class="hint exam-screen-note">已選 ${currentExam.cards.length} 題。考卷固定為 A4 雙欄，手機方向不會改變版面。圖片調整只套用在預覽、列印與 PDF，不會修改題庫原圖。</p><div id="exam-output" class="exam-viewport"><div id="exam-stage"><div id="exam-pages">${paper(currentExam)}</div></div></div>`;
    renderAnswers(root);
    const output=root.querySelector('#exam-pages'),stage=root.querySelector('#exam-stage'),viewport=root.querySelector('#exam-output'),mode=root.querySelector('#exam-image-mode'),background=root.querySelector('#exam-background'),ink=root.querySelector('#exam-ink'),note=root.querySelector('#exam-image-note');
    mode.value=currentExam.imageMode;
    const applyImageMode=()=>{currentExam.imageMode=mode.value;currentExam.background=Number(background.value);currentExam.ink=Number(ink.value);const original=mode.value==='original';background.disabled=original;ink.disabled=original;output.style.setProperty('--exam-image-filter',examImageFilter(mode.value,currentExam.background,currentExam.ink));note.textContent=original?'保留照片原本的顏色與底色。':mode.value==='document'?'降低底色、保留較淡的圖形與線條；建議先用這個模式。':'底色最白且較省墨，但淡色細線可能消失，請先查看預覽。';};
    [mode,background,ink].forEach(control=>control.oninput=applyImageMode);applyImageMode();
    const zoom=root.querySelector('#exam-zoom'),zoomValue=root.querySelector('#exam-zoom-value');
    const syncStage=()=>{stage.style.width=`${output.offsetWidth*currentExam.viewScale}px`;stage.style.height=`${output.scrollHeight*currentExam.viewScale}px`;};
    const applyZoom=value=>{currentExam.viewScale=examZoom(value);output.style.transform=`scale(${currentExam.viewScale})`;zoom.value=String(Math.round(currentExam.viewScale*100));zoomValue.value=`${Math.round(currentExam.viewScale*100)}%`;requestAnimationFrame(syncStage);};
    const fit=()=>{const paperElement=output.querySelector('.exam-paper');if(!paperElement)return;currentExam.autoFit=true;applyZoom(Math.min(1,(viewport.clientWidth-4)/paperElement.offsetWidth));};
    zoom.oninput=()=>{currentExam.autoFit=false;applyZoom(Number(zoom.value)/100);};
    root.querySelector('#exam-zoom-out').onclick=()=>{currentExam.autoFit=false;applyZoom(currentExam.viewScale-.1);};
    root.querySelector('#exam-zoom-in').onclick=()=>{currentExam.autoFit=false;applyZoom(currentExam.viewScale+.1);};
    root.querySelector('#exam-zoom-fit').onclick=fit;
    let pinch=null;
    viewport.addEventListener('touchstart',event=>{if(event.touches.length===2)pinch={distance:touchDistance(event.touches),scale:currentExam.viewScale};},{passive:true});
    viewport.addEventListener('touchmove',event=>{if(!pinch||event.touches.length!==2)return;event.preventDefault();currentExam.autoFit=false;applyZoom(pinch.scale*touchDistance(event.touches)/pinch.distance);},{passive:false});
    viewport.addEventListener('touchend',event=>{if(event.touches.length<2)pinch=null;},{passive:true});
    currentExam.viewScale??=1;applyZoom(currentExam.viewScale);
    requestAnimationFrame(()=>{if(currentExam?.autoFit!==false)fit();});
    if(globalThis.ResizeObserver){new globalThis.ResizeObserver(syncStage).observe(output);new globalThis.ResizeObserver(()=>{if(currentExam?.autoFit)fit();}).observe(viewport);}
    root.querySelector('#exam-back').onclick=()=>{currentExam=null;renderExam({root,state,optionsHtml,toast});};
    const reroll=root.querySelector('#exam-reroll');if(currentExam.selectionMode==='hybrid')reroll?.remove();else reroll?.addEventListener('click',()=>{currentExam.cards=currentExam.selectionMode==='quick'?recommendedExamCards(state.cards,currentExam.count):selectExamCards(state.cards,currentExam);renderExam({root,state,optionsHtml,toast});});
    root.querySelector('#exam-print').onclick=()=>{window.print();setTimeout(()=>toast('若沒有出現列印視窗，請改用 Chrome、Edge 或 Safari 開啟本頁。'),300);};
    return;
  }
  root.innerHTML=`<div class="page-heading"><div><p class="eyebrow">MAKE A TEST</p><h1>自動產生考卷</h1><p>依科目與章節隨機抽題，或自行勾選題目。</p></div></div><div class="split"><section class="panel"><div class="form-row"><label class="field" for="exam-title">考卷名稱</label><input id="exam-title" maxlength="80" value="拾題練習卷"></div><section class="exam-step"><h3><span>1</span>選擇組卷方式</h3><div class="exam-mode-cards"><button type="button" data-exam-mode="quick"><strong>⚡ 快速推薦</strong><small>優先安排到期、常錯與少練題目</small></button><button type="button" data-exam-mode="custom"><strong>⚙ 自訂條件</strong><small>依科目、章節與練習狀態抽題</small></button><button type="button" data-exam-mode="manual"><strong>☑ 手動選題</strong><small>查看題目預覽並自行勾選</small></button></div><select id="exam-selection-mode" hidden><option value="quick">快速推薦</option><option value="custom">自訂條件</option><option value="manual">手動選題</option><option value="hybrid">手動補滿</option></select></section><section id="exam-advanced" class="exam-step"><h3><span>2</span>設定篩選條件</h3><div class="form-row"><label class="field" for="exam-category">科目</label><select id="exam-category">${optionsHtml}</select></div><div class="form-row"><label class="field">章節（未勾選代表全部）</label><div id="exam-chapters" class="exam-chapter-options"></div></div><div class="form-row"><label class="field" for="exam-scope">出題範圍</label><select id="exam-scope"><option value="all">所有題目</option><option value="learning">待熟練題目</option><option value="due">已到期的間隔複習</option></select></div><div class="form-row"><label class="field" for="exam-practice">練習狀態</label><select id="exam-practice"><option value="all">不限練習次數</option><option value="unseen">未練習（0 次）</option><option value="low">練習較少（1–2 次）</option><option value="practiced">練習多次（3 次以上）</option><option value="wrong">曾經答錯</option><option value="frequent">經常答錯（2 次以上）</option></select></div></section><div class="form-row" id="exam-count-row"><label class="field" for="exam-count">題數</label><div class="row count-options"><button data-exam-count="10">10 題</button><button data-exam-count="20" class="active">20 題</button><button data-exam-count="30">30 題</button><input id="exam-count" type="number" min="1" max="200" value="20" aria-label="自訂考卷題數"></div></div><section id="exam-manual" class="exam-manual" hidden><div class="row between"><strong>2　挑選題目</strong><div class="row"><button id="exam-select-all">全選目前結果</button><button id="exam-show-selected" aria-pressed="false">只看已選</button><button id="exam-clear-selection">清除</button></div></div><label class="exam-check compact"><input id="exam-auto-fill" type="checkbox"> 不足目標題數時，由系統自動補滿</label><p id="exam-selected-count" class="muted"></p><div id="exam-manual-list"></div></section><h3 class="exam-confirm-title"><span>3</span>確認輸出</h3><label class="exam-check"><input id="exam-answers" type="checkbox" checked> 在題目卷後附上答案卷</label><div class="exam-build-bar"><p id="exam-available" class="hint"></p><button class="primary" id="exam-generate">產生考卷 →</button></div></section><aside><section class="panel"><span class="tag">列印與 PDF</span><h2>一份題庫，多種練習。</h2><p>可依科目、章節及熟練狀態篩選。手動模式能調整已選題目的順序；沒有答案的卡片會在答案卷顯示原題。</p><p class="muted">考卷不會改變題目的熟練度；只有在「開始練習」中判定答對或答錯才會記錄進度。</p></section></aside></div>`;
  const category=root.querySelector('#exam-category'),scope=root.querySelector('#exam-scope'),practice=root.querySelector('#exam-practice'),count=root.querySelector('#exam-count'),advanced=root.querySelector('#exam-advanced'),selectionMode=root.querySelector('#exam-selection-mode'),chapterBox=root.querySelector('#exam-chapters'),manual=root.querySelector('#exam-manual'),manualList=root.querySelector('#exam-manual-list'),selectedCount=root.querySelector('#exam-selected-count'),available=root.querySelector('#exam-available'),generate=root.querySelector('#exam-generate'),autoFill=root.querySelector('#exam-auto-fill'),showSelectedButton=root.querySelector('#exam-show-selected');
  let manualIds=[],showSelected=false;
  const selectedChapters=()=>[...chapterBox.querySelectorAll('input:checked')].map(input=>input.value);
  const pool=()=>examPool(state.cards,category.value,scope.value,Date.now(),selectedChapters(),practice.value);
  const renderChapters=()=>{
    const values=[...new Set(state.cards.filter(card=>!category.value||card.category===category.value).map(card=>card.chapter||''))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
    chapterBox.innerHTML=values.length?values.map((chapter,index)=>`<label><input type="checkbox" value="${esc(chapter)}" id="exam-chapter-${index}"> ${esc(chapter||'未分類章節')}</label>`).join(''):'<span class="muted">目前沒有章節資料</span>';
    chapterBox.querySelectorAll('input').forEach(input=>input.onchange=update);
  };
  const move=(id,direction)=>{const index=manualIds.indexOf(id),next=index+direction;if(index<0||next<0||next>=manualIds.length)return;[manualIds[index],manualIds[next]]=[manualIds[next],manualIds[index]];renderManual();updateSummary();};
  const renderManual=()=>{
    const cards=pool(),allowed=new Set(cards.map(card=>card.id));manualIds=manualIds.filter(id=>allowed.has(id));const order=new Map(manualIds.map((id,index)=>[id,index]));
    const displayed=showSelected?manualIds.map(id=>cards.find(card=>card.id===id)).filter(Boolean):[...manualIds.map(id=>cards.find(card=>card.id===id)).filter(Boolean),...cards.filter(card=>!order.has(card.id))];
    manualList.innerHTML=displayed.length?displayed.map(card=>{const selected=order.has(card.id),position=order.get(card.id),preview=card.question?`<img class="exam-manual-preview" ${photoAttributes(card.question,true,card.questionMask)} alt="${esc(card.title)}題目預覽" loading="lazy">`:`<div class="exam-manual-preview question-text">${esc(card.questionText||'沒有題目預覽')}</div>`;return `<div class="exam-manual-row ${selected?'selected':''}"><label><input type="checkbox" data-exam-card="${esc(card.id)}" ${selected?'checked':''}>${preview}<span class="exam-manual-info"><strong>${esc(card.title)}</strong><small>${selected?`第 ${position+1} 題 · `:''}${esc(card.category)} · ${esc(card.chapter||'未分類章節')}</small><small>練習 ${card.attempts||0} 次 · 答錯 ${card.mistakes||0} 次</small></span></label>${selected?`<div class="exam-manual-order"><button data-move-up="${esc(card.id)}" aria-label="上移 ${esc(card.title)}" ${position===0?'disabled':''}>↑</button><button data-move-down="${esc(card.id)}" aria-label="下移 ${esc(card.title)}" ${position===manualIds.length-1?'disabled':''}>↓</button></div>`:''}</div>`;}).join(''):'<p class="muted">目前範圍沒有題目。</p>';
    renderAnswers(manualList);
    manualList.querySelectorAll('[data-exam-card]').forEach(input=>input.onchange=()=>{if(input.checked&&!manualIds.includes(input.dataset.examCard))manualIds.push(input.dataset.examCard);else if(!input.checked)manualIds=manualIds.filter(id=>id!==input.dataset.examCard);renderManual();updateSummary();});
    manualList.querySelectorAll('[data-move-up]').forEach(button=>button.onclick=()=>move(button.dataset.moveUp,-1));
    manualList.querySelectorAll('[data-move-down]').forEach(button=>button.onclick=()=>move(button.dataset.moveDown,1));
    selectedCount.textContent=`已選 ${manualIds.length} 題（最多 200 題）`;
  };
  const updateSummary=()=>{const cards=pool(),wanted=Number(count.value),valid=Number.isInteger(wanted)&&wanted>=1&&wanted<=200,mode=selectionMode.value,isManual=mode==='manual',isHybrid=mode==='hybrid';available.textContent=isManual?(manualIds.length?`手動選擇 ${manualIds.length} 題，依目前順序出題。`:'請從清單選擇至少一道題目。'):isHybrid?`手動指定 ${manualIds.length} 題，系統再補到 ${valid?wanted:0} 題。`:mode==='quick'?`系統將從 ${state.cards.length} 題中優先安排到期、常錯及少練題目，共 ${valid?Math.min(wanted,state.cards.length):0} 題。`:(cards.length?`目前條件有 ${cards.length} 題，考卷將抽出 ${valid?Math.min(wanted,cards.length):0} 題。`:'目前條件沒有可用題目。');generate.disabled=isManual?manualIds.length<1||manualIds.length>200:!valid||(mode==='quick'?!state.cards.length:!cards.length)||isHybrid&&manualIds.length>wanted;generate.textContent=isManual?`產生 ${manualIds.length} 題考卷 →`:`產生 ${valid?wanted:0} 題考卷 →`;root.querySelectorAll('[data-exam-count]').forEach(button=>button.classList.toggle('active',Number(button.dataset.examCount)===wanted));};
  function update(){const mode=selectionMode.value,isManual=mode==='manual',usesManual=isManual||mode==='hybrid',baseMode=usesManual?'manual':mode;advanced.hidden=mode==='quick';root.querySelector('#exam-count-row').hidden=isManual;manual.hidden=!usesManual;autoFill.checked=mode==='hybrid';root.querySelectorAll('[data-exam-mode]').forEach(button=>{const active=button.dataset.examMode===baseMode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});if(usesManual)renderManual();updateSummary();}
  category.onchange=()=>{manualIds=[];renderChapters();update();};scope.onchange=practice.onchange=update;count.oninput=update;selectionMode.onchange=update;
  root.querySelectorAll('[data-exam-mode]').forEach(button=>button.onclick=()=>{selectionMode.value=button.dataset.examMode==='manual'?(autoFill.checked?'hybrid':'manual'):button.dataset.examMode;update();});
  autoFill.onchange=()=>{selectionMode.value=autoFill.checked?'hybrid':'manual';update();};
  root.querySelectorAll('[data-exam-count]').forEach(button=>button.onclick=()=>{count.value=button.dataset.examCount;update();});
  root.querySelector('#exam-select-all').onclick=()=>{manualIds=pool().slice(0,200).map(card=>card.id);renderManual();updateSummary();};
  showSelectedButton.onclick=()=>{showSelected=!showSelected;showSelectedButton.classList.toggle('active',showSelected);showSelectedButton.setAttribute('aria-pressed',String(showSelected));renderManual();};
  root.querySelector('#exam-clear-selection').onclick=()=>{manualIds=[];renderManual();updateSummary();};
  generate.onclick=()=>{try{const chapters=selectedChapters(),mode=selectionMode.value,wanted=Number(count.value),cardsById=new Map(state.cards.map(card=>[card.id,card])),manualCards=manualIds.map(id=>cardsById.get(id)).filter(Boolean);let selected;if(mode==='manual')selected=manualCards;else if(mode==='quick')selected=recommendedExamCards(state.cards,wanted);else if(mode==='hybrid'){const excluded=new Set(manualIds),remaining=recommendedExamCards(pool().filter(card=>!excluded.has(card.id)),Math.max(0,wanted-manualCards.length));selected=[...manualCards,...remaining];}else selected=selectExamCards(state.cards,{category:category.value,chapters,scope:scope.value,practice:practice.value,count:wanted});if(!selected.length)throw Error('請至少選擇一道題目。');if(selected.length>200)throw Error('一份考卷最多 200 題。');try{localStorage.setItem('shiti-exam-settings',JSON.stringify({mode,count:wanted,includeAnswers:root.querySelector('#exam-answers').checked}));}catch{}currentExam={title:root.querySelector('#exam-title').value.trim()||'拾題練習卷',category:category.value,chapters,scope:scope.value,practice:practice.value,count:wanted,selectionMode:mode,includeAnswers:root.querySelector('#exam-answers').checked,imageMode:'document',background:35,ink:45,viewScale:1,autoFit:true,cards:selected};renderExam({root,state,optionsHtml,toast});}catch(error){toast(error.message);}};
  try{const saved=JSON.parse(localStorage.getItem('shiti-exam-settings'));if(['quick','custom','manual','hybrid'].includes(saved?.mode))selectionMode.value=saved.mode;autoFill.checked=saved?.mode==='hybrid';if(Number.isInteger(saved?.count)&&saved.count>=1&&saved.count<=200)count.value=saved.count;if(typeof saved?.includeAnswers==='boolean')root.querySelector('#exam-answers').checked=saved.includeAnswers;}catch{}
  renderChapters();update();
}

export function clearExam(){currentExam=null;}
