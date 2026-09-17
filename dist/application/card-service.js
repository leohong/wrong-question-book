import {hasQuestion} from '../domain.js';

const emptyMask=(width=1,height=1)=>({version:1,width,height,strokes:[]});

export function createCardService({getState,commit,randomUUID=()=>crypto.randomUUID(),now=()=>Date.now()}){
  function normalizeDraft(draft,state,existing){
    if(!draft||typeof draft!=='object')throw Error('題目資料不完整。');
    const category=state.categories.includes(draft.category)?draft.category:state.categories[0];
    const title=(draft.title||'').trim();
    const questionText=(draft.questionText||'').trim(),answerText=(draft.answerText||'').trim();
    if(title.length>100)throw Error('題目名稱不可超過 100 個字。');
    if(questionText.length>10000||answerText.length>10000)throw Error('題目與答案文字不可超過 10000 個字。');
    const card={
      ...draft,
      category,
      question:draft.question||null,
      questionText,
      answer:draft.answer||null,
      answerText,
      title:title||`${category}錯題 ${state.cards.length+(existing?0:1)}`
    };
    if(!hasQuestion(card))throw Error('請先加入題目照片或輸入題目文字。');
    if(existing)return {...existing,...card,id:existing.id};
    return {
      ...card,
      id:randomUUID(),
      questionOriginal:draft.questionOriginal||draft.question||null,
      ...(draft.question&&!draft.questionMask?{questionMask:emptyMask()}:{}),
      ...(draft.answer&&!draft.answerMask?{answerMask:emptyMask()}:{}),
      streak:0,stage:-1,due:null,attempts:0,mistakes:0,created:now()
    };
  }

  async function save(draft,{existingId=null}={}){
    const state=getState();
    const existing=existingId?state.cards.find(card=>card.id===existingId):null;
    if(existingId&&!existing)throw Error('找不到要更新的題目。');
    const card=normalizeDraft(draft,state,existing);
    await commit({...state,cards:existing?state.cards.map(item=>item.id===existing.id?card:item):[card,...state.cards]});
    return card;
  }

  async function remove(id){
    const state=getState();
    if(!state.cards.some(card=>card.id===id))throw Error('找不到要刪除的題目。');
    await commit({...state,cards:state.cards.filter(card=>card.id!==id)});
  }

  return {save,remove};
}
