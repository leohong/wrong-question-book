# 開發交接紀錄

更新日期：2026-09-13（Asia/Taipei）

## 專案與目前狀態

- 專案：拾題｜錯題本，繁體中文、手機友善的單機網頁 App。
- 儲存庫：https://github.com/leohong/wrong-question-book.git
- 分支：main；本次功能已推送至提交 `2f27f9e`。
- 線上網站：https://leohong.github.io/wrong-question-book/
- 工作目錄：D:/MyProjects/wrong-question-book
- 原生 HTML/CSS/JavaScript，網站直接使用 dist，不需前端建置。
- GitHub Actions 將 dist 部署至 Pages；根目錄 index.html 是分支部署用的轉址入口。
- IndexedDB 保存題庫與圖片，沒有登入或雲端同步；本機和線上網站資料來源不同，搬移需匯出／匯入備份。

## 這段開發完成的功能

### 題目與答案文字、LaTeX

- 題目卡和答案卡都可手動輸入多行文字，最多 10,000 字。
- 可只使用文字、只使用圖片，或兩者並用。
- 題目至少要有圖片或非空白文字；答案圖片或非空白文字都可使題目參與練習。
- 輸入時提供即時預覽；題庫列表、卡片詳情、練習都顯示題目公式，揭曉答案時顯示答案公式。
- 支援 `$...$`、`$$...$$`、`\(...\)`、`\[...\]`。
- KaTeX 程式、CSS、字型與 MIT 授權保存在 dist/vendor/katex，不依賴 CDN。
- 格式錯誤的公式保留原文；trust=false，限制宏展開與尺寸。
- 儲存與 ZIP／JSON 備份保留原始 questionText、answerText，舊備份仍相容。

### 刪除圖片與平均取色

- 編輯題目與答案图片時提供「刪除圖片」，保留文字與公式；儲存卡片才套用，取消不生效。
- 刪除題目圖片時也移除題目原圖引用及遮罩；答案若仍引用共用原圖，照片仍保留。
- 抹除工具按下背景時，取周圍 11 × 11 原圖像素的 RGB 平均值；邊緣裁切有效區域，透明像素按白底合成。
- 單點只取色，拖曳才塗抹；保留復原、還原、放大、移動圖片等功能。

### AI 複製測試版

- 有圖片的題目／答案，在詳情與編輯畫面提供「複製圖片＋AI 指令（測試版）」、「複製指令」、「下載圖片」。
- 複製裁切並套用目前遮罩的圖片，轉成 PNG；使用 ClipboardItem 包含 image/png 與 text/plain。
- 在點擊事件中立即啟動 clipboard.write，以 Promise 準備圖片，保留使用者手勢。
- 瀏覽器／外部聊天介面可能只貼出圖片，提供單獨複製指令與下載作為備用。
- 不自動傳送圖片到外部服務，不含 Gemini／ChatGPT API 串接；使用者自行貼上，再將結果貼回文字欄位。
- 指令：忽略手寫內容，辨識印刷文字、選項、公式與圖表，公式使用 LaTeX；不確定內容標示【無法辨識】；先不解題，詢問是否需要解題並提供步驟。
- 實際 Gemini／ChatGPT 貼上相容性尚未由使用者回報確認；目前驗證為複製邏輯測試。

### 自然、社會分類

- 預設分類：國文、英文、數學、自然、社會。
- 舊 IndexedDB 設定沒有 expandedCategories 標記時，讀取後一次補上自然、社會並保存標記；不重複新增，之後刪除分類不會反覆補回。
- 若補上後超過 100 個分類則略過。
- 重置資料庫恢復五科，保留使用者自行管理分類能力。

### 使用說明書

- 主選單新增「使用說明」。
- 首次使用或說明版本不同時自動切到說明頁；新使用者仍先看到裝置儲存說明對話框。
- 按「我已閱讀」才記錄目前版本，之後同版本不自動顯示。
- 版本：dist/manual.js 的 MANUAL_VERSION，目前為 2026-09-13.1。
- 閱讀狀態儲存在 localStorage 的 shiti-manual-read-version，依瀏覽器／網站來源分開。
- 更新功能時同步修改說明內容並提高 MANUAL_VERSION，讓使用者再次看到新說明。

## 主要檔案

- dist/app.js：畫面、編輯卡片、練習、AI 按鈕綁定、說明頁入口。
- dist/domain.js：hasQuestion／hasAnswer、練習資格、備份驗證與文字欄位。
- dist/storage.js：IndexedDB、照片引用、分類一次補齊標記。
- dist/math-answer.js：題目與答案公式渲染、即時預覽。
- dist/ai-copy.js：AI_PROMPT、PNG 轉換、剪貼簿與下載。
- dist/manual-erase.js：抹除與 sampleBackgroundColor。
- dist/manual.js：說明版本、閱讀狀態與內容。
- dist/style.css／dist/index.html：版面與載入入口。
- tests：domain、storage、backup、reset、math-answer、manual-erase、ai-copy、manual。

## 本機開發與驗證

```powershell
npm ci
npm run check
npm test
npm start
```

- 本機：http://127.0.0.1:4173/，npm start 用 Python HTTP server 服務 dist。
- 本次最後完整測試：27 項通過，語法檢查通過。
- fake-indexeddb 和 jsdom 測試不代表真實手機相機、觸控、剪貼簿效能或相容性。
- Windows 沙箱可能阻擋 Node 測試建立子程序（spawn EPERM）；此次曾在核准後於沙箱外執行 npm test。
- 不需子程序的獨立測試可用 node --test --test-isolation=none tests/指定檔案.test.js；避免把各測試共享的全域 mock 一起跑在同一隔離環境。
- dist/vendor/katex 是網站必要資源，需要一起部署。

## 提交紀錄

- b3a900f：題目與答案文字、LaTeX、刪除圖片。
- efc984c：抹除改為範圍平均取色。
- 2f27f9e：AI 複製測試版、自然社會分類、版本化說明書。

## 已知狀況與建議下一步

1. 線上曾無法使用；強制重新整理後使用者確認正常，推測是舊快取。app.js 入口已有版本查詢參數，但各個相依模組並非全部同步版本化。下一步可採一致資源版本或建置雜湊，避免新舊模組混用；不要用清除題庫方式處理快取。
2. 在真實 Chrome／Safari、手機與 Gemini／ChatGPT 驗證同時貼上圖片與指令，以及備用複製／下載流程。
3. 補充分類升級的專門測試，確認升級一次、保留自訂分類、使用者刪除後不再補回，以及多分頁版本衝突。
4. AI 生成或辨識結果需使用者核對負號、分母、指數與圖表數值；目前不自動覆寫卡片。
5. README 尚未完整同步 AI 複製、五科預設與說明書功能，可更新；使用者說明集中在 dist/manual.js。
6. 使用者習慣先本機試用，再明確要求 git push；後續修改先交付本機，收到 push 要求再提交推送。

## 下次接續方式

先讀本文件與 README.md，確認 git status、最新提交及任何 AGENTS.md，再依使用者指定功能工作。勿假設前一輪伺服器仍在執行。避免重置或清除現有題庫。若修改使用說明，更新 MANUAL_VERSION；若新增模組或更新載入方式，同步考量快取問題。

## 後續產品規劃

考卷輸出與功能缺口優先順序記錄在 PRODUCT_ROADMAP.md。這些是待確認構想，尚未實作；下次可一起讀取。
