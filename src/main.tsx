import { StrictMode } from 'react'
import { registerForPush } from './services/PushService' // push registration
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <App />
    </ThemeProvider>
  </StrictMode>,
)

// Defer push registration to avoid blocking initial render
const userId = localStorage.getItem('userId');
const defer = (fn: () => void) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(fn, { timeout: 5000 });
  } else {
    setTimeout(fn, 0);
  }
};
if (userId) {
  defer(() => registerForPush(userId));
}

// Register Service Worker for offline/PWA & background sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[PWA] Service Worker registered:', reg.scope);
      })
      .catch(err => {
        console.error('[PWA] Service Worker registration failed:', err);
      });
  });
}

// Idle logout: sign out after 1 hour of no user activity
(() => {
  const IDLE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
  let idleTimer: number | undefined;

  const logout = () => {
    try {
      console.warn('[Auth] Idle timeout reached. Logging out.');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      // Optional: clear other auth/session keys if used
    } catch {}
    // Redirect to login
    try { window.location.href = '/login'; } catch {}
  };

  const resetTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = window.setTimeout(logout, IDLE_LIMIT_MS);
  };

  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'focus'];
  activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true } as any));
  document.addEventListener('visibilitychange', () => {
    // If user returns to the tab, treat as activity
    if (document.visibilityState === 'visible') resetTimer();
  });

  // Start the idle timer when app loads (only if logged in)
  const token = localStorage.getItem('token');
  if (token) resetTimer();
})();
