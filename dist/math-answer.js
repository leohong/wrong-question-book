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
function bracedEnd(text,start){
  if(text[start]!=='{')return -1;
  let depth=0;
  for(let index=start;index<text.length;index++){
    if(text[index]==='{')depth++;
    else if(text[index]==='}'&&!--depth)return index+1;
  }
  return -1;
}
function wrapBareCommands(text){
  let output='',cursor=0;
  const command=/\\(?:d?frac|tfrac|sqrt)\b/g;
  for(let match; (match=command.exec(text));){
    let end=match.index+match[0].length;
    if(match[0].endsWith('sqrt')&&text[end]==='['){const close=text.indexOf(']',end+1);if(close<0)continue;end=close+1;}
    const first=bracedEnd(text,end);if(first<0)continue;end=first;
    if(match[0].includes('frac')){const second=bracedEnd(text,end);if(second<0)continue;end=second;}
    output+=text.slice(cursor,match.index)+`$${text.slice(match.index,end)}$`;cursor=end;command.lastIndex=end;
  }
  return output+text.slice(cursor);
}
export function normalizeBareLatex(source){
  const text=String(source??'');
  const protectedParts=/(`+)[\s\S]*?\1|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\s)[^\n$]*?\$/g;
  let output='',cursor=0;
  for(const match of text.matchAll(protectedParts)){
    output+=wrapBareCommands(text.slice(cursor,match.index))+match[0];cursor=match.index+match[0].length;
  }
  return output+wrapBareCommands(text.slice(cursor));
}
export function renderAnswers(root){
  root.querySelectorAll('.answer-text, .question-text').forEach(element=>{
    if(element.dataset.rendered!=='true'){element.innerHTML=markdownToHtml(normalizeBareLatex(element.textContent));element.dataset.rendered='true';}
    renderMathInElement(element,{...mathOptions,macros:{}});
  });
}
export function previewAnswer(element,text){
  element.innerHTML=markdownToHtml(normalizeBareLatex(text));element.dataset.rendered='true';
  renderMathInElement(element,{...mathOptions,macros:{}});
}
