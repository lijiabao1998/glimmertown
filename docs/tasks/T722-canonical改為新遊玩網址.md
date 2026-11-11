# T722 canonical 與 og:url 改為新的遊玩網址 lijiabao.uk/games/glimmertown/play/
<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->

**發卡／施工**：Claude，2026-11-11。T721 卡面「範圍外」留下的那一項。

**業主原話**：2026-11-11 Claude 回報「三款遊戲頁面裡的 canonical 還寫舊網域，舊網域再轉回新網址」，並建議等下次發版順便改；業主回「現在改」。

**claim**：Claude；分支 `claude/town-canonical-722`，base `2521513c`。

**卡號**：T722。2026-11-11 掃過 main 與全部 origin 分支的 `docs/tasks/`、全部 PR 標題：最大用到 T721；T719 由擱置的港區優化卡預留。

**開工巡檢**（`python tools/session_audit.py`，2026-11-11）：① main success（run 42976457835，文件道，deploy 與 verify-published 照規則略過）② 設定沒變 ③ 期間合併 2 個 PR（#88、#89），沒有異常 ④ 開著的 PR 2 個、遠端分支 13 條。

## 為什麼

- T721 之後，玩家遊玩的網址是 `https://lijiabao.uk/games/glimmertown/play/`，`game.lijiabao.uk/glimmertown/` 已改成 301 轉到那裡。
- `index.html` 的 `<link rel="canonical">` 與 `og:url` 還寫著 `https://game.lijiabao.uk/glimmertown/`（T718 加的）。搜尋引擎讀到的 canonical 是一個會轉址回本頁的網址，訊號繞了一圈；文化中心的 sitemap 列的是新網址，兩邊不一致。

## 做什麼

- `index.html` `<head>` 兩行：`canonical` 的 `href` 與 `og:url` 的 `content`，從 `https://game.lijiabao.uk/glimmertown/` 改成 `https://lijiabao.uk/games/glimmertown/play/`。
- 執行檔有變，依 R4 升版 11.254 → 11.255（`python tools/bump.py 11.255`：`index.html` 的 GAME_VER 與 `sw.js` 的 APP_VER）。
- `docs/ARCH.md` 第 3 行的版本號同步；行數不變（只改既有行）。
- `docs/CHANGELOG.md` 一行。

## 範圍外

- `og:image` 與 `twitter:image` 不動：它們指向使用者站的 `https://game.lijiabao.uk/thumbs/glimmertown.jpg`，那個檔案目前由閘道原樣轉送，直接回 200。
- `<head>` 其他標籤、`<body>`、所有腳本、存檔命名空間、manifest 與圖示。畫面、玩法、美術零變動。
- `README.md` 的版本行與 Pages 連結。
- 發佈工具（T721 剛改完，本卡不動）。

## 凍結驗收（動手前寫好，之後不改鬆）

- [x] `git diff 2521513c -- index.html` 恰好三行有變：`canonical`、`og:url`、`GAME_VER`；`sw.js` 恰好一行（`APP_VER`）；其餘五個執行檔與 base 逐位相同。
- [x] `index.html` 行數與 base 相同（54812，LF 計數）。
- [x] `python tools/verify.py` ALL GREEN，PASS 數不少於 base（本機跑不了就以官方 CI 的 validate 與 ratchet 為準，並照實寫）。
- [x] 官方 CI：scope 判 full 道、一張卡、沒有違規；frame 綠（畫面零變）；fp 綠（像素指紋零變動）；pages-browser 的真升級（線上 11.254 → 本卡 11.255）通過；gate 綠。
- [x] 合併後：main 那一輪 deploy 與 verify-published 綠；`https://lijiabao1998.github.io/glimmertown/` 與 `https://lijiabao.uk/games/glimmertown/play/` 取回的 `index.html` 相同，canonical 是 `https://lijiabao.uk/games/glimmertown/play/`。

## 回滾

`git revert` 本卡的合併提交（版本會停在 11.255，再發版時照 R4 往上升）。

## 施工紀錄

**2026-11-11（Claude）**

- 卡面先推（`242e5048`，只有本卡），開草稿 PR #90。
- 施工：`index.html` 第 12、18 行的網址換成 `https://lijiabao.uk/games/glimmertown/play/`；`python tools/bump.py 11.255`（輸出 `GAME_VER/APP_VER 11.254 -> 11.255`）；`docs/ARCH.md` 第 3 行版本號同步；CHANGELOG 一行。
- 差異核對：`git diff 2521513c -- index.html` 三行（canonical、og:url、GAME_VER），`sw.js` 一行（APP_VER）；`index.html` 54812 行，與 base 相同；`manifest.json`、`icon.svg` 與三張 PNG 對 base 的 `git diff --stat` 為空。
- `python tools/verify.py`（本機，Windows，Node v24.15.0）：`RESULT: ALL GREEN`。`suite green: PASS=12867`、`version in sync: 11.255`、六個種子哨兵相符、`CRLF=0`、ARCH 代碼地圖的錨點與行號相符。base 的 PASS 數本機沒有另跑，以官方 CI 的 ratchet 為準。

**2026-11-11 收據：官方 CI、合併與 main 那一輪（Claude）**

- 官方 CI：head `ca4ec81`，run 43016229949（轉 ready 觸發，第 1 次嘗試）全綠，gate 綠。scope 判 full 道、一張卡、0 違規；frame 綠（畫面零變）、fp 綠、ratchet 綠。pages-browser 的真升級通過：`MAIN_PAGES_REOPEN_PASS`，mode `local-raw-package-upgrade`，32 項檢查（線上 11.254 → 本卡 11.255）。
  - 同一個 head 還有一輪 run 43016190377（推送觸發），在轉 ready 時被新的一輪取消，PR 檢查列表上那一筆紅的 gate 是它，不是失敗後重跑。
- Codex 在 `ca4ec81` 審查完成，沒有意見。`python tools/session_audit.py --premerge 90` 放行。
- 合併：PR #90 以 merge commit `eadc3a35c` 合進 main（12:16:50Z），釘在驗過的 head `ca4ec81c7931dc7b106b573e183a2d11b76a3371`。
- main 那一輪：run 43018970415 全綠，deploy 與 verify-published 都 success。verify-published：`MAIN_PAGES_REOPEN_PASS`，mode `published-https`，url `https://lijiabao1998.github.io/glimmertown/`，23 項檢查。
- 線上核對：`https://lijiabao1998.github.io/glimmertown/` 與 `https://lijiabao.uk/games/glimmertown/play/` 取回的 `index.html` sha256 相同；canonical 與 og:url 都是 `https://lijiabao.uk/games/glimmertown/play/`；`sw.js` 的 APP_VER 是 11.255。
- 本卡到此結束。
