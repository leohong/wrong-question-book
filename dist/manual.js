// Bump this version whenever the user-facing instructions change.
export const MANUAL_VERSION='2026-09-13.1';
const KEY='shiti-manual-read-version';
export function needsManual(storage){try{storage=storage||window.localStorage;return storage.getItem(KEY)!==MANUAL_VERSION;}catch{return true;}}
export function acknowledgeManual(storage){try{storage=storage||window.localStorage;storage.setItem(KEY,MANUAL_VERSION);return true;}catch{return false;}}
export function manualContent(){return `
<section class="panel"><span class="tag">最新功能</span><h2>文字、公式與 AI 辨識</h2><p>題目與答案都能手動輸入文字及公式；圖片可刪除。抹除使用周圍 11 × 11 像素的平均背景色。圖片卡片提供「複製圖片＋AI 指令」測試功能。</p></section>
<section class="panel"><h2>1. 收藏題目與答案</h2><p>按「新增題目」，選擇分類並加入照片，或直接輸入題目文字。預設分類為國文、英文、數學、自然、社會，也可在設定新增或更名。</p><p>答案可使用圖片、文字或兩者一起加入，也可稍後補上。題目至少要有圖片或非空白文字；有答案後才會參與練習。編輯後按「儲存卡片」才會保存。</p></section>
<section class="panel"><h2>2. 裁切與抹除圖片</h2><p>選圖後拖曳框選，裁切框可移動與調整大小，也能保留全圖。抹除時先按住乾淨背景，取周圍平均色，再拖曳抹除；只點一下不會塗抹。可復原、全部還原、放大或切換移動圖片。</p><p>儲存前選擇壓縮品質並檢查小字與公式。「刪除圖片」會保留文字；取消編輯不會套用刪除。答案卡也可使用題目卡保留的原始圖片。</p></section>
<section class="panel"><h2>3. 輸入數學公式</h2><p>公式用 <code>$...$</code> 包住，例如 <code>$-\\frac{19}{7}$</code>；獨立公式用 <code>$$...$$</code>。支援多行文字，每個選項可各占一行，最多 10,000 字。</p><p>輸入時可即時預覽，題庫與練習也會顯示公式。無法解析的公式保留原文，請檢查括號及分隔符。</p></section>
<section class="panel"><h2>4. 用 Gemini／ChatGPT 辨識</h2><p>在有圖片的卡片按「複製圖片＋AI 指令」，到 Gemini／ChatGPT 貼上。複製的是目前裁切並套用抹除的圖片；若只貼出圖片，再按「複製指令」補貼，也可下載圖片上傳。</p><p>指令會要求忽略手寫內容，辨識印刷文字與 LaTeX，不確定的內容標示【無法辨識】，並詢問是否需要解題。將辨識結果貼回題目或答案文字欄位，核對負號、分母與指數後儲存。圖片由你自行貼到外部服務。</p></section>
<section class="panel"><h2>5. 練習與間隔複習</h2><p>選擇分類、出題範圍及題數（1–200 題）。先作答，再翻開答案，自行判定答對或答錯。每題判定立即保存，尚未作答的題目不計分。</p><p>預設連續答對 3 次後進入間隔複習，間隔為 1、3、7、14、30 天，之後每 30 天複習；答錯即重置。可在設定調整熟練門檻，統計頁可查看進度。</p></section>
<section class="panel"><h2>6. 保存、備份與換裝置</h2><p>題庫保存在目前瀏覽器，沒有自動雲端同步。本機與 GitHub Pages 的資料各自獨立。更換裝置、瀏覽器或網址前，在「設定與資料」匯出完整 ZIP 備份，再到新環境匯入。</p><p>匯入會取代目前題庫，請先備份。清除瀏覽器網站資料或重置資料庫會清除題庫。說明書更新後會自動開啟，按「我已閱讀」記住目前版本；也可隨時從主選單查看。</p></section>`;}
