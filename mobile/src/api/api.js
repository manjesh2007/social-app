import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this to your machine's LAN IP when testing on a physical device,
// e.g. http://192.168.1.20:5000/api
export const API_BASE_URL = 'http://10.97.86.228:5000/api';
export const SOCKET_URL = 'http://10.97.86.228:5000';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
