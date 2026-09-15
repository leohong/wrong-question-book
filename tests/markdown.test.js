import test from 'node:test';
import assert from 'node:assert/strict';
import {markdownToHtml} from '../dist/markdown.js';

test('題目 Markdown 支援常用格式並保留 LaTeX',()=>{
 const html=markdownToHtml('# 題目\n\n**粗體**與$x^2$\n\n- A\n- B\n\n> 提示');
 assert.match(html,/<h1>題目<\/h1>/);assert.match(html,/<strong>粗體<\/strong>/);assert.match(html,/\$x\^2\$/);
 assert.match(html,/<ul><li>A<\/li><li>B<\/li><\/ul>/);assert.match(html,/<blockquote>提示<\/blockquote>/);
});

test('Markdown 不執行 HTML 或危險連結',()=>{
 const html=markdownToHtml('<img src=x onerror=alert(1)> [壞連結](javascript:alert(1)) [安全](https://example.com)');
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('href="javascript:'));assert.match(html,/href="https:\/\/example.com"/);
});
