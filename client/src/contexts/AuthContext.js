import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

// Configuración de Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para manejar errores de rate limiting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limit excedido:', error.response.data);
      error.message = 'Demasiados intentos. Por favor, espera unos minutos.';
    }
    return Promise.reject(error);
  }
);

// Estado inicial
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  isAuthenticated: false,
  requiresEmailVerification: false,
  pendingEmail: null
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        token: action.payload.token,
        user: action.payload.user,
        error: null
      };
    
    case 'AUTH_SUCCESS_PENDING_VERIFICATION':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        token: null,
        user: action.payload.user,
        requiresEmailVerification: true,
        pendingEmail: action.payload.email,
        error: null
      };
    
    case 'AUTH_FAIL':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        isAuthenticated: false,
        token: null,
        user: null
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        requiresEmailVerification: false,
        pendingEmail: null
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    case 'EMAIL_VERIFIED':
      return {
        ...state,
        requiresEmailVerification: false,
        pendingEmail: null,
        isAuthenticated: true,
        token: action.payload.token,
        user: action.payload.user
      };
    
    default:
      return state;
  }
};

// Contexto
const AuthContext = createContext();

// Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Configurar token en Axios cuando cambia
  useEffect(() => {
    if (state.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
      localStorage.setItem('token', state.token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [state.token]);

  // Verificar token al cargar
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              token,
              user: response.data.user
            }
          });
        } catch (error) {
          console.error('Token inválido:', error);
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    verifyToken();
  }, []);

  // Función de registro
  const register = async (userData) => {
    // Prevenir múltiples envíos
    if (state.isLoading) {
      console.warn('⚠️ Registro ya en progreso');
      return;
    }

    dispatch({ type: 'AUTH_START' });

    try {
      // Validación básica en el frontend
      if (!userData.username || !userData.email || !userData.password) {
        throw new Error('Todos los campos son requeridos');
      }

      if (userData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new Error('El formato del correo electrónico es inválido');
      }

      console.log('📝 Enviando solicitud de registro...');
      
      const response = await api.post('/auth/register', {
        username: userData.username.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password
      });

      console.log('✅ Respuesta del servidor:', response.data);

      // Verificar si requiere verificación de correo
      if (response.data.requiresEmailVerification) {
        dispatch({
          type: 'AUTH_SUCCESS_PENDING_VERIFICATION',
          payload: {
            user: response.data.user,
            email: response.data.email
          }
        });
        
        return {
          success: true,
          requiresVerification: true,
          email: response.data.email,
          previewUrl: response.data.previewUrl
        };
      } else {
        // Caso raro: registro sin verificación
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            token: response.data.token,
            user: response.data.user
          }
        });
        
        return {
          success: true,
          requiresVerification: false
        };
      }

    } catch (error) {
      console.error('❌ Error en registro:', error);
      
      let errorMessage = 'Error al registrarse';
      
      if (error.response) {
        // Error del servidor
        const serverError = error.response.data;
        
        if (error.response.status === 429) {
          errorMessage = serverError.message || 'Demasiados intentos. Por favor, espera unos minutos.';
        } else if (error.response.status === 400) {
          errorMessage = serverError.message || 'Datos inválidos';
        } else if (error.response.status === 500) {
          errorMessage = 'Error del servidor. Inténtalo más tarde.';
        } else {
          errorMessage = serverError.message || errorMessage;
        }
      } else if (error.request) {
        // Error de red
        errorMessage = 'Error de conexión. Verifica tu internet.';
      } else {
        // Error del frontend
        errorMessage = error.message || errorMessage;
      }

      dispatch({
        type: 'AUTH_FAIL',
        payload: errorMessage
      });

      throw new Error(errorMessage);
    }
  };

  // Función de login
  const login = async (credentials) => {
    if (state.isLoading) {
      console.warn('⚠️ Login ya en progreso');
      return;
    }

    dispatch({ type: 'AUTH_START' });

    try {
      const response = await api.post('/auth/login', {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password
      });

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          token: response.data.token,
          user: response.data.user
        }
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error en login:', error);
      
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.response) {
        if (error.response.status === 429) {
          errorMessage = 'Demasiados intentos. Espera unos minutos.';
        } else if (error.response.status === 403 && error.response.data.requiresEmailVerification) {
          // Caso especial: requiere verificación de correo
          dispatch({
            type: 'AUTH_SUCCESS_PENDING_VERIFICATION',
            payload: {
              user: null,
              email: error.response.data.email
            }
          });
          
          return {
            success: false,
            requiresEmailVerification: true,
            email: error.response.data.email
          };
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      dispatch({
        type: 'AUTH_FAIL',
        payload: errorMessage
      });

      throw new Error(errorMessage);
    }
  };

  // Función de verificación de correo
  const verifyEmail = async (email, code) => {
    if (state.isLoading) {
      console.warn('⚠️ Verificación ya en progreso');
      return;
    }

    dispatch({ type: 'AUTH_START' });

    try {
      const response = await api.post('/auth-verification/verify-and-login', {
        email: email.trim().toLowerCase(),
        code: code
      });

      dispatch({
        type: 'EMAIL_VERIFIED',
        payload: {
          token: response.data.token,
          user: response.data.user
        }
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error en verificación:', error);
      
      let errorMessage = 'Error al verificar el correo';
      
      if (error.response) {
        if (error.response.status === 429) {
          errorMessage = 'Demasiados intentos. Espera unos minutos.';
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      dispatch({
        type: 'AUTH_FAIL',
        payload: errorMessage
      });

      throw new Error(errorMessage);
    }
  };

  // Función de logout
  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  // Limpiar error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Reenviar código de verificación
  const resendVerificationCode = async (email) => {
    try {
      const response = await api.post('/auth-verification/resend-code', {
        email: email.trim().toLowerCase()
      });

      return {
        success: true,
        previewUrl: response.data.previewUrl
      };

    } catch (error) {
      console.error('❌ Error reenviando código:', error);
      
      let errorMessage = 'Error al reenviar el código';
      
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }

      throw new Error(errorMessage);
    }
  };

  const value = {
    ...state,
    register,
    login,
    logout,
    verifyEmail,
    resendVerificationCode,
    clearError,
    api // Exportar instancia de axios para uso directo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
