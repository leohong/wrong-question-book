export function createAppStore({createInitialState,loadState,saveState}){
  let state=createInitialState(),writing=false,writeGuard=()=>null;

  function getState(){return state;}

  async function initialize(){
    const saved=await loadState();
    state=saved||createInitialState();
    return {state,saved:Boolean(saved)};
  }

  async function commit(next,assets){
    const blocked=writeGuard();
    if(blocked)throw Error(blocked);
    if(writing)throw Error('正在儲存，請稍候。');
    writing=true;
    try{
      const saved=await saveState(next,assets);
      state=saved;
      return state;
    }finally{writing=false;}
  }

  function setWriteGuard(guard){writeGuard=typeof guard==='function'?guard:()=>null;}

  return {getState,initialize,commit,setWriteGuard,get busy(){return writing;}};
}
