import AsyncStorage from '@react-native-async-storage/async-storage';

const THERAPY_STORAGE_KEY = '@vision_therapy';
const SESSION_STORAGE_KEY = '@therapy_sessions';

const SNELLEN_CHART = [
  '20/200',
  '20/100',
  '20/70',
  '20/50',
  '20/40',
  '20/30',
  '20/25',
  '20/20',
  '20/15',
  '20/10'
];

class VisionTherapyService {
  constructor() {
    this.currentPatient = null;
    this.baselineData = null;
    this.sessions = [];
  }

  async initialize(patientId) {
    try {
      await this.loadPatientData(patientId);
      await this.loadSessions(patientId);

      console.log('[VisionTherapy] Service initialized for patient:', patientId);
      return true;
    } catch (error) {
      console.error('[VisionTherapy] Init error:', error.message);
      return false;
    }
  }

  async loadPatientData(patientId) {
    try {
      const key = `${THERAPY_STORAGE_KEY}_${patientId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        this.currentPatient = JSON.parse(data);
      } else {
        this.currentPatient = {
          id: patientId,
          createdAt: Date.now()
        };
      }

    } catch (error) {
      console.error('[VisionTherapy] Load patient error:', error.message);
    }
  }

  async loadSessions(patientId) {
    try {
      const key = `${SESSION_STORAGE_KEY}_${patientId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        this.sessions = JSON.parse(data);
      }

    } catch (error) {
      console.error('[VisionTherapy] Load sessions error:', error.message);
    }
  }

  async savePatientData() {
    try {
      if (!this.currentPatient) return;

      const key = `${THERAPY_STORAGE_KEY}_${this.currentPatient.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(this.currentPatient));

    } catch (error) {
      console.error('[VisionTherapy] Save patient error:', error.message);
    }
  }

  async saveSessions() {
    try {
      if (!this.currentPatient) return;

      const key = `${SESSION_STORAGE_KEY}_${this.currentPatient.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(this.sessions));

    } catch (error) {
      console.error('[VisionTherapy] Save sessions error:', error.message);
    }
  }

  async recordBaseline(data) {
    try {
      this.baselineData = {
        snellenAcuity: data.snellenAcuity,
        contrastSensitivity: data.contrastSensitivity,
        visualField: data.visualField,
        navigationTime: data.navigationTime,
        collisionCount: data.collisionCount,
        timestamp: Date.now()
      };

      if (this.currentPatient) {
        this.currentPatient.baseline = this.baselineData;
        await this.savePatientData();
      }

      return {
        success: true,
        baseline: this.baselineData
      };

    } catch (error) {
      console.error('[VisionTherapy] Record baseline error:', error.message);
      throw new Error('Failed to record baseline');
    }
  }

  async recordSession(sessionData) {
    try {
      const session = {
        id: `session_${Date.now()}`,
        date: new Date().toISOString(),
        snellenAcuity: sessionData.snellenAcuity,
        navigationTime: sessionData.navigationTime,
        collisionCount: sessionData.collisionCount,
        comfortRating: sessionData.comfortRating,
        safetyRating: sessionData.safetyRating,
        deviceUsed: sessionData.deviceUsed || false,
        notes: sessionData.notes || '',
        timestamp: Date.now()
      };

      this.sessions.push(session);
      await this.saveSessions();

      const improvement = this.calculateImprovement(session);

      return {
        success: true,
        session,
        improvement
      };

    } catch (error) {
      console.error('[VisionTherapy] Record session error:', error.message);
      throw new Error('Failed to record session');
    }
  }

  calculateImprovement(session) {
    if (!this.baselineData) {
      return null;
    }

    const snellenImprovement = this.calculateSnellenImprovement(
      this.baselineData.snellenAcuity,
      session.snellenAcuity
    );

    const timeImprovement = this.baselineData.navigationTime > 0
      ? ((this.baselineData.navigationTime - session.navigationTime) / this.baselineData.navigationTime) * 100
      : 0;

    const collisionReduction = this.baselineData.collisionCount > 0
      ? ((this.baselineData.collisionCount - session.collisionCount) / this.baselineData.collisionCount) * 100
      : 0;

    return {
      snellenLines: snellenImprovement,
      timeReduction: Math.round(timeImprovement),
      collisionReduction: Math.round(collisionReduction)
    };
  }

  calculateSnellenImprovement(baseline, current) {
    const baselineIndex = SNELLEN_CHART.indexOf(baseline);
    const currentIndex = SNELLEN_CHART.indexOf(current);

    if (baselineIndex === -1 || currentIndex === -1) {
      return 0;
    }

    return currentIndex - baselineIndex;
  }

  getProgressReport() {
    if (this.sessions.length === 0) {
      return {
        totalSessions: 0,
        message: 'No therapy sessions recorded yet'
      };
    }

    const latestSession = this.sessions[this.sessions.length - 1];
    const improvement = this.calculateImprovement(latestSession);

    const weekOneSessions = this.sessions.filter(s => {
      const sessionDate = new Date(s.timestamp);
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return s.timestamp >= weekAgo;
    });

    const avgWeekOneImprovement = weekOneSessions.length > 0
      ? weekOneSessions.reduce((sum, s) => {
          const imp = this.calculateImprovement(s);
          return sum + (imp ? imp.snellenLines : 0);
        }, 0) / weekOneSessions.length
      : 0;

    const twoMonthsSessions = this.sessions.filter(s => {
      const twoMonthsAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);
      return s.timestamp >= twoMonthsAgo;
    });

    const avgTwoMonthsImprovement = twoMonthsSessions.length > 0
      ? twoMonthsSessions.reduce((sum, s) => {
          const imp = this.calculateImprovement(s);
          return sum + (imp ? imp.snellenLines : 0);
        }, 0) / twoMonthsSessions.length
      : 0;

    const engagementRate = (this.sessions.length / Math.max(1, this.getDaysSinceStart())) * 100;

    return {
      totalSessions: this.sessions.length,
      currentSnellen: latestSession.snellenAcuity,
      snellenImprovementWeek1: avgWeekOneImprovement.toFixed(1),
      snellenImprovement2Months: avgTwoMonthsImprovement.toFixed(1),
      timeReduction: improvement ? improvement.timeReduction : 0,
      collisionReduction: improvement ? improvement.collisionReduction : 0,
      engagementRate: Math.min(100, Math.round(engagementRate)),
      daysSinceStart: this.getDaysSinceStart()
    };
  }

  getDaysSinceStart() {
    if (!this.currentPatient || !this.currentPatient.createdAt) {
      return 0;
    }

    const daysSince = (Date.now() - this.currentPatient.createdAt) / (24 * 60 * 60 * 1000);
    return Math.floor(daysSince);
  }

  getAllSessions() {
    return this.sessions;
  }

  async exportData() {
    try {
      return {
        patient: this.currentPatient,
        baseline: this.baselineData,
        sessions: this.sessions,
        progress: this.getProgressReport(),
        exportDate: new Date().toISOString()
      };

    } catch (error) {
      console.error('[VisionTherapy] Export error:', error.message);
      throw new Error('Failed to export data');
    }
  }
}

export default new VisionTherapyService();
