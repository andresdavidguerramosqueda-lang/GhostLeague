import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  InputAdornment,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import {
  FiberManualRecord as DotIcon,
  Groups as GroupsIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import api from '../services/api';

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const resolveUploadUrl = (fileBase, value) => {
  if (!value) return '';
  if (typeof value !== 'string') return '';
  return value.startsWith('/uploads') ? `${fileBase}${value}` : value;
};

const PlayersDirectory = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');

  const fetchUsers = async (value) => {
    const q = String(value || '').trim();
    if (!q) {
      setResults([]);
      setError('');
      setLoading(false);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      // Use the new search endpoint that supports playerId
      const { data } = await api.get(`/users/search/${encodeURIComponent(q)}`);
      setResults(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch (err) {
      console.error('Error buscando usuarios:', err);
      setError('No se pudo realizar la búsqueda. Intenta nuevamente.');
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(query);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const normalizedResults = useMemo(() => {
    return (results || []).map((user) => {
      const competitive = user?.competitive || {};
      const points = safeNumber(competitive.points, 0);
      const level = Math.max(1, safeNumber(competitive.level, 1));
      const wins = Math.max(0, safeNumber(competitive.wins, 0));
      const losses = Math.max(0, safeNumber(competitive.losses, 0));
      const isOnline = !!user.isOnline;
      const avatarSrc = resolveUploadUrl(fileBase, user.avatar);
      return {
        ...user,
        avatarSrc,
        stats: { points, level, wins, losses },
        isOnline,
      };
    });
  }, [fileBase, results]);

  return (
    <Container maxWidth="lg" sx={{ pb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          border: '1px solid rgba(59,130,246,0.35)',
          background:
            'radial-gradient(circle at 25% 20%, rgba(59,130,246,0.2) 0%, rgba(15,23,42,0.92) 55%, rgba(2,6,23,0.95) 100%)',
          boxShadow: '0 0 28px rgba(59,130,246,0.22)',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupsIcon sx={{ color: 'secondary.light' }} />
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                Directorio de jugadores
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
              Busca usuarios por su nombre o ID de jugador (ej: #ABC1234) y revisa su perfil público competitivo.
            </Typography>
          </Box>
          <Button component={RouterLink} to="/ranking" variant="outlined" sx={{ borderColor: 'rgba(168,85,247,0.55)' }}>
            Ver ranking
          </Button>
        </Box>

        <Box sx={{ mt: 3 }}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
            placeholder="Buscar por username o ID de jugador..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {error ? (
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(239,68,68,0.35)', mb: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{error}</Typography>
        </Paper>
      ) : null}

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Grid item xs={12} md={6} key={`player-skeleton-${index}`}>
              <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="55%" />
                    <Skeleton variant="text" width="35%" />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  <Skeleton variant="rounded" width={80} height={24} />
                  <Skeleton variant="rounded" width={90} height={24} />
                  <Skeleton variant="rounded" width={70} height={24} />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : null}

      {!loading && searched && normalizedResults.length === 0 ? (
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Sin resultados
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Prueba con otro nombre de usuario.
          </Typography>
        </Paper>
      ) : null}

      {!loading && normalizedResults.length > 0 ? (
        <Grid container spacing={2}>
          {normalizedResults.map((user) => (
            <Grid item xs={12} md={6} key={`player-${user.id || user.username}`}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(15,23,42,0.85)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={user.avatarSrc}
                    alt={user.username}
                    sx={{ width: 44, height: 44, border: '2px solid rgba(255,255,255,0.12)' }}
                  >
                    {user.username?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      component={RouterLink}
                      to={`/u/${encodeURIComponent(user.username)}`}
                      sx={{
                        display: 'block',
                        fontWeight: 900,
                        textDecoration: 'none',
                        color: 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.username}
                    </Typography>
                    {user.playerId && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontFamily: 'monospace',
                          color: 'primary.main',
                          cursor: 'pointer',
                          '&:hover': { color: 'primary.light' }
                        }}
                        onClick={() => navigator.clipboard.writeText(user.playerId)}
                        title="Copiar ID"
                      >
                        {user.playerId}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Nivel {user.stats.level} • {user.stats.points.toFixed(2)} pts
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <DotIcon sx={{ fontSize: 14, color: user.isOnline ? '#22c55e' : 'rgba(148,163,184,0.9)' }} />
                    <Typography variant="caption" color="text.secondary">
                      {user.isOnline ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  <Chip size="small" label={`${user.stats.wins}W - ${user.stats.losses}L`} />
                  <Chip size="small" label={`${user.stats.points.toFixed(2)} pts`} />
                  {user.country ? <Chip size="small" label={user.country} /> : null}
                  {user.favoriteGame ? <Chip size="small" label={user.favoriteGame} /> : null}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    component={RouterLink}
                    to={`/u/${encodeURIComponent(user.username)}`}
                    variant="contained"
                    size="small"
                  >
                    Ver perfil
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : null}
    </Container>
  );
};

export default PlayersDirectory;
