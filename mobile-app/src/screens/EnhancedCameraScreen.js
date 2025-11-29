import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as KeepAwake from 'expo-keep-awake';
import obstacleDetection from '../services/obstacleDetection';
import emotionDetection from '../services/emotionDetection';
import galleryManager from '../services/galleryManager';
import audioService from '../services/audioService';
import watchConnectivity from '../services/watchConnectivity';
import { CAMERA_CONFIG } from '../constants/config';

const MODES = {
  PRIORITY: 'priority',
  COMPREHENSIVE: 'comprehensive',
  EMOTION: 'emotion'
};

export default function EnhancedCameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mode, setMode] = useState(MODES.COMPREHENSIVE);
  const [lowLightMode, setLowLightMode] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [serviceHealth, setServiceHealth] = useState({
    camera: true,
    obstacleDetection: true,
    emotionDetection: true,
    gallery: true
  });

  const cameraRef = useRef(null);
  const analysisInterval = useRef(null);
  const consecutiveErrors = useRef(0);

  useEffect(() => {
    initializeServices();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      KeepAwake.activateKeepAwakeAsync();
      startContinuousAnalysis();
    } else {
      KeepAwake.deactivateKeepAwake();
      stopContinuousAnalysis();
    }
  }, [isActive, mode, lowLightMode]);

  async function initializeServices() {
    const healthStatus = {
      camera: true,
      obstacleDetection: true,
      emotionDetection: true,
      gallery: true
    };

    try {
      await galleryManager.initialize();
    } catch (error) {
      console.error('Gallery manager init error:', error);
      healthStatus.gallery = false;
      audioService.speak('Gallery auto-save unavailable');
    }

    try {
      await watchConnectivity.initialize();
    } catch (error) {
      console.error('Watch connectivity init error:', error);
    }

    try {
      obstacleDetection.setLowLightMode(lowLightMode);
      obstacleDetection.setPriorityMode(mode === MODES.PRIORITY);
    } catch (error) {
      console.error('Obstacle detection init error:', error);
      healthStatus.obstacleDetection = false;
    }

    setServiceHealth(healthStatus);

    if (healthStatus.obstacleDetection && healthStatus.emotionDetection) {
      audioService.speak('Enhanced Vision Assist ready. Tap to start.');
    } else {
      audioService.speak('Vision Assist ready with limited features.');
    }
  }

  function cleanup() {
    if (analysisInterval.current) {
      clearInterval(analysisInterval.current);
    }
    KeepAwake.deactivateKeepAwake();
  }

  function startContinuousAnalysis() {
    if (analysisInterval.current) {
      clearInterval(analysisInterval.current);
    }

    analysisInterval.current = setInterval(() => {
      performAnalysis();
    }, CAMERA_CONFIG.CAPTURE_INTERVAL);
  }

  function stopContinuousAnalysis() {
    if (analysisInterval.current) {
      clearInterval(analysisInterval.current);
      analysisInterval.current = null;
    }
  }

  async function performAnalysis() {
    if (!cameraRef.current || isAnalyzing) return;

    try {
      setIsAnalyzing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: CAMERA_CONFIG.IMAGE_QUALITY,
        base64: true,
        skipProcessing: true
      });

      if (mode === MODES.EMOTION) {
        await analyzeEmotion(photo.base64);
      } else {
        await analyzeObstacles(photo.base64);
      }

      if (autoSaveEnabled && mode === MODES.COMPREHENSIVE && serviceHealth.gallery) {
        await attemptAutoSave(photo.uri, photo.base64);
      }

      consecutiveErrors.current = 0;

    } catch (error) {
      consecutiveErrors.current++;
      console.error('Analysis error:', error);

      if (consecutiveErrors.current >= 3) {
        handleCriticalError(error);
      }

    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleCriticalError(error) {
    setIsActive(false);
    stopContinuousAnalysis();

    setServiceHealth(prev => ({
      ...prev,
      camera: false
    }));

    Alert.alert(
      'Camera Error',
      'Vision analysis is experiencing issues. Please restart the camera or check permissions.',
      [
        { text: 'Retry', onPress: retryServices },
        { text: 'Stop', style: 'cancel' }
      ]
    );

    audioService.speak('Camera error. Analysis stopped.');
  }

  async function retryServices() {
    consecutiveErrors.current = 0;
    setErrorCount(0);
    await initializeServices();
  }

  async function analyzeObstacles(imageBase64) {
    if (!serviceHealth.obstacleDetection) {
      return;
    }

    try {
      const obstacles = await obstacleDetection.detectObstacles(imageBase64, {
        lowLight: lowLightMode,
        priorityOnly: mode === MODES.PRIORITY,
        includeDistance: true
      });

      if (obstacles.length > 0) {
        await obstacleDetection.announceObstacles(obstacles);

        const criticalObstacle = obstacles.find(o => o.priority === 'critical');
        if (criticalObstacle) {
          await watchConnectivity.sendObstacleAlert(criticalObstacle);
        }
      }

    } catch (error) {
      console.error('Obstacle analysis error:', error);
      setServiceHealth(prev => ({ ...prev, obstacleDetection: false }));
      audioService.speak('Obstacle detection temporarily unavailable');

      setTimeout(() => {
        setServiceHealth(prev => ({ ...prev, obstacleDetection: true }));
      }, 10000);
    }
  }

  async function analyzeEmotion(imageBase64) {
    if (!serviceHealth.emotionDetection) {
      return;
    }

    try {
      const emotion = await emotionDetection.detectEmotion(imageBase64);

      if (emotion) {
        const emotionInfo = emotionDetection.getEmotionInfo(emotion.emotion);
        audioService.speak(`Detected ${emotionInfo.label} emotion`);

        await watchConnectivity.sendEmotionUpdate(emotion);
      }

    } catch (error) {
      console.error('Emotion analysis error:', error);
      setServiceHealth(prev => ({ ...prev, emotionDetection: false }));
      audioService.speak('Emotion detection temporarily unavailable');

      setTimeout(() => {
        setServiceHealth(prev => ({ ...prev, emotionDetection: true }));
      }, 10000);
    }
  }

  async function attemptAutoSave(imageUri, imageBase64) {
    try {
      const result = await galleryManager.autoSaveIfInteresting(imageUri, imageBase64, 7);

      if (result.saved) {
        audioService.speak('Beautiful scene saved');
      }

    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }

  function toggleActive() {
    const newState = !isActive;
    setIsActive(newState);

    if (newState) {
      audioService.speak(`${getModeLabel(mode)} mode activated`);
      watchConnectivity.sendStatusUpdate({ isActive: true });
    } else {
      audioService.speak('Vision assist stopped');
      watchConnectivity.sendStatusUpdate({ isActive: false });
    }

    audioService.hapticSuccess();
  }

  function cycleMode() {
    const modes = [MODES.COMPREHENSIVE, MODES.PRIORITY, MODES.EMOTION];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];

    setMode(nextMode);
    obstacleDetection.setPriorityMode(nextMode === MODES.PRIORITY);

    audioService.speak(getModeLabel(nextMode));
    audioService.hapticSelection();

    watchConnectivity.sendModeChange(nextMode);
  }

  function getModeLabel(currentMode) {
    switch (currentMode) {
      case MODES.PRIORITY:
        return 'Priority alerts only';
      case MODES.EMOTION:
        return 'Emotion detection';
      default:
        return 'Comprehensive mode';
    }
  }

  function toggleLowLight() {
    const newValue = !lowLightMode;
    setLowLightMode(newValue);
    obstacleDetection.setLowLightMode(newValue);

    audioService.speak(newValue ? 'Low light mode enabled' : 'Low light mode disabled');
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera access required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.modeText}>{getModeLabel(mode)}</Text>
              {lowLightMode && (
                <Text style={styles.subText}>Low-light enhanced</Text>
              )}
            </View>
            {isAnalyzing && <ActivityIndicator color="#FFFFFF" size="small" />}
          </View>

          <TouchableOpacity
            style={styles.mainArea}
            onPress={toggleActive}
            onLongPress={cycleMode}
            accessible={true}
            accessibilityLabel={isActive ? 'Stop vision assist' : 'Start vision assist'}
          >
            <View style={styles.centerContent}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: isActive ? '#00FF00' : '#FF0000' }
                ]}
              />
              <Text style={styles.statusText}>
                {isActive ? 'ACTIVE' : 'TAP TO START'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.bottomBar}>
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Low-Light</Text>
              <Switch
                value={lowLightMode}
                onValueChange={toggleLowLight}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={lowLightMode ? '#007AFF' : '#f4f3f4'}
              />
            </View>

            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Auto-Save</Text>
              <Switch
                value={autoSaveEnabled}
                onValueChange={setAutoSaveEnabled}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={autoSaveEnabled ? '#007AFF' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity
              style={styles.modeButton}
              onPress={cycleMode}
              accessible={true}
              accessibilityLabel="Change mode"
            >
              <Text style={styles.modeButtonText}>Change Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  camera: {
    flex: 1,
    width: '100%'
  },
  overlay: {
    flex: 1
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  subText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4
  },
  mainArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  centerContent: {
    alignItems: 'center'
  },
  statusIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  bottomBar: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500'
  },
  modeButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  modeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  message: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
