import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Skeleton,
  TextField,
  Typography,
  InputAdornment,
  Alert,
  Fade,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GroupsIcon from '@mui/icons-material/Groups';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPublicClans } from '../services/clanService';
import ClanCard from '../components/clans/ClanCard';
import EmptyState from '../components/clans/EmptyState';

const Clans = () => {
  const { isAuthenticated, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clans, setClans] = useState([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const [skip, setSkip] = useState(0);
  const limit = 12;

  const hasMore = useMemo(() => (skip + clans.length) < total, [clans.length, skip, total]);

  const fetchClans = async ({ nextSkip = 0, append = false, searchValue = '' } = {}) => {
    try {
      setLoading(true);
      setError('');
      const data = await getPublicClans({ limit, skip: nextSkip, search: searchValue });
      const rows = Array.isArray(data?.clans) ? data.clans : [];
      const count = Number.isFinite(Number(data?.total)) ? Number(data.total) : 0;

      setTotal(count);
      setSkip(nextSkip);
      setClans((prev) => (append ? [...prev, ...rows] : rows));
    } catch (e) {
      console.error('Error cargando clanes:', e);
      setError('No pudimos cargar los clanes. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClans({ nextSkip: 0, append: false, searchValue: '' });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchDraft.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    fetchClans({ nextSkip: 0, append: false, searchValue: search });
    // eslint-disable-next-line
  }, [search]);

  const title = 'Clanes';

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
          boxShadow: '0 0 28px rgba(168,85,247,0.25)',
          mb: 3,
        }}
        component="section"
        aria-label="Explorar clanes"
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
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
              Encuentra un equipo con tu misma mentalidad: competir, mejorar y ganar en comunidad.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 'auto' } }}>
            {isAuthenticated ? (
              <Button
                component={RouterLink}
                to={currentUser?.clanId ? '/my-clan' : '/my-clan'}
                variant="contained"
                sx={{ borderRadius: '999px', whiteSpace: 'nowrap' }}
                aria-label="Ir a mi clan"
              >
                Mi clan
              </Button>
            ) : (
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                sx={{ borderRadius: '999px', whiteSpace: 'nowrap' }}
                aria-label="Iniciar sesión para crear o unirte a un clan"
              >
                Inicia sesión
              </Button>
            )}

            <Button
              onClick={() => fetchClans({ nextSkip: 0, append: false, searchValue: search })}
              variant="outlined"
              startIcon={<RefreshIcon />}
              disabled={loading}
              sx={{ borderRadius: '999px', borderColor: 'rgba(168,85,247,0.55)', whiteSpace: 'nowrap' }}
              aria-label="Recargar clanes"
            >
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Buscar por nombre o tag…"
            inputProps={{
              'aria-label': 'Buscar clanes por nombre o tag',
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Grid container spacing={2} aria-label="Cargando clanes">
          {Array.from({ length: limit }).map((_, idx) => (
            <Grid item xs={12} sm={6} md={4} key={`clan-skeleton-${idx}`}>
              <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                  <Skeleton variant="circular" width={52} height={52} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="45%" />
                  </Box>
                  <Skeleton variant="rounded" width={56} height={24} />
                </Box>
                <Skeleton variant="text" sx={{ mt: 1.5 }} />
                <Skeleton variant="text" width="85%" />
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : clans.length === 0 ? (
        <Fade in timeout={250}>
          <Box>
            <EmptyState
              title="Aún no hay clanes para mostrar"
              description="Prueba con otra búsqueda o vuelve más tarde: los clanes aparecen cuando se activan públicamente."
              actionLabel="Limpiar búsqueda"
              onAction={() => setSearchDraft('')}
              icon={<GroupsIcon sx={{ fontSize: 34 }} />}
            />
          </Box>
        </Fade>
      ) : (
        <Fade in timeout={250}>
          <Box component="section" aria-label="Listado de clanes">
            <Grid container spacing={2}>
              {clans.map((clan) => (
                <Grid item xs={12} sm={6} md={4} key={clan._id}>
                  <ClanCard clan={clan} />
                </Grid>
              ))}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              {hasMore ? (
                <Button
                  onClick={() => fetchClans({ nextSkip: skip + limit, append: true, searchValue: search })}
                  variant="outlined"
                  sx={{ borderRadius: '999px', borderColor: 'rgba(168,85,247,0.55)' }}
                  aria-label="Cargar más clanes"
                >
                  Cargar más
                </Button>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Llegaste al final. Si quieres, crea el tuyo y deja huella.
                </Typography>
              )}
            </Box>
          </Box>
        </Fade>
      )}
    </Container>
  );
};

export default Clans;
