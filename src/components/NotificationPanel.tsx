import React, { useEffect, useState, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import webSocketService from '../services/WebSocketService';
import type { Notification } from '../services/WebSocketService';
import { registerForPush } from '../services/PushService';

interface NotificationPanelProps {
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
  userRole?: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ setMessage }) => {
  // Request permission for system notifications on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  // Track recent notification signatures to avoid duplicates from SW + WS
  const recentKeysRef = useRef<Map<string, number>>(new Map());
  // Let the Service Worker own native notifications entirely to avoid duplicate OS toasts
  // We still update the in-app list via SW postMessage and WebSocket events.
  const showNativeFromPageRef = useRef<boolean>(false);
  const isAdmin = localStorage.getItem('role') === 'ADMIN';
  const currentUserId = localStorage.getItem('userId');

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Initialize WebSocket connection and notification handlers
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to WebSocket
    webSocketService.connect();

    // Subscribe to notification events
    webSocketService.subscribe('notification', handleNotification);
    webSocketService.subscribe('userNotification', handleNotification);
    webSocketService.subscribe('roleNotification', handleNotification);

    // Check connection status periodically
    const connectionCheck = setInterval(() => {
      const connected = webSocketService.isConnectedStatus();
      setIsConnected(connected);
      
      if (!connected && token) {
        console.log('Attempting to reconnect...');
        webSocketService.connect();
      }
    }, 5000);

    // Fetch existing notifications immediately
    fetchNotifications();

    // Register for Web Push to receive system notifications via Service Worker
    if (currentUserId) {
      registerForPush(currentUserId);
    }

    // Always suppress page-level native notifications and rely on SW to show them.
    // This prevents duplicate OS notifications when both SW push and WebSocket events arrive.
    try {
      showNativeFromPageRef.current = false;
      navigator.serviceWorker?.addEventListener?.('controllerchange', () => {
        showNativeFromPageRef.current = false;
      });
    } catch {}

    // Listen for messages from Service Worker (push -> postMessage)
    const onSwMessage = (event: MessageEvent) => {
      try {
        const data = event.data;
        if (data && data.type === 'notification' && data.payload) {
          // Suppress native toast because SW already showed one
          handleNotification(data.payload as Notification, { suppressNative: true });
        }
      } catch {}
    };
    if (navigator.serviceWorker && 'addEventListener' in navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    // Realtime fallback: periodic polling to catch any missed events
    const poller = setInterval(() => {
      // Only poll when the tab is visible to reduce load
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 15000);

    // Refresh when window/tab regains focus
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(connectionCheck);
      clearInterval(poller);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (navigator.serviceWorker && 'removeEventListener' in navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
      webSocketService.unsubscribe('notification');
      webSocketService.unsubscribe('userNotification');
      webSocketService.unsubscribe('roleNotification');
      webSocketService.disconnect();
    };
  }, []);

  const handleNotification = (notification: Notification, opts?: { suppressNative?: boolean }) => {
    console.log('Received notification:', notification);
    // De-dupe by title+message within a short window
    try {
      const key = `${notification.title}|${notification.message}`;
      const now = Date.now();
      const map = recentKeysRef.current;
      // prune old
      for (const [k, ts] of Array.from(map.entries())) {
        if (now - ts > 5000) map.delete(k);
      }
      if (map.has(key)) {
        return; // duplicate within window
      }
      map.set(key, now);
    } catch {}
    
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show native system notification if allowed
    if (
      !opts?.suppressNative &&
      showNativeFromPageRef.current &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        const n = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico', // Update to your app's icon path if needed
        });
        // Focus window/tab if user clicks notification
        n.onclick = () => {
          window.focus();
        };
      } catch (e) {
        console.warn('Native notification error:', e);
      }
    }
    // Show toast notification in-app as fallback/companion
    setMessage({ 
      type: 'success', 
      text: `${notification.title}: ${notification.message}` 
    });
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        setMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }

      const data = await res.json();
      if (res.ok && data.data) {
        const notifications = Array.isArray(data.data) ? data.data : [];
        setNotifications(notifications);
        setUnreadCount(notifications.filter((n: Notification) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    const isAdmin = localStorage.getItem('role') === 'ADMIN';
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      let res;
      if (isAdmin) {
        res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/${notificationId}/dismiss`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (res.ok) {
        setNotifications(prev => {
          const updated = prev.filter(n => n.id !== notificationId);
          setUnreadCount(updated.filter(n => !n.isRead).length);
          return updated;
        });
        setMessage({ type: 'success', text: isAdmin ? 'Notification deleted successfully' : 'Notification dismissed' });
      } else {
        setMessage({ type: 'error', text: isAdmin ? 'Failed to delete notification' : 'Failed to dismiss notification' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: isAdmin ? 'Error deleting notification' : 'Error dismissing notification' });
    }
  };

  const handleDismissNotification = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/${notificationId}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev => {
          const updated = prev.filter(n => n.id !== notificationId);
          setUnreadCount(updated.filter(n => !n.isRead).length);
          return updated;
        });
        setMessage({ type: 'success', text: 'Notification dismissed' });
      } else {
        setMessage({ type: 'error', text: 'Failed to dismiss notification' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error dismissing notification' });
    }
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-3 bg-white dark:bg-neutral-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Show notifications"
      >
        <FaBell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* Connection status indicator */}
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
      </button>
      
      {showNotifications && (
        <div
          className="fixed inset-0 z-40 flex items-start sm:items-start sm:justify-end sm:inset-auto sm:absolute sm:right-0 top-12 mt-0 sm:mt-8 w-full sm:w-96 max-w-full sm:max-w-md px-2 sm:px-0"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="w-full sm:w-96 bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-lg shadow-2xl border border-gray-200 dark:border-neutral-800 z-50 max-h-[70vh] sm:max-h-96 overflow-y-auto transition-all duration-300"
            style={{ pointerEvents: 'auto' }}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
          >
          <div className="p-4 border-b border-gray-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Notifications</h3>
              <div className="flex items-center gap-2">
                {!isConnected && (
                  <span className="text-xs text-red-500">Disconnected</span>
                )} 
              </div>
            </div>
          
          <div className="max-h-[50vh] sm:max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-neutral-800">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`flex flex-col sm:flex-row gap-2 p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer ${!notification.isRead ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex-1" onClick={() => markAsRead(notification.id)}>
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate" title={notification.title}>{notification.title}</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 break-words">{notification.message}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center gap-1 mt-2 sm:mt-0">
                      {isAdmin && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                          className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center"
                          title="Delete (for all users)"
                          aria-label="Delete notification"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDismissNotification(notification.id); }}
                        className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center"
                        title="Dismiss (only for you)"
                        aria-label="Dismiss notification"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-neutral-500 dark:text-neutral-400 text-sm text-center py-4">No notifications</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;