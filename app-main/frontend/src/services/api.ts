import axios from 'axios';
import Constants from 'expo-constants';
import { MetalPrice } from '../types/MetalPrice';

// Get the backend URL from environment variables
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                   process.env.EXPO_PUBLIC_BACKEND_URL || 
                   'http://localhost:8001';

console.log('Backend URL:', BACKEND_URL);

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error?.response?.status, error?.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  async getAllMetalPrices(): Promise<MetalPrice[]> {
    try {
      const response = await api.get('/metals');
      return response.data;
    } catch (error) {
      console.error('Error fetching all metal prices:', error);
      throw new Error('Failed to fetch metal prices');
    }
  },

  async getMetalPrice(metal: string): Promise<MetalPrice> {
    try {
      const response = await api.get(`/metals/${metal}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${metal} price:`, error);
      throw new Error(`Failed to fetch ${metal} price`);
    }
  },

  // Health check endpoint
  async healthCheck(): Promise<any> {
    try {
      const response = await api.get('/');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Backend health check failed');
    }
  },
};