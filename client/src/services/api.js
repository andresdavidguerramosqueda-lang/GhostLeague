// client/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// antes de los interceptores de respuesta
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    if (normalizedToken && normalizedToken !== 'null' && normalizedToken !== 'undefined') {
      config.headers.Authorization = `Bearer ${normalizedToken}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptores para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Manejar cierre de sesión
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;