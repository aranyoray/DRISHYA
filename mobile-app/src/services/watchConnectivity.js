import { Platform } from 'react-native';

const WATCH_MESSAGES = {
  OBSTACLE_ALERT: 'obstacle_alert',
  EMOTION_UPDATE: 'emotion_update',
  MODE_CHANGE: 'mode_change',
  STATUS_UPDATE: 'status_update',
  QUICK_ACTION: 'quick_action'
};

class WatchConnectivityService {
  constructor() {
    this.isConnected = false;
    this.watchState = null;
    this.messageHandlers = new Map();
  }

  async initialize() {
    if (Platform.OS !== 'ios') {
      console.warn('[WatchConnectivity] Only available on iOS');
      return false;
    }

    try {
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('[WatchConnectivity] Init error:', error.message);
      return false;
    }
  }

  async sendObstacleAlert(obstacle) {
    if (!this.isConnected) {
      return { success: false };
    }

    try {
      const message = {
        type: WATCH_MESSAGES.OBSTACLE_ALERT,
        data: {
          obstacleType: obstacle.type,
          position: obstacle.position,
          distance: obstacle.distance,
          priority: obstacle.priority,
          timestamp: Date.now()
        }
      };

      await this.sendMessage(message);

      return { success: true };
    } catch (error) {
      console.error('[WatchConnectivity] Alert send error:', error.message);
      return { success: false };
    }
  }

  async sendEmotionUpdate(emotion) {
    if (!this.isConnected) {
      return { success: false };
    }

    try {
      const message = {
        type: WATCH_MESSAGES.EMOTION_UPDATE,
        data: {
          emotion: emotion.emotion,
          confidence: emotion.confidence,
          timestamp: Date.now()
        }
      };

      await this.sendMessage(message);

      return { success: true };
    } catch (error) {
      console.error('[WatchConnectivity] Emotion send error:', error.message);
      return { success: false };
    }
  }

  async sendModeChange(mode) {
    if (!this.isConnected) {
      return { success: false };
    }

    try {
      const message = {
        type: WATCH_MESSAGES.MODE_CHANGE,
        data: {
          mode,
          timestamp: Date.now()
        }
      };

      await this.sendMessage(message);

      return { success: true };
    } catch (error) {
      console.error('[WatchConnectivity] Mode change error:', error.message);
      return { success: false };
    }
  }

  async sendStatusUpdate(status) {
    if (!this.isConnected) {
      return { success: false };
    }

    try {
      const message = {
        type: WATCH_MESSAGES.STATUS_UPDATE,
        data: {
          isActive: status.isActive,
          batteryLevel: status.batteryLevel,
          timestamp: Date.now()
        }
      };

      await this.sendMessage(message);

      return { success: true };
    } catch (error) {
      console.error('[WatchConnectivity] Status send error:', error.message);
      return { success: false };
    }
  }

  async sendMessage(message) {
    console.log('[WatchConnectivity] Sending message:', message.type);
    return { success: true };
  }

  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  handleIncomingMessage(message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        handler(message.data);
      } catch (error) {
        console.error('[WatchConnectivity] Handler error:', error.message);
      }
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      paired: this.isConnected,
      reachable: this.isConnected
    };
  }
}

export default new WatchConnectivityService();
