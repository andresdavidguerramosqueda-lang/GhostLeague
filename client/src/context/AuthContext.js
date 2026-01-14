// client/src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      setCurrentUser(user);
      return { success: true };
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      const errorMessage = error.response?.data?.message || 'Error de conexión con el servidor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', userData);
      
      // Guardar token y usuario automáticamente
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      setCurrentUser(user);
      
      return {
        success: true,
        user,
        token
      };
    } catch (error) {
      console.error('Error al registrarse:', error);
      const errorMessage = error.response?.data?.message || 'Error al registrarse';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const completeRegistration = async ({ email, code, username, password }) => {
    try {
      setError(null);
      const response = await api.post('/registration/complete', {
        email: (email || '').trim().toLowerCase(),
        code: (code || '').trim(),
        username: (username || '').trim(),
        password
      });

      const { user, token } = response.data;
      localStorage.setItem('token', token);
      setCurrentUser(user);

      return { success: true, user, token };
    } catch (error) {
      console.error('Error al completar el registro:', error);
      const errorMessage = error.response?.data?.message || 'Error al completar el registro';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      setError(null);
      const response = await api.post('/registration/verify-email', {
        email: (email || '').trim().toLowerCase(),
        code: (code || '').trim()
      });

      const { user, token } = response.data;
      localStorage.setItem('token', token);
      setCurrentUser(user);

      return { success: true, user, token };
    } catch (error) {
      console.error('Error al verificar email:', error);
      const errorMessage = error.response?.data?.message || 'Error al verificar email';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const resendVerificationCode = async (email) => {
    try {
      setError(null);
      const response = await api.post('/registration/resend-code', { email: (email || '').trim().toLowerCase() });
      return { success: true, previewUrl: response.data.previewUrl };
    } catch (error) {
      console.error('Error al reenviar el código:', error);
      const errorMessage = error.response?.data?.message || 'Error al reenviar el código';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    navigate('/login');
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Error al cargar el usuario:', error);
      localStorage.removeItem('token');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const role = (currentUser?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'owner' || role === 'owener';

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin,
    login,
    register,
    completeRegistration,
    verifyEmail,
    resendVerificationCode,
    logout,
    refreshUser,
    error,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;