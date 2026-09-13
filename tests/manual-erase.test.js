import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleBackgroundColor} from '../dist/manual-erase.js';
test('平均範圍顏色，單一黑點不會把白背景取成黑色',()=>{
 const ctx={getImageData(x,y,w,h){assert.deepEqual([x,y,w,h],[5,5,11,11]);const data=new Uint8ClampedArray(w*h*4).fill(255);data.set([0,0,0,255],60*4);return {data};}};
 assert.equal(sampleBackgroundColor(ctx,30,30,{x:10,y:10}),'#fdfdfd');
});
test('圖片邊緣只平均有效範圍，透明像素依白底合成',()=>{
 const ctx={getImageData(x,y,w,h){assert.deepEqual([x,y,w,h],[0,0,2,1]);return {data:new Uint8ClampedArray([100,120,140,255,0,0,0,0])};}};
 assert.equal(sampleBackgroundColor(ctx,2,1,{x:2,y:1}),'#b2bcc6');
});
