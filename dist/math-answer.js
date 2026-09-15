import renderMathInElement from './vendor/katex/contrib/auto-render.mjs';
import {markdownToHtml} from './markdown.js';
export const mathOptions = {
  delimiters: [
    {left:'$$',right:'$$',display:true},
    {left:'$',right:'$',display:false},
    {left:'\\(',right:'\\)',display:false},
    {left:'\\[',right:'\\]',display:true}
  ],
  trust:false, strict:'ignore', throwOnError:true,
  maxExpand:1000, maxSize:10,
  errorCallback:()=>{}
};
export function renderAnswers(root){
  root.querySelectorAll('.answer-text, .question-text').forEach(element=>{
    if(element.dataset.rendered!=='true'){element.innerHTML=markdownToHtml(element.textContent);element.dataset.rendered='true';}
    renderMathInElement(element,{...mathOptions,macros:{}});
  });
}
export function previewAnswer(element,text){
  element.innerHTML=markdownToHtml(text);element.dataset.rendered='true';
  renderMathInElement(element,{...mathOptions,macros:{}});
}
