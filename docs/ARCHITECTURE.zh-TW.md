# 架構說明

## 版本與正式入口

Git repository 根目錄是 `Writting_Practise/`。正式網站來源為 `javascript/`，發布檔案為 `javascript/dist/`。`rust/` 保留 Rust/Axum 本機參考版，根目錄 `index.html` 保留最早單檔版本。

## 元件

| 檔案 | 職責 |
| --- | --- |
| `javascript/index.html` | Banner、範本、行列表、編輯器、紙張預覽與設定／格子／列印提示對話框 |
| `javascript/app.css` | 桌面／手機版面、內附字型、紙張縮放及列印媒體樣式 |
| `javascript/worksheet.js` | 無 DOM 的純函式模組；預設資料、嚴格驗證、舊格式轉換、紙張容量與 SVG 產生 |
| `javascript/zhuyin-data.js` | 從原始字型 cmap 提取的字元覆蓋與多音字 IVS 對應，保留上游字型授權 |
| `javascript/chinese.html` | 中文入口，轉至 `index.html?mode=chinese`，預設中文範本與獨立儲存 key |
| `javascript/app.js` | 管理編排狀態與選取行、事件、延後排版、實際字寬量測、編排儲存及列印 |
| `javascript/fonts/` | 內附字型與原始 OFL 授權 |
| `javascript/legal.html` | 網站上的非商業與商用授權摘要 |
| `javascript/scripts/build.cjs` | 複製網站資源及必要授權文件至 `dist/` |
| `javascript/scripts/preview.cjs` | 僅提供靜態檔案的可選本機預覽，可設定 `PORT` 與 `BASE_PATH` |

## 資料流程

```mermaid
flowchart LR
  UI[文字與紙張設定] --> State[app.js 編排狀態]
  State --> Validate[worksheet.js 驗證與正規化]
  Validate --> Layout[計算 mm 尺寸與分頁]
  Layout --> SVG[產生 SVG 頁面]
  SVG --> Preview[紙張預覽與字寬量測]
  Preview --> Store[localStorage / JSON]
  Preview --> Print[獨立列印副本 / 瀏覽器 PDF]
```

瀏覽器程式不呼叫 `/api/render` 或其他後端 API。`worksheet.js` 使用通用包裝，同一模組可由瀏覽器的 `LetterLines` 與 Node.js 的 `require` 使用。`app.js` 在字型載入後量測真實字寬，過寬文字才設定 `textLength`。預覽與列印副本使用不同 clip-path ID，避免隱藏預覽影響列印。

## 設定模型

編排檔外層是 `{ "version": 1, "worksheet": { ... } }`。`worksheet` 包含紙張大小、方向、色彩、邊界、行數／格數、格寬／格高／行距、抬頭與 `rows`。

每行包含 `text`、`font`、`style`、`font_size_mm`、`placement`、`repeat`、`repeat_count` 與 `cells`。`repeat_count` 是單字／句子總份數（1–100）；`repeat` 控制逐格循環填滿；`cells` 的 `null` 表示使用行文字，空字串表示刻意留白。文字、數值、枚舉、資料大小與未知欄位皆會驗證；文字插入 SVG 前會 XML 跳脫。

`grid_style` 預設為 `english`，另可選 `tian`、`mi`、`square`。中文格型使用逐格排列，字型 `zhuyin` 與 `kai` 分別顯示附注音與無注音字形。漢字與 IVS 讀音標記以 grapheme 分組，不會拆成多個格子；原始讀音選擇儲存在文字／格子覆寫中。`kai` 只在繪製時使用 U+E01E0，不修改儲存的原讀音。

中文字型依需要才載入，失敗時阻擋列印並清除舊列印副本。中文入口使用 `letter-lines.javascript.chinese.v1`；一般入口仍使用原 key。中文擴充編排只能由新版 JavaScript 載入，Rust 參考版不支援新增格型與字型欄位。

容量以紙張 mm 計算：扣掉邊界、抬頭與頁尾後，依格高和行距求可用行數；以可用寬度除以格寬求格數。超額行自動分頁；末頁補足空白行。

## 儲存與相容

JavaScript 版使用 `letter-lines.javascript.v1` 作為 localStorage key；Rust 版使用另一個 key。瀏覽器來源也會隔離不同網址的資料。JSON 是兩版移轉編排的介面，載入舊的 `repeat: true` 單字／句子資料時，先換算為明確次數。

## 測試與部署

Node.js 內建 test runner 加 jsdom 測試純排版與互動。DOM 測試封鎖 `fetch`，並模擬字型量測、儲存失敗與列印呼叫；這不包含真正瀏覽器的視覺或印表機測試。發布檔案檢查確認資源、授權與標記完整。

GitHub Actions 使用獨立 build 與 deploy job。Build 僅需要讀取原始碼；Deploy 只在推送 main 或手動執行時進行，使用 `pages: write` 與 `id-token: write` 將靜態 artifact 發布到 `github-pages` environment。PR 不發布網站，也不需要個人 API token。

## Rust 參考版本

`rust/src/main.rs` 以 Axum 提供資源與 `POST /api/render`；`rust/src/worksheet.rs` 負責驗證與 SVG。啟動方式及 Rust 測試見 `rust/README.md`。GitHub Pages 不執行這個 HTTP 伺服器；正式網站改由 JavaScript 完成相同排版工作。
