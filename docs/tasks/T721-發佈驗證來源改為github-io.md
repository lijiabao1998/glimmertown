# T721 發佈驗證來源改為 lijiabao1998.github.io（守衛；game.lijiabao.uk 交給文化中心轉址）
<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->

**發卡／施工**：Claude，2026-11-11。守衛維護屬 Claude 的職責（AGENTS.md：`gpt/` 分支不准動 `.github/`、`tools/`）。

**業主原話**：2026-11-10「把 games 子域名 收回」（家寶數位文化中心 `lijiabao.uk` 的建站交辦）；2026-11-11「搬，帶上存檔」。同日 Claude 回報「舊網域一改成轉址，微光小鎮的發布就會失敗，要先在這個倉庫把驗證來源改掉」，業主回「開卡」。

**claim**：Claude；分支 `claude/town-pages-origin-721`，base `38b8def`。

**卡號**：T721。2026-11-11 掃過 main 與全部 13 條 origin 分支的 `docs/tasks/`、全部 PR 標題：最大用到 T720；T719 由擱置的港區優化卡預留（見 T720 卡）。

**開工巡檢**（`python tools/session_audit.py`，2026-11-11）：① main success（run 41289822195，deploy 與 verify-published 都 success）② 設定沒變 ③ 期間合併 0 個 PR ④ 開著的 PR 2 個、遠端分支 13 條。

## 為什麼

- 業主要把遊戲站 `game.lijiabao.uk` 收回主網域。遊戲的入口改到家寶數位文化中心 `https://lijiabao.uk/`，微光小鎮的遊玩網址是 `https://lijiabao.uk/games/glimmertown/play/`。
- 那個網址 2026-11-11 已上線：文化中心的閘道把本倉庫發佈到 GitHub Pages 的檔案原樣轉送，`index.html` 與 `sw.js` 逐位元組比對與 Pages 相同。本倉庫照舊自己建置、自己發佈，這一段不用改。
- 收回的最後一步是把 `game.lijiabao.uk` 的舊網址改成轉址。做法是拿掉使用者站 `lijiabao1998.github.io` 的自訂網域：Pages 網址變回 `https://lijiabao1998.github.io/glimmertown/`，`game.lijiabao.uk` 改由文化中心的閘道回應。
- 本倉庫的發佈工具把 `https://game.lijiabao.uk` 寫死成唯一合法的發佈來源（T718）：
  - `release-identity.cjs` 的上一版（R3）從 `PAGES_BASE` 抓線上七檔，不跟轉址、只收 200；
  - `published-main.mjs --url` 斷言來源等於 `https://game.lijiabao.uk`，而 verify-published 傳進去的是 deploy-pages 回報的網址。
- 自訂網域一拿掉，deploy-pages 回報的就是 `https://lijiabao1998.github.io/glimmertown/`，舊網址也不再原樣回 200。上面兩處都會 fail-closed：每個 full 道 PR 的 pages-browser、main 的 verify-published 都紅。工具要跟著切換一起改。

## 做什麼

T718 的反向，只動「來源」，路徑 `/glimmertown/` 不動。

- `tools/pages/release-identity.cjs`：`PAGES_ORIGIN` 與檔頭說明裡的網址。
- `tools/pages/published-main.mjs`：`--url` 的來源斷言。
- 四份契約測試裡寫死的同一個來源：`release-identity.test.mjs`、`published-main.test.mjs`、`package.test.mjs`、`upgrade-main.test.mjs`。
- `published-main.test.mjs` 的 `--url` 拒收清單加一條：舊來源 `https://game.lijiabao.uk/glimmertown/` 從此必須被拒。
- `docs/tasks/main-pages/README.md`「Release identity」第 3、7 點寫的抓取網址與路徑（T718 當時沒改到，還寫著 `/GlimmerTown/`）改成現況。
- `docs/CHANGELOG.md` 一行。

不加備援來源：工具仍只認一個來源，轉址、非 200 照舊判紅。既有斷言只換字面量，不刪、不改形式。

## 切換順序（本卡合併的前提）

1. 本 PR 先開著當草稿。切換之前 pages-browser 會紅在 R3 線上抓取：`lijiabao1998.github.io` 目前 301 到自訂網域，工具不跟轉址。這是預期的紅，不重跑賭綠、不合併。
2. 業主點頭後，Claude 在倉庫外做切換（做法記在文化中心倉庫 `lijiabao-digital-cultural-centre`）：拿掉使用者站的自訂網域，`game.lijiabao.uk` 改由文化中心閘道回應。
3. 切換後到本卡合併前，閘道對 `game.lijiabao.uk/glimmertown/` 原樣回 200（同樣七檔、不轉址、不改內容），讓還沒併到新 main 的 PR 的 R3 抓取照舊能過。
4. 切換後重跑本 PR 的 CI：pages-browser 轉綠、gate 綠，照 AGENTS.md 的 `--premerge` 程序合併。合併那一輪 main 的 deploy 回報新網址，verify-published 以新來源實測。
5. 第 2 步到第 4 步之間，不准有別的 full 道 PR 合進 main：它的 verify-published 會因為來源不符而紅。
6. 本卡合併、main 那一輪綠了之後，閘道才把 `game.lijiabao.uk/glimmertown/` 改成轉址到新的遊玩網址。

## 凍結驗收（動手前寫好，之後不改鬆）

- [ ] 改前基準：base（`38b8def`）上 `node tools/pages/release-identity.cjs --previous --json` 解出的上一版提交與七檔雜湊，記在施工紀錄。
- [ ] 紅源（切換前）：改後同一道指令 fail-closed，錯誤落在線上抓取的轉址，不是別處；輸出記在施工紀錄。
- [ ] `node --test tools/pages/*.test.mjs`：測試數與改前相同、0 失敗。
- [ ] `published-main.mjs` 的 `options()`：`--url=https://lijiabao1998.github.io/glimmertown/` 收；`--url=https://game.lijiabao.uk/glimmertown/` 拒。
- [ ] `grep -rn "game.lijiabao.uk" tools/` 只剩 `published-main.test.mjs` 拒收清單那一處。
- [ ] 七個執行檔與 base 逐位相同（`git diff --stat 38b8def -- index.html sw.js manifest.json icon.svg icon-v1-192.png icon-v1-512.png icon-v1-maskable-512.png` 為空）。
- [ ] 官方 CI（切換前）：scope 判 full 道、一張卡、沒有違規；validate（含 `verify.py`）、package、ratchet 與其他不靠線上來源的各道綠；pages-browser 紅在 R3 抓取。
- [ ] 官方 CI（切換後，同一個 head）：pages-browser 綠、gate 綠；`--previous` 解出的上一版與改前基準是同一個提交、七檔雜湊相同。
- [ ] 合併後：main 那一輪 deploy 的 `page_url` 是 `https://lijiabao1998.github.io/glimmertown/`，verify-published 綠。

## 範圍外

- 七個執行檔一行不動，不 bump 版本。`index.html` 的 canonical 與 OG 標籤仍寫 `game.lijiabao.uk`，切換後由轉址帶到新的遊玩網址；要直接改成新網址屬執行檔變更，另開卡。
- `README.md` 的版本行與「已發布 Pages」連結、`docs/ARCH.md`。
- 工作流、其他守衛、存檔命名空間（`glimmerville.main.v1` 不變；`lijiabao.uk` 與原本的 `game.lijiabao.uk` 一樣是多款遊戲共用一個來源）。
- 文化中心的閘道、使用者站的 Pages 設定與 DNS：在那邊的倉庫記錄與驗收。

## 回滾

兩件事要一起做，順序與切換相反：先把使用者站的自訂網域設回 `game.lijiabao.uk`（閘道退出），再 `git revert` 本卡的合併提交。

## 施工紀錄

（施工後補）
