import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { MailOutline as MailIcon } from '@mui/icons-material';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(response.data.message);
      setSuccess(true);
    } catch (err) {
      console.error('Error en forgot password:', err);
      setError(err.response?.data?.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

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
          <MailIcon sx={{ fontSize: 48, color: '#a855f7', mb: 2 }} />
          <Typography variant="h4" sx={{ color: '#a855f7', fontWeight: 'bold', mb: 2 }}>
            ¿Olvidaste tu contraseña?
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {message && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            {message}
          </Alert>
        )}

        {!success ? (
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
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
                'Enviar enlace de recuperación'
              )}
            </Button>
          </form>
        ) : (
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
              Revisa tu correo electrónico y sigue las instrucciones para restablecer tu contraseña.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{
                borderColor: 'rgba(168, 85, 247, 0.5)',
                color: '#a855f7',
                '&:hover': {
                  borderColor: '#a855f7',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                },
              }}
            >
              Volver al inicio de sesión
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            ¿Recordaste tu contraseña?{' '}
            <RouterLink 
              to="/login" 
              style={{ 
                color: '#a855f7', 
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              Inicia sesión
            </RouterLink>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
