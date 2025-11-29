import AsyncStorage from '@react-native-async-storage/async-storage';

const CLINICAL_STORAGE_KEY = '@clinical_data';

const VISION_LEVELS = ['Blind', 'Partial Vision', 'Low Vision'];

const CONDITIONS = [
  'Glaucoma',
  'Macular Degeneration',
  'Diabetic Retinopathy',
  'Macular Edema',
  'Retinopathy of Prematurity',
  'Traumatic Injury',
  'Cataract Surgery Residual',
  'Corneal Disease',
  'Uveitis',
  'Stargardt Disease',
  'Best Disease',
  'Albinism',
  'Cone-Rod Dystrophy',
  'Congenital Cataract',
  'Congenital Glaucoma',
  'Corneal Dystrophy',
  'Lebers Hereditary Optic Neuropathy',
  'Traumatic Optic Injury',
  'Advanced Glaucoma'
];

class ClinicalDataService {
  constructor() {
    this.patients = [];
  }

  async initialize() {
    try {
      await this.loadAllPatients();
      console.log('[ClinicalData] Service initialized');
      return true;
    } catch (error) {
      console.error('[ClinicalData] Init error:', error.message);
      return false;
    }
  }

  async loadAllPatients() {
    try {
      const data = await AsyncStorage.getItem(CLINICAL_STORAGE_KEY);
      if (data) {
        this.patients = JSON.parse(data);
      }
    } catch (error) {
      console.error('[ClinicalData] Load error:', error.message);
    }
  }

  async savePatients() {
    try {
      await AsyncStorage.setItem(CLINICAL_STORAGE_KEY, JSON.stringify(this.patients));
    } catch (error) {
      console.error('[ClinicalData] Save error:', error.message);
    }
  }

  async registerPatient(patientData) {
    try {
      const patient = {
        pid: patientData.pid || `P${String(this.patients.length + 1).padStart(2, '0')}`,
        age: patientData.age,
        sex: patientData.sex,
        visionLevel: patientData.visionLevel,
        conditionType: patientData.conditionType,
        registeredDate: new Date().toISOString(),
        timestamp: Date.now()
      };

      this.patients.push(patient);
      await this.savePatients();

      return {
        success: true,
        patient
      };

    } catch (error) {
      console.error('[ClinicalData] Register error:', error.message);
      throw new Error('Failed to register patient');
    }
  }

  async recordTrialData(pid, trialData) {
    try {
      const patient = this.patients.find(p => p.pid === pid);
      if (!patient) {
        throw new Error('Patient not found');
      }

      if (!patient.trials) {
        patient.trials = [];
      }

      const trial = {
        date: new Date().toISOString(),
        baselineTimeSec: trialData.baselineTimeSec,
        baselineCollisions: trialData.baselineCollisions,
        drishtikaTimeSec: trialData.drishtikaTimeSec,
        drishtikaCollisions: trialData.drishtikaCollisions,
        comfortRating: trialData.comfortRating,
        safetyRating: trialData.safetyRating,
        aiModeAccuracy: trialData.aiModeAccuracy || null,
        snellenImprovementWeek1: trialData.snellenImprovementWeek1 || null,
        snellenImprovement2Months: trialData.snellenImprovement2Months || null,
        timestamp: Date.now()
      };

      patient.trials.push(trial);
      await this.savePatients();

      const improvement = this.calculateImprovement(trial);

      return {
        success: true,
        trial,
        improvement
      };

    } catch (error) {
      console.error('[ClinicalData] Record trial error:', error.message);
      throw new Error('Failed to record trial data');
    }
  }

  calculateImprovement(trial) {
    const timeReduction = trial.baselineTimeSec > 0
      ? ((trial.baselineTimeSec - trial.drishtikaTimeSec) / trial.baselineTimeSec) * 100
      : 0;

    const collisionReduction = trial.baselineCollisions > 0
      ? ((trial.baselineCollisions - trial.drishtikaCollisions) / trial.baselineCollisions) * 100
      : 0;

    return {
      timeReduction: Math.round(timeReduction),
      collisionReduction: Math.round(collisionReduction)
    };
  }

  getPatient(pid) {
    return this.patients.find(p => p.pid === pid);
  }

  getAllPatients() {
    return this.patients;
  }

  getStatistics() {
    if (this.patients.length === 0) {
      return {
        totalPatients: 0,
        message: 'No patient data available'
      };
    }

    const allTrials = [];
    this.patients.forEach(patient => {
      if (patient.trials) {
        allTrials.push(...patient.trials);
      }
    });

    if (allTrials.length === 0) {
      return {
        totalPatients: this.patients.length,
        totalTrials: 0,
        message: 'No trial data available'
      };
    }

    const avgTimeReduction = allTrials.reduce((sum, t) => {
      const improvement = this.calculateImprovement(t);
      return sum + improvement.timeReduction;
    }, 0) / allTrials.length;

    const avgCollisionReduction = allTrials.reduce((sum, t) => {
      const improvement = this.calculateImprovement(t);
      return sum + improvement.collisionReduction;
    }, 0) / allTrials.length;

    const avgComfort = allTrials.reduce((sum, t) => sum + t.comfortRating, 0) / allTrials.length;
    const avgSafety = allTrials.reduce((sum, t) => sum + t.safetyRating, 0) / allTrials.length;

    const trialsWithSnellen = allTrials.filter(t => t.snellenImprovementWeek1);
    const avgSnellenWeek1 = trialsWithSnellen.length > 0
      ? trialsWithSnellen.reduce((sum, t) => sum + t.snellenImprovementWeek1, 0) / trialsWithSnellen.length
      : 0;

    const avgSnellen2Months = trialsWithSnellen.length > 0
      ? trialsWithSnellen.reduce((sum, t) => sum + t.snellenImprovement2Months, 0) / trialsWithSnellen.length
      : 0;

    const conditionCounts = {};
    this.patients.forEach(p => {
      conditionCounts[p.conditionType] = (conditionCounts[p.conditionType] || 0) + 1;
    });

    return {
      totalPatients: this.patients.length,
      totalTrials: allTrials.length,
      avgTimeReduction: Math.round(avgTimeReduction),
      avgCollisionReduction: Math.round(avgCollisionReduction),
      avgComfortRating: avgComfort.toFixed(1),
      avgSafetyRating: avgSafety.toFixed(1),
      avgSnellenWeek1: avgSnellenWeek1.toFixed(1),
      avgSnellen2Months: avgSnellen2Months.toFixed(1),
      conditionDistribution: conditionCounts,
      completionRate: Math.round((this.patients.filter(p => p.trials && p.trials.length > 0).length / this.patients.length) * 100)
    };
  }

  async exportClinicalData() {
    try {
      return {
        patients: this.patients,
        statistics: this.getStatistics(),
        exportDate: new Date().toISOString(),
        totalRecords: this.patients.length
      };

    } catch (error) {
      console.error('[ClinicalData] Export error:', error.message);
      throw new Error('Failed to export clinical data');
    }
  }

  getVisionLevels() {
    return VISION_LEVELS;
  }

  getConditions() {
    return CONDITIONS;
  }
}

export default new ClinicalDataService();
