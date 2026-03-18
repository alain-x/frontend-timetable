// PushService.ts: Handles browser push registration and subscription
// Requires your backend to expose VAPID public key at /api/push/vapidPublicKey

// Prefer env, fallback to production backend host to ensure push works in Netlify build too
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8091';
const VAPID_PUBLIC_KEY_URL = `${API_BASE_URL}/api/push/vapidPublicKey`;
const SUBSCRIBE_URL = `${API_BASE_URL}/api/push/subscribe`;

export async function registerForPush(userId: string) {
  try {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return;
  }

  // Unregister old service workers (best practice for PWA upgrades)
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const reg of regs) {
    if (reg.active && reg.active.scriptURL && !reg.active.scriptURL.endsWith('/sw.js')) {
      await reg.unregister();
    }
  }

  // 1. Request Notification Permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission denied');
    return;
  }

  // 2. Register Service Worker
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // 3. Get VAPID public key from backend
  const vapidKeyResp = await fetch(VAPID_PUBLIC_KEY_URL);
  if (!vapidKeyResp.ok) {
    throw new Error(`Failed to fetch VAPID public key: ${vapidKeyResp.status}`);
  }
  const vapidPublicKey = (await vapidKeyResp.text()).trim();
  if (!vapidPublicKey) {
    throw new Error('Empty VAPID public key received');
  }

  // 4. Check for existing subscription
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    console.log('Push subscription created:', subscription);
  } else {
    console.log('Push subscription already exists:', subscription);
  }

  // 5. Send subscription to backend
  await fetch(SUBSCRIBE_URL + '?userId=' + encodeURIComponent(userId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  console.log('Push subscription sent to backend');
  } catch (err) {
    console.error('Push registration failed:', err);
  }
}

// Unsubscribe utility for PWA hygiene
export async function unsubscribeFromPush() {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      console.log('Push subscription unsubscribed');
    }
  }
}


// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  // Remove any whitespace or line breaks
  base64String = base64String.replace(/\s/g, '');
  // Pad the base64 string as needed
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
