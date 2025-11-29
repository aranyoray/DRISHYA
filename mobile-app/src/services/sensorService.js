import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { LIDAR_CONFIG } from '../constants/config';

/**
 * Sensor Service
 * Handles LIDAR (iOS), accelerometer, gyroscope, and location sensors
 */

class SensorService {
  constructor() {
    this.accelerometerSubscription = null;
    this.gyroscopeSubscription = null;
    this.magnetometerSubscription = null;
    this.locationSubscription = null;

    this.sensorData = {
      acceleration: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      heading: 0,
      location: null,
    };

    this.callbacks = {
      onAcceleration: null,
      onRotation: null,
      onHeading: null,
      onLocation: null,
      onObstacleDetected: null,
    };
  }

  /**
   * Initialize all sensors
   */
  async initialize() {
    try {
      await this.requestPermissions();
      this.startAccelerometer();
      this.startGyroscope();
      this.startMagnetometer();
      await this.startLocationTracking();

      console.log('Sensors initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing sensors:', error);
      return false;
    }
  }

  /**
   * Request necessary permissions
   */
  async requestPermissions() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }
  }

  /**
   * Start accelerometer for device motion detection
   */
  startAccelerometer() {
    Accelerometer.setUpdateInterval(100); // Update every 100ms

    this.accelerometerSubscription = Accelerometer.addListener(data => {
      this.sensorData.acceleration = data;
      if (this.callbacks.onAcceleration) {
        this.callbacks.onAcceleration(data);
      }

      // Detect if device is shaking (for emergency features)
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      if (magnitude > 2.5) { // Device is shaking
        // Could trigger emergency mode or special feature
      }
    });
  }

  /**
   * Start gyroscope for device orientation
   */
  startGyroscope() {
    Gyroscope.setUpdateInterval(100);

    this.gyroscopeSubscription = Gyroscope.addListener(data => {
      this.sensorData.rotation = data;
      if (this.callbacks.onRotation) {
        this.callbacks.onRotation(data);
      }
    });
  }

  /**
   * Start magnetometer for compass heading
   */
  startMagnetometer() {
    Magnetometer.setUpdateInterval(100);

    this.magnetometerSubscription = Magnetometer.addListener(data => {
      // Calculate heading from magnetometer data
      const heading = Math.atan2(data.y, data.x) * (180 / Math.PI);
      this.sensorData.heading = heading;

      if (this.callbacks.onHeading) {
        this.callbacks.onHeading(heading);
      }
    });
  }

  /**
   * Start location tracking
   */
  async startLocationTracking() {
    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        location => {
          this.sensorData.location = location;
          if (this.callbacks.onLocation) {
            this.callbacks.onLocation(location);
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }

  /**
   * LIDAR simulation using camera depth data (iOS)
   * Note: Actual LIDAR requires native module or react-native-vision-camera with frame processors
   * This is a placeholder for LIDAR functionality
   */
  async initializeLidar() {
    if (Platform.OS !== 'ios') {
      console.log('LIDAR only available on iOS devices with LIDAR sensor');
      return false;
    }

    // TODO: Integrate with react-native-vision-camera for actual LIDAR data
    // For now, this is a conceptual implementation
    console.log('LIDAR initialization placeholder');
    return true;
  }

  /**
   * Simulate obstacle detection using LIDAR/depth data
   * In production, this would process actual LIDAR frames
   */
  processDepthData(depthData) {
    // This would process actual depth/LIDAR data
    // For now, it's a placeholder

    const obstacles = this.analyzeDepthMap(depthData);

    if (obstacles.length > 0 && this.callbacks.onObstacleDetected) {
      this.callbacks.onObstacleDetected(obstacles);
    }

    return obstacles;
  }

  /**
   * Analyze depth map for obstacles
   */
  analyzeDepthMap(depthData) {
    // Placeholder for depth analysis
    // Would process depth map to find obstacles
    const obstacles = [];

    // Example: Detect objects within danger zone
    // In real implementation, this would parse depth buffer

    return obstacles;
  }

  /**
   * Get distance to obstacle (simulated)
   * In production, this would use actual LIDAR data
   */
  getObstacleDistance(direction = 'center') {
    // Placeholder - would use actual LIDAR/depth data
    // Returns simulated distance
    return null;
  }

  /**
   * Get current heading/direction
   */
  getCurrentHeading() {
    return this.sensorData.heading;
  }

  /**
   * Get current location
   */
  getCurrentLocation() {
    return this.sensorData.location;
  }

  /**
   * Get device orientation
   */
  getOrientation() {
    const { acceleration } = this.sensorData;

    // Calculate device tilt
    const pitch = Math.atan2(acceleration.y, Math.sqrt(acceleration.x ** 2 + acceleration.z ** 2));
    const roll = Math.atan2(acceleration.x, Math.sqrt(acceleration.y ** 2 + acceleration.z ** 2));

    return {
      pitch: pitch * (180 / Math.PI),
      roll: roll * (180 / Math.PI),
    };
  }

  /**
   * Register callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Stop all sensors
   */
  stopAll() {
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }

    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }

    if (this.magnetometerSubscription) {
      this.magnetometerSubscription.remove();
      this.magnetometerSubscription = null;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
  }
}

export default new SensorService();
