import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Chip, 
  Typography, 
  CircularProgress 
} from '@mui/material';
import { 
  Circle as OnlineIcon, 
  Cancel as OfflineIcon 
} from '@mui/icons-material';
import { updateUserStatus } from '../services/userService';
import api from '../services/api';

const OnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  // Cargar estado inicial
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await api.get('/users/status');
        const data = response.data;
        setIsOnline(Boolean(data.isOnline));
        setLastSeen(data.lastSeen || null);
      } catch (error) {
        console.error('Error cargando estado:', error);
      }
    };

    loadStatus();
  }, []);

  // Marcar como online
  const handleGoOnline = async () => {
    setLoading(true);
    try {
      await updateUserStatus('online');
      setIsOnline(true);
      setLastSeen(null);
    } catch (error) {
      console.error('Error al conectarse:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como offline
  const handleGoOffline = async () => {
    setLoading(true);
    try {
      await updateUserStatus('offline');
      setIsOnline(false);
      setLastSeen(new Date());
    } catch (error) {
      console.error('Error al desconectarse:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-marcar como offline cuando se cierra la pestaña
  useEffect(() => {
    const handleBeforeUnload = async () => {
      await updateUserStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Estado de Conexión
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Chip
          icon={isOnline ? <OnlineIcon /> : <OfflineIcon />}
          label={isOnline ? 'En línea' : 'Desconectado'}
          color={isOnline ? 'success' : 'default'}
          variant="outlined"
        />
        
        {loading && <CircularProgress size={20} />}
      </Box>

      {!isOnline && lastSeen && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Última vez: {new Date(lastSeen).toLocaleString()}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        {!isOnline ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleGoOnline}
            disabled={loading}
            startIcon={<OnlineIcon />}
          >
            Conectarse
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="error"
            onClick={handleGoOffline}
            disabled={loading}
            startIcon={<OfflineIcon />}
          >
            Desconectarse
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default OnlineStatus;
