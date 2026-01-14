import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Paper,
  TextField,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Inbox as InboxIcon,
  MarkEmailRead as MarkReadIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
  Send as SendIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AppealsInbox = ({ open, onClose, initialScope = 'inbox' }) => {
  const { currentUser } = useAuth();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState('');
  const chatEndRef = useRef(null);
  const [scope, setScope] = useState(initialScope);
  const [adminFilter, setAdminFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const role = (currentUser?.role || '').toLowerCase();
  const isOwner = role === 'owner' || role === 'owener';

  const getAssignedId = (assignedTo) =>
    assignedTo && typeof assignedTo === 'object' ? assignedTo._id : assignedTo;

  const getAssignedName = (assignedTo) =>
    assignedTo && typeof assignedTo === 'object' ? assignedTo.username : undefined;

  useEffect(() => {
    if (open) {
      setScope(initialScope);
      setAdminFilter('all');
      setStatusFilter('all');
      setSearchTerm('');
    }
  }, [open, initialScope]);

  useEffect(() => {
    if (open) {
      fetchAppeals(scope);
    }
  }, [open, scope]);

  useEffect(() => {
    if (detailOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detailOpen, selectedAppeal]);

  const fetchAppeals = async (currentScope) => {
    try {
      setLoading(true);
      const response = await api.get(`/users/admin/appeals?scope=${currentScope}`);
      const fetchedAppeals = response.data.appeals || response.data;
      const sortedAppeals = Array.isArray(fetchedAppeals)
        ? fetchedAppeals.sort((a, b) => {
            if (a.read === b.read) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return a.read ? 1 : -1;
          })
        : [];
      setAppeals(sortedAppeals);
    } catch (error) {
      console.error('Error al obtener apelaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setScope(newValue);
  };

  const handleMarkAsRead = async (appealId) => {
    try {
      await api.put(`/users/admin/appeals/${appealId}/read`);
      setAppeals((prev) =>
        prev.map((appeal) =>
          appeal._id === appealId ? { ...appeal, read: true } : appeal
        )
      );
    } catch (error) {
      console.error('Error al marcar apelación como leída:', error);
    }
  };

  const handleOpenDetail = (appeal) => {
    setSelectedAppeal(appeal);
    setDetailOpen(true);
    if (!appeal.read) {
      handleMarkAsRead(appeal._id);
    }
  };

  const handleSendReply = async () => {
    if (!selectedAppeal || !replyMessage.trim()) return;

    setReplyLoading(true);
    setReplyError('');
    try {
      const response = await api.put(
        `/users/admin/appeals/${selectedAppeal._id}/reply`,
        {
          message: replyMessage,
        }
      );

      const updatedAppeal = response.data.appeal || response.data;
      setAppeals((prev) =>
        scope === 'inbox' && updatedAppeal.assignedTo
          ? prev.filter((a) => a._id !== updatedAppeal._id)
          : prev.map((a) => (a._id === updatedAppeal._id ? updatedAppeal : a))
      );
      setSelectedAppeal(updatedAppeal);
      setReplyMessage('');

      setTimeout(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error(
        'Error al responder apelación:',
        error.response?.data || error.message
      );
      setReplyError(
        error.response?.data?.message || 'Error al enviar la respuesta'
      );
    } finally {
      setReplyLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    return status === 'banned' ? (
      <BlockIcon sx={{ fontSize: 18 }} />
    ) : (
      <WarningIcon sx={{ fontSize: 18 }} />
    );
  };

  const getStatusColor = (status) => {
    return status === 'banned' ? 'error' : 'warning';
  };

  const getStatusText = (status) => {
    return status === 'banned' ? 'Baneado' : 'Suspendido';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Hace unos minutos';
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    }
  };

  const unreadCount = appeals.filter((appeal) => !appeal.read).length;
  let filteredAppeals = appeals;

  if (scope === 'taken') {
    if (isOwner && adminFilter !== 'all') {
      filteredAppeals = filteredAppeals.filter((appeal) => {
        const assignedId = getAssignedId(appeal.assignedTo);
        return assignedId && assignedId === adminFilter;
      });
    }
  }

  if (statusFilter !== 'all') {
    filteredAppeals = filteredAppeals.filter(
      (appeal) => (appeal.status || '').toLowerCase() === statusFilter
    );
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredAppeals = filteredAppeals.filter((appeal) => {
      const username = (appeal.username || '').toLowerCase();
      const email = (appeal.email || '').toLowerCase();
      const message = (appeal.message || '').toLowerCase();
      const reason = (appeal.reason || '').toLowerCase();
      return (
        username.includes(term) ||
        email.includes(term) ||
        message.includes(term) ||
        reason.includes(term)
      );
    });
  }

  const adminOptions = [];
  const seenAdmins = new Set();
  if (Array.isArray(appeals)) {
    appeals.forEach((appeal) => {
      const assignedId = getAssignedId(appeal.assignedTo);
      if (assignedId && !seenAdmins.has(assignedId)) {
        seenAdmins.add(assignedId);
        adminOptions.push({
          id: assignedId,
          name: getAssignedName(appeal.assignedTo) || 'Admin',
        });
      }
    });
  }

  const glassPaperProps = {
    sx: {
      borderRadius: 3,
      background:
        'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
  };

  return (
    <>
      {/* Diálogo principal: lista de apelaciones */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={glassPaperProps}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)',
              }}
            >
              <InboxIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff' }}>
                Bandeja de apelaciones
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.6)' }}
              >
                {unreadCount > 0
                  ? `${unreadCount} mensajes nuevos`
                  : 'No tienes mensajes nuevos'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box sx={{ borderBottom: '1px solid rgba(148,163,184,0.25)' }}>
          <Tabs
            value={scope}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="secondary"
            indicatorColor="secondary"
          >
            <Tab
              label="Bandeja"
              value="inbox"
              icon={<InboxIcon fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              label="Casos tomados"
              value="taken"
              icon={<MarkReadIcon fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ minHeight: 400, maxHeight: 600, p: 0 }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 400,
              }}
            >
              <CircularProgress color="secondary" />
            </Box>
          ) : filteredAppeals.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: 400,
                opacity: 0.8,
              }}
            >
              <InboxIcon
                sx={{ fontSize: 56, mb: 2, color: 'rgba(255,255,255,0.2)' }}
              />
              <Typography color="text.secondary">
                No hay apelaciones pendientes
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {scope === 'taken' && (
                <Box
                  sx={{
                    p: 2,
                    pb: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    alignItems: 'center',
                  }}
                >
                  {isOwner && adminOptions.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Administrador</InputLabel>
                      <Select
                        value={adminFilter}
                        label="Administrador"
                        onChange={(e) => setAdminFilter(e.target.value)}
                      >
                        <MenuItem value="all">Todos</MenuItem>
                        {adminOptions.map((admin) => (
                          <MenuItem key={admin.id} value={admin.id}>
                            {admin.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Estado</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Estado"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">Todos</MenuItem>
                      <MenuItem value="suspended">Suspendidos</MenuItem>
                      <MenuItem value="banned">Baneados</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    label="Filtrar casos"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ minWidth: 220 }}
                  />
                </Box>
              )}

              <List sx={{ p: 0, flexGrow: 1, overflowY: 'auto' }}>
                {filteredAppeals.map((appeal, index) => (
                  <React.Fragment key={appeal._id}>
                    <ListItem
                      button
                      onClick={() => handleOpenDetail(appeal)}
                      sx={{
                        p: 2,
                        transition: 'all 0.2s ease',
                        bgcolor: appeal.read
                          ? 'transparent'
                          : 'rgba(139, 92, 246, 0.12)',
                        borderLeft: appeal.read
                          ? '4px solid transparent'
                          : '4px solid #8b5cf6',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.04)',
                          pl: appeal.read ? 2.2 : 2.6,
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                          }}
                          badgeContent={
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: `${getStatusColor(appeal.status)}.main`,
                                border: '2px solid #020617',
                              }}
                            />
                          }
                        >
                          <Avatar
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.08)',
                              color: '#fff',
                            }}
                          >
                            {appeal.username?.charAt(0).toUpperCase()}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>

                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 0.5,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              sx={{ color: '#f9fafb' }}
                            >
                              {appeal.username}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: 'rgba(255,255,255,0.5)' }}
                            >
                              {formatDate(appeal.createdAt)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 0.5,
                              }}
                            >
                              <Chip
                                label={getStatusText(appeal.status)}
                                color={getStatusColor(appeal.status)}
                                size="small"
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 22,
                                  borderRadius: '999px',
                                }}
                              />
                            </Box>
                            {getAssignedName(appeal.assignedTo) && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'rgba(148,163,184,0.9)',
                                  display: 'block',
                                }}
                              >
                                Caso tomado por: {getAssignedName(appeal.assignedTo)}
                              </Typography>
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'rgba(255,255,255,0.7)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {appeal.message}
                            </Typography>
                          </Box>
                        }
                      />

                      {!appeal.read && (
                        <Tooltip title="Marcar como leído">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(appeal._id);
                            }}
                            size="small"
                            sx={{
                              color: 'rgba(255,255,255,0.6)',
                              '&:hover': { color: '#fff' },
                            }}
                          >
                            <MarkReadIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </ListItem>
                    {index < filteredAppeals.length - 1 && (
                      <Divider sx={{ borderColor: 'rgba(148,163,184,0.25)' }} />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalle tipo chat */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={glassPaperProps}
      >
        {selectedAppeal && (
          <>
            <DialogTitle
              sx={{
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.dark' }}>
                  {selectedAppeal.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{ color: '#f9fafb', lineHeight: 1.2 }}
                  >
                    {selectedAppeal.username}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(148,163,184,0.9)' }}
                    >
                      {selectedAppeal.email}
                    </Typography>
                    <Box
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: 'rgba(148,163,184,0.7)',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: `${getStatusColor(selectedAppeal.status)}.main`,
                        fontWeight: 600,
                      }}
                    >
                      {getStatusText(selectedAppeal.status)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <IconButton
                onClick={() => setDetailOpen(false)}
                sx={{ color: 'rgba(148,163,184,0.9)' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent
              sx={{
                p: 2,
                bgcolor: 'rgba(15,23,42,0.9)',
                height: 400,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 2,
                  bgcolor: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#fbbf24',
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    mb: 0.5,
                    display: 'block',
                  }}
                >
                  MOTIVO DE SANCIÓN
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(241,245,249,0.95)' }}
                >
                  {selectedAppeal.reason}
                </Typography>
              </Paper>

              <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 0.5 }}>
                {(
                  Array.isArray(selectedAppeal.conversation) &&
                  selectedAppeal.conversation.length > 0
                    ? selectedAppeal.conversation
                    : selectedAppeal.message
                    ? [
                        {
                          from: 'user',
                          message: selectedAppeal.message,
                          createdAt: selectedAppeal.createdAt,
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
                        justifyContent: isUser ? 'flex-start' : 'flex-end',
                        mb: 2,
                      }}
                    >
                      <Box sx={{ maxWidth: '80%' }}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: isUser
                              ? '18px 18px 18px 4px'
                              : '18px 18px 4px 18px',
                            bgcolor: isUser
                              ? 'rgba(15,23,42,0.9)'
                              : 'transparent',
                            background: !isUser
                              ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                              : undefined,
                            color: '#e5e7eb',
                            boxShadow: !isUser
                              ? '0 8px 24px rgba(79,70,229,0.35)'
                              : 'none',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-line' }}
                          >
                            {msg.message}
                          </Typography>
                        </Paper>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.4,
                            textAlign: isUser ? 'left' : 'right',
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
                    </Box>
                  );
                })}
                <div ref={chatEndRef} />
              </Box>
            </DialogContent>

            <Box
              sx={{
                p: 2,
                borderTop: '1px solid rgba(30,64,175,0.5)',
                bgcolor: 'rgba(15,23,42,0.95)',
              }}
            >
              {replyError && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
                  {replyError}
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Escribe una respuesta..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={replyLoading}
                  multiline
                  maxRows={3}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(15,23,42,0.95)',
                      borderRadius: 3,
                      color: '#f9fafb',
                      '& fieldset': {
                        borderColor: 'rgba(148,163,184,0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(191,219,254,0.9)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#8b5cf6',
                      },
                    },
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <IconButton
                  onClick={handleSendReply}
                  disabled={replyLoading || !replyMessage.trim()}
                  sx={{
                    bgcolor: 'primary.main',
                    color: '#fff',
                    width: 42,
                    height: 42,
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(148,163,184,0.4)',
                    },
                  }}
                >
                  {replyLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SendIcon fontSize="small" />
                  )}
                </IconButton>
              </Box>
            </Box>
          </>
        )}
      </Dialog>
    </>
  );
};

export default AppealsInbox;
