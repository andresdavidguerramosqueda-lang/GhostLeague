import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Skeleton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  FiberManualRecord as DotIcon,
  Refresh as RefreshIcon,
  SportsEsports as GameIcon,
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

const Ranking = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState({ overall: [], byGame: {} });

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');

  const gameKey = tab === 1 ? 'brawlstars' : tab === 2 ? 'clash_royale' : null;

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/users/leaderboard');
      setLeaderboard({
        overall: Array.isArray(data?.overall) ? data.overall : [],
        byGame: data?.byGame && typeof data.byGame === 'object' ? data.byGame : {},
      });
    } catch (err) {
      console.error('Error al cargar leaderboard:', err);
      setError('No se pudo cargar el ranking. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const rows = useMemo(() => {
    if (tab === 0) return leaderboard.overall || [];
    const byGame = leaderboard.byGame || {};
    if (!gameKey) return [];
    return Array.isArray(byGame[gameKey]) ? byGame[gameKey] : [];
  }, [gameKey, leaderboard.byGame, leaderboard.overall, tab]);

  const getStats = (row) => {
    if (!row) return {};
    if (tab === 0) return row.overall || {};
    if (!gameKey) return {};
    return row.byGame?.[gameKey] || {};
  };

  const topThree = rows.slice(0, 3);

  const tabLabel = tab === 0 ? 'General' : tab === 1 ? 'Brawl Stars' : 'Clash Royale';

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
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
              Ranking competitivo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
              Clasificación global y por juego basada en puntos, nivel y rendimiento. Selecciona una pestaña para cambiar de
              ladder.
            </Typography>
          </Box>
          <Button
            onClick={fetchLeaderboard}
            variant="outlined"
            startIcon={<RefreshIcon />}
            disabled={loading}
            sx={{ borderColor: 'rgba(168,85,247,0.55)' }}
          >
            Actualizar
          </Button>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ mt: 3 }}
        >
          <Tab label="General" />
          <Tab label="Brawl Stars" />
          <Tab label="Clash Royale" />
        </Tabs>
      </Paper>

      {error ? (
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(239,68,68,0.35)' }}>
          <Typography sx={{ fontWeight: 700 }}>{error}</Typography>
        </Paper>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Grid item xs={12} md={4} key={`podium-skeleton-${index}`}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="rectangular" height={54} sx={{ mt: 2, borderRadius: 2 }} />
                </Paper>
              </Grid>
            ))
          : topThree.map((player) => {
              const stats = getStats(player);
              const rank = safeNumber(player.rank, 0);
              const trophyColor = rank === 1 ? '#facc15' : rank === 2 ? '#94a3b8' : '#f97316';
              const avatarSrc = resolveUploadUrl(fileBase, player.avatar);
              return (
                <Grid item xs={12} md={4} key={`podium-${player.username}`}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      background:
                        'linear-gradient(135deg, rgba(109,40,217,0.22) 0%, rgba(15,23,42,0.9) 55%, rgba(2,6,23,0.95) 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'radial-gradient(circle at 30% 0%, rgba(250,204,21,0.12) 0%, transparent 45%)',
                        opacity: rank === 1 ? 1 : 0.65,
                        pointerEvents: 'none',
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
                      <TrophyIcon sx={{ color: trophyColor }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                        #{rank} {tabLabel}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, position: 'relative' }}>
                      <Avatar
                        src={avatarSrc}
                        alt={player.username}
                        sx={{ width: 44, height: 44, border: '2px solid rgba(255,255,255,0.12)' }}
                      >
                        {player.username?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          component={RouterLink}
                          to={`/u/${encodeURIComponent(player.username)}`}
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
                          {player.username}
                        </Typography>
                        {player.playerId && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontFamily: 'monospace',
                              color: 'text.secondary',
                              cursor: 'pointer',
                              '&:hover': { color: 'primary.main' }
                            }}
                            onClick={() => navigator.clipboard.writeText(player.playerId)}
                            title="Copiar ID"
                          >
                            {player.playerId}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Nivel {safeNumber(stats.level, 1)} • {safeNumber(stats.points, 0).toFixed(2)} pts
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <DotIcon sx={{ fontSize: 14, color: player.isOnline ? '#22c55e' : 'rgba(148,163,184,0.9)' }} />
                        <Typography variant="caption" color="text.secondary">
                          {player.isOnline ? 'Online' : 'Offline'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, position: 'relative' }}>
                      <Chip size="small" label={`${safeNumber(stats.wins, 0)}W - ${safeNumber(stats.losses, 0)}L`} />
                      <Chip size="small" label={`${safeNumber(stats.points, 0).toFixed(2)} pts`} />
                      {tab !== 0 ? (
                        <Chip size="small" label={`${safeNumber(stats.tournaments, 0)} torneos`} />
                      ) : null}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
      </Grid>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          background: 'rgba(15,23,42,0.85)',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GameIcon sx={{ color: 'secondary.light' }} />
            <Box>
              <Typography sx={{ fontWeight: 900 }}>Ladder: {tabLabel}</Typography>
              <Typography variant="caption" color="text.secondary">
                Ordenado por puntos y victorias.
              </Typography>
            </Box>
          </Box>
          <Chip size="small" label={`${rows.length} jugadores`} />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 900 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Jugador</TableCell>
                {tab === 0 ? <TableCell sx={{ fontWeight: 900 }}>Juego</TableCell> : null}
                <TableCell sx={{ fontWeight: 900 }}>Nivel</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Puntos</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>W-L</TableCell>
                {tab !== 0 ? <TableCell sx={{ fontWeight: 900 }}>Torneos</TableCell> : null}
                <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 10 }).map((_, idx) => (
                    <TableRow key={`row-skeleton-${idx}`}>
                      <TableCell>
                        <Skeleton width={24} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Skeleton variant="circular" width={28} height={28} />
                          <Skeleton width={140} />
                        </Box>
                      </TableCell>
                      {tab === 0 ? (
                        <TableCell>
                          <Skeleton width={90} />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Skeleton width={60} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={70} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={70} />
                      </TableCell>
                      {tab !== 0 ? (
                        <TableCell>
                          <Skeleton width={60} />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Skeleton width={60} />
                      </TableCell>
                    </TableRow>
                  ))
                : rows.map((player) => {
                    const stats = getStats(player);
                    const rank = safeNumber(player.rank, 0);
                    const avatarSrc = resolveUploadUrl(fileBase, player.avatar);
                    const gameLabel =
                      player.favoriteGame ||
                      (player?.byGame?.brawlstars?.points
                        ? 'Brawl Stars'
                        : player?.byGame?.clash_royale?.points
                          ? 'Clash Royale'
                          : '—');
                    return (
                      <TableRow
                        key={`rank-${tabLabel}-${player.username}`}
                        hover
                        sx={{
                          '& td': {
                            borderColor: 'rgba(255,255,255,0.06)',
                          },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 900 }}>{rank}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <Avatar
                              src={avatarSrc}
                              alt={player.username}
                              sx={{ width: 28, height: 28, border: '1px solid rgba(255,255,255,0.12)' }}
                            >
                              {player.username?.[0]?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                component={RouterLink}
                                to={`/u/${encodeURIComponent(player.username)}`}
                                sx={{
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  color: 'inherit',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: { xs: 140, sm: 240 },
                                }}
                              >
                                {player.username}
                              </Typography>
                              {player.playerId && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontFamily: 'monospace',
                                    color: 'text.secondary',
                                    cursor: 'pointer',
                                    '&:hover': { color: 'primary.main' }
                                  }}
                                  onClick={() => navigator.clipboard.writeText(player.playerId)}
                                  title="Copiar ID"
                                >
                                  {player.playerId}
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {safeNumber(stats.wins, 0)}W • {safeNumber(stats.losses, 0)}L
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        {tab === 0 ? <TableCell>{gameLabel}</TableCell> : null}
                        <TableCell>Nivel {safeNumber(stats.level, 1)}</TableCell>
                        <TableCell>{safeNumber(stats.points, 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {safeNumber(stats.wins, 0)}-{safeNumber(stats.losses, 0)}
                        </TableCell>
                        {tab !== 0 ? <TableCell>{safeNumber(stats.tournaments, 0)}</TableCell> : null}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <DotIcon
                              sx={{
                                fontSize: 14,
                                color: player.isOnline ? '#22c55e' : 'rgba(148,163,184,0.9)',
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {player.isOnline ? 'Online' : 'Offline'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default Ranking;
