# Letter & Line｜英文練習紙工作室

以 **Rust + Axum** 製作的本機英文練習紙網頁。Rust 負責紙張尺寸、格子配置、自動分頁、輸入驗證與 SVG 向量排版；瀏覽器提供即時編輯及列印介面。原本上層的 `index.html` 保留不動。

## 精細需求描述

建立一個繁體中文介面的英文書寫練習紙產生器，預設輸出 A4 直向紙張。每一行包含兩條水平書寫線，並可選擇顯示直向虛線分格，方便練習英文字母、單字及句子。

1. **頁首與紙張設定**：網頁頂部 Banner 左側顯示名稱，右側提供「紙張設定」與「列印 / 存成 PDF」。設定包含 A4／A5／Letter、直向／橫向、柔綠／黑白列印、頁面邊界、每頁行數、每行格數、格寬、格高與行距；尺寸以 mm 設定。
2. **逐行獨立編排**：每一行有自己的文字、字型、字級、範字樣式和排列方式。可新增、複製、刪除及上下移動練習行，最多 200 行。同一張紙能混合多種字型和樣式。
3. **文字輸入方式**：左側輸入整行文字；逐格模式按字元排列，含空格，並可勾選重複填滿。單字／句子模式連續排列文字，每行可獨立設定 **1–100 次**；1 次表示只顯示一份範字，重複後的較長內容會縮合至行寬。點選紙上的格子，可以為該格輸入獨立字串或留白，並可還原為行文字所產生的內容。點選整句行會選取該行輸入框。重複次數會隨編排儲存；載入舊版的自動填滿設定時，會依原版面換算成固定次數。
4. **範字與字型**：提供虛線輪廓描字、實線字、淡色字和空白雙線。提供 Patrick Hand、Caveat、Arial、Georgia、Courier New 五種字型，其中兩款手寫字型隨專案附帶。字級會限制在格高內，過長文字會縮合至可用寬度。
5. **即時預覽與分頁**：設定與文字變更立即重新排版。內容行數超過一頁時自動產生多頁，最後一頁補上空白書寫行。當紙張放不下指定行數或格數時，自動採用可容納數量並顯示提示。超過可見格數的文字不會自動流入下一行，預覽會提示；可手動新增行或改整句模式。
6. **可列印的紙張**：每頁以獨立 SVG、實際 mm 尺寸輸出，列印時隱藏所有操作介面、選取效果和編輯提示。可顯示標題及姓名／日期欄，支援瀏覽器另存 PDF。啟動列印前等待排版及字型完成。
7. **保留編排**：在同一瀏覽器自動儲存，也能下載和載入 JSON 編排檔。不依賴帳號或雲端服務。
8. **使用體驗**：桌面採左側編輯、右側紙張預覽；手機改為上下排列。提供鍵盤焦點、表單標籤、狀態提示與對話框。

## 啟動

需先安裝 Rust stable（本專案已在 Rust 1.94 Windows MSVC 驗證）。第一次會從 crates.io 下載套件。

```powershell
cd D:\Code_2026\Python\EnglishPractise\rust
cargo run
```

開啟 **http://127.0.0.1:3000**。停止時按 `Ctrl+C`。預設僅綁定本機，不會開放到區域網路。

若連接埠被占用：

```powershell
$env:PORT = '3001'
cargo run
```

正式編譯可用 `cargo build --release`，之後直接執行 `target\release\letter-lines.exe`。所有網頁與字型都嵌入執行檔，執行時不需要網路或 Node.js。

## 列印

按「列印 / 存成 PDF」，選擇對應的紙張與方向，縮放 **100%／實際大小**，關閉瀏覽器的頁首及頁尾，將列印邊界設為「無」。程式本身已保留 8–30 mm 邊界。瀏覽器和印表機驅動可能覆寫紙張設定，請以列印視窗預覽為準。另存 PDF 可保留向量線條。

虛線為沿字形輪廓的斷續線，適合描字；並非專門單筆畫中心線字型。Arial、Georgia 和 Courier New 使用作業系統字型，其他作業系統的替代字型可能略有差異。

## 驗證

```powershell
cargo test
cargo fmt --check
node --check static/app.js
```

單元測試涵蓋 A4 分頁、A5 橫向容量、文字 XML 跳脫、逐格覆寫與逐行樣式隔離，以及非法尺寸與內容上限。HTTP 介面：`GET /health`、`POST /api/render`（JSON 設定，回傳 SVG 頁面與實際版面資訊）。

可選的前端 DOM 整合測試（需要 Node.js 18 以上，測試工具僅裝在忽略追蹤的 `target/`）：

```powershell
npm install --prefix target/dom-check --no-audit --no-fund --ignore-scripts jsdom@24.1.3
# 先在另一個終端啟動 cargo run
node tests/ui-smoke.cjs
```

此測試透過真正的 Rust HTTP 介面驗證逐行樣式、格子文字、複製／排序／刪除、橫向分頁、列印副本、瀏覽器儲存還原及空白行編輯。DOM 模擬不會驗證實際瀏覽器畫面、字型外觀或實體列印。這次瀏覽器自動化因無法可靠辨識 Windows 網址而中止，所以這三項仍待人工確認。

## 專案結構

```text
rust/
  Cargo.toml / Cargo.lock     Rust 套件與固定相依版本
  src/main.rs                本機 HTTP 服務與內嵌靜態資源
  src/worksheet.rs           紙張排版、SVG 產生與單元測試
  static/index.html          繁體中文操作介面
  static/app.css             響應式外觀與實際尺寸列印樣式
  static/app.js              編輯、預覽、儲存與列印互動
  static/fonts/              內附字型與原始授權文字
  tests/ui-smoke.cjs          可選的前端 DOM 整合測試
```

Patrick Hand 與 Caveat 來自 [Google Fonts 官方字型庫](https://github.com/google/fonts)，各自完整的 SIL Open Font License 隨附在 `static/fonts/`，未修改字型檔。Web 服務使用 [Axum](https://docs.rs/axum/0.8.9/axum/)。
