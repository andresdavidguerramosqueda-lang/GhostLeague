import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import GroupsIcon from '@mui/icons-material/Groups';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { createClan, getClanById, getClanFeed, leaveClan, inviteUserToClan, promoteClanMember, kickClanMember } from '../services/clanService';
import { getUserByUsername } from '../services/userService';
import { resolveUploadUrl } from '../utils/resolveUploadUrl';
import EmptyState from '../components/clans/EmptyState';

const CLAN_ROLE_LABELS = {
  leader: 'Líder',
  coLeader: 'Colíder',
  veteran: 'Veterano',
  member: 'Miembro',
};

const getClanRoleLabel = (role) => CLAN_ROLE_LABELS[role] || role || CLAN_ROLE_LABELS.member;

const getClanFeedMessage = (item) => {
  const type = item?.type;
  const oldRole = item?.metadata?.oldRole;
  const newRole = item?.metadata?.newRole;

  if ((type === 'member_promoted' || type === 'member_demoted') && oldRole && newRole) {
    const action = type === 'member_demoted' ? 'Fue degradado' : 'Fue ascendido';
    return `${action} de ${getClanRoleLabel(oldRole)} a ${getClanRoleLabel(newRole)}`;
  }

  return item?.metadata?.message || item?.type;
};

const MyClan = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const clanId = currentUser?.clanId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  const [clanData, setClanData] = useState(null);
  const [members, setMembers] = useState([]);
  const [feed, setFeed] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [toast, setToast] = useState({ open: false, type: 'success', message: '' });

  // Management states
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ username: '', role: 'member', message: '' });
  const [inviting, setInviting] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [kicking, setKicking] = useState(false);

  const [form, setForm] = useState({
    name: '',
    tag: '',
    description: '',
    motto: '',
    primaryColor: '#6d28d9',
    secondaryColor: '#a855f7',
  });

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');

  const clan = clanData?.clan;
  const logoSrc = useMemo(() => resolveUploadUrl(fileBase, clan?.logo), [clan?.logo, fileBase]);
  const myMembership = useMemo(() => {
    const myId = currentUser?._id || currentUser?.id;
    if (!myId) return null;
    return members.find((m) => (m?.user?._id || m?.user?.id) === myId) || null;
  }, [currentUser?._id, currentUser?.id, members]);
  const isLeader = myMembership?.role === 'leader';
  const isCoLeader = myMembership?.role === 'coLeader';
  const isVeteran = myMembership?.role === 'veteran';
  const canManageMembers = isLeader || isCoLeader;
  const canInviteMembers = isLeader || isCoLeader || isVeteran;

  const fetchMyClan = async () => {
    if (!clanId) {
      setLoading(false);
      setError('');
      setClanData(null);
      setMembers([]);
      setFeed([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await getClanById(clanId);
      setClanData(result);

      const m = Array.isArray(result?.members) ? result.members : [];
      setMembers(m);

      try {
        const feedRes = await getClanFeed(clanId, { limit: 25, skip: 0 });
        setFeed(Array.isArray(feedRes?.feed) ? feedRes.feed : []);
      } catch (e) {
        setFeed(Array.isArray(result?.feed) ? result.feed : []);
      }
    } catch (e) {
      console.error('Error cargando mi clan:', e);
      setError('No pudimos cargar tu clan. Intenta recargar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClan();
    // eslint-disable-next-line
  }, [clanId]);

  const handleCreateClan = async () => {
    try {
      setCreating(true);
      const payload = {
        name: form.name.trim(),
        tag: form.tag.trim(),
        description: form.description.trim(),
        motto: form.motto.trim(),
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
      };

      const res = await createClan(payload);
      const createdClanId = res?.clan?._id || res?.clan?.id;
      setToast({ open: true, type: 'success', message: res?.message || 'Clan creado. ¡A por la gloria!' });
      setCreateOpen(false);
      setForm({
        name: '',
        tag: '',
        description: '',
        motto: '',
        primaryColor: '#6d28d9',
        secondaryColor: '#a855f7',
      });
      await refreshUser();

      if (createdClanId) {
        navigate(`/clans/${createdClanId}`);
      }
    } catch (e) {
      console.error('Error creando clan:', e);
      const msg = e?.response?.data?.message || 'No se pudo crear el clan.';
      setToast({ open: true, type: 'error', message: msg });
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveClan = async () => {
    if (!clanId) return;
    try {
      setLeaving(true);
      const res = await leaveClan(clanId);
      setToast({ open: true, type: 'success', message: res?.message || 'Has abandonado el clan.' });
      setLeaveOpen(false);
      await refreshUser();
      navigate('/clans');
    } catch (e) {
      console.error('Error abandonando clan:', e);
      const msg = e?.response?.data?.message || 'No se pudo abandonar el clan.';
      setToast({ open: true, type: 'error', message: msg });
    } finally {
      setLeaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!clanId || !inviteForm.username.trim()) return;
    try {
      setInviting(true);
      
      // Buscar usuario por nombre de usuario
      const user = await getUserByUsername(inviteForm.username.trim());
      if (!user?._id && !user?.id) {
        setToast({ open: true, type: 'error', message: 'Usuario no encontrado.' });
        return;
      }
      
      const payload = {
        userId: user._id || user.id,
        role: inviteForm.role,
        message: inviteForm.message.trim()
      };
      const res = await inviteUserToClan(clanId, payload);
      setToast({ open: true, type: 'success', message: res?.message || 'Invitación enviada.' });
      setInviteOpen(false);
      setInviteForm({ username: '', role: 'member', message: '' });
    } catch (e) {
      console.error('Error invitando miembro:', e);
      const msg = e?.response?.data?.message || 'No se pudo enviar la invitación.';
      setToast({ open: true, type: 'error', message: msg });
    } finally {
      setInviting(false);
    }
  };

  const handlePromoteMember = async (member, newRole) => {
    if (!clanId || !member?.user?._id) return;
    try {
      const res = await promoteClanMember(clanId, { userId: member.user._id, newRole });
      setToast({ open: true, type: 'success', message: res?.message || 'Miembro promovido.' });
      fetchMyClan();
    } catch (e) {
      console.error('Error promoviendo miembro:', e);
      const msg = e?.response?.data?.message || 'No se pudo promover al miembro.';
      setToast({ open: true, type: 'error', message: msg });
    }
    setAnchorEl(null);
  };

  const handleKickMember = async (member) => {
    if (!clanId || !member?.user?._id) return;
    // Solo mostrar diálogo de confirmación
    setSelectedMember(member);
    setKickDialogOpen(true);
    setAnchorEl(null);
  };

  const confirmKickMember = async () => {
    if (!selectedMember) return;
    try {
      setKicking(true);
      const res = await kickClanMember(clanId, { userId: selectedMember.user._id });
      setToast({ open: true, type: 'success', message: res?.message || 'Miembro expulsado.' });
      fetchMyClan();
      setKickDialogOpen(false);
      setSelectedMember(null);
    } catch (e) {
      console.error('Error expulsando miembro:', e);
      const msg = e?.response?.data?.message || 'No se pudo expulsar al miembro.';
      setToast({ open: true, type: 'error', message: msg });
    } finally {
      setKicking(false);
    }
  };

  const handleMenuOpen = (event, member) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const bannerGradient = clan
    ? `linear-gradient(135deg, ${(clan.primaryColor || '#6d28d9')}33 0%, rgba(15,23,42,0.92) 55%, ${(clan.secondaryColor || '#a855f7')}22 100%)`
    : 'radial-gradient(circle at 20% 20%, rgba(168,85,247,0.18) 0%, rgba(15,23,42,0.92) 55%, rgba(2,6,23,0.95) 100%)';

  return (
    <Container maxWidth="lg" sx={{ pb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          border: '1px solid rgba(168,85,247,0.35)',
          background: bannerGradient,
          boxShadow: '0 0 28px rgba(168,85,247,0.18)',
          mb: 3,
        }}
        component="section"
        aria-label="Panel de mi clan"
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
              Mi clan
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
              Administra tu equipo, revisa la actividad y mantén el ritmo de crecimiento.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 'auto' } }}>
            <Button
              onClick={fetchMyClan}
              variant="outlined"
              startIcon={<RefreshIcon />}
              disabled={loading}
              sx={{ borderRadius: '999px', borderColor: 'rgba(168,85,247,0.55)', flex: { xs: 1, md: 'unset' } }}
              aria-label="Recargar mi clan"
            >
              Recargar
            </Button>

            {!clanId ? (
              <Button
                onClick={() => setCreateOpen(true)}
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ borderRadius: '999px', flex: { xs: 1, md: 'unset' } }}
                aria-label="Crear un clan"
              >
                Crear
              </Button>
            ) : (
              <Button
                onClick={() => setLeaveOpen(true)}
                variant="outlined"
                startIcon={<ExitToAppIcon />}
                sx={{
                  borderRadius: '999px',
                  borderColor: 'rgba(248,113,113,0.55)',
                  color: 'rgba(248,113,113,0.95)',
                  flex: { xs: 1, md: 'unset' },
                }}
                aria-label="Salir del clan"
              >
                Salir
              </Button>
            )}
          </Box>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}
      </Paper>

      {loading ? (
        <Paper sx={{ p: 3, borderRadius: 3 }} aria-label="Cargando mi clan">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="rectangular" height={120} sx={{ mt: 2, borderRadius: 2 }} />
        </Paper>
      ) : !clanId ? (
        <Fade in timeout={250}>
          <Box>
            <EmptyState
              title="Todavía no tienes clan"
              description="Crea uno para reclutar a tu equipo, o explora clanes públicos y pide ingreso al que encaje contigo."
              actionLabel="Explorar clanes"
              onAction={() => window.location.assign('/clans')}
              icon={<GroupsIcon sx={{ fontSize: 34 }} />}
            />
          </Box>
        </Fade>
      ) : !clan ? (
        <Fade in timeout={250}>
          <Box>
            <EmptyState
              title="No pudimos cargar tu clan"
              description="Puede ser un problema temporal. Intenta recargar en unos segundos."
              actionLabel="Recargar"
              onAction={fetchMyClan}
              icon={<GroupsIcon sx={{ fontSize: 34 }} />}
            />
          </Box>
        </Fade>
      ) : (
        <Fade in timeout={250}>
          <Box component="section" aria-label="Contenido del clan">
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Avatar
                  src={logoSrc}
                  alt={clan.name}
                  sx={{
                    width: 64,
                    height: 64,
                    border: '2px solid rgba(255,255,255,0.12)',
                    bgcolor: 'rgba(2,6,23,0.65)',
                  }}
                >
                  {(clan.tag || clan.name).slice(0, 1).toUpperCase()}
                </Avatar>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>
                    {clan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    [{clan.tag}] · Nivel {clan.level ?? 1} · {clan.memberCount ?? 0}/{clan.maxMembers ?? 0} miembros
                  </Typography>
                </Box>

                {isLeader ? <Chip label="Eres el líder" color="secondary" size="small" sx={{ borderRadius: '999px' }} /> : null}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
                  <Chip label={`XP: ${clan.experience ?? 0}`} size="small" sx={{ borderRadius: '999px' }} />
                  <Chip
                    label={clan.isPublic ? 'Público' : 'Privado'}
                    size="small"
                    color={clan.isPublic ? 'secondary' : 'default'}
                    sx={{ borderRadius: '999px' }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3, opacity: 0.25 }} />

              <Tabs
                value={tab}
                onChange={(_, next) => setTab(next)}
                textColor="secondary"
                indicatorColor="secondary"
                aria-label="Secciones del clan"
              >
                <Tab label="Actividad" />
                <Tab label={`Miembros (${members.length})`} />
              </Tabs>

              <Box sx={{ mt: 2.5 }}>
                {tab === 0 ? (
                  <Box>
                    {feed.length === 0 ? (
                      <EmptyState
                        title="Sin actividad todavía"
                        description="Cuando el clan avance, aquí verás eventos importantes."
                        icon={<GroupsIcon sx={{ fontSize: 34 }} />}
                      />
                    ) : (
                      <List aria-label="Actividad del clan">
                        {feed.map((item, idx) => (
                          <ListItem
                            key={`${item?._id || idx}`}
                            sx={{
                              borderRadius: 2,
                              border: '1px solid rgba(148,163,184,0.18)',
                              mb: 1,
                              bgcolor: 'rgba(2,6,23,0.25)',
                            }}
                          >
                            <ListItemText
                              primary={<Typography sx={{ fontWeight: 800 }}>{getClanFeedMessage(item)}</Typography>}
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {item?.createdAt
                                    ? new Date(item.createdAt).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                ) : null}

                {tab === 1 ? (
                  <Box>
                    {/* Botón de invitar para líderes/colíderes/veteranos */}
                    {canInviteMembers && (
                      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Gestión de miembros
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<PersonAddIcon />}
                          onClick={() => setInviteOpen(true)}
                          size="small"
                        >
                          Invitar miembro
                        </Button>
                      </Box>
                    )}
                    
                    {members.length === 0 ? (
                      <EmptyState
                        title="Aún no hay miembros"
                        description="Comparte tu clan y empieza a reclutar."
                        icon={<GroupsIcon sx={{ fontSize: 34 }} />}
                      />
                    ) : (
                      <Grid container spacing={1.5} aria-label="Miembros del clan">
                        {members.map((m, idx) => {
                          const user = m?.user;
                          const username = user?.username || 'Usuario';
                          const avatar = resolveUploadUrl(fileBase, user?.avatar);
                          const isMe = (user?._id || user?.id) === (currentUser?._id || currentUser?.id);

                          return (
                            <Grid item xs={12} md={6} key={`${user?._id || username}-${idx}`}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2,
                                  borderRadius: 3,
                                  border: '1px solid rgba(148,163,184,0.18)',
                                  bgcolor: 'rgba(2,6,23,0.25)',
                                  position: 'relative',
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar
                                    src={avatar}
                                    alt={username}
                                    sx={{ border: '2px solid rgba(255,255,255,0.12)' }}
                                  >
                                    {username.slice(0, 1).toUpperCase()}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontWeight: 900 }} noWrap>
                                      {username}
                                      {isMe && (
                                        <Chip
                                          label="Tú"
                                          size="tiny"
                                          sx={{ ml: 1, height: 20, fontSize: '0.65rem' }}
                                        />
                                      )}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                      Rol: {getClanRoleLabel(m?.role)}
                                    </Typography>
                                  </Box>
                                  
                                  {/* Botones de gestión para líderes/colíderes */}
                                  {canManageMembers && !isMe && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleMenuOpen(e, m)}
                                      sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                  </Box>
                ) : null}
              </Box>
            </Paper>
          </Box>
        </Fade>
      )}

      <Dialog
        open={createOpen}
        onClose={() => (creating ? null : setCreateOpen(false))}
        fullWidth
        maxWidth="sm"
        aria-labelledby="create-clan-title"
      >
        <DialogTitle id="create-clan-title">Crear clan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nombre claro, tag corto y un lema que se sienta. Lo demás se construye jugando.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nombre"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                inputProps={{ 'aria-label': 'Nombre del clan' }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Tag"
                value={form.tag}
                onChange={(e) => setForm((p) => ({ ...p, tag: e.target.value.toUpperCase().slice(0, 5) }))}
                inputProps={{ 'aria-label': 'Tag del clan, máximo 5 caracteres' }}
                helperText="Máx. 5"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lema"
                value={form.motto}
                onChange={(e) => setForm((p) => ({ ...p, motto: e.target.value }))}
                inputProps={{ 'aria-label': 'Lema del clan' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                minRows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                inputProps={{ 'aria-label': 'Descripción del clan' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Color primario"
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                inputProps={{ 'aria-label': 'Color primario del clan' }}
                sx={{ '& input': { height: 46 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Color secundario"
                type="color"
                value={form.secondaryColor}
                onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                inputProps={{ 'aria-label': 'Color secundario del clan' }}
                sx={{ '& input': { height: 46 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button onClick={handleCreateClan} variant="contained" disabled={creating}>
            {creating ? 'Creando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={leaveOpen}
        onClose={() => (leaving ? null : setLeaveOpen(false))}
        fullWidth
        maxWidth="xs"
        aria-labelledby="leave-clan-title"
      >
        <DialogTitle id="leave-clan-title">Salir del clan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Vas a abandonar tu clan actual. Podrás unirte a otro después.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveOpen(false)} disabled={leaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleLeaveClan}
            variant="contained"
            disabled={leaving}
            sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
          >
            {leaving ? 'Saliendo…' : 'Salir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para invitar miembros */}
      <Dialog
        open={inviteOpen}
        onClose={() => (inviting ? null : setInviteOpen(false))}
        fullWidth
        maxWidth="sm"
        aria-labelledby="invite-member-title"
      >
        <DialogTitle id="invite-member-title">Invitar miembro</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Invita a un usuario a unirse a tu clan. Podrá aceptar o rechazar la invitación.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre de usuario"
                value={inviteForm.username}
                onChange={(e) => setInviteForm((p) => ({ ...p, username: e.target.value }))}
                inputProps={{ 'aria-label': 'Nombre de usuario a invitar' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Rol"
                value={inviteForm.role}
                onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                inputProps={{ 'aria-label': 'Rol a asignar' }}
              >
                <MenuItem value="member">Miembro</MenuItem>
                <MenuItem value="veteran">Veterano</MenuItem>
                {isLeader && <MenuItem value="coLeader">Colíder</MenuItem>}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mensaje (opcional)"
                multiline
                minRows={2}
                value={inviteForm.message}
                onChange={(e) => setInviteForm((p) => ({ ...p, message: e.target.value }))}
                inputProps={{ 'aria-label': 'Mensaje de invitación' }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)} disabled={inviting}>
            Cancelar
          </Button>
          <Button onClick={handleInviteMember} variant="contained" disabled={inviting}>
            {inviting ? 'Enviando…' : 'Invitar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menú de gestión de miembros */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 180 },
        }}
      >
        {selectedMember && (
          <>
            {/* Opciones de promoción */}
            {(isLeader || isCoLeader) && selectedMember.role === 'member' && (
              <MenuItem onClick={() => handlePromoteMember(selectedMember, 'veteran')}>
                <ArrowUpwardIcon fontSize="small" sx={{ mr: 1 }} />
                Ascender a Veterano
              </MenuItem>
            )}
            {isLeader && selectedMember.role === 'veteran' && (
              <MenuItem onClick={() => handlePromoteMember(selectedMember, 'coLeader')}>
                <ArrowUpwardIcon fontSize="small" sx={{ mr: 1 }} />
                Ascender a Colíder
              </MenuItem>
            )}
            {/* Solo líder puede degradar colíderes */}
            {isLeader && selectedMember.role === 'coLeader' && (
              <MenuItem onClick={() => handlePromoteMember(selectedMember, 'member')}>
                <ArrowDownwardIcon fontSize="small" sx={{ mr: 1 }} />
                Degradir a Miembro
              </MenuItem>
            )}
            {/* Líder y colíder pueden degradar veteranos */}
            {(isLeader || isCoLeader) && selectedMember.role === 'veteran' && (
              <MenuItem onClick={() => handlePromoteMember(selectedMember, 'member')}>
                <ArrowDownwardIcon fontSize="small" sx={{ mr: 1 }} />
                Degradir a Miembro
              </MenuItem>
            )}
            
            {/* Separador */}
            {(isLeader || (isCoLeader && selectedMember.role !== 'leader')) && (
              <Divider />
            )}
            
            {/* Opción de expulsar */}
            {(isLeader || (isCoLeader && selectedMember.role !== 'leader')) && (
              <MenuItem
                onClick={() => handleKickMember(selectedMember)}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                Expulsar del clan
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      {/* Diálogo de confirmación para expulsar */}
      <Dialog
        open={kickDialogOpen}
        onClose={() => (kicking ? null : setKickDialogOpen(false))}
        fullWidth
        maxWidth="xs"
        aria-labelledby="kick-member-title"
      >
        <DialogTitle id="kick-member-title">Expulsar miembro</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Estás seguro de que quieres expulsar a {selectedMember?.user?.username} del clan?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKickDialogOpen(false)} disabled={kicking}>
            Cancelar
          </Button>
          <Button
            onClick={confirmKickMember}
            variant="contained"
            disabled={kicking}
            sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
          >
            {kicking ? 'Expulsando…' : 'Expulsar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4500}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setToast((p) => ({ ...p, open: false }));
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={toast.type}
          variant="filled"
          sx={{ width: '100%' }}
          onClose={() => setToast((p) => ({ ...p, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MyClan;
