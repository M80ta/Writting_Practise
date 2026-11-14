# EnglishPractise · Letter & Line

繁體中文介面的中英練習紙工作室：英文雙線、中文注音田字格／米字格／方格，逐行選字型、輸入內容、調整尺寸，產生 A4 可列印練習紙。

- 網站預定網址：**https://m80ta.github.io/EnglishPractise/**（GitHub Pages 部署完成後生效）
- 公開儲存庫：**https://github.com/M80ta/EnglishPractise**
- 授權：**PolyForm Noncommercial 1.0.0**。非商業使用依完整授權條款；超出允許範圍的商業使用必須事先另行取得書面授權。

## 開始使用

開啟網站，或直接開啟 [`javascript/index.html`](javascript/index.html)。中文入口為 [`javascript/chinese.html`](javascript/chinese.html)。網站在瀏覽器內排版，不需要登入，也不需要安裝 Rust、Python 或 Node.js。

1. 選擇「字母練習」「單字與句子」或「空白練習紙」。
2. 左側選一行，設定文字、字型、字級與虛線／實線／淡字／空白樣式。
3. 單字／句子可設定 **1–100 次**，最少 1 次。也可直接點紙上的格子輸入字串。
4. 右上角設定紙張、方向、行數、格數、格子大小與列印色彩。
5. 按「列印 / 存成 PDF」，核對紙張大小，使用 100% 實際大小，關閉瀏覽器頁首及頁尾。

完整操作請見 [使用說明](docs/USAGE.zh-TW.md)。

## 本機開發

只需預覽，不需安裝相依套件：

```powershell
git clone git@github.com:M80ta/EnglishPractise.git
cd EnglishPractise\javascript
node scripts/preview.cjs
```

開啟 http://127.0.0.1:4173/ 。執行測試與建置需 Node.js 18 以上（CI 使用 Node.js 24）：

```powershell
npm ci
npm test
npm run build
```

## 文件

| 文件 | 內容 |
| --- | --- |
| [使用說明](docs/USAGE.zh-TW.md) | 範本、逐行與逐格編輯、字型、重複次數、列印、儲存與載入 |
| [中文注音使用說明](docs/CHINESE.zh-TW.md) | 中文格型、附注音／純國字字型、逐格多音字選擇與字型來源 |
| [Git 與部署說明](docs/GIT_AND_DEPLOYMENT.zh-TW.md) | 初始化、帳號與 SSH、提交／推送、GitHub Pages、更新與回復 |
| [架構說明](docs/ARCHITECTURE.zh-TW.md) | JavaScript 排版引擎、資料流程、設定模型、測試、Rust 參考版 |
| [非商業與商用授權說明](LEGAL.md) | 允許範圍、商用申請、第三方素材與法律聲明 |
| [完整正式授權](LICENSE.md) | 未修改的 PolyForm Noncommercial License 1.0.0 官方原文 |
| [第三方授權](THIRD_PARTY_NOTICES.md) | 內附字型、開發套件與授權位置 |

## 原始碼與發布

```text
EnglishPractise/
  javascript/              目前發布的純前端版本
    worksheet.js           驗證、版面計算與 SVG 排版
    app.js                 編輯、儲存、預覽與列印
    scripts/               靜態預覽與建置
    tests/                 排版、DOM 與靜態檔案測試
  rust/                    原始 Rust / Axum 本機參考版本
  index.html               最早的單檔參考版本
  docs/                    操作、Git 與架構文件
  .github/workflows/       自動測試及 GitHub Pages 發布
  LICENSE.md / LEGAL.md    正式授權及中文說明
```

推送至 `main` 後，GitHub Actions 先測試、建置 `javascript/dist/`，再發布此資料夾作為網站首頁。根目錄舊 `index.html` 與 Rust 伺服器不作為正式網站入口。Pull request 只執行測試與建置。

目前的自動化驗證涵蓋排版、分頁、重複次數、匯入／匯出、儲存還原、列印副本、輸入驗證與部署資源。DOM 測試不是實際瀏覽器視覺或實體列印測試。

## 授權與商業使用

**原始碼公開不代表允許商業使用。** 使用、修改及散布需遵守 [LICENSE.md](LICENSE.md)，並保留 [NOTICE](NOTICE)。商業授權需求請透過 [專案 Issues](https://github.com/M80ta/EnglishPractise/issues) 聯絡權利人 M80ta，事先取得書面授權或另行簽訂商用授權合約；提出申請不代表已獲授權。

內附字型依各自原始條款授權，權利與程式的非商業授權分開判斷。中文注音字型保留上游的 CC BY 4.0、SIL OFL、Apache 2.0 與相關署名聲明；詳見第三方授權文件。
