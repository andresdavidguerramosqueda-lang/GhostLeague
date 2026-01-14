// client/src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  DialogContentText,
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Divider,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Event as EventIcon,
  SportsEsports as SportsEsportsIcon,
  Group as GroupIcon,
  EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AppealsInbox from '../components/AppealsInbox';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AdminDashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '1vs1',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    maxParticipants: 16,
    rules: '',
    status: 'upcoming',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchTournaments();
  }, [isAdmin, navigate]);

  const fetchTournaments = async () => {
    try {
      const response = await api.get('/tournaments');
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setError('No se pudieron cargar los torneos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tournament = null) => {
    if (tournament) {
      setEditingTournament(tournament._id);
      setFormData({
        name: tournament.name,
        description: tournament.description,
        type: tournament.type,
        startDate: new Date(tournament.startDate),
        endDate: new Date(tournament.endDate),
        maxParticipants: tournament.maxParticipants,
        rules: tournament.rules,
        status: tournament.status,
      });
    } else {
      setEditingTournament(null);
      setFormData({
        name: '',
        description: '',
        type: '1vs1',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxParticipants: 16,
        rules: '',
        status: 'upcoming',
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTournament(null);
    setFormErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateChange = (name) => (date) => {
    setFormData((prev) => ({ ...prev, [name]: date }));
    // Clear error when date is selected
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const requiredFields = ['name', 'description', 'type', 'startDate', 'endDate'];
    
    requiredFields.forEach((field) => {
      if (!formData[field]) {
        errors[field] = 'Este campo es requerido';
      }
    });

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      errors.endDate = 'La fecha de finalización debe ser posterior a la de inicio';
    }

    if (formData.maxParticipants < 2) {
      errors.maxParticipants = 'Debe haber al menos 2 participantes';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const tournamentData = {
        ...formData,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
      };

      if (editingTournament) {
        await api.put(`/tournaments/${editingTournament}`, tournamentData);
        setSuccessMessage('Torneo actualizado correctamente');
      } else {
        await api.post('/tournaments', tournamentData);
        setSuccessMessage('Torneo creado correctamente');
      }

      fetchTournaments();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving tournament:', error);
      setError(
        error.response?.data?.message || 'Error al guardar el torneo'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (tournament) => {
    setTournamentToDelete(tournament);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tournamentToDelete) return;

    try {
      await api.delete(`/tournaments/${tournamentToDelete._id}`);
      setSuccessMessage('Torneo eliminado correctamente');
      fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      setError('Error al eliminar el torneo');
    } finally {
      setDeleteConfirmOpen(false);
      setTournamentToDelete(null);
    }
  };

  const getStatusInfo = (status) => {
    const statusInfo = {
      upcoming: { label: 'Próximamente', color: 'info' },
      ongoing: { label: 'En Curso', color: 'success' },
      completed: { label: 'Finalizado', color: 'default' },
      cancelled: { label: 'Cancelado', color: 'error' },
    };
    return statusInfo[status] || { label: 'Desconocido', color: 'default' };
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'PPpp', { locale: es });
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Panel de Administración
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Torneo
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Torneos
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Fecha Inicio</TableCell>
                <TableCell>Participantes</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tournaments.length > 0 ? (
                tournaments.map((tournament) => {
                  const status = getStatusInfo(tournament.status);
                  const participantsCount = tournament.participants?.length || 0;
                  const progress = (participantsCount / tournament.maxParticipants) * 100;

                  return (
                    <TableRow key={tournament._id} hover>
                      <TableCell>
                        <Typography fontWeight={500}>{tournament.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<SportsEsportsIcon />}
                          label={tournament.type === '1vs1' ? '1 vs 1' : 'Eliminación'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{formatDate(tournament.startDate)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <GroupIcon
                            fontSize="small"
                            color="action"
                            sx={{ mr: 1 }}
                          />
                          <Box sx={{ minWidth: 60 }}>
                            <Typography variant="body2">
                              {participantsCount}/{tournament.maxParticipants}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ height: 4, borderRadius: 2 }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/tournaments/${tournament._id}`)}
                          title="Ver"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(tournament)}
                          title="Editar"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(tournament)}
                          title="Eliminar"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <EmojiEventsIcon
                      sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
                    />
                    <Typography variant="body1" color="text.secondary">
                      No hay torneos registrados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Sección de Apelaciones */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Apelaciones de Usuarios
        </Typography>
        <AppealsInbox />
      </Paper>

      {/* Add/Edit Tournament Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
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
              {editingTournament ? 'Editar Torneo' : 'Nuevo Torneo'}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={handleCloseDialog}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  margin="dense"
                  id="name"
                  name="name"
                  label="Nombre del Torneo"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.name}
                  onChange={handleChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  id="description"
                  name="description"
                  label="Descripción"
                  type="text"
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  value={formData.description}
                  onChange={handleChange}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!formErrors.type}
                >
                  <InputLabel id="type-label">Tipo de Torneo</InputLabel>
                  <Select
                    labelId="type-label"
                    id="type"
                    name="type"
                    value={formData.type}
                    label="Tipo de Torneo"
                    onChange={handleChange}
                  >
                    <MenuItem value="1vs1">1 vs 1</MenuItem>
                    <MenuItem value="bracket">Torneo por Eliminación</MenuItem>
                  </Select>
                  {formErrors.type && (
                    <FormHelperText>{formErrors.type}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  id="maxParticipants"
                  name="maxParticipants"
                  label="Máx. Participantes"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  error={!!formErrors.maxParticipants}
                  helperText={formErrors.maxParticipants}
                  inputProps={{ min: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider
                  dateAdapter={AdapterDateFns}
                  adapterLocale={es}
                >
                  <DatePicker
                    label="Fecha de Inicio"
                    value={formData.startDate}
                    onChange={handleDateChange('startDate')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        margin="dense"
                        error={!!formErrors.startDate}
                        helperText={formErrors.startDate}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider
                  dateAdapter={AdapterDateFns}
                  adapterLocale={es}
                >
                  <DatePicker
                    label="Fecha de Finalización"
                    value={formData.endDate}
                    onChange={handleDateChange('endDate')}
                    minDate={formData.startDate}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        margin="dense"
                        error={!!formErrors.endDate}
                        helperText={formErrors.endDate || formErrors.dateRange}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!formErrors.status}
                >
                  <InputLabel id="status-label">Estado</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    name="status"
                    value={formData.status}
                    label="Estado"
                    onChange={handleChange}
                  >
                    <MenuItem value="upcoming">Próximamente</MenuItem>
                    <MenuItem value="ongoing">En Curso</MenuItem>
                    <MenuItem value="completed">Finalizado</MenuItem>
                    <MenuItem value="cancelled">Cancelado</MenuItem>
                  </Select>
                  {formErrors.status && (
                    <FormHelperText>{formErrors.status}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  id="rules"
                  name="rules"
                  label="Reglas del Torneo"
                  type="text"
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  value={formData.rules}
                  onChange={handleChange}
                  placeholder="Ingresa las reglas detalladas del torneo..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={handleCloseDialog} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? null : <EventIcon />}
            >
              {submitting
                ? 'Guardando...'
                : editingTournament
                ? 'Actualizar Torneo'
                : 'Crear Torneo'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el torneo "
            <strong>{tournamentToDelete?.name}</strong>"? Esta acción no se puede
            deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            color="primary"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={submitting}
            startIcon={<DeleteIcon />}
          >
            {submitting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
