// Selection coordinates remain in canvas pixels regardless of display size.
export function mountCropSelection(canvas, img, status) {
  const ctx = canvas.getContext('2d'), wrap = canvas.parentElement;
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = '×'; close.className = 'crop-clear';
  close.setAttribute('aria-label', '清除選取框'); close.title = '清除選取框';
  wrap.append(close);
  let box = null, drag = null;
  const full = () => ({x:0,y:0,w:canvas.width,h:canvas.height});
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const point = e => {
    const r = canvas.getBoundingClientRect();
    return {x:clamp((e.clientX-r.left)*canvas.width/r.width,0,canvas.width),y:clamp((e.clientY-r.top)*canvas.height/r.height,0,canvas.height)};
  };
  function hit(p) {
    if (!box) return 'new';
    const r=canvas.getBoundingClientRect(), tx=14*canvas.width/r.width, ty=14*canvas.height/r.height;
    let edge='';
    if(p.y>=box.y-ty&&p.y<=box.y+box.h+ty) {
      if(Math.abs(p.x-box.x)<=tx) edge+='w';
      else if(Math.abs(p.x-box.x-box.w)<=tx) edge+='e';
    }
    if(p.x>=box.x-tx&&p.x<=box.x+box.w+tx) {
      if(Math.abs(p.y-box.y)<=ty) edge+='n';
      else if(Math.abs(p.y-box.y-box.h)<=ty) edge+='s';
    }
    return edge || (p.x>=box.x&&p.x<=box.x+box.w&&p.y>=box.y&&p.y<=box.y+box.h?'move':'new');
  }
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    close.hidden=!box;
    status.textContent=box?`已選取 ${Math.round(box.w)} × ${Math.round(box.h)} 像素`:'未框選，將保留整張照片';
    if(!box) return;
    ctx.fillStyle='#14274488'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.save(); ctx.beginPath(); ctx.rect(box.x,box.y,box.w,box.h); ctx.clip();
    ctx.drawImage(img,0,0,canvas.width,canvas.height); ctx.restore();
    const r=canvas.getBoundingClientRect(), sx=canvas.width/r.width, sy=canvas.height/r.height;
    ctx.strokeStyle='#4c9aff'; ctx.lineWidth=2*sx; ctx.strokeRect(box.x,box.y,box.w,box.h);
    ctx.fillStyle='white';
    for(const [x,y] of [[box.x,box.y+box.h/2],[box.x+box.w,box.y+box.h/2],[box.x+box.w/2,box.y],[box.x+box.w/2,box.y+box.h]]) {
      ctx.fillRect(x-5*sx,y-5*sy,10*sx,10*sy); ctx.strokeRect(x-5*sx,y-5*sy,10*sx,10*sy);
    }
    close.style.left=`${canvas.offsetLeft+clamp((box.x+box.w)/sx-32,0,Math.max(0,r.width-32))}px`;
    close.style.top=`${canvas.offsetTop+clamp(box.y/sy,0,Math.max(0,r.height-32))}px`;
  }
  canvas.onpointerdown=e=>{
    if(drag||e.button!==0) return;
    e.preventDefault(); const p=point(e);
    drag={id:e.pointerId,p,mode:hit(p),before:box?{...box}:null};
    canvas.setPointerCapture(e.pointerId);
    if(drag.mode==='new') box={x:p.x,y:p.y,w:0,h:0};
    draw();
  };
  canvas.onpointermove=e=>{
    const p=point(e);
    if(!drag) {
      const mode=hit(p);
      canvas.style.cursor=mode==='move'?'move':mode==='new'?'crosshair':mode.length===2?(mode==='wn'||mode==='es'?'nwse-resize':'nesw-resize'):(mode==='w'||mode==='e'?'ew-resize':'ns-resize');
      return;
    }
    if(e.pointerId!==drag.id) return;
    const {before:b,mode,p:start}=drag, dx=p.x-start.x,dy=p.y-start.y;
    if(mode==='new') box={x:Math.min(p.x,start.x),y:Math.min(p.y,start.y),w:Math.abs(dx),h:Math.abs(dy)};
    else if(mode==='move') box={...b,x:clamp(b.x+dx,0,canvas.width-b.w),y:clamp(b.y+dy,0,canvas.height-b.h)};
    else {
      let left=b.x,right=b.x+b.w,top=b.y,bottom=b.y+b.h;
      const minW=Math.min(15,canvas.width),minH=Math.min(15,canvas.height);
      if(mode.includes('w')) left=clamp(b.x+dx,0,right-minW);
      if(mode.includes('e')) right=clamp(b.x+b.w+dx,left+minW,canvas.width);
      if(mode.includes('n')) top=clamp(b.y+dy,0,bottom-minH);
      if(mode.includes('s')) bottom=clamp(b.y+b.h+dy,top+minH,canvas.height);
      box={x:left,y:top,w:right-left,h:bottom-top};
    }
    draw();
  };
  function finish(e,cancel=false) {
    if(!drag||e.pointerId!==drag.id) return;
    if(cancel||box.w<Math.min(15,canvas.width)||box.h<Math.min(15,canvas.height)) box=drag.before;
    drag=null;
    if(canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    draw();
  }
  canvas.onpointerup=e=>finish(e);
  canvas.onpointercancel=e=>finish(e,true);
  canvas.onlostpointercapture=e=>finish(e,true);
  close.onclick=()=>{box=null;drag=null;draw();};
  const observer=new ResizeObserver(()=>{if(canvas.isConnected) draw();else observer.disconnect();});
  observer.observe(canvas);
  draw();
  return {getBox:()=>box||full(),selectAll:()=>{box=full();draw();},destroy:()=>observer.disconnect()};
}
