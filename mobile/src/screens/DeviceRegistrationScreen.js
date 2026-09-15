import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as SecureStore from '../utils/storage';
import client from '../api/client';

export default function DeviceRegistrationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    checkRegistration();
  }, []);

  const checkRegistration = async () => {
    try {
      // Check if already registered
      await client.get('/devices/my-device');
      // If we don't catch an error, it means a device is registered. Go straight to attendance.
      navigation.replace('Attendance');
    } catch (error) {
      if (error.response?.status === 404) {
        // No device found, setup device info for registration
        const deviceIdentifier = Platform.OS === 'web' ? 'web_device_id' : (Device.osBuildId || `mocked_uuid_${Math.random()}`);
        const deviceModel = Platform.OS === 'web' ? 'Web Browser' : (Device.modelName || 'Unknown Device');

        setDeviceInfo({
          identifier: deviceIdentifier,
          model: deviceModel
        });
      } else {
        Alert.alert('Error', 'Could not verify device status');
      }
    } finally {
      setLoading(false);
    }
  };

  const registerDevice = async () => {
    setLoading(true);
    try {
      await client.post('/devices/register', {
        device_identifier: deviceInfo.identifier,
        device_model: deviceInfo.model
      });
      Alert.alert('Success', 'Device registered securely!');
      navigation.replace('Attendance');
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Verification</Text>
      <Text style={styles.text}>
        This is your first time logging in. For security purposes, this device will be permanently linked to your student account.
      </Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Device Model:</Text>
        <Text style={styles.value}>{deviceInfo?.model}</Text>
        
        <Text style={styles.label}>Hardware ID:</Text>
        <Text style={styles.value}>{deviceInfo?.identifier}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={registerDevice}>
        <Text style={styles.buttonText}>Register This Device</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
