import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 2000;
const CONNECTION_TIMEOUT = 15000;
const HEALTH_CHECK_INTERVAL = 5000;
const RECONNECT_DELAY = 3000;

const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
  FALLBACK: 'fallback_mode'
};

const ERROR_TYPES = {
  BLUETOOTH_UNAVAILABLE: 'bluetooth_unavailable',
  DEVICE_NOT_FOUND: 'device_not_found',
  CONNECTION_FAILED: 'connection_failed',
  CONNECTION_LOST: 'connection_lost',
  TIMEOUT: 'timeout',
  PERMISSION_DENIED: 'permission_denied'
};

class EnhancedHardwareIntegration {
  constructor() {
    this.connectionState = CONNECTION_STATE.DISCONNECTED;
    this.device = null;
    this.retryCount = 0;
    this.healthCheckTimer = null;
    this.reconnectTimer = null;
    this.lastDataTimestamp = null;
    this.distanceData = { front: null, left: null, right: null };
    this.listeners = new Map();
    this.errorLog = [];
    this.fallbackMode = false;
    this.phoneHasLidar = false;
  }

  async initialize() {
    try {
      this.logInfo('Initializing hardware integration...');

      await this.checkDeviceCapabilities();

      if (Platform.OS === 'web') {
        this.handleError(ERROR_TYPES.BLUETOOTH_UNAVAILABLE, 'Web platform detected');
        await this.activateFallbackMode('Web platform does not support Bluetooth');
        return { success: true, fallbackMode: true };
      }

      const bluetoothAvailable = await this.checkBluetoothAvailable();

      if (!bluetoothAvailable) {
        this.logError('Bluetooth not available on device');
        await this.activateFallbackMode('Bluetooth not available');
        return { success: true, fallbackMode: true };
      }

      this.logInfo('Hardware integration initialized successfully');
      return { success: true, fallbackMode: false };

    } catch (error) {
      this.logError('Initialization failed:', error);
      await this.activateFallbackMode('Initialization failed');
      return { success: true, fallbackMode: true };
    }
  }

  async checkDeviceCapabilities() {
    try {
      const deviceType = await Device.getDeviceTypeAsync();

      if (Platform.OS === 'ios') {
        const modelName = await Device.modelName;
        this.phoneHasLidar = modelName?.includes('Pro') &&
          (modelName?.includes('12') || modelName?.includes('13') ||
           modelName?.includes('14') || modelName?.includes('15'));
      }

      this.logInfo(`Device capabilities: Type=${deviceType}, LiDAR=${this.phoneHasLidar}`);

    } catch (error) {
      this.logError('Device capability check failed:', error);
    }
  }

  async checkBluetoothAvailable() {
    try {
      return Platform.OS === 'ios' || Platform.OS === 'android';
    } catch (error) {
      return false;
    }
  }

  async scanForDevice(timeout = 10000) {
    this.connectionState = CONNECTION_STATE.CONNECTING;
    this.notifyListeners('stateChange', this.connectionState);

    try {
      this.logInfo('Starting device scan...');

      const scanPromise = this.performScan();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Scan timeout')), timeout)
      );

      const device = await Promise.race([scanPromise, timeoutPromise]);

      if (device) {
        this.logInfo('Device found:', device.name);
        return device;
      } else {
        throw new Error('No device found');
      }

    } catch (error) {
      this.handleError(ERROR_TYPES.DEVICE_NOT_FOUND, error.message);
      this.connectionState = CONNECTION_STATE.DISCONNECTED;
      this.notifyListeners('stateChange', this.connectionState);
      throw error;
    }
  }

  async performScan() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 'DRISHTIKA_001',
          name: 'Drishtika Wearable',
          rssi: -60,
          batteryLevel: 85
        });
      }, 2000);
    });
  }

  async connectToDevice(deviceId, autoRetry = true) {
    this.connectionState = CONNECTION_STATE.CONNECTING;
    this.notifyListeners('stateChange', this.connectionState);

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        this.logInfo(`Connection attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

        const connectionPromise = this.establishConnection(deviceId);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT)
        );

        await Promise.race([connectionPromise, timeoutPromise]);

        this.device = { id: deviceId, name: 'Drishtika' };
        this.connectionState = CONNECTION_STATE.CONNECTED;
        this.retryCount = 0;
        this.fallbackMode = false;

        this.startHealthCheck();
        this.startDistanceMonitoring();

        this.notifyListeners('stateChange', this.connectionState);
        this.notifyListeners('connected', this.device);

        this.logInfo('Device connected successfully');

        return {
          success: true,
          device: this.device,
          attempt
        };

      } catch (error) {
        this.logError(`Connection attempt ${attempt} failed:`, error.message);

        if (attempt === MAX_RETRY_ATTEMPTS || !autoRetry) {
          this.handleError(ERROR_TYPES.CONNECTION_FAILED, error.message);
          this.connectionState = CONNECTION_STATE.FAILED;
          this.notifyListeners('stateChange', this.connectionState);

          await this.activateFallbackMode('Connection failed after max retries');

          throw new Error(`Connection failed after ${MAX_RETRY_ATTEMPTS} attempts`);
        }

        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        this.logInfo(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  async establishConnection(deviceId) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.3) {
          resolve();
        } else {
          reject(new Error('Simulated connection failure'));
        }
      }, 1000);
    });
  }

  startHealthCheck() {
    this.healthCheckTimer = setInterval(() => {
      this.checkConnectionHealth();
    }, HEALTH_CHECK_INTERVAL);
  }

  checkConnectionHealth() {
    if (!this.isConnected) return;

    const now = Date.now();
    const timeSinceLastData = now - (this.lastDataTimestamp || now);

    if (timeSinceLastData > HEALTH_CHECK_INTERVAL * 2) {
      this.logError('Connection health check failed - no data received');
      this.handleConnectionLoss();
    }
  }

  async handleConnectionLoss() {
    this.logError('Connection lost - attempting reconnection');

    this.connectionState = CONNECTION_STATE.RECONNECTING;
    this.notifyListeners('stateChange', this.connectionState);
    this.notifyListeners('connectionLost', {});

    this.stopHealthCheck();
    this.stopDistanceMonitoring();

    this.reconnectTimer = setTimeout(async () => {
      try {
        if (this.device) {
          await this.connectToDevice(this.device.id, true);
        }
      } catch (error) {
        this.logError('Reconnection failed:', error);
        await this.activateFallbackMode('Reconnection failed');
      }
    }, RECONNECT_DELAY);
  }

  async activateFallbackMode(reason) {
    this.logInfo('Activating fallback mode:', reason);

    this.fallbackMode = true;
    this.connectionState = CONNECTION_STATE.FALLBACK;

    this.notifyListeners('stateChange', this.connectionState);
    this.notifyListeners('fallbackActivated', {
      reason,
      phoneLidar: this.phoneHasLidar,
      capabilities: {
        camera: true,
        microphone: true,
        phoneLidar: this.phoneHasLidar,
        gps: true,
        sensors: true
      }
    });

    this.startFallbackSensors();
  }

  startFallbackSensors() {
    this.logInfo('Starting fallback sensor mode');

    if (this.phoneHasLidar) {
      this.logInfo('Using phone LiDAR for distance detection');
    } else {
      this.logInfo('Using camera-based depth estimation');
    }

    this.startDistanceMonitoring();
  }

  startDistanceMonitoring() {
    this.monitoringInterval = setInterval(() => {
      if (this.fallbackMode) {
        this.simulateFallbackDistanceData();
      } else {
        this.simulateDistanceReading();
      }
      this.lastDataTimestamp = Date.now();
    }, 100);
  }

  stopDistanceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  simulateDistanceReading() {
    const mockData = {
      front: Math.random() * 3.0,
      left: Math.random() * 3.0,
      right: Math.random() * 3.0,
      timestamp: Date.now(),
      source: 'drishtika_hardware'
    };

    this.updateDistanceData(mockData);
  }

  simulateFallbackDistanceData() {
    const mockData = {
      front: Math.random() * 3.0,
      left: Math.random() * 3.0,
      right: Math.random() * 3.0,
      timestamp: Date.now(),
      source: this.phoneHasLidar ? 'phone_lidar' : 'camera_depth_estimation'
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
        direction: this.getClosestDirection(data),
        source: data.source
      });
    }
  }

  analyzeDistanceData(data) {
    const minDistance = Math.min(data.front, data.left, data.right);

    if (minDistance < 0.5) return 'CRITICAL';
    if (minDistance < 1.0) return 'DANGER';
    if (minDistance < 2.0) return 'WARNING';
    return 'SAFE';
  }

  getClosestDirection(data) {
    const distances = { front: data.front, left: data.left, right: data.right };
    return Object.keys(distances).reduce((a, b) =>
      distances[a] < distances[b] ? a : b
    );
  }

  async disconnect() {
    try {
      this.logInfo('Disconnecting from device');

      this.stopHealthCheck();
      this.stopDistanceMonitoring();

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.device = null;
      this.connectionState = CONNECTION_STATE.DISCONNECTED;
      this.retryCount = 0;

      this.notifyListeners('stateChange', this.connectionState);
      this.notifyListeners('disconnected', {});

      return { success: true };

    } catch (error) {
      this.logError('Disconnect error:', error);
      return { success: false, error: error.message };
    }
  }

  handleError(errorType, message) {
    const error = {
      type: errorType,
      message,
      timestamp: Date.now(),
      state: this.connectionState
    };

    this.errorLog.push(error);

    if (this.errorLog.length > 50) {
      this.errorLog.shift();
    }

    this.notifyListeners('error', error);
    this.logError(`[${errorType}]`, message);
  }

  onDistanceUpdate(callback) {
    this.listeners.set('distance', callback);
  }

  onObstacleDetected(callback) {
    this.listeners.set('obstacle', callback);
  }

  onStateChange(callback) {
    this.listeners.set('stateChange', callback);
  }

  onError(callback) {
    this.listeners.set('error', callback);
  }

  onFallbackActivated(callback) {
    this.listeners.set('fallbackActivated', callback);
  }

  notifyListeners(event, data) {
    const callback = this.listeners.get(event);
    if (callback) {
      try {
        callback(data);
      } catch (error) {
        this.logError('Listener error:', error);
      }
    }
  }

  getConnectionStatus() {
    return {
      state: this.connectionState,
      connected: this.connectionState === CONNECTION_STATE.CONNECTED,
      fallbackMode: this.fallbackMode,
      device: this.device,
      batteryLevel: this.device ? 85 : 0,
      signalStrength: this.device ? -60 : 0,
      lastDataAge: this.lastDataTimestamp
        ? Date.now() - this.lastDataTimestamp
        : null,
      retryCount: this.retryCount,
      errorCount: this.errorLog.length
    };
  }

  getErrorLog() {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  get isConnected() {
    return this.connectionState === CONNECTION_STATE.CONNECTED;
  }

  get isFallbackMode() {
    return this.fallbackMode;
  }

  logInfo(...args) {
    console.log('[HardwareIntegration]', ...args);
  }

  logError(...args) {
    console.error('[HardwareIntegration]', ...args);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new EnhancedHardwareIntegration();
