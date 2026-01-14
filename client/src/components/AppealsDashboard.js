import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Mail as MailIcon,
  MarkEmailRead as ReadIcon,
  Person as PersonIcon,
  Block as BlockIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import api from '../services/api';

const AppealsDashboard = () => {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar apelaciones
  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/admin/appeals');
      setAppeals(response.data);
      setError(null);
    } catch (err) {
      console.error('Error cargando apelaciones:', err);
      setError('Error al cargar las apelaciones');
    } finally {
      setLoading(false);
    }
  };

  // Marcar como leída
  const markAsRead = async (appealId) => {
    try {
      await api.put(`/users/admin/appeals/${appealId}/read`);
      
      // Actualizar estado local
      setAppeals(prev => 
        prev.map(appeal => 
          appeal._id === appealId ? { ...appeal, read: true } : appeal
        )
      );
    } catch (err) {
      console.error('Error marcando como leída:', err);
    }
  };

  useEffect(() => {
    fetchAppeals();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchAppeals, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    return status === 'banned' ? 'error' : 'warning';
  };

  const getStatusIcon = (status) => {
    return status === 'banned' ? <BlockIcon /> : <WarningIcon />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const unreadCount = appeals.filter(a => !a.read).length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bandeja de Apelaciones
      </Typography>
      
      {unreadCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tienes {unreadCount} apelacion{unreadCount !== 1 ? 'es' : ''} sin leer
        </Alert>
      )}

      {appeals.length === 0 ? (
        <Alert severity="success">
          No hay apelaciones pendientes
        </Alert>
      ) : (
        <Box>
          {appeals.map((appeal) => (
            <Card 
              key={appeal._id} 
              sx={{ 
                mb: 2, 
                border: appeal.read ? '1px solid #e0e0e0' : '2px solid #1976d2',
                backgroundColor: appeal.read ? '#f9f9f9' : '#fff'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {appeal.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {appeal.email}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        icon={getStatusIcon(appeal.status)}
                        label={appeal.status === 'banned' ? 'Baneado' : 'Suspendido'}
                        color={getStatusColor(appeal.status)}
                        size="small"
                      />
                      
                      {!appeal.read && (
                        <Tooltip title="Marcar como leída">
                          <IconButton 
                            onClick={() => markAsRead(appeal._id)}
                            color="primary"
                          >
                            <ReadIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    {appeal.assignedTo && (
                      <Typography variant="caption" color="text.secondary">
                        Atendido por: {appeal.assignedTo.username || 'Moderador'}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Motivo de la suspensión/baneo:
                  </Typography>
                  <Typography variant="body2">
                    {appeal.reason}
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Mensaje de apelación:
                  </Typography>
                  <Typography variant="body1">
                    {appeal.message}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Enviado: {new Date(appeal.createdAt).toLocaleString()}
                  </Typography>
                  
                  {appeal.read && (
                    <Chip 
                      label="Leída" 
                      color="default" 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AppealsDashboard;
