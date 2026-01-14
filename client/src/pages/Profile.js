import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Box,
  Divider,
  Tabs,
  Tab,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Slide,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ChatIcon from '@mui/icons-material/Chat';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import ShieldIcon from '@mui/icons-material/Shield';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Profile = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const [savedForm, setSavedForm] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    showEmailOnProfile: currentUser?.showEmailOnProfile ?? true,
    country: currentUser?.country || '',
    favoriteGame: currentUser?.favoriteGame || '',
    avatar: currentUser?.avatar || '',
    banner: currentUser?.banner || '',
    bio: currentUser?.bio || '',
    socialSpotify: currentUser?.socialSpotify || '',
    socialTiktok: currentUser?.socialTiktok || '',
    socialTwitch: currentUser?.socialTwitch || '',
    socialDiscord: currentUser?.socialDiscord || '',
    socialInstagram: currentUser?.socialInstagram || '',
    socialX: currentUser?.socialX || '',
    socialYoutube: currentUser?.socialYoutube || '',
  });

  const [form, setForm] = useState(savedForm);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' | 'error'
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [socialValue, setSocialValue] = useState('');
  const [socialError, setSocialError] = useState('');
  const [competitiveTab, setCompetitiveTab] = useState(0);

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');
  const avatarUrl = form.avatar
    ? form.avatar.startsWith('/uploads')
      ? `${fileBase}${form.avatar}`
      : form.avatar
    : '';
  const bannerUrl = form.banner
    ? form.banner.startsWith('/uploads')
      ? `${fileBase}${form.banner}`
      : form.banner
    : '';

  const buildSocialUrl = (network, value) => {
    if (!value) return '';
    const trimmed = value.trim();
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

  const renderSocialLink = (network, label, value, IconComponent) => {
    if (!value) return null;
    const href = buildSocialUrl(network, value);
    return (
      <Box
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 0.5,
          textDecoration: 'none',
          color: 'inherit',
          '&:hover': {
            textDecoration: 'underline',
          },
        }}
      >
        <IconComponent sx={{ fontSize: 20, mr: 1 }} />
        <Typography
          variant="body2"
          sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {label}
        </Typography>
        <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5 }} />
      </Box>
    );
  };

  const isDirty =
    form.username !== savedForm.username ||
    form.showEmailOnProfile !== savedForm.showEmailOnProfile ||
    form.country !== savedForm.country ||
    form.favoriteGame !== savedForm.favoriteGame ||
    form.bio !== savedForm.bio ||
    form.avatar !== savedForm.avatar ||
    form.banner !== savedForm.banner ||
    form.socialSpotify !== savedForm.socialSpotify ||
    form.socialTiktok !== savedForm.socialTiktok ||
    form.socialTwitch !== savedForm.socialTwitch ||
    form.socialDiscord !== savedForm.socialDiscord ||
    form.socialInstagram !== savedForm.socialInstagram ||
    form.socialX !== savedForm.socialX ||
    form.socialYoutube !== savedForm.socialYoutube;

  // Registrar función global para que el Layout pueda solicitar salir del perfil
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.requestProfileLeave = () => {
        if (!isDirty) {
          goBack();
        } else {
          setLeaveDialogOpen(true);
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete window.requestProfileLeave;
      }
    };
  }, [isDirty, navigate]);

  const openSocialDialog = (networkKey) => {
    setSelectedNetwork(networkKey || null);
    setSocialError('');
    if (networkKey) {
      setSocialValue(form[networkKey] || '');
    } else {
      setSocialValue('');
    }
    setSocialDialogOpen(true);
  };

  const handleSelectNetwork = (networkKey) => {
    setSelectedNetwork(networkKey);
    setSocialError('');
    setSocialValue(form[networkKey] || '');
  };

  const handleSaveSocial = async () => {
    if (!selectedNetwork) {
      setSocialDialogOpen(false);
      return;
    }
    const trimmed = socialValue.trim();
    if (!trimmed) {
      setSocialError('Debes ingresar un usuario o enlace.');
      return;
    }
    const networkKey = selectedNetwork.replace('social', '').toLowerCase();
    const href = buildSocialUrl(networkKey, trimmed);
    try {
      // Validar que sea una URL bien formada localmente (solo formato)
      // eslint-disable-next-line no-new
      new URL(href);
    } catch {
      setSocialError('El enlace no parece válido para esta red social.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      [selectedNetwork]: trimmed,
    }));
    setSocialDialogOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');

    try {
      let nextAvatar = form.avatar;
      let nextBanner = form.banner;

      // Si hay un nuevo avatar seleccionado, súbelo primero
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const { data: avatarData } = await api.post('/auth/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const updatedAvatarUser = avatarData.user || {};
        nextAvatar = updatedAvatarUser.avatar || nextAvatar;
        setForm((prev) => ({
          ...prev,
          avatar: updatedAvatarUser.avatar || prev.avatar,
        }));
        setSavedForm((prev) => ({
          ...prev,
          avatar: updatedAvatarUser.avatar || prev.avatar,
        }));
        setAvatarFile(null);
      }

      if (bannerFile) {
        const formData = new FormData();
        formData.append('banner', bannerFile);

        const { data: bannerData } = await api.post('/auth/banner', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const updatedBannerUser = bannerData.user || {};
        nextBanner = updatedBannerUser.banner || nextBanner;
        setForm((prev) => ({
          ...prev,
          banner: updatedBannerUser.banner || prev.banner,
        }));
        setSavedForm((prev) => ({
          ...prev,
          banner: updatedBannerUser.banner || prev.banner,
        }));
        setBannerFile(null);
      }

      const payload = {
        username: form.username,
        country: form.country,
        favoriteGame: form.favoriteGame,
        bio: form.bio,
        showEmailOnProfile: form.showEmailOnProfile,
        socialSpotify: form.socialSpotify,
        socialTiktok: form.socialTiktok,
        socialTwitch: form.socialTwitch,
        socialDiscord: form.socialDiscord,
        socialInstagram: form.socialInstagram,
        socialX: form.socialX,
        socialYoutube: form.socialYoutube,
      };
      const { data } = await api.put('/auth/profile', payload);
      const updated = data.user || {};

      const mergedProfile = {
        ...form,
        avatar: nextAvatar,
        banner: nextBanner,
        username: updated.username ?? form.username,
        country: updated.country ?? form.country,
        favoriteGame: updated.favoriteGame ?? form.favoriteGame,
        bio: updated.bio ?? form.bio,
        showEmailOnProfile: updated.showEmailOnProfile ?? form.showEmailOnProfile,
        socialSpotify: updated.socialSpotify ?? form.socialSpotify,
        socialTiktok: updated.socialTiktok ?? form.socialTiktok,
        socialTwitch: updated.socialTwitch ?? form.socialTwitch,
        socialDiscord: updated.socialDiscord ?? form.socialDiscord,
        socialInstagram: updated.socialInstagram ?? form.socialInstagram,
        socialX: updated.socialX ?? form.socialX,
        socialYoutube: updated.socialYoutube ?? form.socialYoutube,
      };

      setForm(mergedProfile);
      setSavedForm(mergedProfile);
      setMessage('Perfil actualizado correctamente.');
      setMessageType('success');
      refreshUser && refreshUser();
      return true;
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      setMessage('Ocurrió un error al actualizar el perfil.');
      setMessageType('error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveProfile();
  };

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setUploading(false);
    // Mostrar preview local del avatar seleccionado
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      avatar: previewUrl,
    }));
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleBannerFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBannerFile(file);
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      banner: previewUrl,
    }));
  };

  const handleCopyPlayerId = () => {
    navigator.clipboard.writeText(currentUser.playerId);
    setShowCopyMessage(true);
    setTimeout(() => setShowCopyMessage(false), 2000);
  };

  const handleBannerClick = () => {
    if (bannerInputRef.current) {
      bannerInputRef.current.click();
    }
  };

  const handleDiscardAndExit = () => {
    setLeaveDialogOpen(false);
    goBack();
  };

  const handleSaveAndExit = async () => {
    const ok = await saveProfile();
    if (ok) {
      setLeaveDialogOpen(false);
      goBack();
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h5">Debes iniciar sesión para ver tu perfil.</Typography>
      </Container>
    );
  }

  const competitive =
    currentUser.competitive && typeof currentUser.competitive === 'object'
      ? currentUser.competitive
      : {};

  const competitiveHistoryRaw = Array.isArray(competitive.history)
    ? [...competitive.history]
    : [];
  competitiveHistoryRaw.sort((a, b) => {
    const aDate = a?.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bDate = b?.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bDate - aDate;
  });

  const highlightedWinsRaw = Array.isArray(competitive.highlightedWins)
    ? [...competitive.highlightedWins]
    : [];
  highlightedWinsRaw.sort((a, b) => {
    const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  const safeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const formatGame = (game) => {
    if (game === 'brawlstars') return 'Brawl Stars';
    if (game === 'clash_royale') return 'Clash Royale';
    return 'Otro';
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
  };

  const formatPoints = (value) => {
    const n = safeNumber(value, 0);
    const fixed = n.toFixed(2);
    return `${n >= 0 ? '+' : ''}${fixed}`;
  };

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
  const tournamentsPlayed = Math.max(
    0,
    safeNumber(
      competitive.tournamentsPlayed,
      Array.isArray(competitive.history) ? competitive.history.length : 0
    )
  );

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

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 6 }}>
      <Box sx={{ position: 'relative', mb: { xs: 10, sm: 11 } }}>
        <Box
          onClick={handleBannerClick}
          sx={{
            height: { xs: 180, sm: 240 },
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'grey.900',
            backgroundImage: bannerUrl
              ? `url(${bannerUrl})`
              : 'linear-gradient(135deg, #111827 0%, #1f2937 45%, #0ea5e9 120%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            cursor: 'pointer',
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

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleBannerClick();
            }}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: 'rgba(0,0,0,0.55)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
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
            maxWidth: { sm: 560 },
          }}
        >
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={avatarUrl}
              alt={form.username}
              sx={{
                width: 96,
                height: 96,
                cursor: 'pointer',
                border: '4px solid',
                borderColor: 'background.paper',
              }}
              onClick={handleAvatarClick}
            >
              {form.username?.[0]?.toUpperCase()}
            </Avatar>
            <IconButton
              size="small"
              onClick={handleAvatarClick}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': { bgcolor: 'background.paper' },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>
                {form.username || 'Sin nombre'}
              </Typography>
              {currentUser?.playerId && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Tooltip title="Click para copiar">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
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
                      onClick={handleCopyPlayerId}
                    >
                      {currentUser.playerId}
                    </Typography>
                  </Tooltip>
                  <Snackbar
                    open={showCopyMessage}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    sx={{ bottom: 100 }}
                  >
                    <Alert 
                      severity="success" 
                      sx={{ 
                        backgroundColor: 'rgba(34,197,94,0.9)',
                        color: 'white',
                        '& .MuiAlert-icon': {
                          color: 'white'
                        }
                      }}
                    >
                      ¡ID de jugador copiado!
                    </Alert>
                  </Snackbar>
                </Box>
              )}
              {currentUser?.role === 'owner' && (
                <ShieldIcon sx={{ fontSize: 22, color: 'purple' }} />
              )}
              {currentUser?.role === 'admin' && (
                <ShieldIcon sx={{ fontSize: 22, color: 'orange' }} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" noWrap>
              {form.showEmailOnProfile ? form.email : 'Correo oculto'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {form.country ? (
                <Chip size="small" label={`País: ${form.country}`} />
              ) : null}
              {form.favoriteGame ? (
                <Chip size="small" label={`Juego: ${form.favoriteGame}`} />
              ) : null}
            </Box>
          </Box>
        </Paper>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SportsEsportsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Modo competitivo
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
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
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{ height: 8, borderRadius: 5 }}
                />
              </Box>

              <Box sx={{ minWidth: 220 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {competitiveWins}W - {competitiveLosses}L
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tournamentsPlayed} torneos | winrate {winRate.toFixed(1)}%
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
                    {brawlStats.tournaments} torneos | {formatPoints(brawlStats.points)} pts
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
                    {clashStats.tournaments} torneos | {formatPoints(clashStats.points)} pts
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
                      const tournamentId =
                        typeof item?.tournament === 'string'
                          ? item.tournament
                          : item?.tournament?._id;
                      const name = item?.tournamentName || 'Torneo';
                      const game = item?.game;
                      const placement = Math.max(0, safeNumber(item?.placement, 0));
                      const points = safeNumber(item?.points, 0);
                      const wins = Math.max(0, safeNumber(item?.wins, 0));
                      const losses = Math.max(0, safeNumber(item?.losses, 0));
                      const difficulty = safeNumber(item?.difficultyAvg, 0);
                      const dateLabel = formatDate(item?.completedAt);

                      return (
                        <ListItem
                          key={tournamentId || `${name}-${index}`}
                          disableGutters
                          divider={index < competitiveHistoryRaw.length - 1}
                          secondaryAction={
                            tournamentId ? (
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => navigate(`/tournaments/${tournamentId}`)}
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            ) : null
                          }
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                                    {name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {formatGame(game)}{dateLabel ? ` • ${dateLabel}` : ''}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, pr: tournamentId ? 5 : 0 }}>
                                  {placement ? (
                                    <Chip size="small" label={`#${placement}`} />
                                  ) : null}
                                  <Chip
                                    size="small"
                                    color={points >= 0 ? 'success' : 'error'}
                                    label={`${formatPoints(points)} pts`}
                                  />
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {wins}W - {losses}L | dificultad {difficulty.toFixed(2)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Aún no tienes historial competitivo. Finaliza un torneo para empezar a sumar puntos.
                  </Typography>
                )}
              </Box>
            )}

            {competitiveTab === 1 && (
              <Box sx={{ mt: 1 }}>
                {highlightedWinsRaw.length ? (
                  <List disablePadding>
                    {highlightedWinsRaw.map((item, index) => {
                      const tournamentId =
                        typeof item?.tournament === 'string'
                          ? item.tournament
                          : item?.tournament?._id;
                      const opponent = item?.opponentUsername || 'Rival';
                      const opponentLevel = Math.max(0, safeNumber(item?.opponentLevel, 0));
                      const tournamentName = item?.tournamentName || 'Torneo';
                      const game = item?.game;
                      const dateLabel = formatDate(item?.createdAt);

                      return (
                        <ListItem
                          key={item?._id || `${opponent}-${index}`}
                          disableGutters
                          divider={index < highlightedWinsRaw.length - 1}
                          secondaryAction={
                            tournamentId ? (
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => navigate(`/tournaments/${tournamentId}`)}
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            ) : null
                          }
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                                    {opponent}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {tournamentName}{game ? ` • ${formatGame(game)}` : ''}{dateLabel ? ` • ${dateLabel}` : ''}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, pr: tournamentId ? 5 : 0 }}>
                                  {opponentLevel ? (
                                    <Chip size="small" label={`Nivel ${opponentLevel}`} />
                                  ) : null}
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
                    Aún no tienes victorias destacadas.
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ajustes de perfil
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Actualiza la información visible de tu cuenta en Ghost League.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                fullWidth
                label="Nombre de usuario"
                name="username"
                value={form.username}
                onChange={handleChange}
              />

              <TextField
                margin="normal"
                fullWidth
                label="Correo electrónico"
                name="email"
                value={form.showEmailOnProfile ? form.email : ''}
                disabled
                helperText={
                  form.showEmailOnProfile
                    ? 'Este correo no se puede cambiar.'
                    : 'Tu correo está oculto en tu perfil.'
                }
              />

              <FormControlLabel
                sx={{ mt: 0.5 }}
                control={
                  <Switch
                    checked={!!form.showEmailOnProfile}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        showEmailOnProfile: event.target.checked,
                      }))
                    }
                  />
                }
                label="Mostrar correo en mi perfil"
              />

              <TextField
                margin="normal"
                fullWidth
                label="País"
                name="country"
                value={form.country}
                onChange={handleChange}
              />

              <TextField
                margin="normal"
                fullWidth
                label="Juego favorito"
                name="favoriteGame"
                value={form.favoriteGame}
                onChange={handleChange}
              />

              <TextField
                margin="normal"
                fullWidth
                label="Biografía / descripción"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                multiline
                minRows={3}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
                Redes sociales
              </Typography>

              <Button
                variant="outlined"
                color="primary"
                onClick={() => openSocialDialog(null)}
              >
                Añadir red social
              </Button>

              {(form.socialSpotify ||
                form.socialTiktok ||
                form.socialTwitch ||
                form.socialDiscord ||
                form.socialInstagram ||
                form.socialX ||
                form.socialYoutube) && (
                <Box sx={{ mt: 2, textAlign: 'left' }}>
                  {renderSocialLink('spotify', 'Spotify', form.socialSpotify, MusicNoteIcon)}
                  {renderSocialLink('tiktok', 'TikTok', form.socialTiktok, SportsEsportsIcon)}
                  {renderSocialLink('twitch', 'Twitch', form.socialTwitch, SportsEsportsIcon)}
                  {renderSocialLink('discord', 'Discord', form.socialDiscord, ChatIcon)}
                  {renderSocialLink('instagram', 'Instagram', form.socialInstagram, CameraAltIcon)}
                  {renderSocialLink('x', 'X', form.socialX, TwitterIcon)}
                  {renderSocialLink('youtube', 'YouTube', form.socialYoutube, YouTubeIcon)}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    (si el usuario no existe, el enlace no llevará a ningún lugar)
                  </Typography>
                </Box>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />

              <input
                type="file"
                accept="image/*"
                onChange={handleBannerFileChange}
                ref={bannerInputRef}
                style={{ display: 'none' }}
              />

              <Divider sx={{ my: 2 }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Slide in={isDirty} direction="up" mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: (theme) => theme.zIndex.snackbar,
          }}
        >
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }} elevation={6}>
            <Typography variant="body2">
              Tienes cambios sin guardar.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </Paper>
        </Box>
      </Slide>

      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setMessage('');
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={messageType}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>

      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)}>
        <DialogTitle>Salir del perfil</DialogTitle>
        <DialogContent>
          <Typography>
            Tienes cambios sin guardar en tu perfil. ¿Qué deseas hacer?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={handleDiscardAndExit}>
            Salir y descartar
          </Button>
          <Button variant="contained" onClick={handleSaveAndExit} disabled={saving}>
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={socialDialogOpen} onClose={() => setSocialDialogOpen(false)}>
        <DialogTitle>Redes sociales</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Elige una red social y escribe tu usuario o enlace.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Button variant={selectedNetwork === 'socialTiktok' ? 'contained' : 'outlined'} onClick={() => handleSelectNetwork('socialTiktok')} startIcon={<SportsEsportsIcon />}>
              TikTok
            </Button>
            <Button variant={selectedNetwork === 'socialDiscord' ? 'contained' : 'outlined'} onClick={() => handleSelectNetwork('socialDiscord')} startIcon={<ChatIcon />}>
              Discord
            </Button>
            <Button variant={selectedNetwork === 'socialInstagram' ? 'contained' : 'outlined'} onClick={() => handleSelectNetwork('socialInstagram')} startIcon={<CameraAltIcon />}>
              Instagram
            </Button>
            <Button variant={selectedNetwork === 'socialX' ? 'contained' : 'outlined'} onClick={() => handleSelectNetwork('socialX')} startIcon={<TwitterIcon />}>
              X
            </Button>
            <Button variant={selectedNetwork === 'socialYoutube' ? 'contained' : 'outlined'} onClick={() => handleSelectNetwork('socialYoutube')} startIcon={<YouTubeIcon />}>
              YouTube
            </Button>
            <Button variant={selectedNetwork === 'socialTwitch' ? 'contained' : 'outlined'} onClick={() => handleSelectNetwork('socialTwitch')} startIcon={<SportsEsportsIcon />}>
              Twitch
            </Button>
          </Box>

          {selectedNetwork && (
            <TextField
              autoFocus
              margin="dense"
              label="Usuario o enlace"
              fullWidth
              value={socialValue}
              onChange={(e) => setSocialValue(e.target.value)}
              error={!!socialError}
              helperText={socialError}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSocialDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveSocial} disabled={!selectedNetwork} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
