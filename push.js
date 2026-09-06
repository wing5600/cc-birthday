// PWA 註冊 + 推播通知訂閱
// 後端網址（自有伺服器）
const BACKEND_URL = 'https://panel.sunhingindo.com';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

let swReg = null;
const bellBtn = document.getElementById('bellBtn');

window.addEventListener('load', async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register('sw.js');
    // 已授權過的裝置：每次打開時靜默重新訂閱一次（後端若遺失訂閱資料可自動補上）
    if ('Notification' in window && Notification.permission === 'granted') {
      const sub = await swReg.pushManager.getSubscription();
      if (sub) {
        fetch(BACKEND_URL + '/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub)
        }).catch(() => {});
        if (bellBtn) bellBtn.textContent = '🔔 通知已開啟';
      }
    }
  } catch (err) {
    console.warn('Service Worker 註冊失敗', err);
  }
});

if (isIOS && !isStandalone) {
  // iOS 必須先「加入主畫面」才能收推播
  setTimeout(showA2HSHint, 4000);
}

if (bellBtn) {
  bellBtn.addEventListener('click', () => {
    if (isIOS && !isStandalone) {
      showA2HSHint();
      return;
    }
    enableNotifications();
  });
}

async function enableNotifications() {
  if (!('Notification' in window) || !('PushManager' in window) || !swReg) {
    bellBtn.textContent = '⚠️ 此裝置不支援通知';
    return;
  }
  try {
    bellBtn.textContent = '⏳ 開啟中…';
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      bellBtn.textContent = '🔕 通知被拒絕';
      return;
    }
    const key = await (await fetch(BACKEND_URL + '/vapidPublicKey')).text();
    const sub = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(key)
    });
    await fetch(BACKEND_URL + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
    bellBtn.textContent = '🔔 通知已開啟';
  } catch (err) {
    console.warn('訂閱失敗', err);
    bellBtn.textContent = '⚠️ 開啟失敗，稍後再試';
  }
}

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function showA2HSHint() {
  if (document.getElementById('a2hs')) return;
  const el = document.createElement('div');
  el.id = 'a2hs';
  el.style.cssText =
    'position:fixed;top:16%;left:50%;transform:translateX(-50%);z-index:20;' +
    'max-width:320px;padding:14px 18px;border-radius:16px;text-align:center;' +
    'background:rgba(30,16,52,.92);border:1px solid rgba(255,158,203,.4);' +
    'color:#ffe9f4;font-size:.88rem;line-height:1.7;box-shadow:0 8px 32px rgba(0,0,0,.4);' +
    'font-family:"Noto Sans TC",sans-serif;';
  el.innerHTML =
    '💡 想收到生日通知嗎？<br>用 <b>Safari</b> 打開這個頁面 → 點「<b>分享</b>」→「<b>加入主畫面</b>」<br>再從主畫面的 App 圖示打開，按 🔔 就可以了！' +
    '<div style="margin-top:10px;cursor:pointer;color:#ff9ecb;font-weight:700;" onclick="this.parentElement.remove()">知道了 ✕</div>';
  document.body.appendChild(el);
}
