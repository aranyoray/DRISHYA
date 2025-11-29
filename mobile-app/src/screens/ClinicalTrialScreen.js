import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Picker } from '@react-native-picker/picker';
import clinicalData from '../services/clinicalData';
import audioService from '../services/audioService';

export default function ClinicalTrialScreen() {
  const [patientId, setPatientId] = useState('');
  const [stats, setStats] = useState(null);
  const [newTrial, setNewTrial] = useState({
    baselineTimeSec: '',
    baselineCollisions: '',
    drishtikaTimeSec: '',
    drishtikaCollisions: '',
    comfortRating: 3,
    safetyRating: 3
  });

  useEffect(() => {
    initializeService();
    audioService.speak('Clinical Trial Data. Record patient outcomes.');
  }, []);

  async function initializeService() {
    await clinicalData.initialize();
    loadStatistics();
  }

  async function loadStatistics() {
    const statistics = clinicalData.getStatistics();
    setStats(statistics);
  }

  async function handleRecordTrial() {
    if (!patientId) {
      Alert.alert('Error', 'Please enter patient ID');
      return;
    }

    const trial = {
      baselineTimeSec: parseFloat(newTrial.baselineTimeSec) || 0,
      baselineCollisions: parseInt(newTrial.baselineCollisions) || 0,
      drishtikaTimeSec: parseFloat(newTrial.drishtikaTimeSec) || 0,
      drishtikaCollisions: parseInt(newTrial.drishtikaCollisions) || 0,
      comfortRating: newTrial.comfortRating,
      safetyRating: newTrial.safetyRating
    };

    try {
      const result = await clinicalData.recordTrialData(patientId, trial);

      if (result.success) {
        audioService.speak('Trial data recorded successfully');
        audioService.hapticSuccess();

        setNewTrial({
          baselineTimeSec: '',
          baselineCollisions: '',
          drishtikaTimeSec: '',
          drishtikaCollisions: '',
          comfortRating: 3,
          safetyRating: 3
        });

        loadStatistics();
      }

    } catch (error) {
      Alert.alert('Error', error.message);
      audioService.speak('Failed to record trial data');
    }
  }

  async function handleExportData() {
    try {
      const exportedData = await clinicalData.exportClinicalData();
      audioService.speak('Data exported successfully');

      console.log('Exported Data:', exportedData);
      Alert.alert('Success', `Exported ${exportedData.totalRecords} patient records`);

    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Clinical Trials</Text>
          <Text style={styles.subtitle}>Record and analyze trial data</Text>
        </View>

        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Study Statistics</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Patients:</Text>
              <Text style={styles.statValue}>{stats.totalPatients}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Trials:</Text>
              <Text style={styles.statValue}>{stats.totalTrials}</Text>
            </View>

            {stats.totalTrials > 0 && (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Avg Time Reduction:</Text>
                  <Text style={styles.statValue}>{stats.avgTimeReduction}%</Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Avg Collision Reduction:</Text>
                  <Text style={styles.statValue}>{stats.avgCollisionReduction}%</Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Avg Comfort Rating:</Text>
                  <Text style={styles.statValue}>{stats.avgComfortRating}/5</Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Completion Rate:</Text>
                  <Text style={styles.statValue}>{stats.completionRate}%</Text>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Record New Trial</Text>

          <Text style={styles.inputLabel}>Patient ID</Text>
          <TextInput
            style={styles.input}
            value={patientId}
            onChangeText={setPatientId}
            placeholder="P01"
            accessible={true}
            accessibilityLabel="Patient ID input"
          />

          <Text style={styles.sectionTitle}>Baseline (Without Device)</Text>

          <Text style={styles.inputLabel}>Time (seconds)</Text>
          <TextInput
            style={styles.input}
            value={newTrial.baselineTimeSec}
            onChangeText={(text) => setNewTrial({...newTrial, baselineTimeSec: text})}
            placeholder="120"
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Collision Count</Text>
          <TextInput
            style={styles.input}
            value={newTrial.baselineCollisions}
            onChangeText={(text) => setNewTrial({...newTrial, baselineCollisions: text})}
            placeholder="5"
            keyboardType="numeric"
          />

          <Text style={styles.sectionTitle}>With Drishtika Device</Text>

          <Text style={styles.inputLabel}>Time (seconds)</Text>
          <TextInput
            style={styles.input}
            value={newTrial.drishtikaTimeSec}
            onChangeText={(text) => setNewTrial({...newTrial, drishtikaTimeSec: text})}
            placeholder="70"
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Collision Count</Text>
          <TextInput
            style={styles.input}
            value={newTrial.drishtikaCollisions}
            onChangeText={(text) => setNewTrial({...newTrial, drishtikaCollisions: text})}
            placeholder="2"
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Comfort Rating (1-5)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newTrial.comfortRating}
              onValueChange={(value) => setNewTrial({...newTrial, comfortRating: value})}
            >
              <Picker.Item label="1 - Very Uncomfortable" value={1} />
              <Picker.Item label="2 - Uncomfortable" value={2} />
              <Picker.Item label="3 - Neutral" value={3} />
              <Picker.Item label="4 - Comfortable" value={4} />
              <Picker.Item label="5 - Very Comfortable" value={5} />
            </Picker>
          </View>

          <Text style={styles.inputLabel}>Safety Rating (1-5)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newTrial.safetyRating}
              onValueChange={(value) => setNewTrial({...newTrial, safetyRating: value})}
            >
              <Picker.Item label="1 - Very Unsafe" value={1} />
              <Picker.Item label="2 - Unsafe" value={2} />
              <Picker.Item label="3 - Neutral" value={3} />
              <Picker.Item label="4 - Safe" value={4} />
              <Picker.Item label="5 - Very Safe" value={5} />
            </Picker>
          </View>

          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleRecordTrial}
            accessible={true}
            accessibilityLabel="Record trial data"
          >
            <Text style={styles.recordButtonText}>Record Trial Data</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportData}
          accessible={true}
          accessibilityLabel="Export all data"
        >
          <Text style={styles.exportButtonText}>Export All Data</Text>
        </TouchableOpacity>
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
  statsCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  statLabel: {
    fontSize: 15,
    color: '#000000'
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32'
  },
  inputCard: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    overflow: 'hidden'
  },
  recordButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
