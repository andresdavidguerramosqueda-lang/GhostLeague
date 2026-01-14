import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import { 
  Block as BlockIcon, 
  Mail as MailIcon, 
  DeleteForever as DeleteIcon 
} from '@mui/icons-material';
import api from '../services/api';

const SuspensionDialog = ({ open, onClose, userStatus }) => {
  const [appealMessage, setAppealMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastAppealTime, setLastAppealTime] = useState(null);
  const [timeUntilNextAppeal, setTimeUntilNextAppeal] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [appeal, setAppeal] = useState(null);
  const [loadingAppeal, setLoadingAppeal] = useState(false);
  const [errorAppeal, setErrorAppeal] = useState('');

  const isBanned = userStatus?.status === 'banned';
  const isSuspended = userStatus?.status === 'suspended';

  // Cargar tiempo de última apelación desde localStorage
  useEffect(() => {
    const savedTime = localStorage.getItem(`lastAppeal_${userStatus?.username}`);
    if (savedTime) {
      const time = new Date(savedTime);
      setLastAppealTime(time);
      
      // Calcular tiempo restante
      const now = new Date();
      const timeDiff = now - time;
      const cooldownPeriod = 5 * 60 * 60 * 1000; // 5 horas en milisegundos
      
      if (timeDiff < cooldownPeriod) {
        const remaining = cooldownPeriod - timeDiff;
        setTimeUntilNextAppeal(remaining);
      }
    }
  }, [userStatus?.username]);

  // Cargar la última apelación del usuario (incluye conversación)
  useEffect(() => {
    if (!open || !userStatus) return;

    const fetchAppeal = async () => {
      setLoadingAppeal(true);
      setErrorAppeal('');
      try {
        const response = await api.get('/users/support/appeal');
        setAppeal(response.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error al obtener apelación:', error);
          setErrorAppeal('No se pudo cargar tu apelación.');
        } else {
          setAppeal(null);
        }
      } finally {
        setLoadingAppeal(false);
      }
    };

    fetchAppeal();
  }, [open, userStatus]);

  // Contador regresivo
  useEffect(() => {
    if (timeUntilNextAppeal > 0) {
      const timer = setInterval(() => {
        setTimeUntilNextAppeal(prev => {
          if (prev <= 1000) {
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [timeUntilNextAppeal]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const calculateSuspensionTime = (suspensionDate, durationDays) => {
    if (!suspensionDate) return 'Tiempo no especificado';
    
    const start = new Date(suspensionDate);
    const duration = durationDays && durationDays > 0 ? durationDays : 7;
    const end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now >= end) {
      return 'La suspensión ha terminado';
    }
    
    const remaining = end - now;
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    return `${days} día${days !== 1 ? 's' : ''} y ${hours} hora${hours !== 1 ? 's' : ''}`;
  };

  const handleSubmitAppeal = async () => {
    if (!appealMessage.trim()) {
      return;
    }

    setLoading(true);
    try {
      let response;
      if (appeal && appeal._id) {
        // Responder en hilo existente
        response = await api.put(`/users/support/appeal/${appeal._id}/reply`, { message: appealMessage });
      } else {
        // Crear nueva apelación
        response = await api.put('/users/support/appeal', { message: appealMessage });
      }

      setSubmitted(true);
      setAppeal(response.data.appeal || response.data);
      
      // Guardar tiempo de la apelación
      const now = new Date();
      localStorage.setItem(`lastAppeal_${userStatus?.username}`, now.toISOString());
      setLastAppealTime(now);
      setTimeUntilNextAppeal(5 * 60 * 60 * 1000); // 5 horas
      
      // Limpiar mensaje
      setAppealMessage('');
    } catch (error) {
      console.error('Error al enviar apelación:', error.response?.data || error.message);
      if (error.response?.status === 400 && error.response.data?.message) {
        setErrorAppeal(error.response.data.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      return;
    }

    setDeleting(true);
    try {
      // Limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Limpiar cualquier dato relacionado con apelaciones
      if (userStatus?.username) {
        localStorage.removeItem(`lastAppeal_${userStatus?.username}`);
      }
      
      // Redirigir al login
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Forzar logout incluso si hay error
      localStorage.clear();
      window.location.href = '/login';
    } finally {
      setDeleting(false);
    }
  };

  if (!userStatus) return null;

  return (
    <Dialog 
      open={open} 
      onClose={undefined} // Deshabilitar cierre con ESC y clic fuera
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
      disableBackdropClick
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BlockIcon color={isBanned ? 'error' : 'warning'} />
        {isBanned ? 'Cuenta Baneada' : 'Cuenta Suspendida'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity={isBanned ? 'error' : 'warning'} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              {isBanned ? 'Baneo permanente' : 'Suspensión temporal'}
            </Typography>
          </Alert>

          <Typography variant="body1" gutterBottom>
            Hola <strong>{userStatus.username}</strong>,
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Tu cuenta ha sido {isBanned ? 'baneada permanentemente' : 'suspendida temporalmente'} 
            por violar nuestras normas de la comunidad.
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Motivo:
            </Typography>
            <Typography variant="body2">
              {userStatus.reason}
            </Typography>
          </Box>

          {isSuspended && userStatus.suspensionDate && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tiempo restante:
              </Typography>
              <Chip 
                label={calculateSuspensionTime(
                  userStatus.suspensionDate,
                  userStatus.suspensionDurationDays
                )}
                color="warning"
                size="small"
              />
            </Box>
          )}

          {isBanned && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Duración:
              </Typography>
              <Chip 
                label="Tiempo indefinido"
                color="error"
                size="small"
              />
            </Box>
          )}
        </Box>

        {!submitted ? (
          isSuspended ? (
            <Box>
              {loadingAppeal && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Cargando tu apelación anterior...
                </Alert>
              )}
              {errorAppeal && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorAppeal}
                </Alert>
              )}

              {appeal && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Historial de apelación
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 260,
                      overflowY: 'auto',
                      mb: 2,
                      px: 1,
                      py: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(15,23,42,0.9)',
                    }}
                  >
                    {(
                      Array.isArray(appeal.conversation) &&
                      appeal.conversation.length > 0
                        ? appeal.conversation
                        : appeal.message
                        ? [
                            {
                              from: 'user',
                              message: appeal.message,
                              createdAt: appeal.createdAt,
                            },
                          ]
                        : []
                    ).map((msg, index) => {
                      const isUser = msg.from === 'user';
                      return (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            justifyContent: isUser ? 'flex-end' : 'flex-start',
                            mb: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '80%',
                              px: 1.5,
                              py: 1,
                              borderRadius: isUser
                                ? '18px 18px 4px 18px'
                                : '18px 18px 18px 4px',
                              background: isUser
                                ? 'linear-gradient(135deg, #a855f7 0%, #4f46e5 100%)'
                                : 'rgba(15,23,42,0.95)',
                              color: '#e5e7eb',
                              boxShadow: isUser
                                ? '0 8px 24px rgba(168,85,247,0.6)'
                                : 'none',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: 'pre-line' }}
                            >
                              {msg.message}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              ml: 1,
                              alignSelf: 'flex-end',
                              color: 'rgba(148,163,184,0.9)',
                              fontSize: '0.7rem',
                            }}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
              <Typography variant="subtitle2" gutterBottom>
                ¿Consideras que esto es un error? Puedes apelar esta decisión:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Explica por qué consideras que la suspensión es injustificada..."
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                disabled={loading}
                sx={{ mb: 2 }}
              />
              {timeUntilNextAppeal > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Podrás enviar otra apelación en: <strong>{formatTime(timeUntilNextAppeal)}</strong>
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : isBanned ? (
            <Alert severity="info">
              <Typography variant="body2" paragraph>
                Tu cuenta está <strong>baneada permanentemente</strong>. No puedes enviar apelaciones desde la plataforma.
              </Typography>
              <Typography variant="body2">
                Si crees que se trata de un error, ponte en contacto con el soporte técnico a través de nuestro servidor de Discord:
                {' '}
                <a
                  href="https://discord.com/invite/fuQFVYp448"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  discord.com/invite/fuQFVYp448
                </a>
              </Typography>
            </Alert>
          ) : null
        ) : (
          <Alert severity="success">
            <Typography variant="body2">
              Tu apelación ha sido enviada correctamente. Nos pondremos en contacto contigo pronto.
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="subtitle2" color="error" gutterBottom>
            ¿No quieres esperar? Puedes cerrar sesión:
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Si prefieres no esperar la resolución de la apelación, puedes cerrar sesión 
            y volver más tarde para verificar el estado de tu cuenta.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ flexDirection: 'column', gap: 1 }}>
        {!submitted && isSuspended && (
          <Button 
            onClick={handleSubmitAppeal}
            variant="contained"
            disabled={!appealMessage.trim() || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <MailIcon />}
            fullWidth
          >
            {loading ? 'Enviando...' : 'Enviar apelación'}
          </Button>
        )}
        {submitted && (
          <Alert severity="success" sx={{ width: '100%' }}>
            <Typography variant="body2" align="center">
              Tu apelación ha sido enviada correctamente. Nos pondremos en contacto contigo pronto.
            </Typography>
          </Alert>
        )}
        
        <Button 
          onClick={handleLogout}
          variant="outlined"
          color="error"
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          fullWidth
        >
          {deleting ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuspensionDialog;
