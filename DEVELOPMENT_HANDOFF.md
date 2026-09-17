# 拾題開發與交接文件

更新日期：2026-09-17（Asia/Taipei）

這是後續開發者與 Codex 的主要技術入口。使用方式請讀 `README.md` 與 `dist/manual.js`；未來構想請讀 `PRODUCT_ROADMAP.md`。

## 專案定位

- 繁體中文、手機優先的照片錯題本網頁 App。
- 儲存庫：`https://github.com/leohong/wrong-question-book.git`
- 正式網站：`https://leohong.github.io/wrong-question-book/`
- 工作目錄：`E:\ProjectCode\Wrong question book`；主分支 `main`。
- 原生 HTML、CSS、ES Modules，沒有前端打包步驟；Pages 直接發布 `dist/`。
- local-first：題庫、照片與進度保存在目前網站來源的 IndexedDB；沒有登入、自動同步或後端。
- 換網址、瀏覽器或裝置時，使用者手動匯出 ZIP 再匯入。

## 不可破壞的產品規則

1. 不得因部署、升級或快取問題清除使用者題庫。
2. 題目與答案可使用圖片、文字或兩者；沒有答案的卡片不參與練習，但可加入考卷。
3. 題目和答案可共用一張原圖，`questionMask` 與 `answerMask` 必須獨立。
4. 答案使用題目圖片時，必須取裁切後、抹除前的 `questionOriginal`。
5. 手動抹除第一次按下只取周圍 11 × 11 像素平均色；實際拖曳後才建立筆畫，單點不能留下遮罩。
6. 預設連續答對 3 次後進入間隔複習；間隔 1、3、7、14、30 天，之後每 30 天；答錯重置。
7. 不得暗示 IndexedDB 是雲端同步。介面必須保留明確的備份說明。
8. 不重新導入已放棄的 Gemini、OpenAI 或 Hugging Face 自動去筆跡方案，除非使用者再次明確要求。
9. 修改先在本機驗證；只有使用者明確要求 `git push` 才推送。

## 已完成功能

- 快速新增、完整新增、題目與答案配對。
- 照片框選、四邊調整、拖曳選框、關閉及重畫選框。
- 手動抹除、取色、復原、重置、放大及移動畫布。
- 題目／答案共用原圖與獨立遮罩。
- 題目及答案文字、Markdown、KaTeX 公式。
- 五科預設分類、自訂分類、20／30／自訂題數練習。
- 熟練度、間隔複習、統計圖及各分類掌握度。
- 雙欄 A4 自動組卷、答案卷及黑白列印調整。
- ZIP 備份、舊 JSON 相容、完整性檢查及原子還原。
- 可全部複製圖片與自訂 AI 指令，也保留分開複製；不自動上傳。
- 資料庫重置需輸入「重置」確認。

## 架構進度

1. 頁面層已拆至 `dist/pages/`。
2. 資料操作已集中至 `dist/application/*-service.js`。
3. 卡片控制器與圖片流程已拆至 `dist/components/`、`dist/workflows/`。
4. `app-store.js` 已集中狀態、初始化、寫入鎖與 commit；commit `5798acb` 已推送。
5. 已有 50 項 Node 單元、資料及呈現層測試。
6. Playwright 端到端測試已建立，涵蓋新增、重新載入、練習、統計、ZIP 還原、手機圖片框選、手動抹除、共用原圖及考卷。

第六階段目前在工作目錄中。接手時必須重新查看 `git status`，不要只依這段快照判斷。

## 分層與責任

```text
dist/app.js                     啟動、導覽、模組組裝
  ├─ pages/                     頁面渲染與頁面事件
  ├─ components/                可重用互動元件
  └─ workflows/                 跨畫面的圖片流程
application/*-service.js        使用案例、輸入驗證、狀態轉換
application/app-store.js        記憶體狀態、寫入鎖、commit
storage.js                      IndexedDB、交易、圖片引用、遷移
domain.js                       純規則：選題、熟練度、備份驗證
backup.js / media.js            ZIP、圖片雜湊、縮圖、格式轉換
```

頁面不能直接寫 IndexedDB。新增資料操作時先放入 application service，再由 App Store commit。可純函式化的規則放 `domain.js` 並寫單元測試。

## IndexedDB 與卡片模型

目前資料庫版本為 2，stores：

- `settings`：revision、categories、target、aiPrompt、遷移標記。
- `questions`：題目中繼資料與 `image:<sha256>` 引用。
- `images`：原始壓縮 Blob，以 SHA-256 去重。
- `thumbnails`：可重建的 360 px 縮圖，不進備份。
- `reviewLogs`：逐次作答紀錄。
- `book`：舊版整包資料，只供遷移，成功後刪除。

卡片主要欄位：

```text
id, title, category
question, questionOriginal, questionMask, questionText
answer, answerMask, answerText
streak, stage, attempts, mistakes, created, due
```

遮罩為 `{version:1,width,height,strokes}`；stroke 保存 `color`、`size`、`points`。改格式時必須同步更新驗證、合成、備份及還原測試。

### 寫入與衝突

- App Store 阻止同一分頁重疊寫入；備份期間也阻止資料變更。
- `storage.js` 使用 revision 防止舊分頁覆寫新資料。
- 圖片先準備完成再開交易；失敗不能留下未引用圖片。
- 最後一個圖片引用移除後，才刪除 Blob 與縮圖。

## 備份格式

- ZIP manifest：`format: "shiti"`、`version: 2`。
- `manifest.json` 保存狀態與圖片索引；圖片按 SHA-256 命名且只存一次。
- 匯入上限：ZIP 512 MB；舊 JSON 200 MB。
- 匯入先驗證格式、欄位、重複 ID、圖片雜湊及遮罩，再原子取代。
- 匯入失敗必須保留原資料。

資料模型改動至少驗證：舊資料遷移、ZIP round trip、舊 JSON、損壞備份、共用圖片、遮罩、失敗不覆寫。

## 圖片處理經驗

- 上傳限制 35 MB。
- 裁切後品質：清晰 1800 px／.92、平衡 1600 px／.84、省空間 1200 px／.72。
- 比較 JPEG 與 WebP 實際大小後保存較小者。
- 列表讀縮圖，打開卡片才讀原圖；DOM 移除時釋放 Object URL。
- 遮罩不能烘焙進共用原圖，否則答案無法顯示未抹除內容。
- 遮罩不顯示時先查 `data-photo`、`data-mask`、`observeImages()`、Blob 轉換和尺寸，不要先用 cache busting 掩蓋問題。
- 快速新增刻意略過抹除與清晰度確認；完整編輯才提供完整工具。

## UI、文字與安全

- 使用者文字先經 `esc()`；Markdown 不允許任意 HTML 或危險 URL。
- KaTeX 使用本地資源、`trust=false`；無效公式保留原文。
- 題目與答案文字各最多 10,000 字。
- 修改使用說明時，同步修改 `dist/manual.js` 並提高 `MANUAL_VERSION`。
- 新功能優先使用既有 `dialog`、`toast`、`safely`、page heading 與 service 注入方式。

## 本機開發與驗證

```powershell
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run verify --silent
npm start
```

- App：`http://127.0.0.1:4173/`。
- Playwright：獨立使用 `http://127.0.0.1:4178/` 與新 browser context，不讀寫 4173 題庫。
- Windows Playwright 使用已安裝的 Chrome；CI 使用下載的 Chromium。
- Node 24：`npx -y node@24 --test`；E2E 可用 `npx -y node@24 node_modules/@playwright/test/cli.js test`。
- `test-results/`、`playwright-report/` 必須留在 `.gitignore`。
- `npm run verify --silent` 依序執行語法、Node 與 Playwright 測試；全部成功只輸出「全部完成」，失敗才輸出該步驟的完整內容與 trace 路徑。
- 開發途中只跑相關測試，例如 AI 工具可用 `npm run test:ai --silent`，Playwright 可用 `npx playwright test -g "全部複製"`；commit 或 push 前才執行完整 verify。

測試層級：

- `tests/*.test.js`：domain、storage、backup、服務與呈現模組。
- `tests/e2e/app.spec.js`：跨模組使用者流程。
- `tests/e2e/server.js`：只服務 `dist/` 的測試伺服器，不是正式伺服器。

圖片、IndexedDB、備份或頁面串接修改不能只跑函式測試；至少重跑相應 E2E。

## 部署與 Git

- `.github/workflows/pages.yml` 使用 Node 24。
- CI：`npm ci` → syntax check → Node tests → 安裝 Chromium → Playwright → 上傳 `dist/` → Pages。
- 根目錄 `index.html` 只負責 branch deployment 導向 `dist/index.html`。
- 修改載入圖時需考慮舊快取混用；不要用清除題庫解決快取。
- Windows 遇到 dubious ownership：

```powershell
git -c safe.directory="E:/ProjectCode/Wrong question book" status
```

推送前：查看 status 和 diff、執行 `git diff --check`、三組測試、只 stage 核准檔案；使用者明確要求後才 push。

## 已放棄或受限方向

- Gemini 曾出現 free-tier limit 0、HTTP 429，以及只回傳框座標、不回傳圖片。
- Hugging Face 去筆跡測試未證明能可靠保留印刷文字和細線。
- 目前採手動遮罩與外部 AI 剪貼簿操作，不保存 API key，也不自動傳送照片。
- Web Share、剪貼簿及相機依瀏覽器而異；自動測試不能取代真實裝置驗收。

## 後續優先事項

1. 真實 Android／iPhone 相機、觸控與長時間使用驗收。
2. 統一 ES module 資源版本策略，避免新舊模組混用。
3. 未儲存編輯提醒、最近備份時間與備份提醒。
4. 題目搜尋、標籤、來源、批次分類。
5. 回收筒或短期復原。
6. 大題庫、低階手機與 512 MB 備份壓力測試。
7. PWA／離線功能需先設計可靠更新策略。

## 接手檢查清單

1. 讀 `AGENTS.md`、本文件、`README.md`、`PRODUCT_ROADMAP.md`。
2. 執行 `git status --short`，辨認未推送工作。
3. 不假設 4173 或 4178 伺服器仍在執行。
4. 不重置、清空或匯入使用者的 4173 題庫做測試。
5. 先定位責任層，避免把規則重新塞回 `app.js`。
6. 完成後報告修改、測試、風險，以及是否已 commit／push。
