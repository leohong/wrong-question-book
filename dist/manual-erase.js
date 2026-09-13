// Average an 11 × 11 image-pixel square, clipped at the image edges.
export function sampleBackgroundColor(ctx,width,height,point){
  const x=Math.max(0,Math.min(width-1,Math.floor(point.x)));
  const y=Math.max(0,Math.min(height-1,Math.floor(point.y)));
  const left=Math.max(0,x-5),top=Math.max(0,y-5);
  const w=Math.min(width,x+6)-left,h=Math.min(height,y+6)-top;
  const pixels=ctx.getImageData(left,top,w,h).data,sums=[0,0,0];
  for(let i=0;i<pixels.length;i+=4){
    const alpha=pixels[i+3]/255;
    for(let channel=0;channel<3;channel++)sums[channel]+=pixels[i+channel]*alpha+255*(1-alpha);
  }
  return '#'+sums.map(sum=>Math.round(sum/(w*h)).toString(16).padStart(2,'0')).join('');
}

export function manualErase(source, dialog, onNext, onBack, initialMask=null) {
  const strokes=initialMask?structuredClone(initialMask.strokes).map(s=>({color:s.color||'#ffffff',size:s.size*source.width/initialMask.width,points:s.points.map(p=>({x:p.x*source.width/initialMask.width,y:p.y*source.height/initialMask.height}))})):[];
  function show(){
    dialog('抹除不需要的部分','<p class="hint">先按住乾淨的背景，以周圍 11 × 11 像素範圍的平均顏色取色，再拖曳到要抹除的部分。單點只取色，不會塗抹。</p><label class="field" for="erase-size">橡皮擦大小 <output id="erase-size-label">24</output></label><input id="erase-size" type="range" min="4" max="100" value="24"><div class="actions"><button id="erase-undo">復原上一步</button><button id="erase-reset">全部還原</button><button id="erase-zoom">放大編輯</button><button id="erase-pan" aria-pressed="false">移動圖片</button></div><div id="erase-viewport" style="overflow:auto;max-height:50vh;background:#e7edf5;margin-top:14px"><canvas id="erase-canvas" aria-label="拖曳抹除照片內容" style="display:block;max-width:100%;touch-action:none;cursor:crosshair"></canvas></div><p id="erase-status" class="muted" aria-live="polite"></p><div class="actions"><button id="erase-back">返回框選</button><button id="erase-next" class="primary">下一步：檢查清晰度</button></div>');
    const $=id=>document.getElementById(id),canvas=$('erase-canvas'),ctx=canvas.getContext('2d'),viewport=$('erase-viewport');
    canvas.width=source.width;canvas.height=source.height;
    let active=null,pan=false,zoom=false,picked='#ffffff';
    const drawStroke=s=>{
      ctx.strokeStyle=ctx.fillStyle=s.color||'#ffffff';ctx.lineWidth=s.size;ctx.lineCap=ctx.lineJoin='round';
      ctx.beginPath();ctx.arc(s.points[0].x,s.points[0].y,s.size/2,0,2*Math.PI);ctx.fill();
      ctx.beginPath();ctx.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();
    };
    function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0);for(const s of strokes)drawStroke(s);if(active?.painting)drawStroke(active.stroke);$('erase-undo').disabled=$('erase-reset').disabled=!strokes.length;$('erase-status').textContent=`已抹除 ${strokes.length} 筆。${pan?'目前可拖曳移動圖片。':`目前取色：${picked}，拖曳才會抹除。`}`;}
    const point=e=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(canvas.width,(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(canvas.height,(e.clientY-r.top)*canvas.height/r.height))};};
    canvas.onpointerdown=e=>{if(active||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);active={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};if(!pan){const p=point(e);picked=sampleBackgroundColor(ctx,canvas.width,canvas.height,p);active.stroke={color:picked,size:Number($('erase-size').value)*canvas.width/canvas.getBoundingClientRect().width,points:[p]};}draw();};
    canvas.onpointermove=e=>{if(!active||active.id!==e.pointerId)return;if(active.stroke){if(!active.painting&&Math.hypot(e.clientX-active.x,e.clientY-active.y)<3)return;active.painting=true;active.stroke.points.push(point(e));draw();}else{viewport.scrollLeft=active.left+active.x-e.clientX;viewport.scrollTop=active.top+active.y-e.clientY;}};
    function finish(e,cancel=false){if(!active||active.id!==e.pointerId)return;if(!cancel&&active.painting)strokes.push(active.stroke);active=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);draw();}
    canvas.onpointerup=e=>finish(e);canvas.onpointercancel=e=>finish(e,true);canvas.onlostpointercapture=e=>finish(e,true);
    $('erase-size').oninput=()=>{$('erase-size-label').value=$('erase-size').value;};
    $('erase-undo').onclick=()=>{strokes.pop();draw();};$('erase-reset').onclick=()=>{strokes.length=0;draw();};
    $('erase-zoom').onclick=()=>{zoom=!zoom;canvas.style.maxWidth=zoom?'none':'100%';canvas.style.width=zoom?`${Math.max(source.width,viewport.clientWidth*2)}px`:'';$('erase-zoom').textContent=zoom?'縮放至視窗':'放大編輯';};
    $('erase-pan').onclick=()=>{pan=!pan;$('erase-pan').setAttribute('aria-pressed',String(pan));$('erase-pan').textContent=pan?'切回橡皮擦':'移動圖片';canvas.style.cursor=pan?'grab':'crosshair';draw();};
    $('erase-back').onclick=onBack;
    $('erase-next').onclick=()=>{active=null;draw();onNext(canvas,show,{version:1,width:source.width,height:source.height,strokes:structuredClone(strokes)});};
    draw();
  }
  show();
}
