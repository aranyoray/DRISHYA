import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch
} from 'react';
import { StatusBar } from 'expo-status-bar';
import hardwareIntegration from '../services/hardwareIntegration';
import audioService from '../services/audioService';

export default function HardwareConnectionScreen() {
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState(null);
  const [distances, setDistances] = useState({ front: 0, left: 0, right: 0 });
  const [offlineMode, setOfflineMode] = useState(false);
  const [boneConductionEnabled, setBoneConductionEnabled] = useState(false);

  useEffect(() => {
    initializeService();
    audioService.speak('Hardware Connection. Pair with Drishtika device.');

    return () => {
      hardwareIntegration.disconnect();
    };
  }, []);

  async function initializeService() {
    const initialized = await hardwareIntegration.initialize();
    if (!initialized) {
      audioService.speak('Bluetooth not available on this device');
    }

    hardwareIntegration.onDistanceUpdate((data) => {
      setDistances(data);
    });

    hardwareIntegration.onObstacleDetected((obstacle) => {
      audioService.playDistanceBeep(obstacle.distance);
    });
  }

  async function handleScan() {
    try {
      setScanning(true);
      audioService.speak('Scanning for Drishtika device');

      const foundDevice = await hardwareIntegration.scanForDevice(10000);

      if (foundDevice) {
        setDevice(foundDevice);
        audioService.speak('Device found. Tap to connect.');
      } else {
        audioService.speak('No device found');
      }

    } catch (error) {
      audioService.speak('Scan failed');
    } finally {
      setScanning(false);
    }
  }

  async function handleConnect() {
    if (!device) return;

    try {
      audioService.speak('Connecting to device');

      const result = await hardwareIntegration.connectToDevice(device.id);

      if (result.success) {
        setConnected(true);
        audioService.speak('Device connected successfully');
        audioService.hapticSuccess();
      }

    } catch (error) {
      audioService.speak('Connection failed');
    }
  }

  async function handleDisconnect() {
    try {
      await hardwareIntegration.disconnect();
      setConnected(false);
      setDevice(null);
      audioService.speak('Device disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  function toggleOfflineMode() {
    const newValue = !offlineMode;
    setOfflineMode(newValue);
    hardwareIntegration.setOfflineMode(newValue);
    audioService.speak(newValue ? 'Offline mode enabled' : 'Offline mode disabled');
  }

  function toggleBoneConductionMode() {
    const newValue = !boneConductionEnabled;
    setBoneConductionEnabled(newValue);
    audioService.setBoneConductionMode(newValue);
    audioService.speak(newValue ? 'Bone conduction mode enabled' : 'Bone conduction mode disabled');
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Drishtika Hardware</Text>
          <Text style={styles.subtitle}>Connect wearable device</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Connection Status</Text>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: connected ? '#00FF00' : '#FF0000' }
              ]}
            />
            <Text style={styles.statusText}>
              {connected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>

          {device && (
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceId}>ID: {device.id}</Text>
            </View>
          )}
        </View>

        {connected && (
          <View style={styles.distanceCard}>
            <Text style={styles.cardTitle}>Real-time Distance</Text>

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

        <View style={styles.settingsCard}>
          <Text style={styles.cardTitle}>Device Settings</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Offline Mode</Text>
            <Switch
              value={offlineMode}
              onValueChange={toggleOfflineMode}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={offlineMode ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Bone Conduction Audio</Text>
            <Switch
              value={boneConductionEnabled}
              onValueChange={toggleBoneConductionMode}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={boneConductionEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {!connected ? (
            <>
              <TouchableOpacity
                style={[styles.button, scanning && styles.buttonDisabled]}
                onPress={handleScan}
                disabled={scanning}
                accessible={true}
                accessibilityLabel="Scan for Drishtika device"
              >
                {scanning ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Scan for Device</Text>
                )}
              </TouchableOpacity>

              {device && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleConnect}
                  accessible={true}
                  accessibilityLabel="Connect to device"
                >
                  <Text style={styles.buttonText}>Connect</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={handleDisconnect}
              accessible={true}
              accessibilityLabel="Disconnect from device"
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Drishtika</Text>
          <Text style={styles.infoText}>
            Drishtika is a lightweight wearable device with LiDAR/ToF sensor
            and bone conduction speaker. It clips onto glasses and provides
            real-time obstacle detection with audio feedback.
          </Text>
          <Text style={styles.infoText}>
            Features: 3m range detection, offline operation, <6000 rupees cost.
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
  deviceInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5'
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4
  },
  deviceId: {
    fontSize: 14,
    color: '#666666'
  },
  distanceCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  directionLabel: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500'
  },
  distanceValue: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold'
  },
  settingsCard: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  settingLabel: {
    fontSize: 16,
    color: '#000000'
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
    lineHeight: 22,
    marginBottom: 8
  }
});
