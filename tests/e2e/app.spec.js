import {test,expect} from '@playwright/test';

const MANUAL_VERSION='2026-09-17.3';
const pixelPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAJ0lEQVR4nO3PQQ0AIBDAsAP/nuGNAvZoFSzZOjNnyNi1W7Zu3QkAAADgB2XQAXlW6j2OAAAAAElFTkSuQmCC','base64');

async function openCleanApp(page){
  await page.addInitScript(version=>localStorage.setItem('shiti-manual-read-version',version),MANUAL_VERSION);
  await page.goto('/');
  const welcome=page.getByRole('heading',{name:'開始使用拾題'});
  if(await welcome.isVisible())await page.getByRole('button',{name:'使用此裝置儲存'}).click();
  await expect(page.getByRole('heading',{name:'我的題庫'})).toBeVisible();
}

async function addTextCard(page,{title='分數練習',question='計算 **1/2 + 1/3**',answer='$5/6$'}={}){
  await page.getByRole('button',{name:'＋ 快速新增'}).click();
  await page.getByRole('button',{name:'改用完整新增'}).click();
  await page.locator('#card-title').fill(title);
  await page.getByLabel('手動輸入題目').fill(question);
  await page.getByLabel('手動輸入答案').fill(answer);
  await expect(page.locator('#save-card')).toBeEnabled();
  await page.locator('#save-card').click();
  await expect(page.getByRole('heading',{name:title})).toBeVisible();
}

test('文字題目可新增、重新載入並保留內容',async({page})=>{
  await openCleanApp(page);
  await addTextCard(page,{});
  await page.reload();
  await expect(page.getByRole('heading',{name:'分數練習'})).toBeVisible();
  await page.getByRole('button',{name:/分數練習/}).click();
  await expect(page.locator('#modal').getByText('計算 1/2 + 1/3')).toBeVisible();
  await expect(page.locator('#modal .answer-text')).toContainText('5/6');
});

test('完成一次練習後會更新題目與統計',async({page})=>{
  await openCleanApp(page);
  await addTextCard(page,{title:'練習測試',question:'2 + 3 = ?',answer:'5'});
  await page.getByRole('button',{name:/開始練習/}).click();
  await page.locator('#practice-count').fill('1');
  await page.locator('#start-practice').click();
  await expect(page.getByText('第 1 / 1 題')).toBeVisible();
  await page.locator('#reveal-answer').click();
  await expect(page.getByText('答案卡',{exact:true})).toBeVisible();
  await page.locator('#grade-correct').click();
  await expect(page.getByRole('heading',{name:'這次的練習，完成了。'})).toBeVisible();
  await expect(page.getByText('共 1 題 · 答對 1 題 · 答錯 0 題')).toBeVisible();
  await page.locator('#finish-practice').click();
  await page.getByRole('button',{name:/學習統計/}).click();
  await expect(page.getByText('作答次數')).toBeVisible();
  await expect(page.getByText('1 / 0')).toBeVisible();
});

test('ZIP 備份可在重置後完整匯入',async({page})=>{
  await openCleanApp(page);
  await addTextCard(page,{title:'備份測試',question:'保留這道題',answer:'保留這個答案'});
  await page.getByRole('button',{name:/設定與資料/}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#export-data').click();
  const download=await downloadPromise,backupPath=await download.path();
  expect(backupPath).toBeTruthy();
  await page.locator('#reset-database').click();
  await page.locator('#reset-confirmation').fill('重置');
  await page.locator('#confirm-reset').click();
  await page.getByRole('button',{name:/我的題庫/}).click();
  await expect(page.getByRole('heading',{name:'備份測試'})).toHaveCount(0);
  await page.getByRole('button',{name:/設定與資料/}).click();
  const chooser=page.waitForEvent('filechooser');
  await page.locator('#import-data').click();
  await (await chooser).setFiles(backupPath);
  await expect(page.getByRole('heading',{name:'確認匯入這份備份？'})).toBeVisible();
  await page.locator('#confirm-import').click();
  await page.getByRole('button',{name:/我的題庫/}).click();
  await expect(page.getByRole('heading',{name:'備份測試'})).toBeVisible();
});

test('@mobile 手機尺寸可用照片快速新增並產生考卷',async({page,context})=>{
  await openCleanApp(page);
  await page.getByRole('button',{name:'＋ 快速新增'}).click();
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'選擇圖片',exact:true}).click();
  await (await chooser).setFiles({name:'question.png',mimeType:'image/png',buffer:pixelPng});
  await expect(page.getByRole('heading',{name:'快速框選題目'})).toBeVisible();
  await page.locator('#quick-crop-full').click();
  await page.locator('#quick-crop-use').click();
  await expect(page.getByRole('heading',{name:'選擇答案來源'})).toBeVisible();
  await page.locator('#quick-same').click();
  await page.locator('#quick-save').click();
  await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('.card').click();
  await page.getByText('AI 工具（選用）').first().click();
  await expect(page.getByRole('button',{name:'全部複製'}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'分享給 AI'})).toHaveCount(0);
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:4178'});
  await page.getByRole('button',{name:'全部複製'}).first().click();
  await expect(page.locator('#toast')).toHaveText('已複製圖片與 AI 指令');
  const clipboardTypes=await page.evaluate(async()=>[...new Set((await navigator.clipboard.read()).flatMap(item=>item.types))]);
  expect(clipboardTypes).toEqual(expect.arrayContaining(['image/png','text/plain']));
  await page.locator('#edit-card').click();
  await page.locator('[data-erase="question"]').click();
  await expect(page.getByRole('heading',{name:'抹除不需要的部分'})).toBeVisible();
  const canvas=page.locator('#erase-canvas'),box=await canvas.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x+box.width*0.25,box.y+box.height*0.5);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*0.75,box.y+box.height*0.5,{steps:5});
  await page.mouse.up();
  await expect(page.locator('#erase-status')).toContainText('已抹除 1 筆');
  await page.locator('#erase-next').click();
  await expect(page.getByRole('heading',{name:'編輯題目卡'})).toBeVisible();
  await page.locator('#save-card').click();
  await page.getByRole('button',{name:/產生考卷/}).click();
  await page.locator('#exam-count').fill('1');
  await page.locator('#exam-generate').click();
  await expect(page.getByText('已選 1 題。')).toBeVisible();
  await expect(page.locator('#exam-output')).toContainText('拾題練習卷');
});

test('@mobile 手機尺寸可顯示未加分隔符的 LaTeX 公式',async({page})=>{
  await openCleanApp(page);
  await addTextCard(page,{
    title:'手機公式測試',
    question:String.raw`已知 x=-3，求 \frac{x-9}{4} + \frac{x^2-x+1}{3}。`,
    answer:String.raw`答案是 \frac{4}{3}`
  });
  await page.getByRole('button',{name:/手機公式測試/}).click();
  await expect(page.locator('#modal .question-text .mfrac')).toHaveCount(2);
  await expect(page.locator('#modal .answer-text .mfrac')).toHaveCount(1);
});
