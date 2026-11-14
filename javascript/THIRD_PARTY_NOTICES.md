# 第三方素材與相依套件

本專案原創程式的 PolyForm 非商業授權，不取代或限制以下第三方素材原本的授權。

| 項目 | 用途 | 授權與原文 |
| --- | --- | --- |
| Patrick Hand | 內附自然手寫字型 | SIL OFL 1.1；[`javascript/fonts/PatrickHand-OFL.txt`](javascript/fonts/PatrickHand-OFL.txt) |
| Caveat | 內附流暢手寫字型 | SIL OFL 1.1；[`javascript/fonts/Caveat-OFL.txt`](javascript/fonts/Caveat-OFL.txt) |
| Arial、Georgia、Courier New | 可選的系統字型 | 不隨本專案散布字型檔，由使用者作業系統提供 |
| jsdom 及相依套件 | Node.js 開發測試 | 開發相依版本固定於 `javascript/package-lock.json`；各套件完整授權保留在安裝的套件內，不放入發布網站 |
| Rust crates | Rust 參考版伺服器與序列化 | 版本固定於 `rust/Cargo.lock`；各 crate 授權依其上游 metadata 與授權檔，未作為 JavaScript 網站 runtime 散布 |

字型原始來源為 [Google Fonts 官方字型庫](https://github.com/google/fonts)。兩個版本的 `fonts/` 目錄均保留原始字型及完整授權文字；JavaScript 建置會將對應字型授權一併放入發布檔案。

發行網站同時包含 `LICENSE.md`、`NOTICE`、`LEGAL.md`、本文件，以及 `fonts/` 裡的字型授權原文。若改用其他素材或增加會隨網站散布的第三方套件，維護者應同步更新本文件與發布檔案。
