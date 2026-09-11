export function validMask(m){return m==null||(m.version===1&&Number.isFinite(m.width)&&m.width>0&&m.width<=20000&&Number.isFinite(m.height)&&m.height>0&&m.height<=20000&&Array.isArray(m.strokes)&&m.strokes.length<=10000&&m.strokes.every(s=>(s.color===undefined||/^#[0-9a-fA-F]{6}$/.test(s.color))&&Number.isFinite(s.size)&&s.size>0&&s.size<=100000&&Array.isArray(s.points)&&s.points.length>0&&s.points.length<=100000&&s.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=m.width&&p.y>=0&&p.y<=m.height)));}
export async function maskedBlob(blob,mask){
 if(!mask?.strokes?.length)return blob;
 const img=await createImageBitmap(blob),c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);img.close();ctx.scale(c.width/mask.width,c.height/mask.height);
 for(const s of mask.strokes){ctx.fillStyle=ctx.strokeStyle=s.color||'#ffffff';ctx.lineWidth=s.size;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();ctx.arc(s.points[0].x,s.points[0].y,s.size/2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();}
 return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('圖片合成失敗')),'image/png'));
}
