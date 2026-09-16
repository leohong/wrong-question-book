import {MANUAL_VERSION,needsManual,acknowledgeManual,manualContent} from '../manual.js';
import {pageHeading} from '../ui.js';

export function renderManualPage(root,{onDone,toast}){
  root.innerHTML=pageHeading('USER GUIDE','使用說明書','從收藏題目到複習，照著步驟開始。')+`<p class="hint">說明版本：${MANUAL_VERSION}${needsManual()?' · 首次使用或說明已更新，請閱讀。':''}</p><div class="manual-sections">${manualContent()}</div><button id="manual-read" class="primary wide">我已閱讀，開始使用</button>`;
  root.querySelector('#manual-read').onclick=()=>{
    const saved=acknowledgeManual();
    onDone();
    if(!saved)toast('瀏覽器無法記住閱讀狀態，下次可能再次顯示說明。');
  };
}
