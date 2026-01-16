import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const emailDisabled = String(process.env.REACT_APP_EMAIL_DISABLED).toLowerCase() === 'true';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validar token al cargar la página
  useEffect(() => {
    if (emailDisabled) {
      setValidatingToken(false);
      setTokenValid(false);
      setError('La recuperación de contraseña está deshabilitada temporalmente.');
      return;
    }

    const validateToken = async () => {
      if (!token) {
        setError('Token no proporcionado');
        setValidatingToken(false);
        return;
      }

      try {
        const response = await api.get(`/auth/validate-reset-token/${token}`);
        setTokenValid(true);
        setMessage(response.data.message || 'Token válido');
      } catch (err) {
        console.error('Error validando token:', err);
        setError(err.response?.data?.message || 'Token inválido o expirado');
        setTokenValid(false);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Por favor ingresa una nueva contraseña');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/reset-password', { 
        token, 
        password: password.trim() 
      });
      setMessage(response.data.message);
      setSuccess(true);
    } catch (err) {
      console.error('Error en reset password:', err);
      setError(err.response?.data?.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3
          }}
        >
          <CircularProgress size={48} sx={{ color: '#a855f7', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#e5e7eb' }}>
            Validando token...
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (!tokenValid) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3
          }}
        >
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error || 'Token inválido o expirado'}
          </Alert>
          <Button
            variant="outlined"
            onClick={() => navigate('/forgot-password')}
            sx={{
              borderColor: 'rgba(168, 85, 247, 0.5)',
              color: '#a855f7',
              '&:hover': {
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
              },
            }}
          >
            Solicitar nuevo enlace
          </Button>
        </Paper>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3
          }}
        >
          <CheckIcon sx={{ fontSize: 48, color: '#4ade80', mb: 2 }} />
          <Typography variant="h4" sx={{ color: '#4ade80', fontWeight: 'bold', mb: 2 }}>
            ¡Contraseña restablecida!
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
            {message}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{
              background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5b21b6 0%, #9333ea 100%)',
              },
            }}
          >
            Iniciar sesión
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper 
        sx={{ 
          p: 4, 
          backgroundColor: 'rgba(15, 23, 42, 0.95)', 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LockIcon sx={{ fontSize: 48, color: '#a855f7', mb: 2 }} />
          <Typography variant="h4" sx={{ color: '#a855f7', fontWeight: 'bold', mb: 2 }}>
            Restablecer contraseña
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Ingresa tu nueva contraseña
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {message && !success && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            {message}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Nueva contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            inputProps={{ minLength: 6 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: '#9ca3af' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(168, 85, 247, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(168, 85, 247, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#a855f7',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#9ca3af',
                '&.Mui-focused': {
                  color: '#a855f7',
                },
              },
              input: { color: '#e5e7eb' }
            }}
          />

          <TextField
            fullWidth
            label="Confirmar contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
            inputProps={{ minLength: 6 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    sx={{ color: '#9ca3af' }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(168, 85, 247, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(168, 85, 247, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#a855f7',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#9ca3af',
                '&.Mui-focused': {
                  color: '#a855f7',
                },
              },
              input: { color: '#e5e7eb' }
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5b21b6 0%, #9333ea 100%)',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Restablecer contraseña'
            )}
          </Button>
        </form>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            ¿Recordaste tu contraseña?{' '}
            <button
              onClick={() => navigate('/login')}
              style={{ 
                background: 'none',
                border: 'none',
                color: '#a855f7', 
                textDecoration: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Inicia sesión
            </button>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPassword;
