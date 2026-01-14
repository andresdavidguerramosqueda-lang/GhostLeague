// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Divider,
  Chip,
  Avatar,
  LinearProgress,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  SportsEsports as SportsEsportsIcon,
  EmojiEvents as EmojiEventsIcon,
  Group as GroupIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  HelpOutline as HelpIcon,
  Gavel as GavelIcon,
  Info as InfoIcon,
  Mail as MailIcon,
  Support as SupportIcon,
  Groups as GroupsIcon,
  WhatsApp as WhatsAppIcon,
  Instagram as InstagramIcon,
  MusicNote as MusicNoteIcon,
  LiveTv as LiveTvIcon,
  Headset as HeadsetIcon,
  Mouse as MouseIcon,
  Facebook as FacebookIcon,
} from '@mui/icons-material';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSection, setSupportSection] = useState('faq');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await api.get('tournaments');
        setTournaments(response.data);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const help = params.get('help');
    const section = params.get('section');

    if (help === 'open') {
      setSupportOpen(true);

      if (section === 'faq') {
        setSupportSection('faq');
      } else if (section === 'rules') {
        setSupportSection('rules');
      } else if (section === 'about') {
        setSupportSection('about');
      } else if (section === 'contact' || section === 'support') {
        setSupportSection('contact');
      }
    }
  }, [location.search]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleJoinTournament = async (tournament) => {
    if (!currentUser) {
      navigate('/login', { state: { from: `/tournaments/${tournament._id}` } });
      return;
    }

    const hasFee = Number(tournament.registrationFee) > 0;

    // For paid tournaments, send the user to the detail page so they must use
    // the payment proof flow instead of registering directly from the dashboard.
    if (hasFee) {
      navigate(`/tournaments/${tournament._id}`);
      return;
    }

    try {
      await api.post(`tournaments/${tournament._id}/participate`);
      // Refresh tournaments after joining
      const response = await api.get('tournaments');
      setTournaments(response.data);
    } catch (error) {
      console.error('Error joining tournament:', error);
    }
  };

  const getTournamentStatus = (tournament) => {
    if (tournament.status === 'cancelled') {
      return { label: 'Cancelado', color: 'error' };
    } else if (tournament.status === 'completed') {
      return { label: 'Finalizado', color: 'default' };
    } else if (tournament.status === 'ongoing') {
      return { label: 'En Curso', color: 'success' };
    } else {
      return { label: 'Próximamente', color: 'info' };
    }
  };

  const isUserParticipating = (tournament) => {
    if (!currentUser || !Array.isArray(tournament.participants)) {
      return false;
    }

    return tournament.participants.some((p) => {
      if (!p || p.user == null) return false;
      const userId = typeof p.user === 'string' || typeof p.user === 'number'
        ? String(p.user)
        : p.user._id;
      return userId === currentUser.id;
    });
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    if (tournament.status === 'cancelled') return false;
    if (tabValue === 0) return true; // All tournaments
    if (tabValue === 1) return isUserParticipating(tournament);
    return tournament.status === 'upcoming';
  });

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
          position: 'relative',
          overflow: 'hidden',
          p: 3,
          borderRadius: 3,
          background:
            'radial-gradient(circle at top left, rgba(168,85,247,0.35), transparent 55%),\n             radial-gradient(circle at bottom right, rgba(59,130,246,0.28), transparent 55%),\n             linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.98) 45%, rgba(30,27,75,0.98) 100%)',
          border: '1px solid rgba(168,85,247,0.9)',
          boxShadow: '0 0 40px rgba(88,28,135,0.8), 0 28px 70px rgba(15,23,42,0.98)',
        }}
      >
        {/* Iconos decorativos de gaming */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          <SportsEsportsIcon
            sx={{
              position: 'absolute',
              fontSize: { xs: 90, md: 130 },
              color: 'rgba(168,85,247,0.12)',
              top: { xs: -30, md: -35 },
              right: { xs: -10, md: 10 },
              transform: 'rotate(-18deg)',
            }}
          />
          <HeadsetIcon
            sx={{
              position: 'absolute',
              fontSize: { xs: 80, md: 120 },
              color: 'rgba(129,140,248,0.13)',
              bottom: { xs: -20, md: -30 },
              left: { xs: -10, md: 0 },
              transform: 'rotate(16deg)',
            }}
          />
          <MouseIcon
            sx={{
              position: 'absolute',
              fontSize: { xs: 70, md: 100 },
              color: 'rgba(56,189,248,0.12)',
              bottom: { xs: 40, md: 30 },
              right: { xs: 40, md: 80 },
              transform: 'rotate(-8deg)',
            }}
          />
        </Box>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 800, color: '#e5e7eb', letterSpacing: 0.3 }}
            >
              Hola, {currentUser?.username}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(148,163,184,0.95)' }}>
              Revisa tus torneos, sigue tu progreso y mantente listo para competir.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'rgba(148,163,184,0.35)',
            mb: 3,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="torneos"
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{
              sx: {
                background: 'linear-gradient(135deg, #a855f7 0%, #4f46e5 100%)',
                height: 3,
                borderRadius: 999,
              },
            }}
          >
            <Tab
              label="Todos los Torneos"
              sx={{
                color: 'rgba(148,163,184,0.9)',
                textTransform: 'none',
                fontWeight: 500,
                '&.Mui-selected': {
                  color: '#e5e7eb',
                  fontWeight: 700,
                },
              }}
            />
            <Tab
              label="Mis Torneos"
              sx={{
                color: 'rgba(148,163,184,0.9)',
                textTransform: 'none',
                fontWeight: 500,
                '&.Mui-selected': {
                  color: '#e5e7eb',
                  fontWeight: 700,
                },
              }}
            />
            <Tab
              label="Próximos"
              sx={{
                color: 'rgba(148,163,184,0.9)',
                textTransform: 'none',
                fontWeight: 500,
                '&.Mui-selected': {
                  color: '#e5e7eb',
                  fontWeight: 700,
                },
              }}
            />
          </Tabs>
        </Box>

        <Grid container spacing={3}>
          {filteredTournaments.length > 0 ? (
            filteredTournaments.map((tournament) => {
              const status = getTournamentStatus(tournament);
              const isParticipating = isUserParticipating(tournament);
              const participantsCount = tournament.participants?.length || 0;
              const progress = (participantsCount / tournament.maxParticipants) * 100;

              return (
                <Grid item xs={12} md={6} lg={4} key={tournament._id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.25s ease-out',
                      background: 'rgba(15,23,42,0.96)',
                      border: '1px solid rgba(148,163,184,0.45)',
                      boxShadow: '0 18px 40px rgba(15,23,42,0.9)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: 'rgba(168,85,247,0.8)',
                        boxShadow: '0 24px 55px rgba(15,23,42,1)',
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="h6"
                          component="h2"
                          sx={{ fontWeight: 700, flexGrow: 1, color: '#e5e7eb' }}
                        >
                          {tournament.name}
                        </Typography>
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2, color: 'rgba(203,213,225,0.9)' }}
                      >
                        {tournament.description}
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 1,
                          }}
                        >
                          <SportsEsportsIcon
                            fontSize="small"
                            sx={{ mr: 1, color: 'rgba(148,163,184,0.9)' }}
                          />
                          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.95)' }}>
                            {tournament.type === '1vs1'
                              ? '1 vs 1'
                              : 'Torneo por Eliminación'}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 1,
                          }}
                        >
                          <AccessTimeIcon
                            fontSize="small"
                            sx={{ mr: 1, color: 'rgba(148,163,184,0.9)' }}
                          />
                          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.95)' }}>
                            {new Date(tournament.startDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 1,
                          }}
                        >
                          <GroupIcon
                            fontSize="small"
                            sx={{ mr: 1, color: 'rgba(148,163,184,0.9)' }}
                          />
                          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.95)' }}>
                            {participantsCount} / {tournament.maxParticipants}{' '}
                            participantes
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ width: '100%', mb: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(progress, 100)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(15,23,42,0.9)',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(90deg, #a855f7 0%, #4f46e5 100%)',
                            },
                          }}
                        />
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/tournaments/${tournament._id}`)}
                      >
                        Ver Detalles
                      </Button>
                      {tournament.status === 'upcoming' && !isParticipating && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleJoinTournament(tournament)}
                          sx={{ ml: 'auto' }}
                        >
                          Participar
                        </Button>
                      )}
                      {tournament.status === 'upcoming' && isParticipating && (
                        <Chip
                          label="Inscrito"
                          color="success"
                          size="small"
                          sx={{ ml: 'auto' }}
                        />
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })
          ) : (
            <Grid item xs={12}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 4,
                  border: '1px dashed',
                  borderColor: 'rgba(148,163,184,0.4)',
                  borderRadius: 2,
                  bgcolor: 'rgba(15,23,42,0.9)',
                }}
              >
                <EmojiEventsIcon
                  sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
                />
                <Typography variant="h6" sx={{ color: 'rgba(226,232,240,0.95)' }} gutterBottom>
                  No hay torneos disponibles
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tabValue === 1
                    ? 'Aún no te has inscrito en ningún torneo.'
                    : 'No hay torneos programados en este momento.'}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      <Button
        variant="contained"
        startIcon={<SupportIcon />}
        onClick={() => setSupportOpen(true)}
        sx={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          background: 'linear-gradient(135deg, #a855f7 0%, #4f46e5 40%, #22d3ee 100%)',
          color: '#0b1020',
          boxShadow: '0 0 30px rgba(59,130,246,0.8), 0 0 55px rgba(168,85,247,0.9)',
          textTransform: 'none',
          fontWeight: 800,
          borderRadius: 999,
          px: 3,
          '&:hover': {
            boxShadow: '0 0 40px rgba(59,130,246,1), 0 0 70px rgba(168,85,247,1)',
            transform: 'translateY(-1px)',
          },
        }}
      >
        Centro de ayuda
      </Button>

      <Drawer
        anchor="right"
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
      >
        <Box
          sx={{
            width: { xs: 280, sm: 320 },
            p: 2,
            pt: 3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Centro de ayuda
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Explora la información útil o contacta con el soporte.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <List>
            <ListItemButton
              selected={supportSection === 'faq'}
              onClick={() => {
                setSupportOpen(false);
                navigate('/faq');
              }}
            >
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText primary="Preguntas frecuentes" />
            </ListItemButton>
            <ListItemButton
              selected={supportSection === 'rules'}
              onClick={() => setSupportSection('rules')}
            >
              <ListItemIcon>
                <GavelIcon />
              </ListItemIcon>
              <ListItemText primary="Reglas" />
            </ListItemButton>
            <ListItemButton
              selected={supportSection === 'about'}
              onClick={() => setSupportSection('about')}
            >
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText primary="Sobre nosotros" />
            </ListItemButton>
            <ListItemButton
              selected={supportSection === 'contact'}
              onClick={() => setSupportSection('contact')}
            >
              <ListItemIcon>
                <MailIcon />
              </ListItemIcon>
              <ListItemText primary="Contacto" />
            </ListItemButton>

            <Divider sx={{ my: 1.5 }} />

            <ListItemButton
              onClick={() => {
                setSupportOpen(false);
                navigate('/support');
              }}
              sx={{
                mt: 1,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #a855f7 0%, #4f46e5 100%)',
                color: '#0b1020',
                boxShadow: '0 0 20px rgba(168,85,247,0.75)',
                '& .MuiListItemIcon-root': {
                  color: '#0b1020',
                  minWidth: 40,
                },
                '& .MuiListItemText-primary': {
                  fontWeight: 700,
                },
                '&:hover': {
                  boxShadow: '0 0 26px rgba(168,85,247,0.95)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <ListItemIcon>
                <SupportIcon />
              </ListItemIcon>
              <ListItemText primary="Contactar con el soporte" />
            </ListItemButton>
          </List>

          <Box sx={{ mt: 2 }}>
            {supportSection === 'faq' && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Preguntas frecuentes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aquí podrás encontrar respuestas rápidas sobre el uso de la plataforma y los torneos.
                </Typography>
              </>
            )}
            {supportSection === 'rules' && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Reglas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Consulta las reglas básicas de comportamiento y participación en Ghost League.
                </Typography>
              </>
            )}
            {supportSection === 'about' && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Sobre nosotros
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ghost League es una plataforma creada para organizar y vivir torneos competitivos de forma sencilla.
                </Typography>
              </>
            )}
            {supportSection === 'contact' && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Contacto
                </Typography>

                {/* Grupos de la comunidad */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5 }}>
                  Grupos de la comunidad
                </Typography>
                <Box
                  component="a"
                  href="https://discord.gg/fuQFVYp448"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.5,
                    color: 'text.secondary',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  <GroupsIcon fontSize="small" />
                  <Typography variant="body2" color="inherit">
                    Discord oficial
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  <WhatsAppIcon fontSize="small" />
                  <Typography variant="body2" color="inherit">
                    Comunidad de WhatsApp (próximamente)
                  </Typography>
                </Box>

                {/* Redes sociales */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>
                  Redes sociales
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  <FacebookIcon fontSize="small" />
                  <Typography variant="body2" color="inherit">
                    Facebook
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  <InstagramIcon fontSize="small" />
                  <Typography variant="body2" color="inherit">
                    Instagram
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  <MusicNoteIcon fontSize="small" />
                  <Typography variant="body2" color="inherit">
                    TikTok
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  <LiveTvIcon fontSize="small" />
                  <Typography variant="body2" color="inherit">
                    Twitch
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Drawer>
    </Container>
  );
};

export default Dashboard;