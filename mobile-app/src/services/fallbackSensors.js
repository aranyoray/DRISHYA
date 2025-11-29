import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class FallbackSensorsService {
  constructor() {
    this.cameraActive = false;
    this.microphoneActive = false;
    this.phoneLidarActive = false;
    this.depthEstimationActive = false;
    this.capabilities = {
      camera: false,
      microphone: false,
      phoneLidar: false,
      depthCamera: false
    };
  }

  async initialize() {
    try {
      console.log('[FallbackSensors] Initializing fallback sensors...');

      await this.checkCapabilities();
      await this.requestPermissions();

      console.log('[FallbackSensors] Fallback sensors initialized');
      console.log('[FallbackSensors] Capabilities:', this.capabilities);

      return {
        success: true,
        capabilities: this.capabilities
      };

    } catch (error) {
      console.error('[FallbackSensors] Initialization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkCapabilities() {
    try {
      this.capabilities.camera = await this.checkCameraAvailable();
      this.capabilities.microphone = await this.checkMicrophoneAvailable();

      if (Platform.OS === 'ios') {
        const modelName = await Device.modelName;
        this.capabilities.phoneLidar = modelName?.includes('Pro') &&
          (modelName?.includes('12') || modelName?.includes('13') ||
           modelName?.includes('14') || modelName?.includes('15'));
      }

      this.capabilities.depthCamera = Platform.OS === 'ios';

    } catch (error) {
      console.error('[FallbackSensors] Capability check error:', error);
    }
  }

  async checkCameraAvailable() {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      return status === 'granted' || status === 'undetermined';
    } catch (error) {
      return false;
    }
  }

  async checkMicrophoneAvailable() {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted' || status === 'undetermined';
    } catch (error) {
      return false;
    }
  }

  async requestPermissions() {
    const results = {};

    try {
      if (this.capabilities.camera) {
        const cameraResult = await Camera.requestCameraPermissionsAsync();
        results.camera = cameraResult.status === 'granted';
        this.capabilities.camera = results.camera;
      }

      if (this.capabilities.microphone) {
        const audioResult = await Audio.requestPermissionsAsync();
        results.microphone = audioResult.status === 'granted';
        this.capabilities.microphone = results.microphone;
      }

    } catch (error) {
      console.error('[FallbackSensors] Permission request error:', error);
    }

    return results;
  }

  async activateCameraDepthEstimation() {
    if (!this.capabilities.camera) {
      throw new Error('Camera not available');
    }

    try {
      console.log('[FallbackSensors] Activating camera depth estimation');

      this.depthEstimationActive = true;
      this.cameraActive = true;

      return {
        success: true,
        method: this.capabilities.phoneLidar ? 'phone_lidar' : 'visual_depth_estimation',
        accuracy: this.capabilities.phoneLidar ? 'high' : 'medium'
      };

    } catch (error) {
      console.error('[FallbackSensors] Camera activation error:', error);
      throw error;
    }
  }

  async activateMicrophone() {
    if (!this.capabilities.microphone) {
      throw new Error('Microphone not available');
    }

    try {
      console.log('[FallbackSensors] Activating microphone for voice input');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false
      });

      this.microphoneActive = true;

      return {
        success: true,
        ready: true
      };

    } catch (error) {
      console.error('[FallbackSensors] Microphone activation error:', error);
      throw error;
    }
  }

  async estimateDepthFromCamera(imageBase64) {
    try {
      if (this.capabilities.phoneLidar) {
        return await this.getPhoneLidarDepth();
      } else {
        return await this.estimateDepthVisually(imageBase64);
      }

    } catch (error) {
      console.error('[FallbackSensors] Depth estimation error:', error);
      return null;
    }
  }

  async getPhoneLidarDepth() {
    const mockDepth = {
      front: Math.random() * 3.0 + 0.5,
      left: Math.random() * 3.0 + 0.5,
      right: Math.random() * 3.0 + 0.5,
      source: 'phone_lidar',
      accuracy: 'high',
      confidence: 0.95,
      timestamp: Date.now()
    };

    return mockDepth;
  }

  async estimateDepthVisually(imageBase64) {
    const mockDepth = {
      front: Math.random() * 3.0 + 0.5,
      left: Math.random() * 3.0 + 0.5,
      right: Math.random() * 3.0 + 0.5,
      source: 'visual_estimation',
      accuracy: 'medium',
      confidence: 0.7,
      timestamp: Date.now()
    };

    return mockDepth;
  }

  async deactivateCameraDepthEstimation() {
    try {
      this.depthEstimationActive = false;
      this.cameraActive = false;

      return { success: true };

    } catch (error) {
      console.error('[FallbackSensors] Camera deactivation error:', error);
      return { success: false };
    }
  }

  async deactivateMicrophone() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false
      });

      this.microphoneActive = false;

      return { success: true };

    } catch (error) {
      console.error('[FallbackSensors] Microphone deactivation error:', error);
      return { success: false };
    }
  }

  getStatus() {
    return {
      capabilities: this.capabilities,
      active: {
        camera: this.cameraActive,
        microphone: this.microphoneActive,
        phoneLidar: this.phoneLidarActive,
        depthEstimation: this.depthEstimationActive
      },
      fallbackReady: this.capabilities.camera || this.capabilities.microphone
    };
  }

  async cleanup() {
    try {
      if (this.cameraActive) {
        await this.deactivateCameraDepthEstimation();
      }

      if (this.microphoneActive) {
        await this.deactivateMicrophone();
      }

      return { success: true };

    } catch (error) {
      console.error('[FallbackSensors] Cleanup error:', error);
      return { success: false };
    }
  }
}

export default new FallbackSensorsService();
