import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Support as SupportIcon, Send as SendIcon, Add as AddIcon } from '@mui/icons-material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState('open');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesBoxRef = useRef(null);
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubject, setCreateSubject] = useState('Soporte técnico');
  const [createCategory, setCreateCategory] = useState('technical');
  const [createMessage, setCreateMessage] = useState('');
  const [createSending, setCreateSending] = useState(false);

  const scrollToEnd = () => {
    const el = messagesBoxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    const fetchTickets = async () => {
      setTicketsLoading(true);
      setError('');
      try {
        const response = await api.get(
          `/users/support/tickets?status=${encodeURIComponent(statusFilter)}`
        );
        const fetched = response.data?.tickets || [];
        setTickets(Array.isArray(fetched) ? fetched : []);

        if (!selectedTicket && Array.isArray(fetched) && fetched.length > 0) {
          const first = fetched[0];
          if (first?._id) {
            await fetchTicketById(first._id);
          }
        }

        if (
          selectedTicket &&
          Array.isArray(fetched) &&
          !fetched.some((t) => t._id === selectedTicket._id)
        ) {
          setSelectedTicket(null);
        }
      } catch (err) {
        console.error('Error al cargar tickets de soporte:', err);
        setError('No se pudieron cargar tus tickets de soporte.');
      } finally {
        setTicketsLoading(false);
      }
    };

    fetchTickets();
  }, [statusFilter]);

  const fetchTicketById = async (id) => {
    if (!id) return;
    setTicketLoading(true);
    setError('');
    try {
      const response = await api.get(`/users/support/ticket/${id}`);
      setSelectedTicket(response.data);
      setTimeout(scrollToEnd, 100);
    } catch (err) {
      console.error('Error al cargar ticket de soporte:', err);
      setError('No se pudo cargar el ticket seleccionado.');
    } finally {
      setTicketLoading(false);
    }
  };

  useEffect(() => {
    if (!ticketsLoading && !ticketLoading) {
      scrollToEnd();
    }
  }, [ticketsLoading, ticketLoading, selectedTicket]);

  const handleSend = async () => {
    if (!message.trim()) return;

    if (!selectedTicket || !selectedTicket._id) {
      setError('Selecciona un ticket o crea uno nuevo.');
      return;
    }

    if (selectedTicket.status === 'closed') {
      setError('Este ticket está cerrado. Espera a que soporte lo reabra.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await api.put(
        `/users/support/ticket/${selectedTicket._id}/reply`,
        { message }
      );
      const updated = response.data.ticket || response.data;
      setSelectedTicket(updated);
      setTickets((prev) =>
        prev.map((t) => (t._id === updated._id ? { ...t, ...updated } : t))
      );
      setMessage('');
      setTimeout(scrollToEnd, 100);
    } catch (err) {
      console.error('Error al enviar mensaje al soporte:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'No se pudo enviar tu mensaje.');
    } finally {
      setSending(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!createMessage.trim()) return;
    setCreateSending(true);
    setError('');
    try {
      const response = await api.put('/users/support/ticket', {
        message: createMessage,
        subject: createSubject,
        category: createCategory,
      });

      const created = response.data.ticket || response.data;
      setCreateOpen(false);
      setCreateMessage('');
      setCreateSubject('Soporte técnico');
      setCreateCategory('technical');

      setSelectedTicket(created);
      setStatusFilter('open');
      setTickets((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      setTimeout(scrollToEnd, 100);
    } catch (err) {
      console.error('Error al crear ticket:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'No se pudo crear el ticket.');
    } finally {
      setCreateSending(false);
    }
  };

  const messages = selectedTicket
    ? Array.isArray(selectedTicket.conversation) && selectedTicket.conversation.length > 0
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
    : [];

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,27,75,0.96) 100%)',
          border: '1px solid rgba(148,163,184,0.4)',
          color: '#e5e7eb',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(88,28,135,0.8)',
                boxShadow: '0 0 18px rgba(168,85,247,0.7)',
              }}
            >
              <SupportIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Soporte técnico
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.9)' }}>
                Envía tickets y conversa con el equipo de soporte.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setCreateOpen(true)}
              startIcon={<AddIcon />}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px' }}
            >
              Nuevo ticket
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(-1)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Volver
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button
                size="small"
                variant={statusFilter === 'open' ? 'contained' : 'outlined'}
                onClick={() => setStatusFilter('open')}
                sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700 }}
              >
                Abiertos
              </Button>
              <Button
                size="small"
                variant={statusFilter === 'closed' ? 'contained' : 'outlined'}
                onClick={() => setStatusFilter('closed')}
                sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700 }}
              >
                Cerrados
              </Button>
            </Box>

            <Box
              sx={{
                borderRadius: 2,
                bgcolor: 'rgba(15,23,42,0.9)',
                border: '1px solid rgba(148,163,184,0.2)',
                overflow: 'hidden',
              }}
            >
              {ticketsLoading ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 220,
                  }}
                >
                  <CircularProgress color="inherit" size={22} />
                </Box>
              ) : tickets.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.9)' }}>
                    No hay tickets en esta vista.
                  </Typography>
                </Box>
              ) : (
                <List dense sx={{ p: 0, maxHeight: 360, overflowY: 'auto' }}>
                  {tickets.map((t) => (
                    <ListItem key={t._id} disablePadding>
                      <ListItemButton
                        selected={selectedTicket?._id === t._id}
                        onClick={() => fetchTicketById(t._id)}
                      >
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography variant="subtitle2" sx={{ color: '#f9fafb' }}>
                                {t.subject || 'Soporte técnico'}
                              </Typography>
                              <Chip
                                size="small"
                                label={t.status === 'closed' ? 'Cerrado' : 'Abierto'}
                                color={t.status === 'closed' ? 'default' : 'success'}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              sx={{ color: 'rgba(148,163,184,0.9)' }}
                            >
                              {(t.lastMessage || '').slice(0, 48)}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box
              sx={{
                borderRadius: 2,
                bgcolor: 'rgba(15,23,42,0.9)',
                border: '1px solid rgba(148,163,184,0.2)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(148,163,184,0.2)',
                  gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800, color: '#f9fafb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {selectedTicket?.subject || 'Selecciona un ticket'}
                  </Typography>
                  {selectedTicket?.status && (
                    <Chip
                      size="small"
                      label={selectedTicket.status === 'closed' ? 'Cerrado' : 'Abierto'}
                      color={selectedTicket.status === 'closed' ? 'default' : 'success'}
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>

                <Box />
              </Box>

              <Box ref={messagesBoxRef} sx={{ height: 300, p: 2, overflowY: 'auto' }}>
                {ticketLoading ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                    }}
                  >
                    <CircularProgress color="inherit" size={22} />
                  </Box>
                ) : !selectedTicket ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      textAlign: 'center',
                      px: 4,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.9)' }}>
                      Selecciona un ticket de la bandeja o crea uno nuevo.
                    </Typography>
                  </Box>
                ) : messages.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      textAlign: 'center',
                      px: 4,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.9)' }}>
                      Este ticket aún no tiene mensajes.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {messages.map((msg, index) => {
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
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
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
                  </>
                )}
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderTop: '1px solid rgba(148,163,184,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Escribe tu mensaje para soporte..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending || !selectedTicket || selectedTicket.status === 'closed'}
                  multiline
                  maxRows={3}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(15,23,42,0.95)',
                      borderRadius: 3,
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148,163,184,0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(191,219,254,0.9)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#a855f7',
                      },
                    },
                  }}
                />
                <IconButton
                  onClick={handleSend}
                  disabled={
                    sending ||
                    !message.trim() ||
                    !selectedTicket ||
                    selectedTicket.status === 'closed'
                  }
                  sx={{
                    bgcolor: '#a855f7',
                    color: '#0b1020',
                    width: 42,
                    height: 42,
                    '&:hover': { bgcolor: '#8b5cf6' },
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(148,163,184,0.4)',
                    },
                  }}
                >
                  {sending ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SendIcon />
                  )}
                </IconButton>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo ticket</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Asunto"
              value={createSubject}
              onChange={(e) => setCreateSubject(e.target.value)}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select
                value={createCategory}
                label="Categoría"
                onChange={(e) => setCreateCategory(e.target.value)}
              >
                <MenuItem value="technical">Soporte técnico</MenuItem>
                <MenuItem value="account">Cuenta</MenuItem>
                <MenuItem value="tournaments">Torneos</MenuItem>
                <MenuItem value="other">Otro</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Mensaje"
              value={createMessage}
              onChange={(e) => setCreateMessage(e.target.value)}
              fullWidth
              multiline
              minRows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleCreateTicket}
            variant="contained"
            disabled={createSending || !createMessage.trim()}
          >
            {createSending ? 'Enviando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Support;
