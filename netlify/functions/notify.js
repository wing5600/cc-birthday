const webpush = require('web-push');
const { getStore } = require('@netlify/blobs');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'method not allowed' };
  if (event.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return { statusCode: 401, headers: cors, body: 'unauthorized' };
  }

  webpush.setVapidDetails(
    'mailto:admin@cc-birthday.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  let payload;
  try {
    const { title = '💕 給 CC', body = '', url = './' } = JSON.parse(event.body || '{}');
    payload = JSON.stringify({ title, body, url });
  } catch {
    return { statusCode: 400, headers: cors, body: 'invalid json' };
  }

  const store = getStore('subscriptions');
  const subs = (await store.get('list', { type: 'json' })) || [];
  const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload)));

  // 清掉已失效的訂閱
  const deadIndexes = results
    .map((r, i) =>
      r.status === 'rejected' && [404, 410].includes(r.reason && r.reason.statusCode) ? i : -1
    )
    .filter((i) => i >= 0);
  if (deadIndexes.length) {
    await store.setJSON('list', subs.filter((_, i) => !deadIndexes.includes(i)));
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`通知已送出 ${sent}/${subs.length}`);
  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent, total: subs.length })
  };
};
