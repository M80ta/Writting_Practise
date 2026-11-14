# Git、GitHub 與網站部署

## 專案與帳號

- 本機根目錄：`D:\Code_2026\Python\EnglishPractise`
- GitHub owner：`M80ta`
- 預定公開 repository：`https://github.com/M80ta/EnglishPractise`
- SSH remote：`git@github.com:M80ta/EnglishPractise.git`
- 主要分支：`main`
- Pages 預定網址：`https://m80ta.github.io/EnglishPractise/`

Git 作者名稱／email、SSH 登入帳號、GitHub 連接工具登入與 repository 權限是不同設定。SSH 成功不代表遠端 repository 已建立或 Pages 已發布，必須分別驗證。

## 第一次建立 Git

本目錄初始化的設定僅作用於本專案，不改全域 Git 作者。以下供重建設定時參考，不需在已初始化的專案重複建立：

```powershell
cd D:\Code_2026\Python\EnglishPractise
git init -b main
git config user.name M80ta
git config user.email 165467452+M80ta@users.noreply.github.com
git remote add origin git@github.com:M80ta/EnglishPractise.git
git status
```

此 Windows 電腦的既有 SSH 設定若需要明確指定，可使用本機 Git config 中的 `core.sshCommand`；此設定含機器路徑，不應複製到其他電腦。新電腦應先完成自己的 SSH 設定。

## 確認認證與遠端

```powershell
ssh -T git@github.com
git remote -v
git ls-remote origin
```

GitHub 回傳 `Hi M80ta! You've successfully authenticated...` 表示 SSH 登入成功；因不提供 shell，指令結束碼可能為 1。`Repository not found` 表示 repository 不存在、名稱不符或沒有存取權，不能以 SSH 認證成功取代確認。

## 建立公開 repository 與首次推送

在已登入 M80ta 的 GitHub 建立名為 **EnglishPractise** 的 **Public** repository。保留空白，不預先產生 README、`.gitignore` 或 license，讓本機完整歷史作為來源。若已有同名非空 repository，先確認用途，不應強制覆寫。

檢查即將公開的檔案並提交：

```powershell
git status --short
git diff --check
git add .
git diff --cached --stat
git commit -m "Publish Letter and Line with documentation and noncommercial license"
git push -u origin main
```

`.gitignore` 排除 `node_modules`、Rust `target`、產物 `dist`、本機 `.local`、環境檔、金鑰與日誌。發布原始碼與文件，不要加入存取權杖、密碼或私鑰。

## 啟用 GitHub Pages

在 repository **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。這是 repository 管理設定；SSH push 權限與一般 `GITHUB_TOKEN` 不等於可以首次啟用 Pages 的管理權限。

專案提供 `.github/workflows/pages.yml`：推送 main 後執行 `npm ci`、測試與建置，再把 **`javascript/dist/`** 上傳成 artifact 並部署。它不會把根目錄舊 HTML 或 Rust 伺服器作為正式網站。

若首次 workflow 在尚未啟用 Pages 時失敗，先完成上述 Source 設定，再到 **Actions → Test and deploy Pages → Run workflow** 重跑。GitHub 設定若顯示其他工作流程範本，不必額外建立第二份 Pages YAML。

## 平常更新

```powershell
git pull --ff-only
cd javascript
npm ci
npm test
npm run build
cd ..
git diff --check
git add .
git diff --cached --stat
git commit -m "Describe the worksheet update"
git push
```

看到 Actions 的 deploy job 成功後，再開啟網站確認。若修改 CSS、字型或腳本，應確認線上版本與本次 artifact 一致，而不只檢查 repository 有更新。

## 回復已發布變更

優先使用 `git revert <commit-sha>` 建立反向提交，再 `git push` 觸發部署。不要為了回復網站而直接強制推送主分支。保留錯誤提交與修正歷史，以利追蹤。

## 授權維護

發行時保留 `LICENSE.md`、`NOTICE`、`LEGAL.md`、`THIRD_PARTY_NOTICES.md` 與字型授權。需要商用授權時由權利人另行書面授權；不要在未經權利人同意下改成可無限制商用的授權。
