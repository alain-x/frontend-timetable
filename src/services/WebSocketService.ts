export interface Notification {
  id: number;
  type: 'booking' | 'request' | 'conflict' | 'system' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  userId?: number;
  roomId?: number;
  timetableId?: number;
}

export interface WebSocketMessage {
  type: string;
  destination?: string;
  payload?: any;
  headers?: Record<string, string>;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private reconnectTimer: number | null = null;
  private heartbeatInterval: number | null = null;
  private waitingForOnline = false;
  private handleOnline = () => {
    this.waitingForOnline = false;
    // Try to connect when back online
    this.setupConnection();
  };

  constructor() {
    this.setupConnection();
  }

  private setupConnection() {
    try {
      // If offline, defer connection until online
      if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
        if (!this.waitingForOnline) {
          this.waitingForOnline = true;
          window.addEventListener('online', this.handleOnline, { once: true });
        }
        console.warn('WebSocket: offline, deferring connection');
        return;
      }
      // Use native WebSocket endpoint
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      // Always connect to the backend service host; avoid using window.location.host (Netlify)
      this.ws = new WebSocket(`${wsProtocol}://backend-ewab.onrender.com/ws/websocket`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToNotifications();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          // Handle different message types
          if (data.type === 'notification') {
            this.notifyHandlers('notification', data.payload ?? data);
          } else if (data.type === 'userNotification') {
            this.notifyHandlers('userNotification', data.payload ?? data);
          } else if (data.type === 'roleNotification') {
            this.notifyHandlers('roleNotification', data.payload ?? data);
          } else if (data.type === 'announcement') {
            // Route announcements into the same notification stream
            this.notifyHandlers('notification', data.payload ?? data);
          } else {
            // Fallback: if payload exists, use it, otherwise pass data as-is
            const payload = (data && typeof data === 'object' && 'payload' in data) ? data.payload : data;
            this.notifyHandlers('notification', payload);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Avoid noisy errors while offline
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          console.log('WebSocket error while offline (suppressed)');
        } else {
          console.error('WebSocket error:', error);
        }
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
        this.stopHeartbeat();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error setting up WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'PING',
          payload: { timestamp: Date.now() }
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect() {
    // If offline, wait for online event instead of immediate retries
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      if (!this.waitingForOnline) {
        this.waitingForOnline = true;
        window.addEventListener('online', this.handleOnline, { once: true });
        console.log('WebSocket: offline, waiting for online to reconnect');
      }
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      
      this.reconnectTimer = setTimeout(() => {
        if (!this.isConnected) {
          this.setupConnection();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  public connect() {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      if (!this.waitingForOnline) {
        this.waitingForOnline = true;
        window.addEventListener('online', this.handleOnline, { once: true });
      }
      console.warn('WebSocket: offline, connection postponed');
      return;
    }
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.setupConnection();
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  private subscribeToNotifications() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Send subscription message for general notifications
    this.sendMessage({
      type: 'SUBSCRIBE',
      destination: '/topic/notifications'
    });

    // Send subscription message for user-specific notifications
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub || payload.userId;
        
        if (userId) {
          this.sendMessage({
            type: 'SUBSCRIBE',
            destination: `/user/${userId}/notifications`
          });
        }
      } catch (error) {
        console.error('Error parsing JWT token:', error);
      }
    }

    // Send subscription message for role-based notifications
    const role = localStorage.getItem('role');
    if (role) {
      this.sendMessage({
        type: 'SUBSCRIBE',
        destination: `/topic/notifications/${role}`
      });
    }
  }

  public subscribe(event: string, handler: (message: any) => void) {
    this.messageHandlers.set(event, handler);
  }

  public unsubscribe(event: string) {
    this.messageHandlers.delete(event);
  }

  private notifyHandlers(event: string, message: any) {
    const handler = this.messageHandlers.get(event);
    if (handler) {
      handler(message);
    }
  }

  private sendMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  public isConnectedStatus(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  // Method to send notifications to the server
  public sendNotification(notification: Notification) {
    this.sendMessage({
      type: 'SEND_NOTIFICATION',
      destination: '/app/notifications',
      payload: notification
    });
  }

  // Method to send user-specific notifications
  public sendUserNotification(notification: Notification, userId: string) {
    this.sendMessage({
      type: 'SEND_USER_NOTIFICATION',
      destination: '/app/user-notifications',
      payload: notification,
      headers: { userId }
    });
  }

  // Method to send role-based notifications
  public sendRoleNotification(notification: Notification, role: string) {
    this.sendMessage({
      type: 'SEND_ROLE_NOTIFICATION',
      destination: '/app/role-notifications',
      payload: notification,
      headers: { role }
    });
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 