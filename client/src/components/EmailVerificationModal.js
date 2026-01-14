import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography
} from '@mui/material';

const EmailVerificationModal = ({ isOpen, onClose, onSuccess, email, username, password }) => {
  const { completeRegistration, resendVerificationCode, loading, error } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const normalizedEmail = useMemo(() => (email || '').trim().toLowerCase(), [email]);

  // Timer para reenviar código
  React.useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const submitVerification = useCallback(async () => {
    if (isSubmitting || loading) {
      console.log('⚠️ Verificación ya en progreso');
      return;
    }

    // Validar código
    const trimmedCode = (code || '').trim();
    if (!trimmedCode) return;
    if (!/^\d{4}$/.test(trimmedCode)) return;

    setIsSubmitting(true);

    try {
      console.log('🔍 Verificando código...');

      const result = await completeRegistration({
        email: normalizedEmail,
        code: trimmedCode,
        username,
        password
      });

      if (!result?.success) {
        const message = result?.error || 'Error al verificar el correo';
        throw new Error(message);
      }

      console.log('✅ Verificación exitosa:', result);
      onClose();
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      console.error('❌ Error en verificación:', err);

      if (err?.message?.includes('inválido o expirado')) {
        alert('❌ Código inválido o expirado. Por favor, revisa tu correo o solicita un nuevo código.');
      } else if (err?.message?.includes('Demasiados intentos')) {
        alert('⏰ ' + err.message + '\n\nPor favor, espera unos minutos antes de intentar nuevamente.');
      } else {
        alert('❌ ' + (err?.message || 'Error al verificar el correo'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [code, completeRegistration, isSubmitting, loading, normalizedEmail, onClose, onSuccess, password, username]);

  useEffect(() => {
    if (!isOpen) return;
    if (code.length !== 4) return;
    submitVerification();
  }, [code, isOpen, submitVerification]);

  const handleResendCode = async () => {
    if (resendTimer > 0 || isResending || loading) {
      return;
    }

    setIsResending(true);

    try {
      console.log('📧 Reenviando código...');
      
      const result = await resendVerificationCode(normalizedEmail);
      
      console.log('✅ Código reenviado:', result);
      
      // Iniciar timer de 60 segundos
      setResendTimer(60);
      
    } catch (error) {
      console.error('❌ Error reenviando código:', error);
      alert('❌ ' + error.message);
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={!!isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Verificar correo
      </DialogTitle>
      <DialogContent>
        <Paper elevation={0} sx={{ p: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Enviamos un código de 4 dígitos a:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
            {normalizedEmail}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Código"
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
              setCode(value);
            }}
            autoFocus
            fullWidth
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 4,
              style: { textAlign: 'center', letterSpacing: '0.5em', fontWeight: 700 }
            }}
            disabled={loading || isSubmitting}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            fullWidth
            disabled={loading || isSubmitting || code.length !== 4}
            onClick={submitVerification}
            sx={{ py: 1.3, mb: 2 }}
          >
            {loading || isSubmitting ? 'Verificando...' : 'Verificar'}
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleResendCode}
              disabled={resendTimer > 0 || isResending || loading}
            >
              {resendTimer > 0 ? `Reenviar en ${formatTime(resendTimer)}` : 'Reenviar código'}
            </Button>
            <Button variant="text" fullWidth onClick={onClose}>
              Cerrar
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Solo puedes ingresar 4 números. Al completar los 4 dígitos se verificará automáticamente.
          </Typography>
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerificationModal;
