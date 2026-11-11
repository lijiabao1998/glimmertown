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

- [x] 改前基準：base（`38b8def`）上 `node tools/pages/release-identity.cjs --previous --json` 解出的上一版提交與七檔雜湊，記在施工紀錄。
- [x] 紅源（切換前）：改後同一道指令 fail-closed，錯誤落在線上抓取的轉址，不是別處；輸出記在施工紀錄。
- [x] `node --test tools/pages/*.test.mjs`：測試數與改前相同、0 失敗。
- [x] `published-main.mjs` 的 `options()`：`--url=https://lijiabao1998.github.io/glimmertown/` 收；`--url=https://game.lijiabao.uk/glimmertown/` 拒。
- [x] `grep -rn "game.lijiabao.uk" tools/` 只剩 `published-main.test.mjs` 拒收清單那一處。
- [x] 七個執行檔與 base 逐位相同（`git diff --stat 38b8def -- index.html sw.js manifest.json icon.svg icon-v1-192.png icon-v1-512.png icon-v1-maskable-512.png` 為空）。
- [ ] 官方 CI（切換前）：scope 判 full 道、一張卡、沒有違規；validate（含 `verify.py`）、package、ratchet 與其他不靠線上來源的各道綠；pages-browser 紅在 R3 抓取。
- [x] 官方 CI（切換後，同一個 head）：pages-browser 綠、gate 綠；`--previous` 解出的上一版與改前基準是同一個提交、七檔雜湊相同。
- [ ] 合併後：main 那一輪 deploy 的 `page_url` 是 `https://lijiabao1998.github.io/glimmertown/`，verify-published 綠。

## 範圍外

- 七個執行檔一行不動，不 bump 版本。`index.html` 的 canonical 與 OG 標籤仍寫 `game.lijiabao.uk`，切換後由轉址帶到新的遊玩網址；要直接改成新網址屬執行檔變更，另開卡。
- `README.md` 的版本行與「已發布 Pages」連結、`docs/ARCH.md`。
- 工作流、其他守衛、存檔命名空間（`glimmerville.main.v1` 不變；`lijiabao.uk` 與原本的 `game.lijiabao.uk` 一樣是多款遊戲共用一個來源）。
- 文化中心的閘道、使用者站的 Pages 設定與 DNS：在那邊的倉庫記錄與驗收。

## 回滾

兩件事要一起做，順序與切換相反：先把使用者站的自訂網域設回 `game.lijiabao.uk`（閘道退出），再 `git revert` 本卡的合併提交。

## 施工紀錄

**2026-11-11（Claude）**

- 卡面先推（`196e957`，只有本卡），開草稿 PR #88。
- **改前基準**（base `38b8def` 的工具，`node tools/pages/release-identity.cjs --previous --json`，結束碼 0）：上一版＝`38b8defab13bea99efa72026b18bc19ca8762429`（v11.254，source=live）。線上七檔 sha256：
  - `index.html` `5b546259a76677898b1fb7c7f2cacdd084fbd2b32f0a00e962ef04b30899018f`
  - `sw.js` `51f953edab4af13a643d3ce1a13d252828356a21f7fc248d4a75cebbd8097872`
  - `manifest.json` `21893d46de8bcf86645c964a7ed160237e4f3fa6c0d23055dc01daa98ee64e3e`
  - `icon.svg` `31e67dd794b00928046ab48678aeae26763535ec3b40b94f679ddf37047eaf8b`
  - `icon-v1-192.png` `a7252477296cc7704bd3d485c8a3a25bcfb6c36bcb5df2b0dca666bab4537951`
  - `icon-v1-512.png` `42d58a67cc90bac9f965dbe8497aa5913aa5907623d2f278c2ba6ccc45566d4d`
  - `icon-v1-maskable-512.png` `56ffc2b39731bacf19e121770fdce612c0cc915bb663c1a781d6e1e213005950`
- **施工**：六個工具檔只換來源字面量（`game.lijiabao.uk` → `lijiabao1998.github.io`，測試裡大寫的那一處同步換），`published-main.test.mjs` 的 `--url` 拒收清單尾端加舊來源。`docs/tasks/main-pages/README.md` 第 3、7 點改成現況。CHANGELOG 一行。
- **紅源（切換前）**：改後同一道指令結束碼 1，`Error: Live fetch failed after 6 tries: index.html: fetch failed`，拋在 `fetchLiveFile`。底層原因另外用 `fetch(…,{redirect:'error'})` 單獨確認是 `unexpected redirect`；同時 `curl` 看到 `https://lijiabao1998.github.io/glimmertown/index.html` 回 301 到 `https://game.lijiabao.uk/glimmertown/index.html`。首紅落在線上抓取的轉址，沒有靜默改抓別處。
- **契約測試**（`PAGES_SITE=_site/main node --test --test-reporter=tap tools/pages/*.test.mjs`，Node v24.15.0，Windows 本機）：
  - 改前（base 的工具）：225 項，224 過、1 略、0 失敗。略的是第 223 項（`not-applicable-no-runtime-change`）。
  - 改後、切換前：225 項同名同序，221 過、4 失敗。失敗的 215、216、217、223 都在 `upgrade-main.test.mjs`，訊息都是 `Live fetch failed after 6 tries: index.html: fetch failed`——它們會做真的 R3 線上抓取，紅在同一個紅源。
  - 改後、**模擬**切換後：在倉庫外用一支預載腳本，把對 `https://lijiabao1998.github.io/glimmertown/` 的抓取改由 GitHub Pages 今天實際送出的位元組回應（就是拿掉自訂網域之後它會送的東西）。結果 225 項，224 過、1 略、0 失敗，與改前相同；`--previous` 解出的上一版、七檔 sha256、blob id 與改前基準完全相同。這是模擬，不算驗收通過；真的驗收是切換後的官方 CI。
- `options()` 實跑：`--url=https://lijiabao1998.github.io/glimmertown/` 收；`--url=https://game.lijiabao.uk/glimmertown/` 拒（`published origin must be the verified GlimmerTown GitHub Pages account`）。
- `grep -rn "game.lijiabao.uk" tools/` 只剩 `tools/pages/published-main.test.mjs:20`（拒收清單）。
- 七個執行檔對 base 的 `git diff --stat` 為空。

**更正（凍結驗收第 7 條的預測有誤；原文不改，再記一筆）**

- 第 7 條寫「package 綠、pages-browser 紅」。實跑後發現 package 那一道跑的就是上面那套契約測試，其中四項會做真的 R3 線上抓取，所以**切換前 package 也會紅在同一處**。第 7 條照原文在切換前打不了勾。
- 不放寬，改以第 8 條（切換後同一個 head 全綠）為準，並加一條更嚴的：
  - [x] 切換後官方 CI 的 package：契約測試回到 225 項、224 過、1 略、0 失敗。

**更正二（同樣是第 7 條；原文不改，再記一筆）**

- 切換前那一輪官方 CI（head `a1ad93f9`，run 42913407884）實際紅了五道，不只 package 與 pages-browser：browser 的 core／world／neighbors 三道也紅，日誌都是 `Release identity failed: Error: Live fetch failed after 6 tries: index.html: fetch failed`。它們經 release-correctness 解上一版，紅在同一個紅源。
- 同一輪綠的：scope（full 道、一張卡、0 違規）、validate、approved-art-release、approved-fire-release、scene602、fp、frame、ratchet、port-t677、t717-evidence。gate 因上面五道而紅。沒有重跑、沒有合併。
- 所以第 7 條照原文打不了勾（它寫 package 綠、只有 pages-browser 紅）。實際情況是：不靠線上來源的各道綠，靠線上來源的五道全部紅在 R3 抓取。

**2026-11-11 切換（業主當天回「切換」）**

- 使用者站 `lijiabao1998.github.io`：刪 `CNAME`、清掉 Pages 自訂網域（該倉庫提交 `aec6cfd`，13:37 +08:00）。`https://lijiabao1998.github.io/glimmertown/` 直接回 200，`gh api repos/lijiabao1998/glimmertown/pages` 的 `html_url` 變成這個網址。
- 本機用改後的工具對真的線上再跑一次 `--previous`（不是模擬）：結束碼 0，上一版同樣是 `38b8defab13bea99efa72026b18bc19ca8762429`（v11.254），七檔 sha256 與改前基準相同。
- **切換中途出過錯，照實記**：閘道接手 `game.lijiabao.uk` 的部署先失敗了（Cloudflare 回 `Hostname 'game.lijiabao.uk' already has externally managed DNS records`，舊的 DNS 紀錄沒有先刪）。13:37 到約 13:58 之間，`game.lijiabao.uk` 的網址回 404，卡面「切換順序」第 3 條（閘道原樣回 200）在這二十分鐘不成立。這段時間沒有別的 PR 在跑。
- 刪掉那筆 DNS 紀錄、重新部署後，閘道接上。`game.lijiabao.uk/glimmertown/` 目前原樣回 200、不轉址；七檔各抓一次，sha256 與改前基準逐一相同（`index.html` 以瀏覽器標頭再抓一次也相同，沒有被插入內容）。
- **官方 CI（切換後，同一個 head `a1ad93f9`，run 42967784904，由轉 ready 觸發，第 1 次嘗試）**：全部綠，gate 綠。
  - package：契約測試 225 項，224 過、1 略、0 失敗。
  - pages-browser：`MAIN_PAGES_UPGRADE_NOT_APPLICABLE`，`previousCommit` 是 `38b8defab13bea99efa72026b18bc19ca8762429`，與改前基準同一個提交。
  - browser 三道、validate、ratchet、fp、frame 與其餘各道都綠。
- Codex：轉 ready 觸發的審查在 `a1ad93f` 上跑完，沒有留下意見。
- 本提交只補卡面與 CHANGELOG 的驗收欄（`.md`），工具與測試沒有再動。

**還沒做的**

- 本提交推上去後的那一輪 CI 與 Codex 重審；之後照 `--premerge` 程序合併。
- 合併後 main 那一輪的 deploy 與 verify-published（凍結驗收最後一條）。
- 那一輪綠了之後，文化中心的閘道才把 `game.lijiabao.uk/glimmertown/` 改成轉址。
