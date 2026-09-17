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

export function examPool(cards,category='',scope='all',now=Date.now()){
  return cards.filter(card=>(!category||card.category===category)&&(
    scope==='all'||
    scope==='learning'&&card.stage<0||
    scope==='due'&&card.stage>=0&&card.due<=now
  ));
}

export function selectExamCards(cards,{category='',scope='all',count=20,random=Math.random,now=Date.now()}={}){
  if(!Number.isInteger(count)||count<1||count>200)throw Error('題數請輸入 1 到 200 的整數。');
  if(!['all','learning','due'].includes(scope))throw Error('無效的出題範圍。');
  return shuffled(examPool(cards,category,scope,now),random).slice(0,count);
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
    root.innerHTML=`<div class="exam-controls"><button id="exam-back">← 重新設定</button><div class="row"><button id="exam-reroll">重新抽題</button><button class="primary" id="exam-print">直接列印</button></div></div><section class="exam-image-controls exam-screen-note" aria-label="列印圖片調整"><div class="exam-image-mode"><label class="field" for="exam-image-mode">列印圖片</label><select id="exam-image-mode"><option value="original">原圖</option><option value="document">黑白文件</option><option value="high-contrast">高對比黑白（測試）</option></select></div><label>背景更白 <input id="exam-background" type="range" min="0" max="100" value="${currentExam.background}"></label><label>文字更深 <input id="exam-ink" type="range" min="0" max="100" value="${currentExam.ink}"></label><p id="exam-image-note" class="muted" aria-live="polite"></p></section><section class="exam-zoom-controls exam-screen-note" aria-label="考卷預覽縮放"><button id="exam-zoom-out" aria-label="縮小考卷">−</button><input id="exam-zoom" type="range" min="30" max="160" step="5" aria-label="考卷縮放比例"><button id="exam-zoom-in" aria-label="放大考卷">＋</button><button id="exam-zoom-fit">符合螢幕</button><output id="exam-zoom-value"></output><span>可在考卷上雙指縮放</span></section><p class="hint exam-screen-note">已選 ${currentExam.cards.length} 題。考卷固定為 A4 雙欄，手機方向不會改變版面。圖片調整只套用在預覽、列印與 PDF，不會修改題庫原圖。</p><div id="exam-output" class="exam-viewport"><div id="exam-pages">${paper(currentExam)}</div></div>`;
    renderAnswers(root);
    const output=root.querySelector('#exam-pages'),viewport=root.querySelector('#exam-output'),mode=root.querySelector('#exam-image-mode'),background=root.querySelector('#exam-background'),ink=root.querySelector('#exam-ink'),note=root.querySelector('#exam-image-note');
    mode.value=currentExam.imageMode;
    const applyImageMode=()=>{currentExam.imageMode=mode.value;currentExam.background=Number(background.value);currentExam.ink=Number(ink.value);const original=mode.value==='original';background.disabled=original;ink.disabled=original;output.style.setProperty('--exam-image-filter',examImageFilter(mode.value,currentExam.background,currentExam.ink));note.textContent=original?'保留照片原本的顏色與底色。':mode.value==='document'?'降低底色、保留較淡的圖形與線條；建議先用這個模式。':'底色最白且較省墨，但淡色細線可能消失，請先查看預覽。';};
    [mode,background,ink].forEach(control=>control.oninput=applyImageMode);applyImageMode();
    const zoom=root.querySelector('#exam-zoom'),zoomValue=root.querySelector('#exam-zoom-value');
    const applyZoom=value=>{currentExam.viewScale=examZoom(value);output.style.setProperty('--exam-scale',currentExam.viewScale);zoom.value=String(Math.round(currentExam.viewScale*100));zoomValue.value=`${Math.round(currentExam.viewScale*100)}%`;};
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
    if(globalThis.ResizeObserver)new globalThis.ResizeObserver(()=>{if(currentExam?.autoFit)fit();}).observe(viewport);
    root.querySelector('#exam-back').onclick=()=>{currentExam=null;renderExam({root,state,optionsHtml,toast});};
    root.querySelector('#exam-reroll').onclick=()=>{currentExam.cards=selectExamCards(state.cards,currentExam);renderExam({root,state,optionsHtml,toast});};
    root.querySelector('#exam-print').onclick=()=>{window.print();setTimeout(()=>toast('若沒有出現列印視窗，請改用 Chrome、Edge 或 Safari 開啟本頁。'),300);};
    return;
  }
  root.innerHTML=`<div class="page-heading"><div><p class="eyebrow">MAKE A TEST</p><h1>自動產生考卷</h1><p>從錯題庫隨機組成題目卷與答案卷。</p></div></div><div class="split"><section class="panel"><div class="form-row"><label class="field" for="exam-title">考卷名稱</label><input id="exam-title" maxlength="80" value="拾題練習卷"></div><div class="form-row"><label class="field" for="exam-category">選擇分類</label><select id="exam-category">${optionsHtml}</select></div><div class="form-row"><label class="field" for="exam-scope">出題範圍</label><select id="exam-scope"><option value="all">所有題目</option><option value="learning">待熟練題目</option><option value="due">已到期的間隔複習</option></select></div><div class="form-row"><label class="field" for="exam-count">題數</label><div class="row count-options"><button data-exam-count="10">10 題</button><button data-exam-count="20" class="active">20 題</button><button data-exam-count="30">30 題</button><input id="exam-count" type="number" min="1" max="200" value="20" aria-label="自訂考卷題數"></div></div><label class="exam-check"><input id="exam-answers" type="checkbox" checked> 在題目卷後附上答案卷</label><p id="exam-available" class="hint"></p><button class="primary wide" id="exam-generate">產生考卷 →</button></section><aside><section class="panel"><span class="tag">列印與 PDF</span><h2>一份題庫，多種練習。</h2><p>每次產生都會隨機抽題且不重複。沒有答案的卡片會在答案卷顯示原題。完成預覽後，可直接列印，或在列印視窗選擇「另存為 PDF」。</p><p class="muted">考卷不會改變題目的熟練度；只有在「開始練習」中判定答對或答錯才會記錄進度。</p></section></aside></div>`;
  const category=root.querySelector('#exam-category'),scope=root.querySelector('#exam-scope'),count=root.querySelector('#exam-count'),available=root.querySelector('#exam-available'),generate=root.querySelector('#exam-generate');
  const update=()=>{const pool=examPool(state.cards,category.value,scope.value),wanted=Number(count.value),valid=Number.isInteger(wanted)&&wanted>=1&&wanted<=200;available.textContent=pool.length?`這個範圍可使用 ${pool.length} 題，考卷將抽出 ${valid?Math.min(wanted,pool.length):0} 題。`:'這個範圍沒有可用題目。';generate.disabled=!pool.length||!valid;root.querySelectorAll('[data-exam-count]').forEach(button=>button.classList.toggle('active',Number(button.dataset.examCount)===wanted));};
  [category,scope,count].forEach(input=>input.oninput=update);
  root.querySelectorAll('[data-exam-count]').forEach(button=>button.onclick=()=>{count.value=button.dataset.examCount;update();});
  generate.onclick=()=>{try{const selected=selectExamCards(state.cards,{category:category.value,scope:scope.value,count:Number(count.value)});if(!selected.length)throw Error('這個範圍沒有可用題目。');currentExam={title:root.querySelector('#exam-title').value.trim()||'拾題練習卷',category:category.value,scope:scope.value,count:Number(count.value),includeAnswers:root.querySelector('#exam-answers').checked,imageMode:'document',background:35,ink:45,viewScale:1,autoFit:true,cards:selected};renderExam({root,state,optionsHtml,toast});}catch(error){toast(error.message);}};
  update();
}

export function clearExam(){currentExam=null;}
