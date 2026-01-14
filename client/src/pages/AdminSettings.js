import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Grid,
  Card,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  AdminPanelSettings as AdminIcon,
  Block as BlockIcon,
  PersonOff as BanIcon,
  CheckCircle as VerifyIcon,
  Refresh as RefreshIcon,
  Inbox as InboxIcon,
  PeopleAlt as UsersIcon,
  Gavel as BansIcon,
  OnlinePrediction as OnlineIcon,
  SupportAgent as SupportAgentIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AppealsInbox from '../components/AppealsInbox';
import SupportInbox from '../components/SupportInbox';
import AdminPendingInbox from '../components/AdminPendingInbox';

const AdminSettings = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Estados para filtros
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connectionFilter, setConnectionFilter] = useState('all');

  // Estados para bandeja de apelaciones
  const [appealsOpen, setAppealsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Estados para bandeja de soporte técnico
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportInitialScope, setSupportInitialScope] = useState('inbox');

  // Estados para bandeja unificada de pendientes
  const [pendingOpen, setPendingOpen] = useState(false);

  // Dialog states
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(7);
  const [banReason, setBanReason] = useState('');

  // Polling para actualización en tiempo real
  useEffect(() => {
    fetchUsers();
    fetchUnreadAppeals();

    // Actualizar cada 3 segundos para mejor sincronización
    const interval = setInterval(() => {
      fetchUsers();
      fetchUnreadAppeals();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadAppeals = async () => {
    try {
      const response = await api.get('/users/admin/appeals');
      const appeals = response.data.appeals || response.data || [];
      const unread = Array.isArray(appeals)
        ? appeals.filter(appeal => !appeal.read).length
        : 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error al obtener apelaciones no leídas:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/admin/users');
      // La ruta ahora devuelve los usuarios directamente (sin paginación)
      setUsers(response.data);
      setLastUpdate(new Date()); // Actualizar timestamp
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      showMessage('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const getOnlineStatus = (user) => {
    if (!user.lastSeen) return { text: 'Nunca', color: 'default' };

    const now = new Date();
    const lastSeen = new Date(user.lastSeen);
    const diffSeconds = Math.floor((now - lastSeen) / 1000);

    // Si la última actividad es muy reciente (menos de 2 minutos)
    if (diffSeconds < 120) {
      return { text: 'En línea', color: 'success' };
    } else if (diffSeconds < 600) {
      // Si hace menos de 10 minutos, mostrar "Activo recientemente"
      return { text: 'Activo recientemente', color: 'warning' };
    } else {
      // Formatear la última conexión con información de fecha
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastSeenDate = new Date(lastSeen);
      lastSeenDate.setHours(0, 0, 0, 0);

      const timeString = lastSeen.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      let dateString;
      if (lastSeenDate.getTime() === today.getTime()) {
        dateString = `Hoy a las ${timeString}`;
      } else if (lastSeenDate.getTime() === yesterday.getTime()) {
        dateString = `Ayer a las ${timeString}`;
      } else {
        dateString = lastSeen.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit',
          year: '2-digit'
        }) + ` a las ${timeString}`;
      }

      return { 
        text: `Desconectado - Última conexión: ${dateString}`, 
        color: 'default' 
      };
    }
  };

  const filteredUsers = users.filter(user => {
    // Filtro de búsqueda
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de rol
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    // Filtro de estado de cuenta
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !user.suspended && !user.banned) ||
                         (statusFilter === 'suspended' && user.suspended) ||
                         (statusFilter === 'banned' && user.banned);

    // Filtro de conexión
    const onlineStatus = getOnlineStatus(user);
    const matchesConnection = connectionFilter === 'all' ||
                             (connectionFilter === 'online' && onlineStatus.text === 'En línea') ||
                             (connectionFilter === 'recent' && onlineStatus.text === 'Activo recientemente') ||
                             (connectionFilter === 'offline' && onlineStatus.text.includes('Desconectado'));

    return matchesSearch && matchesRole && matchesStatus && matchesConnection;
  });

  const handleRoleChange = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleSuspend = (user) => {
    setSelectedUser(user);
    setSuspendReason('');
    setSuspendDuration(7);
    setSuspendDialogOpen(true);
  };

  const handleBan = (user) => {
    setSelectedUser(user);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const confirmRoleChange = async () => {
    try {
      console.log('Cambiando rol para usuario:', selectedUser.username, 'a rol:', newRole);
      console.log('Rol actual del usuario logueado:', currentUser.role);

      const response = await api.put(`/users/admin/users/${selectedUser._id}/role`, { role: newRole });
      console.log('Respuesta del servidor:', response.data);

      showMessage(`Rol de ${selectedUser.username} actualizado a ${newRole}`);
      fetchUsers();
      setRoleDialogOpen(false);
    } catch (error) {
      console.error('Error al cambiar rol:', error.response?.data || error.message);
      showMessage(error.response?.data?.message || 'Error al cambiar rol', 'error');
    }
  };

  const confirmSuspend = async () => {
    try {
      await api.put(`/users/admin/users/${selectedUser._id}/suspend`, {
        reason: suspendReason,
        durationDays: suspendDuration,
      });
      showMessage(`${selectedUser.username} suspendido`);
      fetchUsers();
      setSuspendDialogOpen(false);
    } catch (error) {
      showMessage('Error al suspender usuario', 'error');
    }
  };

  const confirmBan = async () => {
    try {
      await api.put(`/users/admin/users/${selectedUser._id}/ban`, { reason: banReason });
      showMessage(`${selectedUser.username} baneado`);
      fetchUsers();
      setBanDialogOpen(false);
    } catch (error) {
      showMessage('Error al banear usuario', 'error');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'error';
      case 'admin': return 'warning';
      case 'creator': return 'info';
      case 'suspended': return 'secondary';
      case 'banned': return 'default';
      default: return 'primary';
    }
  };

  const getStatusColor = (user) => {
    if (user.banned) return 'error';
    if (user.suspended) return 'warning';
    return 'success';
  };

  const getStatusText = (user) => {
    if (user.banned) return 'Baneado';
    if (user.suspended) return 'Suspendido';
    return 'Activo';
  };

  const encryptEmail = (email) => {
    if (!email) return '';

    const [username, domain] = email.split('@');
    if (!username || !domain) return email;

    // Mostrar primeros 2 caracteres y últimos 2 caracteres del username
    const visibleChars = Math.min(2, username.length);
    const endChars = Math.min(2, username.length - visibleChars);

    let encryptedUsername = username.substring(0, visibleChars);
    if (username.length > visibleChars + endChars) {
      encryptedUsername += '*'.repeat(username.length - visibleChars - endChars);
    }
    if (endChars > 0) {
      encryptedUsername += username.substring(username.length - endChars);
    }

    return `${encryptedUsername}@${domain}`;
  };

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          No tienes permisos para acceder a esta página.
        </Alert>
      </Container>
    );
  }

  // Estadísticas rápidas
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.suspended && !u.banned).length;
  const suspendedUsers = users.filter((u) => u.suspended).length;
  const bannedUsers = users.filter((u) => u.banned).length;
  // Usar la misma lógica que la tabla (getOnlineStatus) para contar conectados
  const onlineUsers = users.filter((u) => getOnlineStatus(u).text === 'En línea').length;

  const openSupportInbox = (scope = 'inbox') => {
    setSupportInitialScope(scope);
    setSupportOpen(true);
  };

  return (
    <>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header con glassmorphism */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            background:
              'linear-gradient(135deg, rgba(109, 40, 217, 0.18) 0%, rgba(15, 23, 42, 0.6) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                background: 'linear-gradient(90deg, #a78bfa, #ffffff)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 0.5,
              }}
            >
              Panel de administración
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestiona usuarios, roles, suspensiones y baneos en tiempo real.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip
              label={`Actualizado: ${lastUpdate.toLocaleTimeString('es-ES')}`}
              variant="outlined"
              size="small"
              sx={{ borderColor: 'rgba(255,255,255,0.16)' }}
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setPendingOpen(true)}
              startIcon={<InboxIcon />}
              sx={{ borderRadius: '999px', px: 3 }}
            >
              Pendientes
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setAppealsOpen(true)}
              startIcon={
                <Badge badgeContent={unreadCount} color="error">
                  <InboxIcon />
                </Badge>
              }
              sx={{ borderRadius: '999px', px: 3 }}
            >
              Bandeja de apelaciones
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => openSupportInbox('inbox')}
              startIcon={<SupportAgentIcon />}
              sx={{ borderRadius: '999px', px: 3 }}
            >
              Soporte técnico
            </Button>
            {currentUser.role === 'owner' && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => openSupportInbox('taken')}
                startIcon={<VisibilityIcon />}
                sx={{ borderRadius: '999px', px: 3 }}
              >
                Monitoreo
              </Button>
            )}
          </Box>
        </Paper>

        {/* Tarjetas de resumen */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[{
            label: 'Usuarios totales',
            val: totalUsers,
            icon: <UsersIcon />,
            color: 'primary.main',
          },
          {
            // Estado de cuenta: usuarios sin suspensión ni ban
            label: 'Activos (cuenta)',
            val: activeUsers,
            icon: <VerifyIcon />,
            color: 'success.main',
          },
          {
            // Estado de conexión: usuarios marcados como online
            label: 'En línea (conexión)',
            val: onlineUsers,
            icon: <OnlineIcon />,
            color: 'info.main',
          },
          {
            label: 'Suspendidos',
            val: suspendedUsers,
            icon: <BlockIcon />,
            color: 'warning.main',
          },
          {
            label: 'Baneados',
            val: bannedUsers,
            icon: <BansIcon />,
            color: 'error.main',
          },
          ].map((stat, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  p: 2.2,
                }}
              >
                <Avatar sx={{ bgcolor: stat.color, mr: 2 }}>
                  {stat.icon}
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.val}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {message && (
          <Alert severity={messageType} sx={{ mb: 3, borderRadius: 2 }}>
            {message}
          </Alert>
        )}

        {/* Bloque principal de gestión */}
        <Paper sx={{ p: 0, mb: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              p: 3,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              bgcolor: 'rgba(15,23,42,0.8)',
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Gestión de usuarios
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={8}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  }}
                >
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Rol</InputLabel>
                    <Select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      label="Rol"
                    >
                      <MenuItem value="all">Todos los roles</MenuItem>
                      <MenuItem value="user">Usuario</MenuItem>
                      <MenuItem value="creator">Creador</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="suspended">Suspendido</MenuItem>
                      <MenuItem value="banned">Baneado</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Estado</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Estado"
                    >
                      <MenuItem value="all">Todos los estados</MenuItem>
                      <MenuItem value="active">Activo</MenuItem>
                      <MenuItem value="suspended">Suspendido</MenuItem>
                      <MenuItem value="banned">Baneado</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Conexión</InputLabel>
                    <Select
                      value={connectionFilter}
                      onChange={(e) => setConnectionFilter(e.target.value)}
                      label="Conexión"
                    >
                      <MenuItem value="all">Todos</MenuItem>
                      <MenuItem value="online">En línea</MenuItem>
                      <MenuItem value="recent">Recientes</MenuItem>
                      <MenuItem value="offline">Offline</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="text"
                    color="secondary"
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                      setConnectionFilter('all');
                    }}
                    startIcon={<RefreshIcon />}
                  >
                    Limpiar
                  </Button>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.04)',
                  py: 0.5,
                  px: 1.5,
                  borderRadius: 1,
                }}
              >
                Mostrando <strong>{filteredUsers.length}</strong> de {users.length} usuarios
              </Typography>
            </Box>
          </Box>

          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(15,23,42,0.9)' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    USUARIO
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    EMAIL
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    ROL
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    ESTADO
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    CONEXIÓN
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    REGISTRO
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 'bold', color: 'text.secondary' }}
                  >
                    ACCIONES
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user._id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'primary.dark',
                            fontSize: '0.875rem',
                          }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium">
                          {user.username}
                        </Typography>
                        {user.role === 'owner' && (
                          <Chip
                            label="OWNER"
                            size="small"
                            color="error"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontFamily: 'monospace',
                        }}
                      >
                        {encryptEmail(user.email)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(user)}
                        color={getStatusColor(user)}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor:
                              getOnlineStatus(user).color === 'success'
                                ? '#22c55e'
                                : getOnlineStatus(user).color === 'warning'
                                ? '#f59e0b'
                                : '#64748b',
                            boxShadow:
                              getOnlineStatus(user).color === 'success'
                                ? '0 0 8px #22c55e'
                                : 'none',
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {getOnlineStatus(user).text}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {(currentUser.role === 'owner' ||
                          (currentUser.role === 'admin' && user.role !== 'admin')) &&
                          user.role !== 'owner' && (
                            <Tooltip title="Cambiar rol">
                              <IconButton
                                size="small"
                                onClick={() => handleRoleChange(user)}
                                color="primary"
                              >
                                <AdminIcon />
                              </IconButton>
                            </Tooltip>
                          )}

                        {!user.suspended &&
                          !user.banned &&
                          user.role !== 'owner' &&
                          !(user.role === 'admin' && currentUser.role === 'admin') && (
                            <>
                              <Tooltip title="Suspender">
                                <IconButton
                                  size="small"
                                  onClick={() => handleSuspend(user)}
                                  color="warning"
                                >
                                  <BlockIcon />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Banear">
                                <IconButton
                                  size="small"
                                  onClick={() => handleBan(user)}
                                  color="error"
                                >
                                  <BanIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}

                        {(user.suspended || user.banned) &&
                          user.role !== 'owner' &&
                          !(user.role === 'admin' && currentUser.role === 'admin') && (
                            <Tooltip title="Restaurar acceso">
                              <IconButton
                                size="small"
                                onClick={() => handleRoleChange(user)}
                                color="success"
                              >
                                <VerifyIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Dialog para cambiar rol */}
        <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Cambiar rol de {selectedUser?.username}</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Rol</InputLabel>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                label="Rol"
              >
                <MenuItem value="user">Usuario</MenuItem>
                {(currentUser.role === 'admin' || currentUser.role === 'owner') && (
                  <MenuItem value="creator">Creador de contenido</MenuItem>
                )}
                {currentUser.role === 'owner' && <MenuItem value="admin">Admin</MenuItem>}
                {currentUser.role === 'owner' && <MenuItem value="owner">Owner</MenuItem>}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmRoleChange} variant="contained">Cambiar</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para suspender */}
        <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Suspender a {selectedUser?.username}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo de suspensión"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              type="number"
              label="Duración de suspensión (días)"
              value={suspendDuration}
              onChange={(e) => setSuspendDuration(e.target.value)}
              sx={{ mt: 2 }}
              inputProps={{ min: 1, max: 365 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Si indicas un valor no válido, se usarán 7 días por defecto.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuspendDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmSuspend} variant="contained" color="warning">Suspender</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para banear */}
        <Dialog open={banDialogOpen} onClose={() => setBanDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Banear a {selectedUser?.username}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo de baneo"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBanDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmBan} variant="contained" color="error">Banear</Button>
          </DialogActions>
        </Dialog>
      </Container>

      <AppealsInbox 
        open={appealsOpen}
        onClose={() => {
          setAppealsOpen(false);
          fetchUnreadAppeals(); // Actualizar contador al cerrar
        }}
      />

      <SupportInbox
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        initialScope={supportInitialScope}
      />

      <AdminPendingInbox
        open={pendingOpen}
        onClose={() => setPendingOpen(false)}
        onOpenSupport={(scope) => openSupportInbox(scope)}
        onOpenAppeals={() => setAppealsOpen(true)}
      />
    </>
  );
};

export default AdminSettings;
