import {INTERVALS,hasAnswer} from '../domain.js';
import {photoAttributes} from '../image-view.js?v=pick1';
import {renderAnswers} from '../math-answer.js?v=bare1';
import {esc,formatDate,pageHeading} from '../ui.js';
import {metricsHtml} from './statistics-page.js';

export function cardStatus(card,now=Date.now()){
  if(!hasAnswer(card))return '待補答案';
  if(card.stage<0)return '待熟練';
  return card.due<=now?'今日待複習':'間隔複習中';
}

export function chaptersFor(cards,category=''){
  return [...new Set(cards.filter(card=>(!category||card.category===category)&&card.chapter).map(card=>card.chapter))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
}

export function createLibraryPage({getState,getRoot,onAdd,onOpen}){
  const view={category:'',chapter:'*',status:'all',limit:30};
  function render(){
    const state=getState(),root=getRoot(),chapters=chaptersFor(state.cards,view.category);
    if(view.chapter!=='*'&&view.chapter!==''&&!chapters.includes(view.chapter))view.chapter='*';
    const cards=state.cards.filter(card=>(!view.category||card.category===view.category)&&(view.chapter==='*'||(card.chapter||'')===view.chapter)&&(
      view.status==='all'||(view.status==='missing'?!hasAnswer(card):view.status==='spaced'?card.stage>=0:card.stage<0)
    ));
    const chapterOptions=`<option value="*">全部章節</option><option value="">未分類章節</option>${chapters.map(chapter=>`<option value="${esc(chapter)}">${esc(chapter)}</option>`).join('')}`;
    root.innerHTML=pageHeading('MY QUESTION BOOK','我的題庫','把值得再練一次的題目，留在這裡。','<button class="primary" id="new-card">＋ 快速新增</button>')+metricsHtml(state)+`<div class="toolbar"><div class="chips">${['',...state.categories].map(category=>`<button class="chip ${view.category===category?'active':''}" data-category="${esc(category)}">${esc(category||'全部')} <span style="opacity:.65">${state.cards.filter(card=>!category||card.category===category).length}</span></button>`).join('')}</div><div class="library-filters"><select id="chapter-filter" aria-label="章節" style="width:auto">${chapterOptions}</select><select id="status-filter" aria-label="熟練狀態" style="width:auto"><option value="all">所有狀態</option><option value="learning">待熟練</option><option value="spaced">間隔複習中</option><option value="missing">待補答案</option></select></div></div>${cards.length?`<div class="cards">${cards.slice(0,view.limit).map(card=>`<button class="card" data-card="${esc(card.id)}">${card.question?`<img class="card-photo" ${photoAttributes(card.question,true,card.questionMask)} alt="${esc(card.title)}的題目" loading="lazy">`:`<div class="question-text library-text">${esc(card.questionText)}</div>`}<div class="card-body"><div class="card-top"><span class="tag">${esc(card.category)}${card.chapter?` · ${esc(card.chapter)}`:''}</span><span class="tag ${!hasAnswer(card)?'orange':card.stage>=0?'green':''}">${cardStatus(card)}</span></div><h3>${esc(card.title)}</h3>${card.stage<0?`<div class="meter">${Array.from({length:state.target},(_,index)=>`<i class="${index<card.streak?'on':''}"></i>`).join('')}</div><div class="row between muted"><span>連續答對 ${card.streak} / ${state.target}</span><span>答錯 ${card.mistakes} 次</span></div>`:`<div class="row between muted"><span>下次複習 ${formatDate(card.due)}</span><span>${INTERVALS[card.stage]} 天間隔</span></div>`}</div></button>`).join('')}</div>`:`<section class="empty"><span class="empty-icon">＋</span><h2>${state.cards.length?'這裡還沒有符合的題目':'從第一道錯題開始'}</h2><p>拍下題目，用手指框選範圍。答案可以一起加入，也可以之後再補。</p><button class="primary" id="empty-add">拍照 / 選擇圖片</button></section>`}`;
    if(cards.length>view.limit){const more=document.createElement('button');more.className='wide';more.style.marginTop='24px';more.textContent=`載入更多（已顯示 ${view.limit} / ${cards.length} 題）`;more.onclick=()=>{view.limit+=30;render();};root.append(more);}
    renderAnswers(root);
    root.querySelector('#new-card').onclick=onAdd;
    root.querySelector('#empty-add')?.addEventListener('click',onAdd);
    root.querySelector('#chapter-filter').value=view.chapter;
    root.querySelector('#chapter-filter').onchange=event=>{view.chapter=event.target.value;view.limit=30;render();};
    root.querySelector('#status-filter').value=view.status;
    root.querySelector('#status-filter').onchange=event=>{view.status=event.target.value;view.limit=30;render();};
    root.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>{view.category=button.dataset.category;view.chapter='*';view.limit=30;render();});
    root.querySelectorAll('[data-card]').forEach(button=>button.onclick=()=>onOpen(button.dataset.card));
  }
  return {render,get category(){return view.category;},set category(value){view.category=value;view.chapter='*';},reset(){view.category='';view.chapter='*';view.status='all';view.limit=30;}};
}
