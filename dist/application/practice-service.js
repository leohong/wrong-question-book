import {eligible,grade,shuffled} from '../domain.js';

export function createPracticeService({getState,commit,now=()=>Date.now(),random=Math.random}){
  function validateScope(category,mode){
    const state=getState();
    if(!['all','due','recommended'].includes(mode)||category&&!state.categories.includes(category))throw Error('無效的出題範圍。');
    return state;
  }

  function available(category,mode){
    const state=validateScope(category,mode);
    return eligible(state.cards,category,mode,now());
  }

  function createSession(category,mode,count){
    if(!Number.isInteger(count)||count<1||count>200)throw Error('題數請輸入 1 到 200 的整數。');
    const pool=available(category,mode);
    if(!pool.length)throw Error('這個範圍沒有已配對答案的題目。');
    return {ids:shuffled(pool,random).slice(0,count).map(card=>card.id)};
  }

  async function recordAnswer(cardId,correct){
    if(typeof correct!=='boolean')throw Error('作答結果不正確。');
    const state=getState(),card=state.cards.find(item=>item.id===cardId);
    if(!card)throw Error('找不到這道題目。');
    const at=now(),next=grade(card,correct,state.target,at);
    await commit({...state,cards:state.cards.map(item=>item.id===card.id?next:item),history:[...state.history,{cardId:card.id,category:card.category,correct,at}]});
    return next;
  }

  return {available,createSession,recordAnswer};
}
