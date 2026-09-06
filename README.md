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

## 部署到自己的伺服器（All-in-One，推薦）

`server/server.js` 會同時伺服前端網頁和推播 API，一個 Node 程式搞定。

### 1. 在伺服器上安裝 Node.js 18+ 並拉取程式碼

```bash
git clone https://github.com/wing5600/cc-birthday.git /opt/cc-birthday
cd /opt/cc-birthday/server
npm install
cp .env.example .env   # 然後編輯 .env，填入金鑰（值見你 Mac 上的 server/.env）
```

### 2. 用 systemd 讓它常駐

```bash
sudo cp /opt/cc-birthday/cc-birthday.service /etc/systemd/system/
# 視需要編輯裡面的 WorkingDirectory / node 路徑（which node 可查）
sudo systemctl enable --now cc-birthday
sudo systemctl status cc-birthday   # 確認 active (running)
```

### 3. 用 Caddy 掛上 HTTPS（自動申請 Let's Encrypt 憑證）

```bash
sudo apt install caddy -y    # Debian/Ubuntu；其他發行版見 caddyserver.com
sudo cp /opt/cc-birthday/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile   # 把 cc.example.com 換成你的網域
sudo systemctl reload caddy
```

記得防火牆開放 80 / 443 port。完成後 `https://你的網域` 就是生日頁面，
API 也在同網域下（`/vapidPublicKey`、`/subscribe`、`/notify`），免設定 CORS。

> 已用 Nginx 的話，只要加一個 site：`listen 443 ssl;` 配上憑證，
> `location / { proxy_pass http://127.0.0.1:3000; }` 即可。

### 4. 更新程式碼

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

```bash
cd server
node send.js "🎂 生日快樂！" "打開 App 有驚喜喔 💕"
```

或用 curl：

```bash
curl -X POST https://cc-birthday-push.netlify.app/notify \
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
