import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as KeepAwake from 'expo-keep-awake';
import visionAI from '../services/visionAI';
import audioService from '../services/audioService';
import sensorService from '../services/sensorService';
import { CAMERA_CONFIG } from '../constants/config';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastDescription, setLastDescription] = useState('');
  const [mode, setMode] = useState('comprehensive'); // comprehensive, obstacles, navigation, people, text

  const cameraRef = useRef(null);
  const analysisInterval = useRef(null);

  useEffect(() => {
    // Keep screen awake when camera is active
    if (isActive) {
      KeepAwake.activateKeepAwakeAsync();
    } else {
      KeepAwake.deactivateKeepAwake();
    }

    return () => {
      KeepAwake.deactivateKeepAwake();
    };
  }, [isActive]);

  useEffect(() => {
    // Initialize sensors
    sensorService.initialize();

    // Set up sensor callbacks
    sensorService.setCallbacks({
      onObstacleDetected: (obstacles) => {
        if (obstacles.length > 0) {
          const nearest = obstacles[0];
          audioService.announceObstacle(nearest.distance, nearest.direction);
        }
      },
    });

    return () => {
      sensorService.stopAll();
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    // Announce screen
    setTimeout(() => {
      audioService.speak('Vision Assist Camera. Tap the screen to start or stop real-time analysis.');
    }, 500);
  }, []);

  const handlePermissionRequest = async () => {
    const { status } = await requestPermission();
    if (status === 'granted') {
      audioService.speak('Camera permission granted');
      audioService.hapticSuccess();
    } else {
      audioService.speak('Camera permission denied. Please enable camera access in settings.');
    }
  };

  const captureAndAnalyze = async () => {
    if (!cameraRef.current || isAnalyzing) return;

    try {
      setIsAnalyzing(true);

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: CAMERA_CONFIG.IMAGE_QUALITY,
        base64: true,
        skipProcessing: true,
      });

      // Analyze based on current mode
      let description = '';

      switch (mode) {
        case 'comprehensive':
          description = await visionAI.comprehensiveAnalysis(photo.base64);
          break;
        case 'obstacles':
          description = await visionAI.detectObstacles(photo.base64);
          break;
        case 'navigation':
          description = await visionAI.getNavigationGuidance(photo.base64);
          break;
        case 'people':
          description = await visionAI.recognizePeople(photo.base64);
          break;
        case 'text':
          description = await visionAI.readText(photo.base64);
          break;
        default:
          description = await visionAI.describeScene(photo.base64);
      }

      // Update and announce
      setLastDescription(description);
      audioService.announceScene(description);

    } catch (error) {
      console.error('Analysis error:', error);
      audioService.speak('Error analyzing image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleActive = () => {
    const newState = !isActive;
    setIsActive(newState);

    if (newState) {
      audioService.speak('Vision assist started. Real-time analysis active.');
      audioService.hapticSuccess();

      // Start continuous analysis
      analysisInterval.current = setInterval(() => {
        captureAndAnalyze();
      }, CAMERA_CONFIG.CAPTURE_INTERVAL);
    } else {
      audioService.speak('Vision assist stopped.');
      audioService.hapticSuccess();

      // Stop continuous analysis
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
        analysisInterval.current = null;
      }
    }
  };

  const cycleMode = () => {
    const modes = ['comprehensive', 'obstacles', 'navigation', 'people', 'text'];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];

    setMode(nextMode);

    const modeNames = {
      comprehensive: 'Comprehensive mode',
      obstacles: 'Obstacle detection mode',
      navigation: 'Navigation mode',
      people: 'People recognition mode',
      text: 'Text reading mode',
    };

    audioService.speak(modeNames[nextMode]);
    audioService.hapticSelection();
  };

  const handleManualCapture = () => {
    audioService.speak('Analyzing scene');
    audioService.hapticSelection();
    captureAndAnalyze();
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera access is required for vision assist
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={handlePermissionRequest}
          accessible={true}
          accessibilityLabel="Grant camera permission"
          accessibilityRole="button"
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        accessibilityLabel="Camera view"
      >
        <View style={styles.overlay}>
          {/* Top bar with mode indicator */}
          <View style={styles.topBar}>
            <Text style={styles.modeText}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
            </Text>
            {isAnalyzing && (
              <ActivityIndicator color="#FFFFFF" size="small" />
            )}
          </View>

          {/* Main interaction area */}
          <TouchableOpacity
            style={styles.mainTouchArea}
            onPress={toggleActive}
            onLongPress={cycleMode}
            accessible={true}
            accessibilityLabel={isActive ? 'Stop vision assist' : 'Start vision assist'}
            accessibilityHint="Double tap to toggle. Long press to change mode."
            accessibilityRole="button"
          >
            <View style={styles.centerContent}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: isActive ? '#00FF00' : '#FF0000' }
              ]} />
              <Text style={styles.statusText}>
                {isActive ? 'ACTIVE' : 'TAP TO START'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Bottom controls */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleManualCapture}
              accessible={true}
              accessibilityLabel="Analyze scene once"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>📸 Analyze</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={cycleMode}
              accessible={true}
              accessibilityLabel="Change analysis mode"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>🔄 Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (lastDescription) {
                  audioService.speak(lastDescription, { interrupt: false });
                } else {
                  audioService.speak('No previous description available');
                }
              }}
              accessible={true}
              accessibilityLabel="Repeat last description"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>🔊 Repeat</Text>
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
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mainTouchArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  button: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
