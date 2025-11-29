import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import audioService from '../services/audioService';

const SETTINGS_KEY = '@drishya_settings';

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    speechRate: 1.0,
    speechPitch: 1.0,
    captureInterval: 2000,
    hapticFeedback: true,
    autoStart: false,
    apiKey: '',
  });

  useEffect(() => {
    loadSettings();
    audioService.speak('Settings screen. Adjust your preferences here.');
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        updateAudioSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      updateAudioSettings(newSettings);
      audioService.speak('Settings saved');
      audioService.hapticSuccess();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateAudioSettings = (newSettings) => {
    audioService.updateSettings({
      rate: newSettings.speechRate,
      pitch: newSettings.speechPitch,
    });
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const testSpeech = () => {
    audioService.speak(
      'This is a test of the text to speech system. Adjust the rate and pitch to your preference.',
      { interrupt: true }
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your DRISHYA experience</Text>
        </View>

        {/* Speech Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Speech Settings</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Speech Rate: {settings.speechRate.toFixed(2)}</Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => updateSetting('speechRate', Math.max(0.5, settings.speechRate - 0.1))}
                accessible={true}
                accessibilityLabel="Decrease speech rate"
              >
                <Text style={styles.sliderButtonText}>-</Text>
              </TouchableOpacity>

              <Text style={styles.sliderValue}>{settings.speechRate.toFixed(1)}</Text>

              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => updateSetting('speechRate', Math.min(2.0, settings.speechRate + 0.1))}
                accessible={true}
                accessibilityLabel="Increase speech rate"
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Speech Pitch: {settings.speechPitch.toFixed(2)}</Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => updateSetting('speechPitch', Math.max(0.5, settings.speechPitch - 0.1))}
                accessible={true}
                accessibilityLabel="Decrease speech pitch"
              >
                <Text style={styles.sliderButtonText}>-</Text>
              </TouchableOpacity>

              <Text style={styles.sliderValue}>{settings.speechPitch.toFixed(1)}</Text>

              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => updateSetting('speechPitch', Math.min(2.0, settings.speechPitch + 0.1))}
                accessible={true}
                accessibilityLabel="Increase speech pitch"
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testSpeech}
            accessible={true}
            accessibilityLabel="Test speech settings"
          >
            <Text style={styles.testButtonText}>🔊 Test Speech</Text>
          </TouchableOpacity>
        </View>

        {/* Camera Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Camera Settings</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              Analysis Interval: {(settings.captureInterval / 1000).toFixed(1)}s
            </Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => updateSetting('captureInterval', Math.max(1000, settings.captureInterval - 500))}
                accessible={true}
                accessibilityLabel="Decrease analysis interval"
              >
                <Text style={styles.sliderButtonText}>-</Text>
              </TouchableOpacity>

              <Text style={styles.sliderValue}>{(settings.captureInterval / 1000).toFixed(1)}s</Text>

              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => updateSetting('captureInterval', Math.min(10000, settings.captureInterval + 500))}
                accessible={true}
                accessibilityLabel="Increase analysis interval"
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Accessibility Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(value) => updateSetting('hapticFeedback', value)}
              accessible={true}
              accessibilityLabel="Toggle haptic feedback"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Auto-start Vision Assist</Text>
            <Switch
              value={settings.autoStart}
              onValueChange={(value) => updateSetting('autoStart', value)}
              accessible={true}
              accessibilityLabel="Toggle auto-start"
            />
          </View>
        </View>

        {/* API Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Configuration</Text>
          <Text style={styles.helpText}>
            Enter your OpenAI API key for vision analysis
          </Text>

          <TextInput
            style={styles.input}
            value={settings.apiKey}
            onChangeText={(value) => updateSetting('apiKey', value)}
            placeholder="sk-..."
            secureTextEntry
            accessible={true}
            accessibilityLabel="API key input"
            accessibilityHint="Enter your OpenAI API key"
          />
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About DRISHYA</Text>
          <Text style={styles.aboutText}>
            Version 1.0.0{'\n\n'}
            DRISHYA is an AI-powered vision assist application designed to help
            visually impaired users navigate their environment with real-time
            audio descriptions, obstacle detection, and navigation guidance.
            {'\n\n'}
            Features include scene description, people recognition, text reading,
            and LIDAR-based obstacle detection on supported devices.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  settingLabel: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderButton: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  sliderButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 10,
  },
  helpText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
  },
  aboutText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
  },
});
