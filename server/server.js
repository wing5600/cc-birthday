const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 本地開發時讀取 .env（部署平台用環境變數，不需要這個檔案）
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) {
      const key = line.slice(0, i).trim();
      if (!process.env[key]) process.env[key] = line.slice(i + 1).trim();
    }
  }
} catch {}

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, ADMIN_KEY } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !ADMIN_KEY) {
  console.error('缺少環境變數：VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / ADMIN_KEY');
  process.exit(1);
}

webpush.setVapidDetails('mailto:admin@cc-birthday.local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const DB = path.join(__dirname, 'subscriptions.json');
const loadSubs = () => {
  try {
    return JSON.parse(fs.readFileSync(DB, 'utf8'));
  } catch {
    return [];
  }
};
const saveSubs = (subs) => fs.writeFileSync(DB, JSON.stringify(subs, null, 2));

const app = express();
app.use(cors());
app.use(express.json());

// All-in-One：同時伺服前端靜態檔案（repo 根目錄）
// 安全：/server 底下有 .env 與訂閱資料，必須擋掉
app.use('/server', (req, res) => res.status(404).send('not found'));
app.use(
  express.static(path.join(__dirname, '..'), {
    dotfiles: 'ignore',
    index: 'index.html',
    setHeaders: (res, filePath) => {
      // service worker 不可被快取，否則更新會延遲
      if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

app.get('/health', (req, res) => res.send('CC birthday push server 💕'));

app.get('/vapidPublicKey', (req, res) => res.type('text/plain').send(VAPID_PUBLIC_KEY));

// PWA 訂閱推播
app.post('/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).send('invalid subscription');
  const subs = loadSubs();
  if (!subs.find((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    saveSubs(subs);
    console.log('新訂閱：', sub.endpoint.slice(0, 60) + '…');
  }
  res.status(201).send('ok');
});

// 發送通知給所有訂閱者（需要管理密碼）
app.post('/notify', async (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).send('unauthorized');
  const { title = '💕 給 CC', body = '', url = './' } = req.body || {};
  const subs = loadSubs();
  const payload = JSON.stringify({ title, body, url });
  const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload)));
  // 清掉已失效的訂閱（裝置取消訂閱等）
  const deadIndexes = results
    .map((r, i) =>
      r.status === 'rejected' && [404, 410].includes(r.reason && r.reason.statusCode) ? i : -1
    )
    .filter((i) => i >= 0);
  if (deadIndexes.length) saveSubs(subs.filter((_, i) => !deadIndexes.includes(i)));
  const sent = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`通知已送出 ${sent}/${subs.length}`);
  res.json({ sent, total: subs.length });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🎂 push server listening on :${port}`));
