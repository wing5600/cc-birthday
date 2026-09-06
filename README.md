# CC 生日快樂 🎂

為 CC 的 9 月 7 日生日製作的 3D 祝福網頁（繁體中文），是一個可以「加入主畫面」的 iOS PWA，還能接收你發送的推播通知 💕

## 頁面內容

- 🎂 3D 三層生日蛋糕（草莓、奶油、金色「CC」字）
- 🕯️ 五根蠟燭，可以「吹蠟燭許願」再點亮
- 🎆 煙火：自動施放，輕觸畫面或按按鈕也會放
- 💗 點擊畫面會爆出愛心
- 🎈 漂浮氣球、🎊 彩帶、✨ 星空與魔法光塵
- 🎵 WebAudio 合成的生日快樂歌（可開關）
- 📱 PWA：可加入 iPhone 主畫面，全螢幕打開、離線也能看
- 🔔 推播通知：你可以從後端發通知到她的手機

## 檔案結構

```
index.html            主頁面（3D 場景）
push.js               PWA 註冊 + 推播訂閱
sw.js                 Service Worker（離線快取 + 推播接收）
manifest.webmanifest  PWA 設定
icons/                App 圖示
server/               推播後端 - 本地開發版（Node + Express + web-push）
netlify/functions/    推播後端 - 雲端版（Netlify Functions + Blobs）
netlify.toml          Netlify 部署設定
```

## 部署前端（GitHub Pages）

```bash
gh repo create cc-birthday --public --source . --push
gh api repos/{owner}/cc-birthday/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

網址會是 `https://<你的帳號>.github.io/cc-birthday/`

## 部署到 aaPanel 伺服器（推薦流程）

前端在 GitHub Pages，後端在 aaPanel 伺服器。網域：`panel.sunhingindo.com`

### 1. SSH 登入伺服器，跑應用程式安裝腳本

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/wing5600/cc-birthday/main/setup-aapanel.sh)
```

會自動完成：程式碼放到 `/www/wwwroot/cc-birthday` → 安裝依賴 → 產生金鑰寫入 `.env` → 顯示**管理密碼**。

### 2. aaPanel 建立 Node 專案

面板 →「網站」→「Node 專案」→「新增 Node 專案」：

| 欄位 | 值 |
|---|---|
| 網域 | `panel.sunhingindo.com` |
| 專案目錄 | `/www/wwwroot/cc-birthday/server` |
| 啟動檔案 | `server.js` |
| 埠號 | `3000` |
| Node 版本 | 18 以上（沒有就先在「軟體商店 → Node 版本管理器」安裝） |

建立後面板會自動配好 Nginx 反向代理。

> ⚠️ 如果你的 aaPanel 本身就是用 `panel.sunhingindo.com` 的 443 port 登入，
> 請改用另一個子網域（例如 `cc.sunhingindo.com`）避免把面板蓋掉。

### 3. 申請 SSL

網站設定 →「SSL」→「Let's Encrypt」→ 申請 → 開啟「強制 HTTPS」。

### 4. 驗證

```bash
curl https://panel.sunhingindo.com/health
# 回應 CC birthday push server 💕 即成功
```

後台管理介面：`https://panel.sunhingindo.com/admin`（輸入管理密碼即可發通知）

---

## 部署到自己的伺服器（無面板的 All-in-One 安裝腳本）

前端在 GitHub Pages，後端跑在你自己的伺服器（Ubuntu/Debian）。
一條指令全自動：安裝 Node.js、Caddy（自動 HTTPS）、systemd 常駐、產生金鑰：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/wing5600/cc-birthday/main/setup.sh)
```

腳本會問你的網域（DNS 需先指向伺服器 IP），跑完後：

1. **把網域填進前端**：編輯 GitHub 上的 [`push.js`](https://github.com/wing5600/cc-birthday/edit/main/push.js)，
   把 `BACKEND_URL` 改成 `https://你的網域`，commit 後等約 1 分鐘
2. **開後台**：`https://你的網域/admin` → 輸入管理密碼（腳本結尾會顯示）就能發通知
3. 伺服器本身也會鏡像伺服完整頁面：`https://你的網域/`

### 後台管理介面（/admin）

- 輸入 ADMIN_KEY 登入（會記在瀏覽器裡）
- 顯示已訂閱裝置數
- 快速訊息按鈕 + 自訂標題/內容，一鍵發送
- 手機瀏覽器也能用

### 手動部署（不想用腳本的話）

```bash
git clone https://github.com/wing5600/cc-birthday.git /opt/cc-birthday
cd /opt/cc-birthday/server && npm install && cp .env.example .env  # 編輯 .env 填金鑰
sudo cp ../cc-birthday.service /etc/systemd/system/   # 視情況修改路徑
sudo systemctl enable --now cc-birthday
# Caddy：把 Caddyfile 的網域改掉後放到 /etc/caddy/Caddyfile，sudo systemctl reload caddy
```

### 更新程式碼

```bash
cd /opt/cc-birthday && git pull && sudo systemctl restart cc-birthday
```

---

<details>
<summary>替代方案：Netlify Functions（免信用卡，但要多註冊帳號）</summary>

`netlify/functions/` 裡有現成的 Netlify 版本（Functions + Blobs）：

```bash
npx netlify login
npx netlify sites:create --name cc-birthday-push
npx netlify env:set VAPID_PUBLIC_KEY "..."   # 值見 server/.env
npx netlify env:set VAPID_PRIVATE_KEY "..."
npx netlify env:set ADMIN_KEY "..."
npx netlify deploy --prod
```

</details>

## CC 的 iPhone 設定（iOS 16.4 以上）

1. 用 **Safari** 打開 `https://<你的帳號>.github.io/cc-birthday/`
2. 點「分享」→「**加入主畫面**」
3. 從主畫面的蛋糕圖示打開 App
4. 點「💝 點我開啟」→ 按「🔔 開啟通知」→ 允許

## 發送通知給她

**用後台網頁（最方便）**：打開 `https://你的網域/admin` → 輸入管理密碼 → 寫訊息 → 發送。

**或用指令**：

```bash
cd server
node send.js "🎂 生日快樂！" "打開 App 有驚喜喔 💕"
```

**或 curl**：

```bash
curl -X POST https://你的網域/notify \
  -H "Content-Type: application/json" \
  -H "x-admin-key: <你的 ADMIN_KEY>" \
  -d '{"title":"🎂 生日快樂！","body":"打開 App 有驚喜喔 💕"}'
```

也可以做一個 iOS 捷徑（Shortcut）呼叫這個 API，從自己手機一鍵發送。

## 本地開發

```bash
# 前端
python3 -m http.server 8080   # 打開 http://localhost:8080

# 後端
cd server && npm install && npm start   # http://localhost:3000
```
