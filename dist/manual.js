// Bump this version whenever the user-facing instructions change.
export const MANUAL_VERSION='2026-09-17.3';
const KEY='shiti-manual-read-version';
export function needsManual(storage){try{storage=storage||window.localStorage;return storage.getItem(KEY)!==MANUAL_VERSION;}catch{return true;}}
export function acknowledgeManual(storage){try{storage=storage||window.localStorage;storage.setItem(KEY,MANUAL_VERSION);return true;}catch{return false;}}
export function manualContent(){return `
<section class="panel"><span class="tag">本次更新</span><h2>從快速收藏到自動組卷</h2><ul><li>新增「快速新增」三步驟流程，可連續拍攝多題。</li><li>可從已有答案的錯題隨機產生題目卷與答案卷。</li><li>題目與答案文字支援 Markdown 和數學公式。</li><li>AI 工具可用「全部複製」一次複製圖片與辨識指令。</li></ul></section>
<section class="panel"><h2>1. 快速新增題目</h2><ol><li>在「我的題庫」按「快速新增」，選擇分類後拍照或選圖。</li><li>拖曳框選一道題目；可移動方框、拉動四邊或保留全圖。</li><li>答案選擇「使用題目原圖」、「另拍答案」、「選擇答案圖片」、「文字答案」或「稍後補答案」。</li><li>按「儲存並完成」，或按「儲存並繼續」立即加入下一題。</li></ol><p>快速模式會記住上一次分類、自動產生題目名稱，並以平衡畫質儲存。它會略過抹除和清晰度確認，以縮短收藏時間。</p></section>
<section class="panel"><h2>2. 完整新增與編輯</h2><p>需要自訂題名、輸入完整題目、手動抹除、選擇壓縮品質或使用 AI 指令時，可在快速新增第一步按「改用完整新增」。已收藏的題目也能開啟後再編輯。</p><p>題目至少需要一張圖片或非空白文字。答案可使用圖片、文字或兩者；沒有答案的卡片會標示「待補答案」，補上答案後才會加入練習。</p></section>
<section class="panel"><h2>3. 裁切、原圖與手動抹除</h2><p>完整模式的裁切框可移動、調整四邊，也可按框上的 × 清除後重畫。抹除時，第一下只會選取周圍 11 × 11 像素的平均背景色；開始拖曳後才會留下抹除筆畫。</p><p>題目卡保留裁切後、抹除前的原圖，抹除內容以遮罩另外保存。答案選擇「使用題目卡原始圖片」時會共用同一張原圖，但題目與答案各自保留遮罩，因此不會重複儲存照片，也不會把題目卡的抹除效果帶到答案卡。</p><p>儲存前可選清晰、平衡或省空間品質。請放大核對負號、小數點、分母、指數與圖形標示。</p></section>
<section class="panel"><h2>4. Markdown 與數學公式</h2><p>題目與答案文字支援標題、粗體、斜體、清單、引用、程式碼與網址。常見的 <code>\\frac{...}{...}</code> 與 <code>\\sqrt{...}</code> 會自動辨識；仍建議行內公式用 <code>$...$</code>，例如 <code>$-\\frac{19}{7}$</code>，獨立公式用 <code>$$...$$</code>。</p><p>完整編輯時會即時預覽，題庫卡片、題目詳情及練習畫面也會顯示格式。每個欄位最多 10,000 字；無法解析的公式會保留原文。</p></section>
<section class="panel"><h2>5. 搭配 Gemini 或 ChatGPT 辨識</h2><p>在圖片卡片展開 AI 工具後，可按「全部複製」一次將圖片與 AI 指令寫入剪貼簿，再貼到支援多格式剪貼簿的服務。若瀏覽器或目標服務只接受其中一種內容，請改用「複製圖片」與「複製指令」分開操作；也可下載圖片。</p><p>內建指令要求忽略手寫內容，保留題目、解答、公式及圖表的順序與位置，把遮住或不確定的地方標示為 <code>???</code>，不猜測且不先解題；最後詢問是否需要解題並提供觀念思考與速解步驟。把辨識結果貼回文字欄位後，仍需自行核對原圖。</p></section>
<section class="panel"><h2>6. 自動產生考卷</h2><p>在「產生考卷」設定卷名、分類、出題範圍和題數。系統會從符合條件的卡片隨機抽題，同一份考卷不會重複；沒有答案的卡片也能加入，答案卷會改為顯示原題。</p><p>考卷採 A4 直式雙欄版面，每欄最多 5 題、每頁最多 10 題，題目之間使用虛線分隔。長題或大圖會依內容繼續分頁，避免壓縮到無法閱讀。</p><p>可選擇是否附上答案卷，也能重新抽題。完成預覽後按「列印／另存 PDF」；在瀏覽器列印視窗選擇印表機或「另存為 PDF」。產生考卷不會改變熟練度。</p></section>
<section class="panel"><h2>7. 練習、熟練度與統計</h2><p>在「開始練習」選擇分類、出題範圍及 1–200 題。先自行作答，再翻開答案並判定答對或答錯；每題判定會立即保存。</p><p>預設連續答對 3 次後進入間隔複習，間隔依序為 1、3、7、14、30 天，之後每 30 天複習。任何階段答錯都會重置；熟練門檻可在設定調整，統計頁會顯示近期答題與各分類進度。</p></section>
<section class="panel"><h2>8. 儲存、備份與重置</h2><p>題庫、照片與進度只保存在目前網址及瀏覽器，沒有自動雲端同步；本機預覽和 GitHub Pages 的資料彼此獨立。換手機、瀏覽器或網址前，請先在「設定與資料」匯出 ZIP，再到新環境匯入。</p><p>匯入備份會取代目前題庫。「重置資料庫」會清除目前瀏覽器中的所有題目、照片、作答紀錄與熟練進度，並恢復預設分類；需要保留資料時請先匯出備份。</p></section>`;}
