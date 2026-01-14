// client/src/components/layout/Layout.js
import Footer from './Footer';
import FloatingHelpButton from '../FloatingHelpButton';
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Container, 
  Box, 
  Typography, 
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';

import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home as HomeIcon,
  SportsEsports as TournamentsIcon,
  EmojiEvents as TrophyIcon,
  Groups as GroupsIcon,
  MailOutline as MailIcon,
  AccountCircle as AccountIcon,
  ExitToApp as LogoutIcon,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
  Shield as ShieldIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  SupportAgent as SupportAgentIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import SuspensionDialog from '../SuspensionDialog';
import api from '../../services/api';

const Layout = ({ children }) => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [userStatus, setUserStatus] = useState(null);
  const [reactivationDialogOpen, setReactivationDialogOpen] = useState(false);
  const [reactivationPreviousStatus, setReactivationPreviousStatus] = useState(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsDisabled, setNotificationsDisabled] = useState(false);

  const points = Math.max(0, Number(currentUser?.competitive?.points ?? 0));
  const level = Math.max(1, Math.floor(points / 100) + 1);
  const levelStart = (level - 1) * 100;
  const nextLevelPoints = level * 100;
  const progressInLevel = Math.max(0, points - levelStart);

  // Verificar estado del usuario (suspensión/baneo y reactivación)
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      console.log('currentUser:', currentUser?.username);
      
      const checkUserStatus = async () => {
        try {
          console.log('Llamando a API /users/status...');
          const response = await api.get('/users/status');
          console.log('Respuesta de API:', response.data);

          const status = response.data.status;
          const statusKey = currentUser?.username
            ? `lastAccountStatus_${currentUser.username}`
            : null;
          let previousStatus = null;

          if (statusKey) {
            previousStatus = localStorage.getItem(statusKey);
          }

          if (status !== 'active') {
            console.log('Usuario suspendido/baneado, mostrando diálogo');
            setUserStatus(response.data);
            setSuspensionDialogOpen(true);
          } else {
            console.log('Usuario activo');
            if (previousStatus && previousStatus !== 'active' && previousStatus !== status) {
              console.log('Usuario reactivado, mostrando diálogo');
              setReactivationPreviousStatus(previousStatus);
              setReactivationDialogOpen(true);
            }
            if (statusKey) {
              localStorage.setItem(statusKey, status);
            }
          }
        } catch (error) {
          console.error('Error verificando estado del usuario:', error);
        }
      };

      checkUserStatus();
    }
  }, [isAuthenticated, currentUser]);

  // Polling de notificaciones
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        setNotificationsError('');
        const response = await api.get('/users/notifications');
        const notificationsData = Array.isArray(response.data) ? response.data : [];
        setNotifications(notificationsData);
        const unreadCount = notificationsData.filter(n => !n.read).length;
        setUnreadNotifications(unreadCount);
        setNotificationsDisabled(false);
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        if (error.response?.status === 404) {
          setNotificationsError('Las notificaciones no están disponibles temporalmente');
          setNotificationsDisabled(true);
        } else {
          setNotificationsError('Error al cargar notificaciones');
        }
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  const handleLogoutDialogOpen = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutDialogClose = () => {
    setLogoutDialogOpen(false);
  };

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');
  const avatarSrc = currentUser?.avatar
    ? currentUser.avatar.startsWith('/uploads')
      ? `${fileBase}${currentUser.avatar}`
      : currentUser.avatar
    : null;

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    setLogoutDialogOpen(false);
  };

  const handleOpenNotifications = () => {
    setNotificationsOpen(true);
  };

  const handleCloseNotifications = () => {
    setNotificationsOpen(false);
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.post('/users/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifications(0);
    } catch (error) {
      console.error('Error marcando notificaciones como leídas:', error);
    }
  };

  const handleOpenNotification = async (notification) => {
    if (!notification.read) {
      try {
        await api.put(`/users/notifications/${notification._id}/read`);
        setNotifications(prev =>
          prev.map(n => (n._id === notification._id ? { ...n, read: true } : n))
        );
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marcando notificación como leída:', error);
      }
    }

    if (notification.type === 'support_reply' && notification.data?.ticketId) {
      navigate(`/support?ticket=${notification.data.ticketId}`);
    } else if (notification.type === 'payment_approved' && notification.data?.tournamentId) {
      navigate(`/tournaments/${notification.data.tournamentId}`);
    }
    handleCloseNotifications();
  };

  const location = useLocation();
  const navigate = useNavigate();
  const isProfilePage = location.pathname === '/profile';
  const isOnline = useOnlineStatus();

  return (
    <Box
      className="gl-app-shell"
      sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
    >
      {/* Header principal */}
      <header>
        {!isProfilePage && (
          <AppBar position="fixed" elevation={1}>
            <Container maxWidth="xl">
              <Toolbar disableGutters sx={{ justifyContent: 'space-between', py: 1 }}>
                {/* Logo */}
                <Box
                  component={RouterLink}
                  to="/"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                    mr: 2
                  }}
                  aria-label="Ghost League - Inicio"
                >
                  <Box
                    component="span"
                    className="gl-logo-text"
                    sx={{
                      fontSize: { xs: '1.3rem', sm: '1.5rem' },
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Ghost League
                  </Box>
                </Box>

                {/* Navegación principal */}
                <nav aria-label="Navegación principal">
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                    <Button 
                      color="inherit" 
                      component={RouterLink} 
                      to="/"
                      sx={{ fontWeight: 600 }}
                    >
                      Inicio
                    </Button>
                    <Button 
                      color="inherit" 
                      component={RouterLink} 
                      to="/tournaments"
                      sx={{ fontWeight: 600 }}
                    >
                      Torneos
                    </Button>
                    <Button 
                      color="inherit" 
                      component={RouterLink} 
                      to="/ranking"
                      sx={{ fontWeight: 600 }}
                    >
                      Ranking
                    </Button>
                    {/* <Button 
                      color="inherit" 
                      component={RouterLink} 
                      to="/clans"
                      sx={{ fontWeight: 600 }}
                      aria-label="Explorar clanes"
                    >
                      Clanes
                    </Button> */}
                    <Button 
                      color="inherit" 
                      component={RouterLink} 
                      to="/players"
                      sx={{ fontWeight: 600 }}
                    >
                      Jugadores
                    </Button>
                  </Box>
                </nav>

                {/* Sección de usuario y notificaciones */}
                <section aria-label="Cuenta de usuario">
                  {isAuthenticated ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {/* Campana de notificaciones */}
                      <Tooltip title="Notificaciones" arrow>
                        <IconButton
                          color="inherit"
                          onClick={handleOpenNotifications}
                          disabled={notificationsDisabled}
                          aria-label={`Notificaciones ${unreadNotifications > 0 ? `(${unreadNotifications} no leídas)` : ''}`}
                        >
                          <Badge
                            badgeContent={notificationsDisabled ? 0 : unreadNotifications}
                            color="error"
                            sx={{
                              '& .MuiBadge-badge': {
                                fontSize: '0.6rem',
                                height: 16,
                                minWidth: 16,
                              },
                            }}
                          >
                            <NotificationsIcon />
                          </Badge>
                        </IconButton>
                      </Tooltip>

                      {/* Bloque XP/Level */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                        }}
                        aria-label={`Nivel ${level}, ${points} puntos`}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: '#fbbf24',
                            fontSize: '0.85rem',
                          }}
                        >
                          LVL {level}
                        </Typography>
                        <Box
                          sx={{
                            width: { xs: 40, sm: 60 },
                            height: 6,
                            bgcolor: 'rgba(255,255,255,0.2)',
                            borderRadius: 3,
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                          role="progressbar"
                          aria-valuenow={progressInLevel}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${(progressInLevel / 100) * 100}%`,
                              bgcolor: '#fbbf24',
                              borderRadius: 3,
                            }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.9)',
                          }}
                        >
                          {points} XP
                        </Typography>
                      </Box>

                      <Tooltip title="Mi cuenta" arrow>
                        <IconButton
                          onClick={handleMenu}
                          size="small"
                          aria-label="Abrir menú de cuenta"
                          aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                          aria-haspopup="true"
                          aria-expanded={Boolean(anchorEl)}
                        >
                          <Avatar
                            src={avatarSrc}
                            alt={currentUser?.username}
                            sx={{
                              width: 36,
                              height: 36,
                              border: '2px solid rgba(255,255,255,0.3)',
                            }}
                          >
                            {currentUser?.username?.charAt(0).toUpperCase()}
                          </Avatar>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Box>
                      <Button 
                        color="inherit" 
                        component={RouterLink} 
                        to="/login"
                        startIcon={<AccountIcon />}
                        sx={{ mr: 1 }}
                      >
                        Iniciar Sesión
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="inherit" 
                        component={RouterLink} 
                        to="/register"
                      >
                        Registrarse
                      </Button>
                    </Box>
                  )}
                </section>

                {/* Menú desplegable de cuenta */}
                <Menu
                  anchorEl={anchorEl}
                  id="account-menu"
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  onClick={handleClose}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                      mt: 1.5,
                      '& .MuiAvatar-root': {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  aria-label="Opciones de cuenta"
                >
                  <MenuItem 
                    component={RouterLink} 
                    to="/profile"
                    onClick={handleClose}
                  >
                    <AccountIcon sx={{ mr: 1 }} /> Mi Perfil
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to="/tournaments"
                    state={{ initialFilter: 'mine' }}
                    onClick={handleClose}
                  >
                    <TournamentsIcon sx={{ mr: 1 }} /> Mis Torneos
                  </MenuItem>
                  {/* <MenuItem 
                    component={RouterLink} 
                    to="/my-clan"
                    onClick={handleClose}
                  >
                    <ShieldIcon sx={{ mr: 1 }} /> Mi clan
                  </MenuItem>
                  <MenuItem 
                    component={RouterLink} 
                    to="/clan-invites"
                    onClick={handleClose}
                  >
                    <MailIcon sx={{ mr: 1 }} /> Invitaciones
                  </MenuItem>
                  <MenuItem 
                    component={RouterLink} 
                    to="/clans"
                    onClick={handleClose}
                  >
                    <ShieldIcon sx={{ mr: 1 }} /> Explorar clanes
                  </MenuItem> */}
                  <MenuItem 
                    component={RouterLink} 
                    to="/ranking"
                    onClick={handleClose}
                  >
                    <TrophyIcon sx={{ mr: 1 }} /> Ranking
                  </MenuItem>
                  <MenuItem 
                    component={RouterLink} 
                    to="/players"
                    onClick={handleClose}
                  >
                    <GroupsIcon sx={{ mr: 1 }} /> Buscar jugadores
                  </MenuItem>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'owner' || currentUser?.role === 'creator') && (
                    <MenuItem 
                      component={RouterLink} 
                      to="/admin-settings"
                      onClick={handleClose}
                    >
                      <SettingsIcon sx={{ mr: 1 }} /> Ajustes de admin
                    </MenuItem>
                  )}
                  <Divider />
                  <MenuItem onClick={handleLogoutDialogOpen}>
                    <LogoutIcon sx={{ mr: 1 }} /> Cerrar Sesión
                  </MenuItem>
                </Menu>
              </Toolbar>
            </Container>
          </AppBar>
        )}
      </header>

      {/* Header para páginas de perfil */}
      {isProfilePage && (
        <header>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'primary.main',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: (theme) => theme.zIndex.appBar,
            }}
          >
            <Button
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                if (typeof window !== 'undefined' && typeof window.requestProfileLeave === 'function') {
                  window.requestProfileLeave();
                } else {
                  navigate('/');
                }
              }}
              sx={{ fontWeight: 600 }}
              aria-label="Volver a la página anterior"
            >
              Volver
            </Button>
          </Box>
        </header>
      )}

      {/* Espacio para que el contenido no quede detrás del header fijo */}
      <Box sx={{ height: isProfilePage ? 56 : 64 }} />

      <Container 
        component="main" 
        maxWidth="xl" 
        sx={{ 
          flex: 1,
          py: 4,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box
          key={location.pathname}
          className="gl-page-enter"
          sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {children}
        </Box>
      </Container>

      {/* Reemplaza el Box del footer por el componente Footer */}
      <Footer />

      {/* Drawer de notificaciones */}
      <Drawer
        anchor="right"
        open={notificationsOpen}
        onClose={handleCloseNotifications}
      >
        <Box sx={{ width: { xs: 320, sm: 380 }, p: 2, pt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Notificaciones
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleMarkAllNotificationsRead}
              disabled={notificationsLoading || unreadNotifications === 0}
              sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700 }}
            >
              Marcar todo como leído
            </Button>
          </Box>

          {notificationsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {notificationsError}
            </Alert>
          )}

          {notificationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {Array.isArray(notifications) && notifications.length > 0 ? (
                notifications.map((n) => {
                  const icon = n?.type === 'support_reply'
                    ? <SupportAgentIcon />
                    : n?.type === 'payment_approved'
                      ? <CheckCircleIcon />
                      : <NotificationsIcon />;

                  return (
                    <ListItemButton
                      key={n._id}
                      onClick={() => handleOpenNotification(n)}
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        border: '1px solid rgba(148,163,184,0.22)',
                        backgroundColor: n.read ? 'transparent' : 'rgba(168,85,247,0.10)',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: n.read ? 'text.secondary' : 'secondary.main' }}>
                        {icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={n.title}
                        secondary={
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                fontWeight: n.read ? 500 : 800,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {n.message}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
                              {new Date(n.createdAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  );
                })
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography variant="body2">
                    {notificationsDisabled ? 'Notificaciones no disponibles' : 'No tienes notificaciones'}
                  </Typography>
                </Box>
              )}
            </List>
          )}
        </Box>
      </Drawer>

      {/* Dialogs */}
      <SuspensionDialog
        open={suspensionDialogOpen}
        onClose={() => setSuspensionDialogOpen(false)}
        userStatus={userStatus}
      />

      <Dialog open={logoutDialogOpen} onClose={handleLogoutDialogClose}>
        <DialogTitle>Cerrar sesión</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que quieres cerrar sesión?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutDialogClose}>Cancelar</Button>
          <Button onClick={handleLogout} color="primary" variant="contained">
            Cerrar sesión
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reactivationDialogOpen} onClose={() => setReactivationDialogOpen(false)}>
        <DialogTitle sx={{ color: 'success.main' }}>¡Cuenta reactivada!</DialogTitle>
        <DialogContent>
          <Typography>
            Tu cuenta ha sido reactivada y ya puedes usar todas las funciones de Ghost League.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReactivationDialogOpen(false)} variant="contained">
            Continuar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Botón de ayuda flotante - solo mostrar en desktop */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <FloatingHelpButton />
      </Box>
    </Box>
  );
};

export default Layout;
