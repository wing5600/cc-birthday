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
server/               推播後端（Node + Express + web-push）
render.yaml           Render 一鍵部署設定
```

## 部署前端（GitHub Pages）

```bash
gh repo create cc-birthday --public --source . --push
gh api repos/{owner}/cc-birthday/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

網址會是 `https://<你的帳號>.github.io/cc-birthday/`

## 部署後端（Render 免費方案）

1. 到 [render.com](https://render.com) 註冊（可用 GitHub 登入）
2. Dashboard → **New → Blueprint** → 選 `cc-birthday` repo（會自動讀取 `render.yaml`）
3. 建立時填入三個環境變數（值在 `server/.env` 裡）：
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `ADMIN_KEY`
4. 部署完成後會得到網址，例如 `https://cc-birthday-push.onrender.com`
5. 把這個網址填進：
   - `push.js` 最上面的 `BACKEND_URL`（改完 commit + push，GitHub Pages 會自動更新）
   - `server/.env` 的 `BACKEND_URL`（本機發通知用）

> 免費方案閒置會休眠，第一次發通知可能等 30–60 秒喚醒，屬正常現象。
> 訂閱資料存在後端記憶體碟，重開機會遺失——但 PWA 每次打開都會自動重新訂閱，所以她只要開過 App 就會補上。

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
curl -X POST https://cc-birthday-push.onrender.com/notify \
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
