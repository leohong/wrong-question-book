import {renderAnswers} from '../math-answer.js?v=bare1';
import {esc,pageHeading} from '../ui.js';

export function createPracticePage({
  getState,
  getRoot,
  practiceService,
  renderApp,
  dialog,
  modal,
  toast,
  safely,
  optionsHtml,
  questionContent,
  answerContent
}){
  let session=null;

  function start(category,mode,count){
    const created=practiceService.createSession(category,mode,count);
    session={ids:created.ids,index:0,correct:0,revealed:false,answering:false};
    renderApp('practice');
    return {count:session.ids.length};
  }

  function confirmLeave(then){
    if(session?.answering){toast('正在儲存作答，請稍候。');return;}
    dialog('結束這次練習？','<p>已作答的結果都已儲存，尚未作答的題目不會計分。</p><div class="actions"><button id="keep-practice">繼續練習</button><button id="leave-practice" class="primary">結束練習</button></div>');
    modal.querySelector('#keep-practice').onclick=()=>modal.close();
    modal.querySelector('#leave-practice').onclick=()=>{session=null;modal.close();then();};
  }

  function renderSetup(){
    const state=getState(),root=getRoot();
    root.innerHTML=pageHeading('ONE QUESTION AT A TIME','開始一場練習','先自己作答，再翻開答案。誠實判定，讓複習更有效。')+`<div class="split"><section class="panel"><h2>安排這次的考題</h2><div class="form-row"><label class="field" for="practice-category">選擇分類</label><select id="practice-category">${optionsHtml('',true)}</select></div><div class="form-row"><label class="field" for="practice-mode">出題範圍</label><select id="practice-mode"><option value="recommended">待熟練 ＋ 已到期的題目</option><option value="due">只練已到期的間隔複習</option><option value="all">全部題目（包含尚未到期）</option></select></div><div class="form-row"><label class="field" for="practice-count">本次題數</label><div class="row count-options"><button data-count="20" class="active">20 題</button><button data-count="30">30 題</button><input type="number" id="practice-count" aria-label="自訂題數" min="1" max="200" value="20"></div></div><p id="eligible-note" class="hint"></p><button id="start-practice" class="primary wide">開始練習 →</button></section><aside><section class="panel"><span class="tag">熟練機制</span><h2 style="margin-top:16px">一步一步，記得更久。</h2><ol class="spaced-list"><li>連續答對 <strong>${state.target} 次</strong>，進入間隔複習。</li><li>依序在 1、3、7、14、30 天後再練。</li><li>答錯重置連續答對次數，回到待熟練。</li></ol><p class="muted note">每場題目不重複。沒有答案的題目，補上答案後才會加入考題。</p></section></aside></div>`;
    const category=root.querySelector('#practice-category');
    const mode=root.querySelector('#practice-mode');
    const count=root.querySelector('#practice-count');
    const update=()=>{
      const available=practiceService.available(category.value,mode.value).length,wanted=Number(count.value);
      root.querySelector('#eligible-note').textContent=available?`可出題 ${available} 題。本次將隨機選取 ${Math.min(Number.isInteger(wanted)&&wanted>0?wanted:0,available)} 題。`:'目前沒有可出的題目，請先新增題目與答案，或更改範圍。';
      root.querySelector('#start-practice').disabled=!available;
      root.querySelectorAll('[data-count]').forEach(button=>button.classList.toggle('active',Number(button.dataset.count)===wanted));
    };
    [category,mode,count].forEach(input=>input.oninput=update);
    root.querySelectorAll('[data-count]').forEach(button=>button.onclick=()=>{count.value=button.dataset.count;update();});
    root.querySelector('#start-practice').onclick=safely(()=>start(category.value,mode.value,Number(count.value)));
    update();
  }

  function renderSession(){
    const state=getState(),root=getRoot();
    if(session.index>=session.ids.length){
      const total=session.ids.length,correct=session.correct;
      root.innerHTML=`<section class="empty session"><span class="empty-icon">✓</span><h1>這次的練習，完成了。</h1><p>共 ${total} 題 · 答對 ${correct} 題 · 答錯 ${total-correct} 題</p><h2 style="color:var(--blue);font-size:46px">${Math.round(correct/total*100)}<small style="font-size:20px">%</small></h2><p>每次判定都已儲存，題目的熟練度與下次複習時間也已更新。</p><button id="finish-practice" class="primary">回到練習安排</button></section>`;
      root.querySelector('#finish-practice').onclick=()=>{session=null;renderApp('practice');};
      return;
    }
    const card=state.cards.find(item=>item.id===session.ids[session.index]);
    root.innerHTML=`<div class="session"><div class="session-top"><h2>第 ${session.index+1} / ${session.ids.length} 題</h2><button id="end-session">結束練習</button></div><div class="progress" role="progressbar" aria-valuenow="${session.index}" aria-valuemin="0" aria-valuemax="${session.ids.length}"><div style="width:${session.index/session.ids.length*100}%"></div></div><section class="question-sheet"><div class="row between"><span class="tag">${esc(card.category)}</span><span class="muted">${card.stage>=0?'間隔複習':`連續答對 ${card.streak} / ${state.target}`}</span></div><h2>${esc(card.title)}</h2>${questionContent(card)}${session.revealed?`<div class="answer-sheet"><span class="tag green">答案卡</span>${answerContent(card)}<p class="muted">對照答案，這題你答對了嗎？</p></div>`:'<p class="muted" style="text-align:center">先在紙上或心中作答，準備好後再看答案。</p>'}</section>${session.revealed?'<div class="grade-buttons"><button class="incorrect" id="grade-wrong">× 答錯了，再練習</button><button class="correct" id="grade-correct">✓ 答對了</button></div>':'<button class="primary wide" id="reveal-answer">翻開答案卡</button>'}</div>`;
    renderAnswers(root);
    root.querySelector('#end-session').onclick=()=>confirmLeave(()=>renderApp('practice'));
    root.querySelector('#reveal-answer')?.addEventListener('click',()=>{session.revealed=true;renderSession();});
    const answer=correct=>safely(async()=>{
      if(session.answering)return;
      session.answering=true;
      root.querySelectorAll('.grade-buttons button').forEach(button=>button.disabled=true);
      try{
        await practiceService.recordAnswer(card.id,correct);
        session.correct+=correct?1:0;
        session.index++;
        session.revealed=false;
      }finally{
        session.answering=false;
        renderSession();
      }
    });
    if(session.revealed){
      root.querySelector('#grade-wrong').onclick=answer(false);
      root.querySelector('#grade-correct').onclick=answer(true);
    }
  }

  return {
    render(){session?renderSession():renderSetup();},
    start,
    confirmLeave,
    clear(){session=null;},
    get active(){return Boolean(session);}
  };
}
