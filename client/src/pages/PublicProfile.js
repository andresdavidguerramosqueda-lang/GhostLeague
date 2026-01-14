import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CameraAlt as CameraAltIcon,
  Chat as ChatIcon,
  FiberManualRecord as DotIcon,
  MusicNote as MusicNoteIcon,
  OpenInNew as OpenInNewIcon,
  Shield as ShieldIcon,
  SportsEsports as SportsEsportsIcon,
  Twitter as TwitterIcon,
  YouTube as YouTubeIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
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

const formatGame = (game) => {
  if (game === 'brawlstars') return 'Brawl Stars';
  if (game === 'clash_royale') return 'Clash Royale';
  return 'Otro';
};

const buildSocialUrl = (network, value) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  switch (network) {
    case 'spotify':
      return `https://open.spotify.com/user/${handle}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${handle}`;
    case 'twitch':
      return `https://www.twitch.tv/${handle}`;
    case 'discord':
      return `https://discord.com/users/${handle}`;
    case 'instagram':
      return `https://www.instagram.com/${handle}`;
    case 'x':
      return `https://x.com/${handle}`;
    case 'youtube':
      return `https://www.youtube.com/${handle}`;
    default:
      return `https://${trimmed}`;
  }
};

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [competitiveTab, setCompetitiveTab] = useState(0);

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        setUser(null);

        const raw = username ? String(username) : '';
        const decoded = raw ? decodeURIComponent(raw) : '';
        const { data } = await api.get(`/users/${encodeURIComponent(decoded)}`);
        setUser(data);
      } catch (err) {
        console.error('Error cargando perfil público:', err);
        if (err?.response?.status === 404) {
          setError('Este usuario no se ha encontrado.');
        } else {
          setError('No se pudo cargar el perfil. Intenta nuevamente.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const competitive = useMemo(() => {
    return user?.competitive && typeof user.competitive === 'object' ? user.competitive : {};
  }, [user]);

  const competitiveHistoryRaw = useMemo(() => {
    const raw = Array.isArray(competitive.history) ? [...competitive.history] : [];
    raw.sort((a, b) => {
      const aDate = a?.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bDate = b?.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bDate - aDate;
    });
    return raw;
  }, [competitive.history]);

  const highlightedWinsRaw = useMemo(() => {
    const raw = Array.isArray(competitive.highlightedWins) ? [...competitive.highlightedWins] : [];
    raw.sort((a, b) => {
      const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
    return raw;
  }, [competitive.highlightedWins]);

  const competitivePoints = Math.max(0, safeNumber(competitive.points, 0));
  const storedLevel = safeNumber(competitive.level, 0);
  const competitiveLevel = storedLevel > 0 ? storedLevel : Math.floor(competitivePoints / 100) + 1;
  const levelStart = (competitiveLevel - 1) * 100;
  const inLevel = Math.max(0, competitivePoints - levelStart);
  const progressPercent = Math.max(0, Math.min(100, (inLevel / 100) * 100));
  const pointsToNext = Math.max(0, competitiveLevel * 100 - competitivePoints);

  const competitiveWins = Math.max(0, safeNumber(competitive.wins, 0));
  const competitiveLosses = Math.max(0, safeNumber(competitive.losses, 0));
  const totalMatches = competitiveWins + competitiveLosses;
  const winRate = totalMatches ? (competitiveWins / totalMatches) * 100 : 0;

  const buildGameStats = (gameKey) => {
    const entries = competitiveHistoryRaw.filter((h) => h?.game === gameKey);
    const tournaments = entries.length;
    const points = entries.reduce((sum, h) => sum + safeNumber(h?.points, 0), 0);
    const wins = entries.reduce((sum, h) => sum + safeNumber(h?.wins, 0), 0);
    const losses = entries.reduce((sum, h) => sum + safeNumber(h?.losses, 0), 0);
    const avgPlacement = tournaments
      ? entries.reduce((sum, h) => sum + safeNumber(h?.placement, 0), 0) / tournaments
      : 0;
    return { tournaments, points, wins, losses, avgPlacement };
  };

  const brawlStats = buildGameStats('brawlstars');
  const clashStats = buildGameStats('clash_royale');

  const avatarUrl = resolveUploadUrl(fileBase, user?.avatar);
  const bannerUrl = resolveUploadUrl(fileBase, user?.banner);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 3, mb: 6 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Cargando perfil...
          </Typography>
          <LinearProgress />
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 3, mb: 6 }}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(239,68,68,0.35)' }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {error}
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => navigate(-1)}>
              Volver
            </Button>
            <Button component={RouterLink} to="/players" variant="contained">
              Buscar jugadores
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 6 }}>
      <Box sx={{ position: 'relative', mb: { xs: 10, sm: 11 } }}>
        <Box
          sx={{
            height: { xs: 180, sm: 240 },
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'grey.900',
            backgroundImage: bannerUrl
              ? `url(${bannerUrl})`
              : 'linear-gradient(135deg, #0b1020 0%, #1f2937 50%, #4f46e5 120%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.35)',
            }}
          />
        </Box>

        <Paper
          elevation={6}
          sx={{
            position: 'absolute',
            left: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 'auto' },
            bottom: { xs: -72, sm: -80 },
            p: 2,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            maxWidth: { sm: 640 },
          }}
        >
          <Avatar
            src={avatarUrl}
            alt={user.username}
            sx={{
              width: 96,
              height: 96,
              border: '4px solid',
              borderColor: 'background.paper',
            }}
          >
            {user.username?.[0]?.toUpperCase()}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>
                {user.username || 'Sin nombre'}
              </Typography>
              {user?.role === 'owner' && <ShieldIcon sx={{ fontSize: 22, color: 'purple' }} />}
              {user?.role === 'admin' && <ShieldIcon sx={{ fontSize: 22, color: 'orange' }} />}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 0.5 }}>
                <DotIcon sx={{ fontSize: 14, color: user.isOnline ? '#22c55e' : 'rgba(148,163,184,0.9)' }} />
                <Typography variant="caption" color="text.secondary">
                  {user.isOnline ? 'Online' : 'Offline'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {user.country ? <Chip size="small" label={`País: ${user.country}`} /> : null}
              {user.favoriteGame ? <Chip size="small" label={`Juego: ${user.favoriteGame}`} /> : null}
              <Chip size="small" label={`Nivel ${competitiveLevel}`} />
              <Chip size="small" label={`${competitivePoints.toFixed(2)} pts`} />
            </Box>
          </Box>
        </Paper>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SportsEsportsIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Modo competitivo
                </Typography>
              </Box>
              <Button component={RouterLink} to="/ranking" variant="outlined" size="small">
                Ver ranking
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mt: 2, mb: 2 }}>
              <Box sx={{ minWidth: 160 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                  Nivel {competitiveLevel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {competitivePoints.toFixed(2)} pts
                </Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  {inLevel.toFixed(2)}/100 | faltan {pointsToNext.toFixed(2)} para nivel {competitiveLevel + 1}
                </Typography>
                <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 5 }} />
              </Box>

              <Box sx={{ minWidth: 220 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {competitiveWins}W - {competitiveLosses}L
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  winrate {winRate.toFixed(1)}%
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                    Brawl Stars
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {brawlStats.tournaments} torneos | {brawlStats.points.toFixed(2)} pts
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {brawlStats.wins}W - {brawlStats.losses}L | avg #{brawlStats.avgPlacement.toFixed(1)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                    Clash Royale
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {clashStats.tournaments} torneos | {clashStats.points.toFixed(2)} pts
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {clashStats.wins}W - {clashStats.losses}L | avg #{clashStats.avgPlacement.toFixed(1)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Tabs
              value={competitiveTab}
              onChange={(_, next) => setCompetitiveTab(next)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ mb: 1 }}
            >
              <Tab label="Historial" />
              <Tab label="Victorias destacadas" />
            </Tabs>

            {competitiveTab === 0 && (
              <Box sx={{ mt: 1 }}>
                {competitiveHistoryRaw.length ? (
                  <List disablePadding>
                    {competitiveHistoryRaw.map((item, index) => {
                      const name = item?.tournamentName || 'Torneo';
                      const game = item?.game;
                      const placement = Math.max(0, safeNumber(item?.placement, 0));
                      const points = safeNumber(item?.points, 0);
                      const wins = Math.max(0, safeNumber(item?.wins, 0));
                      const losses = Math.max(0, safeNumber(item?.losses, 0));
                      return (
                        <ListItem
                          key={item?._id || `${name}-${index}`}
                          disableGutters
                          divider={index < competitiveHistoryRaw.length - 1}
                        >
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 2,
                                }}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                                    {name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {formatGame(game)}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    flexShrink: 0,
                                  }}
                                >
                                  {placement ? <Chip size="small" label={`#${placement}`} /> : null}
                                  <Chip
                                    size="small"
                                    color={points >= 0 ? 'success' : 'error'}
                                    label={`${points >= 0 ? '+' : ''}${points.toFixed(2)} pts`}
                                  />
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {wins}W - {losses}L
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Aún no hay historial competitivo.
                  </Typography>
                )}
              </Box>
            )}

            {competitiveTab === 1 && (
              <Box sx={{ mt: 1 }}>
                {highlightedWinsRaw.length ? (
                  <List disablePadding>
                    {highlightedWinsRaw.map((item, index) => {
                      const opponent = item?.opponentUsername || 'Rival';
                      const opponentLevel = Math.max(0, safeNumber(item?.opponentLevel, 0));
                      const tournamentName = item?.tournamentName || 'Torneo';
                      const game = item?.game;
                      return (
                        <ListItem
                          key={item?._id || `${opponent}-${index}`}
                          disableGutters
                          divider={index < highlightedWinsRaw.length - 1}
                        >
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 2,
                                }}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                                    {opponent}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {tournamentName}{game ? ` • ${formatGame(game)}` : ''}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    flexShrink: 0,
                                  }}
                                >
                                  {opponentLevel ? <Chip size="small" label={`Nivel ${opponentLevel}`} /> : null}
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Aún no hay victorias destacadas.
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }} gutterBottom>
              Perfil público
            </Typography>

            {user.playerId && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  ID de Jugador:
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    fontWeight: 'bold',
                    color: 'primary.main',
                    backgroundColor: 'rgba(168,85,247,0.1)',
                    border: '1px solid rgba(168,85,247,0.3)',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: 'rgba(168,85,247,0.2)',
                      borderColor: 'rgba(168,85,247,0.5)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => navigator.clipboard.writeText(user.playerId)}
                  title="Copiar ID"
                >
                  {user.playerId}
                </Typography>
              </Box>
            )}

            {user.bio ? (
              <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {user.bio}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Este jugador aún no agregó una biografía.
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              Redes
            </Typography>

            {user.socialSpotify ? (
              <Box
                component="a"
                href={buildSocialUrl('spotify', user.socialSpotify)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', mb: 0.5, textDecoration: 'none', color: 'inherit' }}
              >
                <MusicNoteIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Spotify
                </Typography>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : null}

            {user.socialTiktok ? (
              <Box
                component="a"
                href={buildSocialUrl('tiktok', user.socialTiktok)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', mb: 0.5, textDecoration: 'none', color: 'inherit' }}
              >
                <SportsEsportsIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  TikTok
                </Typography>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : null}

            {user.socialTwitch ? (
              <Box
                component="a"
                href={buildSocialUrl('twitch', user.socialTwitch)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', mb: 0.5, textDecoration: 'none', color: 'inherit' }}
              >
                <SportsEsportsIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Twitch
                </Typography>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : null}

            {user.socialDiscord ? (
              <Box
                component="a"
                href={buildSocialUrl('discord', user.socialDiscord)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', mb: 0.5, textDecoration: 'none', color: 'inherit' }}
              >
                <ChatIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Discord
                </Typography>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : null}

            {user.socialInstagram ? (
              <Box
                component="a"
                href={buildSocialUrl('instagram', user.socialInstagram)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', mb: 0.5, textDecoration: 'none', color: 'inherit' }}
              >
                <CameraAltIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Instagram
                </Typography>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : null}

            {user.socialX ? (
              <Box
                component="a"
                href={buildSocialUrl('x', user.socialX)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', mb: 0.5, textDecoration: 'none', color: 'inherit' }}
              >
                <TwitterIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  X
                </Typography>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : null}

            {user.socialYoutube ? (
              <Box
                component="a"
                href={buildSocialUrl('youtube', user.socialYoutube)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', mb: 0.5, textDecoration: 'none', color: 'inherit' }}
              >
                <YouTubeIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  YouTube
                </Typography>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : null}

            {!user.socialSpotify &&
            !user.socialTiktok &&
            !user.socialTwitch &&
            !user.socialDiscord &&
            !user.socialInstagram &&
            !user.socialX &&
            !user.socialYoutube ? (
              <Typography variant="body2" color="text.secondary">
                Sin redes vinculadas.
              </Typography>
            ) : null}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                component={RouterLink}
                to="/players"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
              >
                Volver a búsqueda
              </Button>
              <Button component={RouterLink} to="/tournaments" variant="contained">
                Ver torneos
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PublicProfile;
