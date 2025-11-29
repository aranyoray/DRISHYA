import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import audioService from '../services/audioService';

export default function HomeScreen({ navigation }) {
  useEffect(() => {
    // Announce screen when it loads
    setTimeout(() => {
      audioService.speak('Welcome to DRISHYA Vision Assist. Tap anywhere to hear instructions.');
    }, 500);
  }, []);

  const handleScreenTap = () => {
    const instructions = `
      DRISHYA is your vision assistant.
      This app has three main sections:
      Home: Where you are now. Get help and instructions.
      Vision Assist: The main camera feature for real-time environment description.
      Settings: Customize your experience.

      To start using vision assist, navigate to the Vision Assist tab.
    `;
    audioService.speak(instructions);
  };

  const navigateToCamera = () => {
    audioService.speak('Opening Vision Assist');
    audioService.hapticSelection();
    navigation.navigate('Vision');
  };

  const features = [
    {
      title: 'Real-time Scene Description',
      description: 'Get instant audio descriptions of your surroundings',
      icon: '👁️',
    },
    {
      title: 'Obstacle Detection',
      description: 'Alerts for obstacles and hazards in your path',
      icon: '⚠️',
    },
    {
      title: 'People Recognition',
      description: 'Identify people, their expressions, and actions',
      icon: '👥',
    },
    {
      title: 'Text Reading',
      description: 'Read signs, labels, and any visible text',
      icon: '📖',
    },
    {
      title: 'Navigation Assist',
      description: 'Get guidance for walking and navigation',
      icon: '🧭',
    },
  ];

  return (
    <View style={styles.container} accessibilityLabel="Home Screen">
      <StatusBar style="dark" />

      <TouchableOpacity
        style={styles.fullScreenTap}
        onPress={handleScreenTap}
        accessible={true}
        accessibilityLabel="Tap anywhere for instructions"
        accessibilityHint="Double tap to hear how to use this app"
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>DRISHYA</Text>
            <Text style={styles.subtitle}>Vision Assist AI</Text>
            <Text style={styles.tagline}>
              Your AI companion for navigating the world
            </Text>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Features</Text>
            {features.map((feature, index) => (
              <View
                key={index}
                style={styles.featureCard}
                accessible={true}
                accessibilityLabel={`${feature.title}: ${feature.description}`}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={navigateToCamera}
            accessible={true}
            accessibilityLabel="Start Vision Assist"
            accessibilityHint="Double tap to open the camera and start using vision assist"
            accessibilityRole="button"
          >
            <Text style={styles.startButtonText}>Start Vision Assist</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Designed for accessibility with VoiceOver and TalkBack support
            </Text>
          </View>
        </ScrollView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullScreenTap: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#007AFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000000',
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
  },
  startButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});
