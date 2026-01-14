import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Fade,
  Paper,
  Skeleton,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

import { useAuth } from '../context/AuthContext';
import {
  acceptClanInvite,
  cancelClanInvite,
  declineClanInvite,
  getMyClanInvites,
} from '../services/clanInviteService';
import { resolveUploadUrl } from '../utils/resolveUploadUrl';
import EmptyState from '../components/clans/EmptyState';

const CLAN_ROLE_LABELS = {
  leader: 'Líder',
  coLeader: 'Colíder',
  veteran: 'Veterano',
  member: 'Miembro',
};

const getClanRoleLabel = (role) => CLAN_ROLE_LABELS[role] || role || CLAN_ROLE_LABELS.member;

const ClanInvites = () => {
  const { refreshUser } = useAuth();

  const [tab, setTab] = useState(0); // 0 received, 1 sent
  const type = tab === 0 ? 'received' : 'sent';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invites, setInvites] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const [toast, setToast] = useState({ open: false, type: 'success', message: '' });

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');

  const fetchInvites = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getMyClanInvites({ type });
      setInvites(Array.isArray(res?.invites) ? res.invites : []);
    } catch (e) {
      console.error('Error cargando invitaciones:', e);
      setError('No pudimos cargar las invitaciones. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
    // eslint-disable-next-line
  }, [type]);

  const handleAccept = async (inviteId) => {
    try {
      setBusyId(inviteId);
      const res = await acceptClanInvite(inviteId);
      setToast({ open: true, type: 'success', message: res?.message || 'Invitación aceptada.' });
      await refreshUser();
      await fetchInvites();
    } catch (e) {
      console.error('Error aceptando invitación:', e);
      const msg = e?.response?.data?.message || 'No se pudo aceptar la invitación.';
      setToast({ open: true, type: 'error', message: msg });
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (inviteId) => {
    try {
      setBusyId(inviteId);
      const res = await declineClanInvite(inviteId);
      setToast({ open: true, type: 'success', message: res?.message || 'Invitación rechazada.' });
      await fetchInvites();
    } catch (e) {
      console.error('Error rechazando invitación:', e);
      const msg = e?.response?.data?.message || 'No se pudo rechazar la invitación.';
      setToast({ open: true, type: 'error', message: msg });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (inviteId) => {
    try {
      setBusyId(inviteId);
      const res = await cancelClanInvite(inviteId);
      setToast({ open: true, type: 'success', message: res?.message || 'Invitación cancelada.' });
      await fetchInvites();
    } catch (e) {
      console.error('Error cancelando invitación:', e);
      const msg = e?.response?.data?.message || 'No se pudo cancelar la invitación.';
      setToast({ open: true, type: 'error', message: msg });
    } finally {
      setBusyId(null);
    }
  };

  const emptyCopy = useMemo(() => {
    if (type === 'received') {
      return {
        title: 'Sin invitaciones nuevas',
        description: 'Cuando un clan te invite, aparecerá aquí. Mientras tanto, explora clanes y pide ingreso al que te represente.',
        actionLabel: 'Explorar clanes',
        action: () => window.location.assign('/clans'),
      };
    }

    return {
      title: 'No has enviado invitaciones',
      description: 'Cuando invites a alguien a tu clan, podrás ver el estado aquí. Tip: invita a jugadores activos para crecer más rápido.',
      actionLabel: 'Ir a mi clan',
      action: () => window.location.assign('/my-clan'),
    };
  }, [type]);

  return (
    <Container maxWidth="lg" sx={{ pb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          border: '1px solid rgba(168,85,247,0.35)',
          background:
            'radial-gradient(circle at 20% 20%, rgba(168,85,247,0.18) 0%, rgba(15,23,42,0.92) 55%, rgba(2,6,23,0.95) 100%)',
          boxShadow: '0 0 28px rgba(168,85,247,0.18)',
          mb: 3,
        }}
        component="section"
        aria-label="Invitaciones de clan"
      >
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
          Invitaciones
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
          Mantén tu bandeja limpia: acepta cuando estés listo, rechaza cuando no encaje. Nada personal, es estrategia.
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ mt: 3 }}
          aria-label="Filtro de invitaciones"
        >
          <Tab label="Recibidas" />
          <Tab label="Enviadas" />
        </Tabs>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Paper sx={{ p: 3, borderRadius: 3 }} aria-label="Cargando invitaciones">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="rectangular" height={96} sx={{ mt: 2, borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={96} sx={{ mt: 1.5, borderRadius: 2 }} />
        </Paper>
      ) : invites.length === 0 ? (
        <Fade in timeout={250}>
          <Box>
            <EmptyState
              title={emptyCopy.title}
              description={emptyCopy.description}
              actionLabel={emptyCopy.actionLabel}
              onAction={emptyCopy.action}
              icon={<MailIcon sx={{ fontSize: 34 }} />}
            />
          </Box>
        </Fade>
      ) : (
        <Fade in timeout={250}>
          <Box component="section" aria-label="Listado de invitaciones">
            {invites.map((inv) => {
              const clan = inv?.clan;
              const userFrom = inv?.from;
              const userTo = inv?.to;

              const title = clan?.name ? `${clan.name} [${clan.tag || ''}]` : 'Clan';
              const subtitle = inv?.message || 'Invitación de clan';

              const avatarSrc = resolveUploadUrl(fileBase, clan?.logo || userFrom?.avatar || userTo?.avatar);

              const isBusy = busyId === inv?._id;
              const isPending = String(inv?.status || '').toLowerCase() === 'pending';

              return (
                <Paper
                  key={inv._id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: '1px solid rgba(148,163,184,0.18)',
                    bgcolor: 'rgba(2,6,23,0.25)',
                    mb: 1.5,
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: 'rgba(168,85,247,0.35)',
                    },
                  }}
                  aria-label={`Invitación ${title}`}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Avatar
                      src={avatarSrc}
                      alt={title}
                      sx={{ width: 52, height: 52, border: '2px solid rgba(255,255,255,0.12)' }}
                    >
                      {(clan?.tag || title || '?').slice(0, 1).toUpperCase()}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 900 }} noWrap>
                        {title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {subtitle}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={`Estado: ${inv?.status || '—'}`}
                          sx={{ borderRadius: '999px' }}
                        />
                        {inv?.role ? (
                          <Chip size="small" label={`Rol: ${getClanRoleLabel(inv.role)}`} sx={{ borderRadius: '999px' }} />
                        ) : null}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 'auto' } }}>
                      {type === 'received' ? (
                        <>
                          <Button
                            onClick={() => handleDecline(inv._id)}
                            variant="outlined"
                            startIcon={<CloseIcon />}
                            disabled={!isPending || isBusy}
                            sx={{
                              borderRadius: '999px',
                              borderColor: 'rgba(248,113,113,0.55)',
                              color: 'rgba(248,113,113,0.95)',
                              flex: { xs: 1, md: 'unset' },
                            }}
                            aria-label="Rechazar invitación"
                          >
                            Rechazar
                          </Button>
                          <Button
                            onClick={() => handleAccept(inv._id)}
                            variant="contained"
                            startIcon={<CheckIcon />}
                            disabled={!isPending || isBusy}
                            sx={{ borderRadius: '999px', flex: { xs: 1, md: 'unset' } }}
                            aria-label="Aceptar invitación"
                          >
                            {isBusy ? 'Procesando…' : 'Aceptar'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleCancel(inv._id)}
                          variant="outlined"
                          startIcon={<DeleteIcon />}
                          disabled={!isPending || isBusy}
                          sx={{ borderRadius: '999px', flex: { xs: 1, md: 'unset' } }}
                          aria-label="Cancelar invitación"
                        >
                          {isBusy ? 'Cancelando…' : 'Cancelar'}
                        </Button>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mt: 2, opacity: 0.2 }} />

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {inv?.createdAt
                      ? new Date(inv.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </Fade>
      )}

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

export default ClanInvites;
