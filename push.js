// PWA 註冊 + 推播通知訂閱
// 後端網址（自有伺服器）
const BACKEND_URL = 'https://cc.cryhan.com';

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

// CC 點「點我開啟」進入頁面後，自動彈出通知詢問（iOS 需先加入主畫面）
const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    setTimeout(() => {
      if (isIOS && !isStandalone) showA2HSHint();
      else showNotifyPrompt();
    }, 1600);
  });
}

async function enableNotifications() {
  if (!('Notification' in window) || !('PushManager' in window)) {
    bellBtn.textContent = '⚠️ 此裝置不支援通知';
    return;
  }
  try {
    bellBtn.textContent = '⏳ 開啟中…';
    swReg = swReg || (await navigator.serviceWorker.ready);
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

function showNotifyPrompt() {
  if (document.getElementById('notifyPrompt')) return;
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  const el = document.createElement('div');
  el.id = 'notifyPrompt';
  el.style.cssText =
    'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:30;' +
    'width:min(320px,86vw);padding:22px 20px;border-radius:20px;text-align:center;' +
    'background:rgba(30,16,52,.95);border:1px solid rgba(255,158,203,.45);' +
    'color:#ffe9f4;box-shadow:0 12px 40px rgba(0,0,0,.5);' +
    'font-family:"Noto Sans TC",sans-serif;';
  el.innerHTML =
    '<div style="font-size:44px;">🎁</div>' +
    '<p style="font-size:1.05rem;font-weight:700;margin:10px 0 4px;">要開啟通知嗎？</p>' +
    '<p style="font-size:.88rem;color:#cbb8e8;line-height:1.7;">生日當天的驚喜訊息<br>會第一時間送到妳手上 💕</p>' +
    '<div style="display:flex;gap:10px;margin-top:16px;">' +
    '<button id="npNo" style="flex:1;padding:12px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:transparent;color:#cbb8e8;font-size:.95rem;font-family:inherit;cursor:pointer;">先不用</button>' +
    '<button id="npYes" style="flex:2;padding:12px;border-radius:999px;border:none;background:linear-gradient(135deg,#ff9ecb,#ffd58a);color:#3a1b3d;font-size:.95rem;font-weight:700;font-family:inherit;cursor:pointer;">好呀 🔔</button>' +
    '</div>';
  document.body.appendChild(el);
  document.getElementById('npYes').addEventListener('click', () => {
    el.remove();
    enableNotifications();
  });
  document.getElementById('npNo').addEventListener('click', () => el.remove());
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
