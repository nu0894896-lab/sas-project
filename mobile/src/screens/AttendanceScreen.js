import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Device from 'expo-device';
import * as SecureStore from '../utils/storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import client from '../api/client';

export default function AttendanceScreen({ navigation }) {
  const [courseId, setCourseId] = useState('');
  const [proximityToken, setProximityToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const response = await client.get('/courses/my-courses');
      setMyCourses(response.data);
    } catch (error) {
      console.log('Could not fetch courses');
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await client.get('/reports/my-attendance');
      setHistory(response.data);
    } catch (error) {
      console.log('Could not fetch history');
    }
  };

  const handleStartScan = async () => {
    if (!permission?.granted) {
      const newPermission = await requestPermission();
      if (!newPermission.granted) {
        showAlert('Permission Required', 'You need to grant camera access to scan QR codes.');
        return;
      }
    }
    setScanning(true);
  };

  const handleBarcodeScanned = ({ type, data }) => {
    setScanning(false);
    try {
      const parsed = JSON.parse(data);
      if (parsed.c_id && parsed.token) {
        setCourseId(parsed.c_id.toString());
        setProximityToken(parsed.token);
        // We let them press submit themselves so they can verify
      } else {
        showAlert('Invalid QR Code', 'This does not look like a valid SAS QR code.');
      }
    } catch (e) {
      showAlert('Invalid Format', 'Could not read the QR data.');
    }
  };

  const handleMarkAttendance = async () => {
    if (!courseId || !proximityToken) {
      showAlert('Error', 'Please enter Course ID and Proximity Token.');
      return;
    }

    setLoading(true);
    try {
      // 1. Get the Active Session for this Course
      const sessionRes = await client.get(`/sessions/active/${courseId}`);
      const sessionId = sessionRes.data.id;

      // 2. Perform Biometric Verification
      let biometricPassed = false;
      if (Platform.OS === 'web') {
        biometricPassed = true;
      } else {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const authResult = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verify your identity to mark attendance',
          });
          biometricPassed = authResult.success;
        } else {
          biometricPassed = true;
        }
      }

      // 3. Mark Attendance
      const deviceIdentifier = Platform.OS === 'web' ? 'web_device_id' : (Device.osBuildId || 'mocked_uuid');
      const markRes = await client.post('/attendance/mark', {
        session_id: sessionId,
        device_identifier: deviceIdentifier,
        proximity_token: proximityToken,
        biometric_passed: biometricPassed
      });

      showAlert('Success', 'Attendance Marked Successfully!');
      setCourseId('');
      setProximityToken('');
      fetchHistory(); 
      fetchMyCourses();

    } catch (error) {
      showAlert('Failed', error.response?.data?.message || 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('sas_token');
    navigation.replace('Login');
  };

  if (scanning) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>Point Camera at QR Code</Text>
          <TouchableOpacity style={styles.cancelScanButton} onPress={() => setScanning(false)}>
            <Text style={styles.buttonText}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mark Attendance</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Enter Course ID"
          value={courseId}
          onChangeText={setCourseId}
          keyboardType="numeric"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Scan or Enter Proximity Token"
          value={proximityToken}
          onChangeText={setProximityToken}
          autoCapitalize="characters"
        />

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.button, styles.scanBtn]} 
            onPress={handleStartScan}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📷 Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.submitBtn, loading && { opacity: 0.7 }]} 
            onPress={handleMarkAttendance}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Submit ➔'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.historyTitle}>My Enrolled Courses</Text>
      {myCourses.map((course, index) => (
        <View key={course.id || index} style={[styles.historyCard, course.is_active && { borderLeftColor: '#ef4444' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.historyCourse}>{course.course_name} (ID: {course.id})</Text>
            {course.is_active && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>🔴 ACTIVE NOW</Text>
              </View>
            )}
          </View>
          <Text style={styles.historyDate}>Teacher: {course.teacher_name || 'N/A'}</Text>
        </View>
      ))}
      {myCourses.length === 0 && (
        <Text style={styles.historyDate}>You are not enrolled in any courses.</Text>
      )}

      <Text style={[styles.historyTitle, { marginTop: 20 }]}>Recent History</Text>
      {history.map((record, index) => (
        <View key={index} style={styles.historyCard}>
          <Text style={styles.historyCourse}>{record.course_name}</Text>
          <Text style={styles.historyStatus(record.status)}>{record.status}</Text>
          <Text style={styles.historyDate}>{new Date(record.start_time).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  scanBtn: {
    backgroundColor: '#64748b',
  },
  submitBtn: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 10,
  },
  historyCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  historyCourse: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyStatus: (status) => ({
    color: status === 'Present' ? '#10b981' : '#ef4444',
    fontWeight: '600',
    marginTop: 5,
  }),
  historyDate: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 5,
  },
  activeBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  activeBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  scannerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  cancelScanButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  }
});
