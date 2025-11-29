import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import enhancedHardware from '../services/enhancedHardwareIntegration';
import fallbackSensors from '../services/fallbackSensors';
import audioService from '../services/audioService';

const CONNECTION_STATES = {
  disconnected: { label: 'Disconnected', color: '#999999' },
  connecting: { label: 'Connecting...', color: '#FF9800' },
  connected: { label: 'Connected', color: '#4CAF50' },
  reconnecting: { label: 'Reconnecting...', color: '#FF9800' },
  failed: { label: 'Connection Failed', color: '#F44336' },
  fallback_mode: { label: 'Fallback Mode Active', color: '#2196F3' }
};

export default function EnhancedHardwareScreen() {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [device, setDevice] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [distances, setDistances] = useState({ front: 0, left: 0, right: 0 });
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackCapabilities, setFallbackCapabilities] = useState(null);
  const [errorLog, setErrorLog] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    initializeServices();

    return () => {
      enhancedHardware.disconnect();
      fallbackSensors.cleanup();
    };
  }, []);

  async function initializeServices() {
    try {
      const hwResult = await enhancedHardware.initialize();

      enhancedHardware.onStateChange((state) => {
        setConnectionState(state);
        updateStatus();
      });

      enhancedHardware.onDistanceUpdate((data) => {
        setDistances(data);
      });

      enhancedHardware.onError((error) => {
        handleError(error);
      });

      enhancedHardware.onFallbackActivated(async (data) => {
        await handleFallbackActivation(data);
      });

      if (hwResult.fallbackMode) {
        audioService.speak('Hardware unavailable. Fallback mode activated using phone sensors.');
      } else {
        audioService.speak('Hardware connection ready. Tap to scan for Drishtika device.');
      }

    } catch (error) {
      console.error('Initialization error:', error);
      audioService.speak('Initialization failed. Using fallback mode.');
    }
  }

  async function handleFallbackActivation(data) {
    setFallbackMode(true);
    setFallbackCapabilities(data.capabilities);

    audioService.speak(
      `Fallback mode activated. Using phone ${data.phoneLidar ? 'LiDAR' : 'camera'}, microphone, and sensors.`
    );

    try {
      await fallbackSensors.initialize();

      if (data.capabilities.camera) {
        await fallbackSensors.activateCameraDepthEstimation();
      }

      if (data.capabilities.microphone) {
        await fallbackSensors.activateMicrophone();
      }

    } catch (error) {
      console.error('Fallback activation error:', error);
    }
  }

  function handleError(error) {
    setErrorLog(prev => [...prev.slice(-4), error]);

    const errorMessages = {
      bluetooth_unavailable: 'Bluetooth not available on this device',
      device_not_found: 'Drishtika device not found',
      connection_failed: 'Failed to connect to device',
      connection_lost: 'Connection to device lost',
      timeout: 'Connection timeout',
      permission_denied: 'Permission denied'
    };

    const message = errorMessages[error.type] || error.message;
    audioService.speak(message);
  }

  function updateStatus() {
    const status = enhancedHardware.getConnectionStatus();
    setConnectionStatus(status);
    setRetryAttempt(status.retryCount);
  }

  async function handleScan() {
    try {
      setScanning(true);
      audioService.speak('Scanning for Drishtika device');

      const foundDevice = await enhancedHardware.scanForDevice(15000);

      setDevice(foundDevice);
      audioService.speak(`Device found: ${foundDevice.name}. Tap to connect.`);

    } catch (error) {
      audioService.speak('No device found. Try again or use fallback mode.');

      Alert.alert(
        'Device Not Found',
        'Drishtika device not detected. Would you like to use fallback mode with phone sensors?',
        [
          { text: 'Retry Scan', onPress: handleScan },
          { text: 'Use Fallback Mode', onPress: activateFallbackManually }
        ]
      );

    } finally {
      setScanning(false);
    }
  }

  async function handleConnect() {
    if (!device) return;

    try {
      audioService.speak('Connecting to device');

      const result = await enhancedHardware.connectToDevice(device.id, true);

      if (result.success) {
        audioService.speak(`Connected successfully after ${result.attempt} attempt${result.attempt > 1 ? 's' : ''}`);
        audioService.hapticSuccess();
      }

    } catch (error) {
      Alert.alert(
        'Connection Failed',
        `Failed to connect after multiple attempts. ${error.message}`,
        [
          { text: 'Retry', onPress: handleConnect },
          { text: 'Use Fallback Mode', onPress: activateFallbackManually }
        ]
      );
    }
  }

  async function activateFallbackManually() {
    await enhancedHardware.activateFallbackMode('User requested fallback mode');
  }

  async function handleDisconnect() {
    try {
      await enhancedHardware.disconnect();
      setDevice(null);
      setFallbackMode(false);
      audioService.speak('Disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  function renderConnectionState() {
    const state = CONNECTION_STATES[connectionState] || CONNECTION_STATES.disconnected;

    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Connection Status</Text>

        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: state.color }]} />
          <Text style={styles.statusText}>{state.label}</Text>
        </View>

        {retryAttempt > 0 && (
          <Text style={styles.retryText}>Retry attempt: {retryAttempt}/3</Text>
        )}

        {connectionStatus && connectionStatus.lastDataAge && (
          <Text style={styles.dataAgeText}>
            Last data: {Math.round(connectionStatus.lastDataAge / 1000)}s ago
          </Text>
        )}
      </View>
    );
  }

  function renderFallbackInfo() {
    if (!fallbackMode) return null;

    return (
      <View style={styles.fallbackCard}>
        <Text style={styles.cardTitle}>Fallback Mode Active</Text>
        <Text style={styles.fallbackText}>
          Using phone sensors instead of Drishtika hardware
        </Text>

        {fallbackCapabilities && (
          <View style={styles.capabilitiesContainer}>
            <Text style={styles.capabilityLabel}>Available:</Text>
            {fallbackCapabilities.camera && (
              <Text style={styles.capability}>Camera Depth Estimation</Text>
            )}
            {fallbackCapabilities.phoneLidar && (
              <Text style={styles.capability}>Phone LiDAR (High Accuracy)</Text>
            )}
            {fallbackCapabilities.microphone && (
              <Text style={styles.capability}>Microphone for Voice</Text>
            )}
            {fallbackCapabilities.gps && (
              <Text style={styles.capability}>GPS Navigation</Text>
            )}
          </View>
        )}
      </View>
    );
  }

  function renderErrorLog() {
    if (errorLog.length === 0) return null;

    return (
      <View style={styles.errorCard}>
        <Text style={styles.cardTitle}>Recent Errors</Text>
        {errorLog.map((error, index) => (
          <View key={index} style={styles.errorItem}>
            <Text style={styles.errorType}>{error.type}</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
            <Text style={styles.errorTime}>
              {new Date(error.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Hardware Connection</Text>
          <Text style={styles.subtitle}>Drishtika Wearable Device</Text>
        </View>

        {renderConnectionState()}
        {renderFallbackInfo()}

        {(connectionState === 'connected' || fallbackMode) && (
          <View style={styles.distanceCard}>
            <Text style={styles.cardTitle}>
              Distance Sensors {distances.source ? `(${distances.source})` : ''}
            </Text>

            <View style={styles.distanceRow}>
              <Text style={styles.directionLabel}>Front:</Text>
              <Text style={styles.distanceValue}>
                {distances.front ? `${distances.front.toFixed(2)}m` : 'N/A'}
              </Text>
            </View>

            <View style={styles.distanceRow}>
              <Text style={styles.directionLabel}>Left:</Text>
              <Text style={styles.distanceValue}>
                {distances.left ? `${distances.left.toFixed(2)}m` : 'N/A'}
              </Text>
            </View>

            <View style={styles.distanceRow}>
              <Text style={styles.directionLabel}>Right:</Text>
              <Text style={styles.distanceValue}>
                {distances.right ? `${distances.right.toFixed(2)}m` : 'N/A'}
              </Text>
            </View>
          </View>
        )}

        {renderErrorLog()}

        <View style={styles.buttonContainer}>
          {connectionState === 'disconnected' && !fallbackMode && (
            <>
              <TouchableOpacity
                style={[styles.button, scanning && styles.buttonDisabled]}
                onPress={handleScan}
                disabled={scanning}
              >
                {scanning ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Scan for Device</Text>
                )}
              </TouchableOpacity>

              {device && (
                <TouchableOpacity style={styles.button} onPress={handleConnect}>
                  <Text style={styles.buttonText}>Connect to {device.name}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.fallbackButton]}
                onPress={activateFallbackManually}
              >
                <Text style={styles.buttonText}>Use Fallback Mode</Text>
              </TouchableOpacity>
            </>
          )}

          {(connectionState === 'connected' || fallbackMode) && (
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={handleDisconnect}
            >
              <Text style={styles.buttonText}>
                {fallbackMode ? 'Exit Fallback Mode' : 'Disconnect'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Connection Features</Text>
          <Text style={styles.infoText}>
            Automatic retry: 3 attempts with exponential backoff
          </Text>
          <Text style={styles.infoText}>
            Health monitoring: 5-second heartbeat check
          </Text>
          <Text style={styles.infoText}>
            Auto-reconnect: On connection loss
          </Text>
          <Text style={styles.infoText}>
            Fallback mode: Automatic on persistent failure
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40
  },
  header: {
    marginBottom: 30
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666666'
  },
  statusCard: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12
  },
  statusText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500'
  },
  retryText: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 8
  },
  dataAgeText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4
  },
  fallbackCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12
  },
  fallbackText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 12
  },
  capabilitiesContainer: {
    marginTop: 8
  },
  capabilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8
  },
  capability: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 16,
    marginBottom: 4
  },
  distanceCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  directionLabel: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500'
  },
  distanceValue: {
    fontSize: 18,
    color: '#2E7D32',
    fontWeight: 'bold'
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  errorItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2'
  },
  errorType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C62828',
    marginBottom: 4
  },
  errorMessage: {
    fontSize: 13,
    color: '#E53935',
    marginBottom: 4
  },
  errorTime: {
    fontSize: 12,
    color: '#999999'
  },
  buttonContainer: {
    marginBottom: 20
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  disconnectButton: {
    backgroundColor: '#FF3B30'
  },
  fallbackButton: {
    backgroundColor: '#2196F3'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  infoCard: {
    backgroundColor: '#FFF9E6',
    padding: 20,
    borderRadius: 12
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6
  }
});
