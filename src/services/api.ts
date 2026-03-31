import axios from 'axios';
import { auth } from '../lib/firebase';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(async (config) => {
  // Try to get Firebase token first
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      }
    } catch (err) {
      console.error('Error getting Firebase token:', err);
    }
  }
  
  // Fallback to localStorage for legacy tokens
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Check if the response is actually JSON
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML instead of JSON:', response.data);
      return Promise.reject(new Error('Invalid API response: Expected JSON, received HTML.'));
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
        return new Promise(() => {}); // Prevent further errors during redirect
      }
    }
    return Promise.reject(error);
  }
);

export default api;
