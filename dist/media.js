export const IMAGE_PREFIX = 'image:';
export const isImageRef = value => typeof value === 'string' && /^image:[a-f0-9]{64}$/.test(value);

export function dataUrlToBlob(url) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(url);
  if (!match) throw Error('圖片格式不正確。');
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  return new Blob([bytes], {type:match[1]});
}
export async function imageId(blob) {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return IMAGE_PREFIX + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
}
export async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i=0;i<bytes.length;i+=32768) binary += String.fromCharCode(...bytes.subarray(i,i+32768));
  return `data:${blob.type};base64,${btoa(binary)}`;
}
export async function thumbnail(blob) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1,360/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.75));
  } finally {bitmap.close();}
}
