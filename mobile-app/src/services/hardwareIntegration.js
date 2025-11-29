import { Platform } from 'react-native';
import * as Bluetooth from 'expo-bluetooth';

const DRISHTIKA_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const DISTANCE_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
const COMMAND_CHARACTERISTIC_UUID = '0000ffe2-0000-1000-8000-00805f9b34fb';

const DISTANCE_THRESHOLDS = {
  CRITICAL: 0.5,
  DANGER: 1.0,
  WARNING: 2.0,
  SAFE: 3.0
};

const BEEP_PATTERNS = {
  CRITICAL: { interval: 100, duration: 50 },
  DANGER: { interval: 250, duration: 100 },
  WARNING: { interval: 500, duration: 100 },
  SAFE: { interval: 1000, duration: 100 }
};

class HardwareIntegrationService {
  constructor() {
    this.device = null;
    this.isConnected = false;
    this.distanceData = {
      front: null,
      left: null,
      right: null,
      timestamp: null
    };
    this.listeners = new Map();
    this.offlineMode = false;
  }

  async initialize() {
    try {
      if (Platform.OS === 'web') {
        console.warn('Bluetooth not supported on web');
        return false;
      }

      const isAvailable = await this.checkBluetoothAvailable();
      if (!isAvailable) {
        console.warn('Bluetooth not available');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[HardwareIntegration] Init error:', error.message);
      return false;
    }
  }

  async checkBluetoothAvailable() {
    try {
      return true;
    } catch (error) {
      return false;
    }
  }

  async scanForDevice(timeout = 10000) {
    try {
      console.log('[HardwareIntegration] Scanning for Drishtika device...');

      const foundDevice = {
        id: 'DRISHTIKA_001',
        name: 'Drishtika Wearable',
        rssi: -60
      };

      return foundDevice;

    } catch (error) {
      console.error('[HardwareIntegration] Scan error:', error.message);
      throw new Error('Failed to scan for device');
    }
  }

  async connectToDevice(deviceId) {
    try {
      console.log('[HardwareIntegration] Connecting to device:', deviceId);

      this.device = { id: deviceId, name: 'Drishtika' };
      this.isConnected = true;

      this.startDistanceMonitoring();

      return {
        success: true,
        device: this.device
      };

    } catch (error) {
      console.error('[HardwareIntegration] Connection error:', error.message);
      throw new Error('Failed to connect to device');
    }
  }

  async disconnect() {
    try {
      if (this.device) {
        this.stopDistanceMonitoring();
        this.device = null;
        this.isConnected = false;
      }

      return { success: true };

    } catch (error) {
      console.error('[HardwareIntegration] Disconnect error:', error.message);
      return { success: false };
    }
  }

  startDistanceMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.simulateDistanceReading();
    }, 100);
  }

  stopDistanceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  simulateDistanceReading() {
    const mockData = {
      front: Math.random() * 3.0,
      left: Math.random() * 3.0,
      right: Math.random() * 3.0,
      timestamp: Date.now()
    };

    this.updateDistanceData(mockData);
  }

  updateDistanceData(data) {
    this.distanceData = data;

    const obstacleLevel = this.analyzeDistanceData(data);

    this.notifyListeners('distance', data);

    if (obstacleLevel !== 'SAFE') {
      this.notifyListeners('obstacle', {
        level: obstacleLevel,
        distance: Math.min(data.front, data.left, data.right),
        direction: this.getClosestDirection(data)
      });
    }
  }

  analyzeDistanceData(data) {
    const minDistance = Math.min(data.front, data.left, data.right);

    if (minDistance < DISTANCE_THRESHOLDS.CRITICAL) {
      return 'CRITICAL';
    } else if (minDistance < DISTANCE_THRESHOLDS.DANGER) {
      return 'DANGER';
    } else if (minDistance < DISTANCE_THRESHOLDS.WARNING) {
      return 'WARNING';
    }

    return 'SAFE';
  }

  getClosestDirection(data) {
    const distances = {
      front: data.front,
      left: data.left,
      right: data.right
    };

    return Object.keys(distances).reduce((a, b) =>
      distances[a] < distances[b] ? a : b
    );
  }

  getBeepPattern(obstacleLevel) {
    return BEEP_PATTERNS[obstacleLevel] || BEEP_PATTERNS.SAFE;
  }

  async calibrateDevice(settings) {
    try {
      console.log('[HardwareIntegration] Calibrating device:', settings);

      const calibrationData = {
        sensitivity: settings.sensitivity || 1.0,
        beepVolume: settings.beepVolume || 0.8,
        distanceUnit: settings.distanceUnit || 'meters',
        timestamp: Date.now()
      };

      return {
        success: true,
        calibration: calibrationData
      };

    } catch (error) {
      console.error('[HardwareIntegration] Calibration error:', error.message);
      throw new Error('Device calibration failed');
    }
  }

  async sendCommand(command, params = {}) {
    if (!this.isConnected) {
      throw new Error('Device not connected');
    }

    try {
      console.log('[HardwareIntegration] Sending command:', command, params);

      return { success: true };

    } catch (error) {
      console.error('[HardwareIntegration] Command error:', error.message);
      throw new Error('Failed to send command');
    }
  }

  onDistanceUpdate(callback) {
    this.listeners.set('distance', callback);
  }

  onObstacleDetected(callback) {
    this.listeners.set('obstacle', callback);
  }

  notifyListeners(event, data) {
    const callback = this.listeners.get(event);
    if (callback) {
      try {
        callback(data);
      } catch (error) {
        console.error('[HardwareIntegration] Listener error:', error.message);
      }
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      device: this.device,
      batteryLevel: this.isConnected ? 85 : 0,
      signalStrength: this.isConnected ? -60 : 0
    };
  }

  getCurrentDistances() {
    return this.distanceData;
  }

  setOfflineMode(enabled) {
    this.offlineMode = enabled;
  }

  isOfflineMode() {
    return this.offlineMode;
  }
}

export default new HardwareIntegrationService();
