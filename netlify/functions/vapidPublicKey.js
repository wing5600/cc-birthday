const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'text/plain' },
    body: process.env.VAPID_PUBLIC_KEY || ''
  };
};
