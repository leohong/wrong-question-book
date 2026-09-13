import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {previewAnswer,renderAnswers} from '../dist/math-answer.js';
const dom=new JSDOM('<div id="root"><div class="answer-text"></div><textarea></textarea></div>');
globalThis.document=dom.window.document;
globalThis.Node=dom.window.Node;
const root=document.querySelector('#root'),element=root.querySelector('.answer-text');
const sample=String.raw`(A) $-\frac{19}{7} = (-3) + \frac{2}{7}$
(B) $-2\frac{3}{5} = (-\frac{3}{5}) + (-2)$
(C) $- (-\frac{4}{5} - \frac{3}{7} + \frac{5}{9}) = (-\frac{5}{9}) - (\frac{4}{5} - \frac{3}{7})$
(D) $(2\frac{1}{4} + 4\frac{1}{3}) - \frac{3}{5} = 4\frac{1}{3} - \frac{3}{5} + 2\frac{1}{4}$`;
test('四個選項在預覽與答案卡排成分數，重新顯示不重複渲染',()=>{
 previewAnswer(element,sample);
 assert.equal(element.querySelectorAll('.katex').length,4);
 assert.ok(element.querySelectorAll('.mfrac').length>=13);
 assert.ok(element.textContent.includes('(D)'));
 renderAnswers(root);
 assert.equal(element.querySelectorAll('.katex').length,4);
 element.textContent=sample;renderAnswers(root);
 assert.equal(element.querySelectorAll('.katex').length,4);
});
test('獨立公式與括號分隔符可用，無效公式保留原文',()=>{
 previewAnswer(element,String.raw`$$\frac{1}{2}$$ \(x+1\) \[y=2\]`);
 assert.equal(element.querySelectorAll('.katex').length,3);
 assert.equal(element.querySelectorAll('.katex-display').length,2);
 const invalid=String.raw`錯誤 $\frac{$ 與未配對 $x`;
 previewAnswer(element,invalid);assert.equal(element.textContent,invalid);
});
test('文字視為純文字，公式不能插入連結或外部圖片，輸入欄位保留原文',()=>{
 const text=String.raw`<img src=x onerror=alert(1)> $\href{https://example.com}{x}$ $\includegraphics{https://example.com/a.png}$`;
 previewAnswer(element,text);
 assert.equal(element.querySelectorAll('img,a').length,0);
 assert.ok(element.textContent.includes('<img src=x'));
 root.querySelector('textarea').value=sample;renderAnswers(root);
 assert.equal(root.querySelector('textarea').value,sample);
 previewAnswer(element,'一般答案\n第二行');assert.equal(element.textContent,'一般答案\n第二行');
});

test('題目卡與答案卡共用公式排版',()=>{
 const question=document.createElement('div');question.className='question-text';question.textContent=sample;root.append(question);
 renderAnswers(root);assert.equal(question.querySelectorAll('.katex').length,4);
 question.remove();
});
