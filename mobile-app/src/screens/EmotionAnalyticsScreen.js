import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import emotionDetection from '../services/emotionDetection';
import audioService from '../services/audioService';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function EmotionAnalyticsScreen() {
  const [dailyStats, setDailyStats] = useState(null);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    audioService.speak('Emotion Analytics screen. View your daily emotional insights.');
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const stats = await emotionDetection.getDailyStats();
      const trend = await emotionDetection.getWeeklyTrend();

      setDailyStats(stats);
      setWeeklyTrend(trend);
    } catch (error) {
      console.error('Analytics load error:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderPieChart() {
    if (!dailyStats || dailyStats.total === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No emotion data for today</Text>
        </View>
      );
    }

    const emotionOrder = ['HAPPINESS', 'SADNESS', 'FEAR', 'ANGER', 'SURPRISE', 'DISGUST', 'NEUTRAL'];
    const chartData = emotionOrder
      .map(key => ({
        emotion: key,
        percentage: dailyStats.percentages[key],
        count: dailyStats.counts[key],
        color: dailyStats.emotions[key].color,
        label: dailyStats.emotions[key].label
      }))
      .filter(item => item.count > 0);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.totalCount}>Total Moments: {dailyStats.total}</Text>

        {chartData.map((item, index) => (
          <View key={index} style={styles.emotionRow}>
            <View style={[styles.colorBox, { backgroundColor: item.color }]} />
            <View style={styles.emotionInfo}>
              <Text style={styles.emotionLabel}>{item.label}</Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: item.color
                    }
                  ]}
                />
              </View>
            </View>
            <Text style={styles.percentage}>{item.percentage}%</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderSummary() {
    if (!dailyStats || dailyStats.total === 0) {
      return null;
    }

    const emotions = Object.keys(dailyStats.percentages);
    const maxEmotion = emotions.reduce((max, emotion) =>
      dailyStats.percentages[emotion] > dailyStats.percentages[max] ? emotion : max
    );

    const emotionInfo = dailyStats.emotions[maxEmotion];

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Summary</Text>
        <Text style={styles.summaryText}>
          You experienced {dailyStats.total} emotional moments today.
        </Text>
        <Text style={styles.summaryText}>
          Your dominant emotion was {emotionInfo.label} at {dailyStats.percentages[maxEmotion]}%.
        </Text>
      </View>
    );
  }

  function renderWeeklyTrend() {
    if (weeklyTrend.length === 0) {
      return null;
    }

    return (
      <View style={styles.trendContainer}>
        <Text style={styles.sectionTitle}>Weekly Trend</Text>
        {weeklyTrend.map((day, index) => {
          const emotionInfo = emotionDetection.getEmotionInfo(day.dominant);
          return (
            <View key={index} style={styles.trendRow}>
              <Text style={styles.trendDate}>{day.date}</Text>
              <View style={styles.trendBar}>
                <View
                  style={[
                    styles.trendIndicator,
                    { backgroundColor: emotionInfo.color }
                  ]}
                />
                <Text style={styles.trendLabel}>{emotionInfo.label}</Text>
              </View>
              <Text style={styles.trendCount}>{day.count}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  async function handleClearData() {
    audioService.speak('Clearing emotion history');
    await emotionDetection.clearHistory();
    await loadAnalytics();
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Emotion Analytics</Text>
          <Text style={styles.subtitle}>Track your emotional journey</Text>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading analytics...</Text>
        ) : (
          <>
            {renderSummary()}
            {renderPieChart()}
            {renderWeeklyTrend()}

            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearData}
              accessible={true}
              accessibilityLabel="Clear emotion history"
            >
              <Text style={styles.clearButtonText}>Clear History</Text>
            </TouchableOpacity>
          </>
        )}
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
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 40
  },
  summaryCard: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12
  },
  summaryText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
    lineHeight: 24
  },
  chartContainer: {
    marginBottom: 30
  },
  totalCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 20
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12
  },
  emotionInfo: {
    flex: 1
  },
  emotionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4
  },
  barContainer: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden'
  },
  bar: {
    height: '100%',
    borderRadius: 4
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 12,
    minWidth: 40,
    textAlign: 'right'
  },
  emptyChart: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#999999'
  },
  trendContainer: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 20
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  trendDate: {
    fontSize: 14,
    color: '#666666',
    width: 100
  },
  trendBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  trendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  trendLabel: {
    fontSize: 14,
    color: '#333333'
  },
  trendCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    minWidth: 30,
    textAlign: 'right'
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
