import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from '../utils/storage';

// Prioritize the cloud API URL if we built the app using EAS, otherwise fall back to local IP for dev
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:5000/api' : 'http://10.114.29.74:5000/api');

const client = axios.create({
  baseURL: BASE_URL,
});

client.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('sas_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
