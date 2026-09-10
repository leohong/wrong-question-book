export const PRESETS={clear:{edge:1800,quality:.92},balanced:{edge:1600,quality:.84},small:{edge:1200,quality:.72}};
const encode=(canvas,type,quality)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('無法壓縮圖片，請重試。')),type,quality));
export async function compressCanvas(source,mode){
  const preset=PRESETS[mode];if(!preset)throw Error('無效的壓縮模式。');
  const scale=Math.min(1,preset.edge/Math.max(source.width,source.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);
  const [jpeg,webp]=await Promise.all([encode(canvas,'image/jpeg',preset.quality),encode(canvas,'image/webp',preset.quality)]);
  return{blob:webp.type==='image/webp'&&webp.size<jpeg.size?webp:jpeg,width:canvas.width,height:canvas.height};
}
