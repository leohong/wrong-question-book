function categoryName(input){
  if(typeof input!=='string')throw Error('分類名稱必須是文字。');
  const name=input.trim();
  if(!name||name.length>30)throw Error('名稱請輸入 1 到 30 個字。');
  return name;
}

export function createCategoryService({getState,commit}){
  async function add(input){
    const state=getState(),name=categoryName(input);
    if(state.categories.includes(name))throw Error('已經有這個分類。');
    if(state.categories.length>=100)throw Error('分類最多 100 個。');
    await commit({...state,categories:[...state.categories,name]});
    return {name};
  }

  async function rename(oldName,input){
    const state=getState(),name=categoryName(input);
    if(!state.categories.includes(oldName))throw Error('找不到要更名的分類。');
    if(name!==oldName&&state.categories.includes(name))throw Error('已經有這個分類。');
    if(name===oldName)return {oldName,name};
    await commit({
      ...state,
      categories:state.categories.map(category=>category===oldName?name:category),
      cards:state.cards.map(card=>card.category===oldName?{...card,category:name}:card),
      history:state.history.map(item=>item.category===oldName?{...item,category:name}:item)
    });
    return {oldName,name};
  }

  async function remove(name){
    const state=getState();
    if(!state.categories.includes(name))throw Error('找不到要刪除的分類。');
    if(state.categories.length<2||state.cards.some(card=>card.category===name))throw Error('只能刪除沒有題目的分類，且至少需保留一個分類。');
    await commit({...state,categories:state.categories.filter(category=>category!==name)});
    return {name};
  }

  return {add,rename,remove};
}
