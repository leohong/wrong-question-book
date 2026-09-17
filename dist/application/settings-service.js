import {initialState} from '../domain.js';

export function createSettingsService({getState,commit}){
  async function setTarget(value){
    const target=Number(value);
    if(!Number.isInteger(target)||target<1||target>10)throw Error('請輸入 1 到 10 的整數。');
    await commit({...getState(),target});
    return {target};
  }

  async function setAiPrompt(value){
    if(typeof value!=='string')throw Error('辨識指令必須是文字。');
    const aiPrompt=value.trim();
    if(!aiPrompt)throw Error('辨識指令不能空白。');
    if(aiPrompt.length>10000)throw Error('辨識指令不可超過 10000 個字。');
    await commit({...getState(),aiPrompt});
    return {aiPrompt};
  }

  async function reset(){
    const next=initialState();
    await commit(next);
    return next;
  }

  async function replace(next,assets){
    await commit(next,assets);
    return next;
  }

  return {setTarget,setAiPrompt,reset,replace};
}
