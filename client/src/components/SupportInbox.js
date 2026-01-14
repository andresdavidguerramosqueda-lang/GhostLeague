import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  SupportAgent as SupportAgentIcon,
  MarkEmailRead as MarkReadIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import api from '../services/api';

const SupportInbox = ({ open, onClose, initialScope = 'inbox' }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [scope, setScope] = useState(initialScope);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setScope(initialScope);
      setSearchTerm('');
      setStatusFilter('open');
      setTypeFilter('all');
    }
  }, [open, initialScope]);

  useEffect(() => {
    if (open) {
      fetchTickets(scope);
    }
  }, [open, scope, statusFilter]);

  useEffect(() => {
    if (detailOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detailOpen, selectedTicket]);

  const fetchTickets = async (currentScope) => {
    try {
      setLoading(true);
      const response = await api.get(
        `/users/admin/support-tickets?scope=${currentScope}&status=${statusFilter}`
      );
      const fetched = response.data.tickets || [];
      const sorted = Array.isArray(fetched)
        ? fetched.sort((a, b) => {
            if (a.read === b.read) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return a.read ? 1 : -1;
          })
        : [];

      setTickets(sorted);
    } catch (error) {
      console.error('Error al obtener tickets de soporte (admin):', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTicket = async () => {
    if (!selectedTicket?._id) return;
    setActionLoading(true);
    setReplyError('');
    try {
      const response = await api.put(
        `/users/admin/support-tickets/${selectedTicket._id}/take`
      );
      const updatedTicket = response.data.ticket || response.data;
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
      );
      setSelectedTicket(updatedTicket);
      if (scope === 'inbox') {
        setScope('taken');
      }
    } catch (error) {
      console.error('Error al tomar ticket:', error.response?.data || error.message);
      setReplyError(error.response?.data?.message || 'Error al tomar el ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket?._id) return;
    setActionLoading(true);
    setReplyError('');
    try {
      const response = await api.put(
        `/users/admin/support-tickets/${selectedTicket._id}/close`
      );
      const updatedTicket = response.data.ticket || response.data;
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
      );
      setSelectedTicket(updatedTicket);
    } catch (error) {
      console.error('Error al cerrar ticket:', error.response?.data || error.message);
      setReplyError(error.response?.data?.message || 'Error al cerrar el ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket?._id) return;
    setActionLoading(true);
    setReplyError('');
    try {
      const response = await api.put(
        `/users/admin/support-tickets/${selectedTicket._id}/reopen`
      );
      const updatedTicket = response.data.ticket || response.data;
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
      );
      setSelectedTicket(updatedTicket);
    } catch (error) {
      console.error('Error al reabrir ticket:', error.response?.data || error.message);
      setReplyError(error.response?.data?.message || 'Error al reabrir el ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsRead = async (ticketId) => {
    try {
      await api.put(`/users/admin/support-tickets/${ticketId}/read`);
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, read: true } : t))
      );
    } catch (error) {
      console.error('Error al marcar ticket como leído:', error);
    }
  };

  const handleOpenDetail = (ticket) => {
    const isPaymentValidation =
      ticket?.subtype === 'payment_validation' && ticket?.tournament;

    if (isPaymentValidation) {
      if (!ticket.read) {
        handleMarkAsRead(ticket._id);
      }
      if (typeof onClose === 'function') {
        onClose();
      }
      navigate(`/tournaments/${ticket.tournament}`);
      return;
    }

    setSelectedTicket(ticket);
    setDetailOpen(true);
    if (!ticket.read) {
      handleMarkAsRead(ticket._id);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setReplyLoading(true);
    setReplyError('');
    try {
      const response = await api.put(
        `/users/admin/support-tickets/${selectedTicket._id}/reply`,
        {
          message: replyMessage,
        }
      );

      const updatedTicket = response.data.ticket || response.data;
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
      );
      setSelectedTicket(updatedTicket);
      setReplyMessage('');

      setTimeout(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error(
        'Error al responder ticket de soporte:',
        error.response?.data || error.message
      );
      setReplyError(
        error.response?.data?.message || 'Error al enviar la respuesta'
      );
    } finally {
      setReplyLoading(false);
    }
  };

  const unreadCount = tickets.filter((t) => !t.read).length;

  const filteredTickets = tickets.filter((t) => {
    // Filtro por tipo de mensaje (solo aplica si typeFilter != 'all')
    if (typeFilter !== 'all') {
      const subtype = t.subtype || 'general';
      const category = (t.category || '').toLowerCase();
      let matchesType = true;

      switch (typeFilter) {
        case 'support':
          matchesType = subtype === 'general' && category !== 'tournaments';
          break;
        case 'payment_validation':
          matchesType = subtype === 'payment_validation';
          break;
        case 'payment_report':
          // Usamos esta opción también para casos tipo "apelación" de cuenta
          matchesType = subtype === 'payment_report' || category === 'account';
          break;
        default:
          matchesType = true;
      }

      if (!matchesType) return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const username = (t.username || '').toLowerCase();
    const email = (t.email || '').toLowerCase();
    const subject = (t.subject || '').toLowerCase();
    const message = (t.message || '').toLowerCase();
    return (
      username.includes(term) ||
      email.includes(term) ||
      subject.includes(term) ||
      message.includes(term)
    );
  });

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

  const handleTabChange = (event, newValue) => {
    setScope(newValue);
  };

  return (
    <>
      {/* Diálogo principal: lista de tickets de soporte */}
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
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'secondary.main',
                boxShadow: '0 0 15px rgba(236, 72, 153, 0.5)',
              }}
            >
              <SupportAgentIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff' }}>
                Soporte técnico
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.6)' }}
              >
                {unreadCount > 0
                  ? `${unreadCount} tickets nuevos`
                  : 'No tienes tickets nuevos'}
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
              icon={<ChatIcon fontSize="small" />}
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
          ) : tickets.length === 0 ? (
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
              <SupportAgentIcon
                sx={{ fontSize: 56, mb: 2, color: 'rgba(255,255,255,0.2)' }}
              />
              <Typography color="text.secondary">
                No hay tickets de soporte en esta vista
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2, pt: 1, height: '100%', boxSizing: 'border-box' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  mb: 1.5,
                  alignItems: 'center',
                }}
              >
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Estado"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="open">Abiertos</MenuItem>
                    <MenuItem value="closed">Cerrados</MenuItem>
                    <MenuItem value="all">Todos</MenuItem>
                  </Select>
                </FormControl>

                {scope === 'taken' && (
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Tipo de mensaje</InputLabel>
                    <Select
                      value={typeFilter}
                      label="Tipo de mensaje"
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <MenuItem value="all">Todos</MenuItem>
                      <MenuItem value="support">Soporte técnico</MenuItem>
                      <MenuItem value="payment_validation">
                        Validación de pago
                      </MenuItem>
                      <MenuItem value="payment_report">
                        Reporte / apelación
                      </MenuItem>
                    </Select>
                  </FormControl>
                )}

                <TextField
                  fullWidth
                  placeholder="Buscar por usuario, email, asunto o mensaje"
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    flex: 1,
                    minWidth: 220,
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
                        borderColor: '#ec4899',
                      },
                    },
                  }}
                />
              </Box>

              {filteredTickets.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 340,
                    opacity: 0.8,
                  }}
                >
                  <Typography color="text.secondary">
                    No hay tickets que coincidan con el filtro
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0, maxHeight: 360, overflowY: 'auto' }}>
                  {filteredTickets.map((ticket) => (
                    <React.Fragment key={ticket._id}>
                      <ListItem
                        button
                        onClick={() => handleOpenDetail(ticket)}
                        sx={{
                          p: 2,
                          transition: 'all 0.2s ease',
                          bgcolor: ticket.read
                            ? 'transparent'
                            : 'rgba(236, 72, 153, 0.12)',
                          borderLeft: ticket.read
                            ? '4px solid transparent'
                            : '4px solid #ec4899',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.04)',
                            pl: ticket.read ? 2.2 : 2.6,
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
                                  bgcolor:
                                    ticket.status === 'open'
                                      ? 'success.main'
                                      : 'grey.500',
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
                              {ticket.username?.charAt(0).toUpperCase()}
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
                                {ticket.username}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255,255,255,0.5)' }}
                              >
                                {new Date(ticket.createdAt).toLocaleString('es-ES')}
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
                                  label={ticket.subject || 'Soporte técnico'}
                                  color="secondary"
                                  size="small"
                                  sx={{
                                    fontSize: '0.7rem',
                                    height: 22,
                                    borderRadius: '999px',
                                  }}
                                />
                              </Box>

                              {ticket.assignedTo && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(148,163,184,0.9)',
                                    display: 'block',
                                  }}
                                >
                                  Atendido por:{' '}
                                  {ticket.assignedTo.username || 'Moderador'}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>

        {selectedTicket && (
          <Dialog
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
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
                pb: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: 'secondary.dark' }}>
                  {selectedTicket.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{ color: '#f9fafb', lineHeight: 1.2 }}
                  >
                    {selectedTicket.username}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(148,163,184,0.9)' }}
                  >
                    {selectedTicket.email}
                  </Typography>
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
                  bgcolor: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.35)',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#93c5fd',
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    mb: 0.5,
                    display: 'block',
                  }}
                >
                  ASUNTO
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(241,245,249,0.95)' }}
                >
                  {selectedTicket.subject || 'Soporte técnico'}
                </Typography>
              </Paper>

              <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 0.5 }}>
                {(
                  Array.isArray(selectedTicket.conversation) &&
                  selectedTicket.conversation.length > 0
                    ? selectedTicket.conversation
                    : selectedTicket.message
                    ? [
                        {
                          from: 'user',
                          message: selectedTicket.message,
                          createdAt: selectedTicket.createdAt,
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
                              ? 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)'
                              : undefined,
                            color: '#e5e7eb',
                            boxShadow: !isUser
                              ? '0 8px 24px rgba(236,72,153,0.35)'
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

              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                {!selectedTicket.assignedTo && selectedTicket.status === 'open' && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleTakeTicket}
                    disabled={actionLoading || replyLoading}
                  >
                    Tomar caso
                  </Button>
                )}

                {selectedTicket.status === 'open' ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCloseTicket}
                    disabled={actionLoading || replyLoading}
                  >
                    Cerrar
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleReopenTicket}
                    disabled={actionLoading || replyLoading}
                  >
                    Reabrir
                  </Button>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Escribe una respuesta para el usuario..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={replyLoading || actionLoading || selectedTicket.status === 'closed'}
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
                        borderColor: '#ec4899',
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
                  disabled={replyLoading || actionLoading || !replyMessage.trim() || selectedTicket.status === 'closed'}
                  sx={{
                    bgcolor: 'secondary.main',
                    color: '#fff',
                    width: 42,
                    height: 42,
                    '&:hover': { bgcolor: 'secondary.dark' },
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
          </Dialog>
        )}
      </Dialog>
    </>
  );
};

export default SupportInbox;
