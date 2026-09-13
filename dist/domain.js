import {validMask} from './mask-layer.js';
export const INTERVALS = [1, 3, 7, 14, 30];
export const DAY = 86400000;
export const initialState = () => ({version:1,categories:['國文','英文','數學'],target:3,cards:[],history:[]});
export function grade(card, correct, target, now = Date.now()) {
  const next = {...card, attempts:card.attempts+1, mistakes:card.mistakes+(correct?0:1)};
  if (!correct) return {...next,streak:0,stage:-1,due:null};
  if (card.stage >= 0) {
    next.stage = Math.min(card.stage+1,INTERVALS.length-1);
    next.due = now + INTERVALS[next.stage]*DAY;
  } else {
    next.streak++;
    if (next.streak >= target) {next.stage=0;next.due=now+DAY;}
  }
  return next;
}
export const hasQuestion = c => Boolean(c.question || (typeof c.questionText==='string' && c.questionText.trim()));
export const hasAnswer = c => Boolean(c.answer || (typeof c.answerText==='string' && c.answerText.trim()));
export function eligible(cards, category, mode, now=Date.now()) {
  return cards.filter(c=>hasAnswer(c) && (!category || c.category===category) && (mode==='all' || (mode==='due' ? c.stage>=0 && c.due<=now : c.stage<0 || c.due<=now)));
}
export function shuffled(items, random=Math.random) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
const integer = (x,min,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(x)&&x>=min&&x<=max;
const date = x => integer(x,0,8640000000000000);
const photo = x => typeof x==='string' && x.length<12000000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(x);
export function validateBackup(data, {allowImageRefs=false}={}) {
  const validPhoto = x => photo(x) || (allowImageRefs && typeof x==='string' && /^image:[a-f0-9]{64}$/.test(x));
  if (!data || data.version!==1 || !Array.isArray(data.categories) || !data.categories.length || data.categories.length>100 || !data.categories.every(c=>typeof c==='string'&&c.trim().length>0&&c.length<=30) || new Set(data.categories).size!==data.categories.length || !integer(data.target,1,10) || !Array.isArray(data.cards) || data.cards.length>10000 || !Array.isArray(data.history) || data.history.length>100000) throw Error('備份格式不正確，請選擇由拾題匯出的 JSON 檔案。');
  const ids = new Set();
  for (const c of data.cards) {
    if (!c || typeof c.id!=='string' || !c.id || c.id.length>100 || ids.has(c.id) || typeof c.title!=='string' || c.title.length>100 || !data.categories.includes(c.category) || !(validPhoto(c.question) || (c.question===null && typeof c.questionText==='string' && c.questionText.trim())) || (c.questionText!==undefined && (typeof c.questionText!=='string' || c.questionText.length>10000)) || (c.answerText!==undefined && (typeof c.answerText!=='string' || c.answerText.length>10000)) || !validMask(c.questionMask) || !validMask(c.answerMask) || (c.questionOriginal!=null&&!validPhoto(c.questionOriginal)) || !(c.answer===null||validPhoto(c.answer)) || !integer(c.streak,0) || !integer(c.stage,-1,4) || !integer(c.attempts,0) || !integer(c.mistakes,0,c.attempts) || !date(c.created) || !(c.stage===-1?c.due===null:date(c.due))) throw Error('備份中的題目或照片資料不完整。');
    ids.add(c.id);
  }
  for(const h of data.history) if(!h || typeof h.cardId!=='string' || typeof h.category!=='string' || h.category.length>30 || typeof h.correct!=='boolean' || !date(h.at)) throw Error('備份中的練習紀錄不正確。');
  return {version:1,categories:[...data.categories],target:data.target,cards:data.cards.map(c=>({id:c.id,title:c.title,category:c.category,question:c.question,...(c.questionText!==undefined?{questionText:c.questionText}:{}),answer:c.answer,...(c.answerText!==undefined?{answerText:c.answerText}:{}),...(c.questionMask?{questionMask:structuredClone(c.questionMask)}:{}),...(c.answerMask?{answerMask:structuredClone(c.answerMask)}:{}),...(c.questionOriginal?{questionOriginal:c.questionOriginal}:{}),streak:c.streak,stage:c.stage,attempts:c.attempts,mistakes:c.mistakes,created:c.created,due:c.due})),history:data.history.map(h=>({cardId:h.cardId,category:h.category,correct:h.correct,at:h.at}))};
}
