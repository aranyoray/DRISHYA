import axios from 'axios';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/config';

const EMOTIONS = {
  HAPPINESS: {
    code: 'H',
    morse: [200, 100, 200, 100, 200, 100, 200],
    label: 'happy',
    color: '#FFD700'
  },
  SADNESS: {
    code: 'SD',
    morse: [200, 100, 200, 100, 200, 300, 200, 100, 200],
    label: 'sad',
    color: '#4169E1'
  },
  FEAR: {
    code: 'F',
    morse: [200, 100, 200, 300, 200, 100, 200],
    label: 'fearful',
    color: '#9370DB'
  },
  ANGER: {
    code: 'A',
    morse: [200, 300, 200],
    label: 'angry',
    color: '#DC143C'
  },
  SURPRISE: {
    code: 'SU',
    morse: [200, 100, 200, 100, 200, 300, 200, 100, 200, 100, 200],
    label: 'surprised',
    color: '#FF8C00'
  },
  DISGUST: {
    code: 'D',
    morse: [200, 300, 200, 100, 200, 100, 200],
    label: 'disgusted',
    color: '#228B22'
  },
  NEUTRAL: {
    code: 'N',
    morse: [200, 300, 200],
    label: 'neutral',
    color: '#808080'
  }
};

const STORAGE_KEY = '@emotion_tracking';

class EmotionDetectionService {
  constructor() {
    this.emotionHistory = [];
    this.dailyStats = null;
  }

  async detectEmotion(imageBase64) {
    try {
      const prompt = 'Analyze the primary person visible in this image. Identify their dominant facial expression from these options: happiness, sadness, fear, anger, surprise, disgust, or neutral. Return ONLY a JSON object: {"emotion": "emotion_name", "confidence": 0.0-1.0, "description": "brief context"}';

      const response = await axios.post(
        API_CONFIG.OPENAI_API_URL,
        {
          model: API_CONFIG.OPENAI_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
              }
            ]
          }],
          max_tokens: 150,
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`
          },
          timeout: 10000
        }
      );

      const result = this.parseEmotionResponse(response.data.choices[0].message.content);

      if (result) {
        await this.trackEmotion(result);
        await this.vibrateMorseCode(result.emotion);
      }

      return result;

    } catch (error) {
      console.error('[EmotionDetection] Detection failed:', error.message);
      throw new Error('Emotion detection failed');
    }
  }

  parseEmotionResponse(rawResponse) {
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const data = JSON.parse(jsonMatch[0]);
      const emotionKey = data.emotion.toUpperCase();

      if (!EMOTIONS[emotionKey]) {
        return null;
      }

      return {
        emotion: emotionKey,
        confidence: data.confidence || 0.5,
        description: data.description || '',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('[EmotionDetection] Parse error:', error.message);
      return null;
    }
  }

  async vibrateMorseCode(emotionKey) {
    const emotion = EMOTIONS[emotionKey];
    if (!emotion || !emotion.morse) {
      return;
    }

    try {
      for (let i = 0; i < emotion.morse.length; i++) {
        const duration = emotion.morse[i];

        if (i % 2 === 0) {
          await new Promise(resolve => setTimeout(resolve, duration));
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await new Promise(resolve => setTimeout(resolve, duration));
        }
      }
    } catch (error) {
      console.error('[EmotionDetection] Haptic error:', error.message);
    }
  }

  async trackEmotion(emotionData) {
    this.emotionHistory.push(emotionData);

    if (this.emotionHistory.length > 1000) {
      this.emotionHistory.shift();
    }

    try {
      const existingData = await AsyncStorage.getItem(STORAGE_KEY);
      const allHistory = existingData ? JSON.parse(existingData) : [];

      allHistory.push(emotionData);

      if (allHistory.length > 5000) {
        allHistory.splice(0, allHistory.length - 5000);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
    } catch (error) {
      console.error('[EmotionDetection] Storage error:', error.message);
    }
  }

  async getDailyStats(date = new Date()) {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        return this.getEmptyStats();
      }

      const allHistory = JSON.parse(data);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).getTime();

      const todayEmotions = allHistory.filter(
        e => e.timestamp >= startOfDay && e.timestamp <= endOfDay
      );

      if (todayEmotions.length === 0) {
        return this.getEmptyStats();
      }

      const emotionCounts = {};
      Object.keys(EMOTIONS).forEach(key => {
        emotionCounts[key] = 0;
      });

      todayEmotions.forEach(e => {
        if (emotionCounts.hasOwnProperty(e.emotion)) {
          emotionCounts[e.emotion]++;
        }
      });

      const total = todayEmotions.length;
      const percentages = {};

      Object.keys(emotionCounts).forEach(key => {
        percentages[key] = Math.round((emotionCounts[key] / total) * 100);
      });

      return {
        date: date.toISOString().split('T')[0],
        total,
        counts: emotionCounts,
        percentages,
        emotions: EMOTIONS
      };

    } catch (error) {
      console.error('[EmotionDetection] Stats error:', error.message);
      return this.getEmptyStats();
    }
  }

  getEmptyStats() {
    const counts = {};
    const percentages = {};

    Object.keys(EMOTIONS).forEach(key => {
      counts[key] = 0;
      percentages[key] = 0;
    });

    return {
      date: new Date().toISOString().split('T')[0],
      total: 0,
      counts,
      percentages,
      emotions: EMOTIONS
    };
  }

  async getWeeklyTrend() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }

      const allHistory = JSON.parse(data);
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const weekData = allHistory.filter(e => e.timestamp >= weekAgo);

      const dailyGroups = {};
      weekData.forEach(e => {
        const day = new Date(e.timestamp).toISOString().split('T')[0];
        if (!dailyGroups[day]) {
          dailyGroups[day] = [];
        }
        dailyGroups[day].push(e);
      });

      return Object.entries(dailyGroups).map(([date, emotions]) => ({
        date,
        count: emotions.length,
        dominant: this.getDominantEmotion(emotions)
      }));

    } catch (error) {
      console.error('[EmotionDetection] Trend error:', error.message);
      return [];
    }
  }

  getDominantEmotion(emotions) {
    const counts = {};
    emotions.forEach(e => {
      counts[e.emotion] = (counts[e.emotion] || 0) + 1;
    });

    let maxEmotion = 'NEUTRAL';
    let maxCount = 0;

    Object.entries(counts).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxEmotion = emotion;
      }
    });

    return maxEmotion;
  }

  async clearHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.emotionHistory = [];
      return { success: true };
    } catch (error) {
      console.error('[EmotionDetection] Clear error:', error.message);
      return { success: false };
    }
  }

  getEmotionInfo(emotionKey) {
    return EMOTIONS[emotionKey] || EMOTIONS.NEUTRAL;
  }
}

export default new EmotionDetectionService();
