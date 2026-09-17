import test from 'node:test';
import assert from 'node:assert/strict';
import {validateImageFile} from '../dist/workflows/image-workflow.js';
import {createCardController} from '../dist/components/card-controller.js';

test('image workflow rejects non-images and oversized files before opening an editor',()=>{
  assert.throws(()=>validateImageFile({type:'text/plain',size:10}),/請選擇照片檔案/);
  assert.throws(()=>validateImageFile({type:'image/png',size:35*1024*1024+1}),/35 MB/);
  assert.doesNotThrow(()=>validateImageFile({type:'image/jpeg',size:1024}));
});

test('card controller exposes shared safe question and answer content renderers',()=>{
  const controller=createCardController({
    getState:()=>({cards:[],categories:['數學'],aiPrompt:'prompt'}),
    getDefaultCategory:()=>'',
    cardService:{},imageWorkflow:{},dialog(){},modal:{querySelectorAll:()=>[]},toast(){},safely:fn=>fn,renderApp(){},
    optionsHtml:()=>'',openQuickAdd(){},query:()=>null
  });
  const card={question:null,questionText:'<script>$x$</script>',answer:null,answerText:'**2**'};
  assert.equal(controller.questionContent(card),'<div class="question-text">&lt;script&gt;$x$&lt;/script&gt;</div>');
  assert.equal(controller.answerContent(card),'<div class="answer-text">**2**</div>');
});
