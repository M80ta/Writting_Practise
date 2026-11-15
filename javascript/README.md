# Letter & Line｜純 JavaScript 中英練習紙

這一版使用 **HTML、CSS 與原生 JavaScript**，在瀏覽器內完成驗證、SVG 排版、預覽與列印。使用網頁不需安裝 Rust、Python、Node.js，也沒有 API 或後端服務。英文字型、中文注音字型及完整授權文字均隨專案附帶。

**中文注音版：直接開啟 [`chinese.html`](chinese.html)**，或在網頁選「中文注音」範本。支援田字格／米字格／方格、附注音標楷與純國字、逐格多音字選擇。完整操作與來源見 [中文注音使用說明](../docs/CHINESE.zh-TW.md)。

本程式採 [PolyForm Noncommercial 1.0.0](LICENSE.md)，商用須事先確認並取得所需的書面授權。完整中文說明見 [LEGAL.md](LEGAL.md)，網站內也提供 `legal.html`。

## 開啟方式

直接以近期版本的 Chrome、Edge 或 Firefox 開啟本資料夾的 **`index.html`**。

部分瀏覽器可能限制 `file://` 網址的字型載入或自動儲存；這時仍能以系統字型編輯、下載編排和列印。如果希望使用完整字型與固定的瀏覽器儲存來源，可使用以下可選的靜態預覽（需 Node.js 18 以上，不需要先安裝套件）：

```powershell
cd D:\Code_2026\Python\EnglishPractise\javascript
node scripts/preview.cjs
```

開啟 **http://127.0.0.1:4173/**，按 `Ctrl+C` 停止。這個預覽程式只提供靜態檔案，所有練習紙運算仍在瀏覽器內完成。

## 功能

- **中英書寫格**：英文每行兩條水平線；中文可選田字格、米字格、方格，右側預留注音區。
- **紙張設定**：A4／A5／Letter、直向／橫向、柔綠／黑白列印、頁面邊界、每頁行數、每行格數、格寬、格高、行距與中文水平格間距，尺寸以 mm 設定。中文預設 13 行 × 8 格、每格 22.5 × 17mm、左右格間距 2mm；英文預設 15 行 × 16 格、每格 12 × 14mm。共用 A4 直向、8mm 邊界及 2mm 行距。
- **逐行獨立編排**：文字、字型、字級與範字樣式可逐行設定，並支援新增、複製、刪除、上下移動，最多 200 行。
- **逐格與單字／句子模式**：可點紙上格子輸入獨立字串，或在左側編輯整行文字。
- **重複次數**：單字與句子每行可獨立設定 **1–100 次**，1 次只放一份範字；逐格字母可選擇自動重複填滿。
- **七種字型選項**：Patrick Hand、Caveat、Arial、Georgia、Courier New，另有字嗨注音標楷與同字型的純國字異體。
- **中文讀音選擇**：點選格子，在單一國字的讀音圖卡中選擇。國字與 IVS 讀音標記不會分成兩格；不自動推測整句多音字與變調。
- **四種範字樣式**：虛線輪廓描字、實線、淡色與空白雙線。虛線為字形輪廓，不是單筆畫中心線。
- **自動分頁與列印**：內容超過一頁時自動分頁，最後一頁補上空白書寫行。超過紙張可容納的行數或格數會自動限制並顯示提示；過長的單字／句子會縮合到行寬。
- **儲存與載入**：同一瀏覽器自動儲存，可下載／載入 JSON 編排檔，包含相容的 Rust 版 v1 編排檔。舊版自動填滿會換算成固定重複次數。

逐格文字超出每行格數時，超出的字元會保留在編排中並顯示提示，不會自動流到下一行。可增加格數、縮小格寬、手動新增行或改成單字／句子模式。

儲存空間按網站來源區分。本機檔案、本機預覽、Rust 服務與 GitHub Pages 不會自動共用編排；移轉時請先下載 JSON，再於另一個網址載入。

中文入口使用獨立儲存 key。含新增中文字型或格型的編排檔可在新版 JavaScript 版載入，舊 Rust 參考版不支援這些新增欄位。

## 列印與 PDF

按右上角「列印 / 存成 PDF」。列印視窗請選擇與紙張設定相同的大小與方向，使用 **100%／實際大小**、邊界「無」，並關閉瀏覽器頁首與頁尾。程式本身已有安全邊界。選擇「另存為 PDF」即可保留向量練習紙。

不同瀏覽器與印表機驅動可能覆寫紙張設定，請以列印視窗為準。

## 放到 GitHub Pages

本專案不需要網站建置工具，可直接發布。所有程式、樣式與字型都使用相對路徑，支援 `https://<帳號>.github.io/<專案名稱>/` 形式的網址。

本 repository 使用上層 `.github/workflows/pages.yml`，在推送 main 後先測試與建置，再發布本目錄的 `dist/` 為網站首頁。Repository 的 **Settings → Pages → Source** 應選擇 **GitHub Actions**。完整的首次建立、Git 初始化、推送與回復步驟見 [Git 與部署說明](../docs/GIT_AND_DEPLOYMENT.zh-TW.md)。

若另外將此資料夾獨立作為其他 repository 的根目錄，也可使用 Pages 的 **Deploy from a branch → main → /(root)**；請一併保留字型、授權文件與 `.nojekyll`。

若只想打包網站需要的檔案，執行：

```powershell
node scripts/build.cjs
```

可發布檔案會複製到 `dist/`，包含內附字型與授權文字。`dist/` 的內容也可以部署到其他靜態網站主機。不必上傳 `node_modules/`、測試或預覽腳本。

詳細設定可參考 [GitHub Pages 官方說明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。Git 提交、遠端推送與網站成功上線需分別確認。

## 開發與測試

只有執行測試時需要安裝開發套件：

```powershell
npm ci
npm test
```

21 項測試涵蓋紙張尺寸與分頁、中英格型、水平格間距與點選位置、字型與樣式隔離、重複次數、格子字串、IVS 多音字與純國字切換、XML 跳脫、非法輸入、舊編排相容、匯出／匯入、自動儲存還原、列印副本、中文字型失敗阻擋列印、資源路徑，以及字型和正式授權完整性。DOM 測試會阻擋所有 `fetch` 呼叫，確認不依賴後端。建置後可執行 `node scripts/verify-dist.cjs` 檢查 20 個發布檔案與官方授權 SHA-256。

靜態資源以 `/Writting_Practise/` 作為正式網站路徑，並保留更深子目錄及本機檔案的路徑測試。實際瀏覽器畫面、列印預覽與實體列印仍待人工確認；DOM 模擬不代表視覺驗證。

## 檔案

```text
javascript/
  index.html              繁體中文介面
  chinese.html            中文注音版入口
  app.css                 外觀、手機版與列印樣式
  app.js                  編輯、儲存、字型量測與列印互動
  worksheet.js            輸入驗證、紙張排版與 SVG 產生
  zhuyin-data.js          字型 cmap 的覆蓋範圍與多音字 IVS 對應
  legal.html              非商業使用與商業授權說明頁
  LICENSE.md / LEGAL.md    正式授權與中文說明
  NOTICE                  必要版權聲明
  THIRD_PARTY_NOTICES.md   第三方授權
  fonts/                  字型與完整 SIL Open Font License
  scripts/preview.cjs      可選的本機靜態檔案預覽
  scripts/build.cjs        可選的靜態檔案打包
  scripts/verify-dist.cjs  發布檔案與授權完整性檢查
  scripts/generate-zhuyin-data.py  維護時重建 cmap metadata（選用 Python）
  tests/                  單元、DOM 與資源路徑測試
  package.json            測試指令與開發相依套件
  package-lock.json       固定開發相依版本
  .nojekyll               靜態檔案發布標記
```

Patrick Hand 與 Caveat 來自 [Google Fonts 官方字型庫](https://github.com/google/fonts)，保留原始字型與各自完整的 SIL Open Font License。Arial、Georgia、Courier New 由使用者的系統提供，跨平台顯示可能略有不同。

中文字型來自 [ButTaiwan/bpmfvs](https://github.com/ButTaiwan/bpmfvs)，保留漢字 CC BY 4.0、非漢字 SIL OFL 1.1、注音 IVS Apache 2.0 與其他上游署名。原始字型未修改，約 17.1 MB，依使用需要載入；詳細原文見 `fonts/LICENSE-ZihiKaiStd.txt`、`LICENSE-2.0.txt` 及 `BpmfZihiKaiStd-NOTICE.txt`。
