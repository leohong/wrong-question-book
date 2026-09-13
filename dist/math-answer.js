import renderMathInElement from './vendor/katex/contrib/auto-render.mjs';
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
  root.querySelectorAll('.answer-text, .question-text').forEach(element=>renderMathInElement(element,{...mathOptions,macros:{}}));
}
export function previewAnswer(element,text){
  element.textContent=text;
  renderMathInElement(element,{...mathOptions,macros:{}});
}
