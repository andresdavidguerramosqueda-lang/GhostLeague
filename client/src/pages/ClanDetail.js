import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Skeleton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LoginIcon from '@mui/icons-material/Login';

import { useAuth } from '../context/AuthContext';
import { getClanById, requestJoinClan } from '../services/clanService';
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

  return item?.metadata?.message || item?.type || 'Evento';
};

const ClanDetail = () => {
  const { id } = useParams();
  const { isAuthenticated, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const [tab, setTab] = useState(0);

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState('Me gustaría unirme. Prometo aportar al equipo.');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' });

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');

  const clan = data?.clan;
  const members = Array.isArray(data?.members) ? data.members : [];
  const feed = Array.isArray(data?.feed) ? data.feed : [];

  const isMember = useMemo(() => {
    const myClanId = currentUser?.clanId;
    if (!myClanId || !clan?._id) return false;
    return String(myClanId) === String(clan._id);
  }, [clan?._id, currentUser?.clanId]);

  const myMembership = useMemo(() => {
    const myId = currentUser?._id || currentUser?.id;
    if (!myId) return null;
    return members.find((m) => (m?.user?._id || m?.user?.id) === myId) || null;
  }, [currentUser?._id, currentUser?.id, members]);

  const isLeader = isMember && myMembership?.role === 'leader';

  const bannerSrc = useMemo(() => resolveUploadUrl(fileBase, clan?.banner), [clan?.banner, fileBase]);
  const logoSrc = useMemo(() => resolveUploadUrl(fileBase, clan?.logo), [clan?.logo, fileBase]);

  const primary = clan?.primaryColor || '#6d28d9';
  const secondary = clan?.secondaryColor || '#a855f7';

  const fetchClan = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getClanById(id);
      setData(result);
    } catch (e) {
      console.error('Error cargando clan:', e);
      setError('No pudimos cargar este clan. Puede que ya no esté activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClan();
    // eslint-disable-next-line
  }, [id]);

  const handleRequestJoin = async () => {
    try {
      setActionLoading(true);
      await requestJoinClan(id, { message: joinMessage });
      setToast({ open: true, type: 'success', message: 'Solicitud enviada. El líder del clan la revisará pronto.' });
      setJoinDialogOpen(false);
    } catch (e) {
      console.error('Error solicitando ingreso:', e);
      const msg = e?.response?.data?.message || 'No se pudo enviar la solicitud. Intenta de nuevo.';
      setToast({ open: true, type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 4 }}>
      <Button
        component={RouterLink}
        to="/clans"
        startIcon={<ArrowBackIcon />}
        sx={{ borderRadius: '999px', mb: 2 }}
        aria-label="Volver al listado de clanes"
      >
        Volver
      </Button>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: -4, px: 2 }}>
            <Skeleton variant="circular" width={84} height={84} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={42} />
              <Skeleton variant="text" width="40%" />
            </Box>
          </Box>
        </Paper>
      ) : !clan ? (
        <Fade in timeout={250}>
          <Box>
            <EmptyState
              title="Clan no disponible"
              description="Este clan no está activo o fue ocultado. Puedes explorar otros clanes desde el listado."
              actionLabel="Ir a clanes"
              onAction={() => window.location.assign('/clans')}
              icon={<GroupsIcon sx={{ fontSize: 34 }} />}
            />
          </Box>
        </Fade>
      ) : (
        <Fade in timeout={250}>
          <Box component="article" aria-label={`Detalle del clan ${clan.name}`}>
            <Paper
              elevation={0}
              sx={{
                overflow: 'hidden',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.08)',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: { xs: 180, md: 220 },
                  background: bannerSrc
                    ? `url(${bannerSrc}) center/cover no-repeat`
                    : `linear-gradient(135deg, ${primary}66 0%, rgba(15,23,42,0.95) 55%, ${secondary}55 100%)`,
                }}
                aria-label="Banner del clan"
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(2,6,23,0.2) 0%, rgba(2,6,23,0.9) 100%)',
                  }}
                />
              </Box>

              <Box sx={{ px: { xs: 2.5, md: 4 }, pb: { xs: 3, md: 4 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    mt: { xs: -5, md: -6 },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    flexDirection: { xs: 'column', md: 'row' },
                  }}
                >
                  <Avatar
                    src={logoSrc}
                    alt={clan.name}
                    sx={{
                      width: { xs: 84, md: 96 },
                      height: { xs: 84, md: 96 },
                      border: '2px solid rgba(255,255,255,0.12)',
                      bgcolor: 'rgba(2,6,23,0.65)',
                    }}
                  >
                    {(clan.tag || clan.name).slice(0, 1).toUpperCase()}
                  </Avatar>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                      {clan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      [{clan.tag}] · Nivel {clan.level ?? 1} · {clan.memberCount ?? 0}/{clan.maxMembers ?? 0} miembros
                    </Typography>
                    {clan.motto ? (
                      <Typography variant="body2" sx={{ mt: 1.25, fontWeight: 700 }}>
                        “{clan.motto}”
                      </Typography>
                    ) : null}

                    <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {isLeader ? (
                        <Chip
                          label="Eres el líder"
                          color="secondary"
                          size="small"
                          sx={{ borderRadius: '999px' }}
                        />
                      ) : null}
                      <Chip
                        label={`XP: ${clan.experience ?? 0}`}
                        size="small"
                        sx={{ borderRadius: '999px' }}
                        aria-label={`Experiencia del clan ${clan.experience ?? 0}`}
                      />
                      <Chip
                        label={clan.isPublic ? 'Público' : 'Privado'}
                        size="small"
                        color={clan.isPublic ? 'secondary' : 'default'}
                        sx={{ borderRadius: '999px' }}
                        aria-label={`Visibilidad: ${clan.isPublic ? 'público' : 'privado'}`}
                      />
                      {isMember ? (
                        <Chip
                          label="Estás dentro"
                          size="small"
                          color="success"
                          sx={{ borderRadius: '999px' }}
                          aria-label="Eres miembro de este clan"
                        />
                      ) : null}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 'auto' } }}>
                    {isMember ? (
                      <Button
                        component={RouterLink}
                        to="/my-clan"
                        variant="contained"
                        sx={{ borderRadius: '999px', flex: { xs: 1, md: 'unset' } }}
                        aria-label="Ir a la página de mi clan"
                      >
                        Ver panel
                      </Button>
                    ) : isAuthenticated ? (
                      <Button
                        onClick={() => setJoinDialogOpen(true)}
                        variant="contained"
                        startIcon={<HowToRegIcon />}
                        sx={{ borderRadius: '999px', flex: { xs: 1, md: 'unset' } }}
                        aria-label="Solicitar ingreso al clan"
                        disabled={!!currentUser?.clanId}
                      >
                        Solicitar ingreso
                      </Button>
                    ) : (
                      <Button
                        component={RouterLink}
                        to="/login"
                        variant="contained"
                        startIcon={<LoginIcon />}
                        sx={{ borderRadius: '999px', flex: { xs: 1, md: 'unset' } }}
                        aria-label="Iniciar sesión para solicitar ingreso"
                      >
                        Inicia sesión
                      </Button>
                    )}
                  </Box>
                </Box>

                {isAuthenticated && !!currentUser?.clanId && !isMember ? (
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    Ya perteneces a un clan. Para unirte a otro, primero debes salir del actual.
                  </Alert>
                ) : null}

                <Divider sx={{ my: 3, opacity: 0.25 }} />

                <Tabs
                  value={tab}
                  onChange={(_, next) => setTab(next)}
                  textColor="secondary"
                  indicatorColor="secondary"
                  aria-label="Secciones del clan"
                >
                  <Tab label="Resumen" />
                  <Tab label={`Miembros (${members.length})`} />
                  <Tab label="Actividad" />
                </Tabs>

                <Box sx={{ mt: 2.5 }}>
                  {tab === 0 ? (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        ¿De qué va este clan?
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {clan.description ||
                          'Este clan está construyendo su historia. Si te gusta competir con buen ambiente, quizás sea tu lugar.'}
                      </Typography>

                      <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          label={`Líder: ${clan.leader?.username || '—'}`}
                          size="small"
                          sx={{ borderRadius: '999px' }}
                        />
                        {Array.isArray(clan.subLeaders) && clan.subLeaders.length ? (
                          <Chip
                            label={`Colíderes: ${clan.subLeaders.length}`}
                            size="small"
                            sx={{ borderRadius: '999px' }}
                          />
                        ) : null}
                      </Box>
                    </Box>
                  ) : null}

                  {tab === 1 ? (
                    <Box>
                      {members.length === 0 ? (
                        <EmptyState
                          title="Aún no hay miembros"
                          description="Parece un clan nuevo. Si te interesa, puedes ser de los primeros en entrar."
                          icon={<GroupsIcon sx={{ fontSize: 34 }} />}
                        />
                      ) : (
                        <List aria-label="Lista de miembros">
                          {members.map((m, idx) => {
                            const user = m?.user;
                            const username = user?.username || 'Usuario';
                            const avatar = resolveUploadUrl(fileBase, user?.avatar);
                            return (
                              <ListItem
                                key={`${user?._id || username}-${idx}`}
                                sx={{
                                  borderRadius: 2,
                                  border: '1px solid rgba(148,163,184,0.18)',
                                  mb: 1,
                                  bgcolor: 'rgba(2,6,23,0.25)',
                                }}
                              >
                                <ListItemAvatar>
                                  <Avatar
                                    src={avatar}
                                    alt={username}
                                    sx={{ border: '2px solid rgba(255,255,255,0.12)' }}
                                  >
                                    {username.slice(0, 1).toUpperCase()}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography
                                      component={RouterLink}
                                      to={`/u/${encodeURIComponent(username)}`}
                                      sx={{
                                        fontWeight: 900,
                                        textDecoration: 'none',
                                        color: 'inherit',
                                      }}
                                      aria-label={`Ver perfil de ${username}`}
                                    >
                                      {username}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                      Rol: {getClanRoleLabel(m?.role)}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      )}
                    </Box>
                  ) : null}

                  {tab === 2 ? (
                    <Box>
                      {feed.length === 0 ? (
                        <EmptyState
                          title="Sin actividad reciente"
                          description="Cuando el clan crezca, aquí verás eventos como miembros nuevos, ascensos y victorias."
                          icon={<GroupsIcon sx={{ fontSize: 34 }} />}
                        />
                      ) : (
                        <List aria-label="Actividad reciente">
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
                                primary={
                                  <Typography sx={{ fontWeight: 800 }}>
                                    {getClanFeedMessage(item)}
                                  </Typography>
                                }
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
                </Box>
              </Box>
            </Paper>

            <Dialog
              open={joinDialogOpen}
              onClose={() => (actionLoading ? null : setJoinDialogOpen(false))}
              fullWidth
              maxWidth="sm"
              aria-labelledby="join-clan-title"
            >
              <DialogTitle id="join-clan-title">Solicitar ingreso</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Deja un mensaje corto. El líder lo verá junto a tu perfil.
                </Typography>
                <TextField
                  multiline
                  minRows={3}
                  fullWidth
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  inputProps={{ 'aria-label': 'Mensaje para el líder del clan' }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setJoinDialogOpen(false)} disabled={actionLoading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleRequestJoin}
                  variant="contained"
                  disabled={actionLoading}
                  aria-label="Enviar solicitud"
                >
                  {actionLoading ? 'Enviando…' : 'Enviar'}
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={toast.open}
              onClose={() => setToast((p) => ({ ...p, open: false }))}
              aria-labelledby="clan-toast-title"
            >
              <DialogTitle id="clan-toast-title">
                {toast.type === 'success' ? 'Listo' : 'Atención'}
              </DialogTitle>
              <DialogContent>
                <Alert severity={toast.type} sx={{ borderRadius: 2 }}>
                  {toast.message}
                </Alert>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setToast((p) => ({ ...p, open: false }))} variant="contained">
                  Entendido
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Fade>
      )}
    </Container>
  );
};

export default ClanDetail;
