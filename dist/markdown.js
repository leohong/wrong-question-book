const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function inlineMarkdown(source){
  const tokens=[];
  const hold=value=>`\uE000${tokens.push(value)-1}\uE001`;
  let text=String(source).replace(/(`+)([\s\S]*?)\1/g,(_,ticks,code)=>hold(`<code>${escapeHtml(code)}</code>`));
  text=text.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\s)[^\n$]*?\$)/g,value=>hold(escapeHtml(value)));
  text=escapeHtml(text)
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^\n]+?)\*\*/g,'<strong>$1</strong>').replace(/__([^\n]+?)__/g,'<strong>$1</strong>')
    .replace(/~~([^\n]+?)~~/g,'<del>$1</del>').replace(/(^|[^*])\*([^*\n]+?)\*/g,'$1<em>$2</em>').replace(/(^|[^_])_([^_\n]+?)_/g,'$1<em>$2</em>');
  return text.replace(/\uE000(\d+)\uE001/g,(_,index)=>tokens[Number(index)]);
}

export function markdownToHtml(source){
  const lines=String(source||'').replace(/\r\n?/g,'\n').split('\n'),out=[];
  let paragraph=[],list=null,quote=[],code=null;
  const flushParagraph=()=>{if(paragraph.length){out.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`);paragraph=[];}};
  const flushList=()=>{if(list){out.push(`<${list.type}>${list.items.map(item=>`<li>${inlineMarkdown(item)}</li>`).join('')}</${list.type}>`);list=null;}};
  const flushQuote=()=>{if(quote.length){out.push(`<blockquote>${quote.map(inlineMarkdown).join('<br>')}</blockquote>`);quote=[];}};
  const flush=()=>{flushParagraph();flushList();flushQuote();};
  for(const line of lines){
    if(code!==null){if(/^```/.test(line)){out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);code=null;}else code.push(line);continue;}
    if(/^```/.test(line)){flush();code=[];continue;}
    const heading=line.match(/^(#{1,4})\s+(.+)$/);if(heading){flush();out.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);continue;}
    if(/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)){flush();out.push('<hr>');continue;}
    const item=line.match(/^\s*([-+*]|\d+\.)\s+(.+)$/);if(item){flushParagraph();flushQuote();const type=/\d/.test(item[1])?'ol':'ul';if(list?.type!==type){flushList();list={type,items:[]};}list.items.push(item[2]);continue;}
    const quoted=line.match(/^>\s?(.*)$/);if(quoted){flushParagraph();flushList();quote.push(quoted[1]);continue;}
    if(!line.trim()){flush();continue;}flushList();flushQuote();paragraph.push(line);
  }
  if(code!==null)out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);flush();return out.join('');
}
