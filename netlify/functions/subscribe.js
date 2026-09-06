const { getStore } = require('@netlify/blobs');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'method not allowed' };

  let sub;
  try {
    sub = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: cors, body: 'invalid json' };
  }
  if (!sub || !sub.endpoint) return { statusCode: 400, headers: cors, body: 'invalid subscription' };

  const store = getStore('subscriptions');
  const subs = (await store.get('list', { type: 'json' })) || [];
  if (!subs.find((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    await store.setJSON('list', subs);
    console.log('新訂閱：', sub.endpoint.slice(0, 60));
  }
  return { statusCode: 201, headers: cors, body: 'ok' };
};
