// src/pages/Tournaments.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  IconButton,
} from '@mui/material';
import {
  EmojiEvents as EmojiEventsIcon,
  AccessTime as AccessTimeIcon,
  Group as GroupIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusConfig = {
  mine: { label: 'Mis Torneos' },
  all: { label: 'Todos' },
  upcoming: { label: 'Próximos', color: 'info', chipLabel: 'Próximamente' },
  ongoing: { label: 'En curso', color: 'success', chipLabel: 'En Curso' },
  completed: { label: 'Finalizados', color: 'default', chipLabel: 'Finalizado' },
  cancelled: { label: 'Cancelados', color: 'error', chipLabel: 'Cancelado' },
};

function Tournaments() {
  const [tournaments, setTournaments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState(
    () => location.state?.initialFilter || 'upcoming'
  );
  const { isAdmin, currentUser } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const createDateTimeLocalString = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [createData, setCreateData] = useState(() => {
    const now = new Date();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return {
      name: '',
      game: 'brawlstars',
      description: '',
      maxParticipants: 16,
      registrationFee: 0,
      startDateTime: createDateTimeLocalString(now),
      endDateTime: createDateTimeLocalString(end),
    };
  });

  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const response = await api.get('/tournaments');
        setTournaments(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error al cargar torneos:', err);
        setError('No se pudieron cargar los torneos. Intenta más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const handleFilterChange = (event, newValue) => {
    setStatusFilter(newValue);
  };

  const handleOpenCreate = () => {
    setCreateErrors({});
    const now = new Date();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setCreateData({
      name: '',
      game: 'brawlstars',
      description: '',
      maxParticipants: 16,
      registrationFee: 0,
      startDateTime: createDateTimeLocalString(now),
      endDateTime: createDateTimeLocalString(end),
    });
    setCreateOpen(true);
  };

  const handleCloseCreate = () => {
    if (!creating) {
      setCreateOpen(false);
    }
  };

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateData((prev) => ({ ...prev, [name]: value }));
    if (createErrors[name]) {
      setCreateErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateCreate = () => {
    const errors = {};

    if (!createData.name.trim()) {
      errors.name = 'El nombre es obligatorio';
    }
    if (!createData.game) {
      errors.game = 'Selecciona un juego';
    }
    if (!createData.startDateTime) {
      errors.startDateTime = 'La fecha y hora de inicio es obligatoria';
    }
    if (!createData.endDateTime) {
      errors.endDateTime = 'La fecha y hora de fin es obligatoria';
    }
    if (!errors.startDateTime && !errors.endDateTime) {
      const start = new Date(createData.startDateTime);
      const end = new Date(createData.endDateTime);
      if (Number.isNaN(start.getTime())) {
        errors.startDateTime = 'Fecha y hora de inicio inválidas';
      }
      if (Number.isNaN(end.getTime())) {
        errors.endDateTime = 'Fecha y hora de fin inválidas';
      }
      if (!errors.startDateTime && !errors.endDateTime && start >= end) {
        errors.endDateTime =
          'La fecha y hora de fin deben ser posteriores a la de inicio';
      }
    }
    const max = Number(createData.maxParticipants);

    if (!max || max < 2) {
      errors.maxParticipants = 'Debe haber al menos 2 participantes';
    }
    const fee = Number(createData.registrationFee);
    if (fee < 0) {
      errors.registrationFee = 'El costo no puede ser negativo';
    }
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async () => {
    if (!validateCreate()) return;
    setCreating(true);
    try {
      const start = new Date(createData.startDateTime);
      const end = new Date(createData.endDateTime);

      const payload = {
        name: createData.name.trim(),
        game: createData.game,
        description:
          createData.description.trim() ||
          `Torneo de ${
            createData.game === 'brawlstars' ? 'Brawl Stars' : 'Clash Royale'
          }`,
        type: '1vs1',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        maxParticipants: Number(createData.maxParticipants),
        registrationFee: Number(createData.registrationFee) || 0,

        rules: 'Reglas por definir',
        status: 'upcoming',
      };

      await api.post('/tournaments', payload);
      const response = await api.get('/tournaments');
      setTournaments(Array.isArray(response.data) ? response.data : []);
      setCreateOpen(false);
    } catch (err) {
      console.error('Error al crear torneo:', err);
      setCreateErrors((prev) => ({
        ...prev,
        form:
          err.response?.data?.message || 'Error al crear el torneo. Intenta de nuevo.',
      }));
    } finally {
      setCreating(false);
    }
  };

  const isCancelledOlderThan24h = (tournament) => {
    const status = tournament.status || 'upcoming';
    if (status !== 'cancelled' || !tournament.updatedAt) {
      return false;
    }

    const cancelledAt = new Date(tournament.updatedAt).getTime();
    const now = Date.now();
    const HOURS_24 = 24 * 60 * 60 * 1000;

    return now - cancelledAt > HOURS_24;
  };

  const isCompletedOlderThan7Days = (tournament) => {
    const status = tournament.status || 'upcoming';
    if (status !== 'completed') {
      return false;
    }

    const completedRaw = tournament.completedAt || tournament.endDate || tournament.updatedAt;
    if (!completedRaw) {
      return false;
    }

    const completedAt = new Date(completedRaw).getTime();
    if (Number.isNaN(completedAt)) {
      return false;
    }

    const now = Date.now();
    const DAYS_7 = 7 * 24 * 60 * 60 * 1000;
    return now - completedAt > DAYS_7;
  };

  const currentUserId = currentUser?.id || currentUser?._id;

  const isUserParticipating = (tournament) => {
    if (!currentUserId || !Array.isArray(tournament.participants)) {
      return false;
    }

    const currentId = String(currentUserId);

    return tournament.participants.some((p) => {
      const user = p?.user;
      if (!user) return false;

      const participantId =
        typeof user === 'string' || typeof user === 'number'
          ? String(user)
          : String(user._id || user.id || '');

      return participantId === currentId;
    });
  };

  const isUserOrganizer = (tournament) => {
    if (!currentUserId || !tournament.createdBy) {
      return false;
    }

    const currentId = String(currentUserId);
    const createdBy = tournament.createdBy;
    const createdById =
      typeof createdBy === 'string' || typeof createdBy === 'number'
        ? String(createdBy)
        : String(createdBy._id || createdBy.id || '');

    return createdById === currentId;
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    const status = tournament.status || 'upcoming';

    if (isCancelledOlderThan24h(tournament)) {
      return false;
    }

    if (isCompletedOlderThan7Days(tournament)) {
      return false;
    }

    if (statusFilter === 'mine') {
      return isUserParticipating(tournament) || isUserOrganizer(tournament);
    }

    if (statusFilter === 'all') return true;
    return status === statusFilter;
  });

  const maxForCalc = Number(createData.maxParticipants) || 0;
  const feeForCalc = Number(createData.registrationFee) || 0;
  const potentialTotal = maxForCalc * feeForCalc;
  const supportShare = potentialTotal * 0.2;
  const prizeShare = potentialTotal - supportShare;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: '#fff',
              boxShadow: 3,
            }}
          >
            <EmojiEventsIcon />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Torneos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Explora torneos activos, próximos y finalizados de la comunidad.
            </Typography>
          </Box>
        </Box>

        {isAdmin && (
          <Button
            variant="contained"
            onClick={handleOpenCreate}
            sx={{ minWidth: 160 }}
          >
            Crear torneo
          </Button>
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 3,
          bgcolor: 'background.paper',
          px: 2,
        }}
      >
        <Tabs
          value={statusFilter}
          onChange={handleFilterChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="filtro de torneos por estado"
        >
          <Tab label={statusConfig.mine.label} value="mine" />
          <Tab label={statusConfig.upcoming.label} value="upcoming" />
          <Tab label={statusConfig.ongoing.label} value="ongoing" />
          <Tab label={statusConfig.completed.label} value="completed" />
          <Tab label={statusConfig.cancelled.label} value="cancelled" />
          <Tab label={statusConfig.all.label} value="all" />
        </Tabs>
      </Paper>

      {loading && (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {!loading && !error && filteredTournaments.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            p: 4,
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <EmojiEventsIcon
            sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }}
          />
          <Typography variant="h6" gutterBottom>
            No hay torneos en esta categoría
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vuelve más tarde o cambia el filtro de estado para ver otros torneos.
          </Typography>
        </Box>
      )}

      {!loading && !error && filteredTournaments.length > 0 && (
        <Grid container spacing={3}>
          {filteredTournaments.map((tournament) => {
            const statusKey = tournament.status || 'upcoming';
            const statusInfo = statusConfig[statusKey] || statusConfig.upcoming;
            const participantsCount = tournament.participants?.length || 0;
            const maxParticipants = tournament.maxParticipants || 0;
            const progress = maxParticipants
              ? Math.min(
                  100,
                  Math.round((participantsCount / maxParticipants) * 100)
                )
              : 0;
            const userIsParticipating = isUserParticipating(tournament);
            const userIsOrganizer = isUserOrganizer(tournament);

            return (
              <Grid item xs={12} sm={6} md={4} key={tournament._id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, mb: 0.5 }}
                      >
                        {tournament.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {tournament.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={statusInfo.chipLabel || statusInfo.label}
                      color={statusInfo.color || 'default'}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon
                        sx={{ fontSize: 18, color: 'text.secondary' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(tournament.startDate).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon
                        sx={{ fontSize: 18, color: 'text.secondary' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {participantsCount} / {maxParticipants} participantes
                      </Typography>
                    </Box>

                    {maxParticipants > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      mt: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Tipo: {tournament.type === '1vs1' ? '1 vs 1' : 'Eliminación'}
                      </Typography>
                      {tournament.status === 'upcoming' && userIsParticipating && (
                        <Chip
                          label="Inscrito"
                          color="success"
                          size="small"
                          sx={{ ml: 0.5 }}
                        />
                      )}
                      {statusFilter === 'mine' && userIsOrganizer && (
                        <Chip
                          label="Organizador"
                          color="secondary"
                          size="small"
                          sx={{ ml: 0.5 }}
                        />
                      )}
                    </Box>

                    <Button
                      variant="contained"
                      size="small"
                      component={Link}
                      to={`/tournaments/${tournament._id}`}
                    >
                      Ver detalles
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {isAdmin && (
        <Dialog
          open={createOpen}
          onClose={handleCloseCreate}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Crear torneo
              </Typography>
              <IconButton
                aria-label="close"
                onClick={handleCloseCreate}
                sx={{ color: (theme) => theme.palette.grey[500] }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Nombre del torneo"
                name="name"
                fullWidth
                variant="outlined"
                value={createData.name}
                onChange={handleCreateChange}
                error={!!createErrors.name}
                helperText={createErrors.name}
              />

              <FormControl fullWidth variant="outlined" error={!!createErrors.game}>
                <InputLabel id="game-label">Juego</InputLabel>
                <Select
                  labelId="game-label"
                  name="game"
                  value={createData.game}
                  label="Juego"
                  onChange={handleCreateChange}
                >
                  <MenuItem value="brawlstars">Brawl Stars</MenuItem>
                  <MenuItem value="clash_royale">Clash Royale</MenuItem>
                </Select>
                {createErrors.game && (
                  <FormHelperText>{createErrors.game}</FormHelperText>
                )}
              </FormControl>

              <TextField
                label="Descripción"
                name="description"
                fullWidth
                multiline
                minRows={3}
                variant="outlined"
                value={createData.description}
                onChange={handleCreateChange}
              />

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                }}
              >
                <TextField
                  label="Fecha y hora de inicio"
                  name="startDateTime"
                  type="datetime-local"
                  fullWidth
                  variant="outlined"
                  value={createData.startDateTime}
                  onChange={handleCreateChange}
                  error={!!createErrors.startDateTime}
                  helperText={createErrors.startDateTime}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Fecha y hora de fin"
                  name="endDateTime"
                  type="datetime-local"
                  fullWidth
                  variant="outlined"
                  value={createData.endDateTime}
                  onChange={handleCreateChange}
                  error={!!createErrors.endDateTime}
                  helperText={createErrors.endDateTime}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <TextField
                label="Máx. participantes"
                name="maxParticipants"
                type="number"
                fullWidth
                variant="outlined"
                value={createData.maxParticipants}
                onChange={handleCreateChange}
                error={!!createErrors.maxParticipants}
                helperText={createErrors.maxParticipants}
                inputProps={{ min: 2 }}
              />

              <TextField
                label="Costo de inscripción"
                name="registrationFee"
                type="number"
                fullWidth
                variant="outlined"
                value={createData.registrationFee}
                onChange={handleCreateChange}
                error={!!createErrors.registrationFee}
                helperText={
                  createErrors.registrationFee ||
                  'Puedes dejarlo en 0 para torneos gratuitos.'
                }
                inputProps={{ min: 0, step: 0.01 }}
              />

              {potentialTotal > 0 && (
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  >
                    Recaudación estimada (si se llenan los cupos)
                  </Typography>
                  <Typography variant="body2">
                    Total: ${potentialTotal.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    Premios (80%): ${prizeShare.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    Soporte (20%): ${supportShare.toFixed(2)}
                  </Typography>
                </Box>
              )}

              {createErrors.form && (
                <Typography variant="body2" color="error">
                  {createErrors.form}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCreate} disabled={creating}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubmit}
              variant="contained"
              disabled={creating}
            >
              {creating ? 'Creando...' : 'Crear torneo'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}

export default Tournaments;