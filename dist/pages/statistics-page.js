import {esc,pageHeading} from '../ui.js';

export function cardCounts(state,now=Date.now()){
  return {
    total:state.cards.length,
    learning:state.cards.filter(card=>card.stage<0).length,
    spaced:state.cards.filter(card=>card.stage>=0).length,
    due:state.cards.filter(card=>Boolean(card.answer||card.answerText?.trim())&&card.stage>=0&&card.due<=now).length
  };
}

export function metricsHtml(state){
  const counts=cardCounts(state);
  return `<div class="stats-row">${[
    ['收藏的錯題',counts.total],
    ['待熟練',counts.learning],
    ['間隔複習中',counts.spaced],
    ['今日到期',counts.due]
  ].map(([label,value])=>`<div class="stat"><label>${label}</label><strong>${value}<small> 題</small></strong></div>`).join('')}</div>`;
}

export function renderStatisticsPage(root,state,now=new Date()){
  const counts=cardCounts(state,now.getTime());
  const total=state.history.length;
  const correct=state.history.filter(item=>item.correct).length;
  const percentage=counts.total?Math.round(counts.spaced/counts.total*100):0;
  const days=Array.from({length:7},(_,index)=>{
    const date=new Date(now);
    date.setHours(0,0,0,0);
    date.setDate(date.getDate()-6+index);
    const end=new Date(date);
    end.setDate(end.getDate()+1);
    const history=state.history.filter(item=>item.at>=date.getTime()&&item.at<end.getTime());
    return {
      label:`${date.getMonth()+1}/${date.getDate()}`,
      right:history.filter(item=>item.correct).length,
      wrong:history.filter(item=>!item.correct).length
    };
  });
  const max=Math.max(1,...days.flatMap(day=>[day.right,day.wrong]));
  root.innerHTML=pageHeading(
    'YOUR LEARNING, AT A GLANCE',
    '看見自己的進步',
    total?`累積作答 ${total} 次，答對 ${correct} 次，答錯 ${total-correct} 次。`:'完成第一次練習後，這裡會出現你的學習紀錄。'
  )+metricsHtml(state)+`<div class="split"><section class="panel"><div class="row between"><h2>最近 7 天的練習</h2><span class="muted">作答次數</span></div><div class="chart" role="img" aria-label="最近七天作答紀錄：${days.map(day=>`${day.label} 答對 ${day.right} 次、答錯 ${day.wrong} 次`).join('；')}">${days.map(day=>`<div class="chart-col"><div class="chart-bars"><div class="bar" style="height:${day.right/max*100}%" title="答對 ${day.right} 次"></div><div class="bar wrong" style="height:${day.wrong/max*100}%" title="答錯 ${day.wrong} 次"></div></div><small>${day.label}</small><small>${day.right} / ${day.wrong}</small></div>`).join('')}</div><div class="legend"><span><i></i>答對</span><span><i class="wrong"></i>答錯</span></div></section><section class="panel"><h2>題目熟練度</h2><div class="donut" style="background:conic-gradient(#155eeb ${percentage}%,#e8edf5 0)" role="img" aria-label="${percentage}% 的題目已進入間隔複習"><div><strong>${percentage}%</strong><small class="muted">已進入間隔複習</small></div></div><p class="muted" style="text-align:center">${counts.spaced} 題已熟練 · ${counts.learning} 題待熟練</p></section></div><section class="panel"><h2>各分類掌握情況</h2>${state.categories.map(category=>{
    const cards=state.cards.filter(card=>card.category===category);
    const mastered=cards.filter(card=>card.stage>=0).length;
    return `<div class="subject-line"><div class="row between"><span>${esc(category)}</span><span class="muted">${mastered} / ${cards.length} 題已熟練</span></div><div class="progress"><div style="width:${cards.length?mastered/cards.length*100:0}%"></div></div></div>`;
  }).join('')}</section>`;
}
