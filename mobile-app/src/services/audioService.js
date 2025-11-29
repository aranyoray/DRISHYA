import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { AUDIO_CONFIG, HAPTIC_PATTERNS } from '../constants/config';

/**
 * Audio Service
 * Handles Text-to-Speech and haptic feedback for accessibility
 */

class AudioService {
  constructor() {
    this.isSpeaking = false;
    this.speechQueue = [];
    this.settings = {
      language: AUDIO_CONFIG.DEFAULT_LANGUAGE,
      pitch: AUDIO_CONFIG.DEFAULT_PITCH,
      rate: AUDIO_CONFIG.DEFAULT_RATE,
    };
  }

  /**
   * Speak text using Text-to-Speech
   * @param {string} text - Text to speak
   * @param {object} options - Speech options (priority, language, etc.)
   */
  async speak(text, options = {}) {
    const {
      priority = 'normal', // 'high', 'normal', 'low'
      interrupt = false,
      onDone = null,
      onStart = null,
    } = options;

    // Stop current speech if interrupt flag is set
    if (interrupt) {
      await this.stop();
    }

    const speechOptions = {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: this.settings.rate,
      onStart: () => {
        this.isSpeaking = true;
        if (onStart) onStart();
      },
      onDone: () => {
        this.isSpeaking = false;
        if (onDone) onDone();
        this.processQueue();
      },
      onStopped: () => {
        this.isSpeaking = false;
      },
      onError: (error) => {
        console.error('Speech error:', error);
        this.isSpeaking = false;
      },
    };

    if (priority === 'high' || !this.isSpeaking) {
      Speech.speak(text, speechOptions);
    } else {
      // Add to queue for later
      this.speechQueue.push({ text, options: speechOptions });
    }
  }

  /**
   * Process speech queue
   */
  processQueue() {
    if (this.speechQueue.length > 0 && !this.isSpeaking) {
      const next = this.speechQueue.shift();
      Speech.speak(next.text, next.options);
    }
  }

  /**
   * Stop current speech
   */
  async stop() {
    await Speech.stop();
    this.isSpeaking = false;
    this.speechQueue = [];
  }

  /**
   * Pause current speech
   */
  async pause() {
    await Speech.pause();
  }

  /**
   * Resume paused speech
   */
  async resume() {
    await Speech.resume();
  }

  /**
   * Clear speech queue
   */
  clearQueue() {
    this.speechQueue = [];
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking() {
    return this.isSpeaking;
  }

  /**
   * Update speech settings
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Announce obstacle warning with high priority
   */
  announceObstacle(distance, direction) {
    let message = '';

    if (distance < 0.5) {
      message = `Danger! Obstacle directly ahead, very close, ${direction}`;
    } else if (distance < 1.5) {
      message = `Warning: Obstacle ahead, approximately ${distance.toFixed(1)} meters, ${direction}`;
    } else {
      message = `Obstacle detected ${direction}, ${distance.toFixed(1)} meters away`;
    }

    this.speak(message, { priority: 'high', interrupt: true });
    this.hapticWarning(distance);
  }

  /**
   * Announce scene description
   */
  announceScene(description) {
    this.speak(description, { priority: 'normal' });
  }

  /**
   * Announce navigation instruction
   */
  announceNavigation(instruction) {
    this.speak(instruction, { priority: 'high' });
  }

  /**
   * Provide haptic feedback based on distance
   */
  async hapticWarning(distance) {
    try {
      if (distance < 0.5) {
        // Danger - strong repeated vibration
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }, 200);
      } else if (distance < 1.5) {
        // Warning - medium vibration
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        // Success/info - light vibration
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Success haptic feedback
   */
  async hapticSuccess() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Selection haptic feedback (for button presses)
   */
  async hapticSelection() {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Get available voices
   */
  async getAvailableVoices() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices;
    } catch (error) {
      console.error('Error getting voices:', error);
      return [];
    }
  }
}

export default new AudioService();
