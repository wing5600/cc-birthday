// 發送通知給 CC：node send.js "標題" "內容"
// 例如：node send.js "🎂 生日快樂！" "打開 App 有驚喜喔 💕"
const fs = require('fs');
const path = require('path');

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

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!ADMIN_KEY) {
  console.error('請在 server/.env 設定 ADMIN_KEY');
  process.exit(1);
}

const title = process.argv[2] || '💕 給 CC';
const body = process.argv[3] || '你有一則新訊息';

fetch(BACKEND_URL + '/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
  body: JSON.stringify({ title, body })
})
  .then(async (r) => {
    console.log(r.status, await r.text());
  })
  .catch((err) => {
    console.error('發送失敗：', err.message);
    process.exit(1);
  });
