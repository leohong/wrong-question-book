export const $=selector=>document.querySelector(selector);

export const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[char]));

export const formatDate=milliseconds=>new Date(milliseconds).toLocaleDateString('zh-TW',{
  month:'short',
  day:'numeric'
});

export function pageHeading(kicker,title,description,action=''){
  return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p style="margin:0">${description}</p></div>${action}</div>`;
}
