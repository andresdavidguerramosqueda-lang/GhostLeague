import React from 'react';
import {
  Typography,
  Container,
  Box,
  Paper,
  Grid,
  Button,
  Chip
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  SportsEsports as GameIcon,
  Group as GroupIcon,
  ArrowForward as ArrowIcon,
  Bolt as BoltIcon,
  HeadsetMic as HeadsetIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HeroButton({ children, variant = 'contained', to, ...props }) {
  return (
    <Button
      component={RouterLink}
      to={to}
      variant={variant}
      size="medium"
      sx={{
        px: 3,
        py: 1,
        fontSize: '1rem',
        borderRadius: '50px',
        textTransform: 'none',
        fontWeight: 'bold',
        boxShadow:
          variant === 'contained'
            ? '0 4px 18px rgba(168, 85, 247, 0.55)'
            : 'none',
        background:
          variant === 'contained'
            ? 'linear-gradient(135deg, #a855f7 0%, #4f46e5 100%)'
            : 'transparent',
        border:
          variant === 'outlined'
            ? '1.5px solid rgba(168,85,247,0.6)'
            : 'none',
        color: variant === 'outlined' ? '#e5e7eb' : '#0b1020',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          background:
            variant === 'contained'
              ? 'linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 50%, #6366f1 100%)'
              : 'rgba(88,28,135,0.4)',
          border:
            variant === 'outlined' ? '1.5px solid #a855f7' : 'none',
          boxShadow:
            variant === 'contained'
              ? '0 10px 28px rgba(168, 85, 247, 0.7)'
              : 'none',
        },
        ...(props.sx || {}),
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: 'rgba(30, 41, 59, 0.45)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 4,
        transition: 'all 0.4s ease',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(180deg, rgba(168,85,247,0.09) 0%, transparent 100%)',
          pointerEvents: 'none',
        },
        '&:hover': {
          transform: 'translateY(-10px)',
          background: 'rgba(30, 27, 75, 0.9)',
          border: '1px solid rgba(168, 85, 247, 0.45)',
          boxShadow: '0 18px 40px -8px rgba(15, 23, 42, 0.9)',
        },
        '&:hover .icon-box': {
          transform: 'scale(1.1) rotate(5deg)',
          background: 'linear-gradient(135deg, #a855f7 0%, #4f46e5 100%)',
          color: '#0b1020',
        },
      }}
    >
      <Box
        className="icon-box"
        sx={{
          width: 60,
          height: 60,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          background: 'rgba(15, 23, 42, 0.85)',
          color: '#c4b5fd',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Icon sx={{ fontSize: 30 }} />
      </Box>
      <Typography
        variant="h5"
        gutterBottom
        fontWeight="bold"
        sx={{ color: '#fff' }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}
      >
        {desc}
      </Typography>
    </Paper>
  );
}

function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#020617',
        color: 'white',
        overflowX: 'hidden',
        border: '2px solid rgba(168,85,247,0.8)',
        borderRadius: 4,
        boxShadow:
          '0 0 25px rgba(168,85,247,0.55), 0 0 60px rgba(88,28,135,0.7)',
        mx: { xs: 1, md: 2 },
        my: { xs: 1, md: 2 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          pt: { xs: 2, md: 3 },
          pb: { xs: 2, md: 3 },

          background:
            'radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.18) 0%, transparent 50%),' +
            'radial-gradient(circle at 80% 70%, rgba(88, 28, 135, 0.22) 0%, transparent 50%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <GameIcon
            sx={{
              position: 'absolute',
              fontSize: { xs: 120, md: 170 },
              color: 'rgba(148,163,184,0.06)',
              bottom: { xs: -30, md: -20 },
              left: { xs: -40, md: 20 },
              transform: 'rotate(-18deg)',
            }}
          />
          <HeadsetIcon
            sx={{
              position: 'absolute',
              fontSize: { xs: 120, md: 170 },
              color: 'rgba(129,140,248,0.09)',
              top: { xs: -10, md: 10 },
              right: { xs: -30, md: 40 },
              transform: 'rotate(15deg)',
            }}
          />
        </Box>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ mb: 2 }}>
                <Box
                  className="gl-float"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: '99px',
                    bgcolor: 'rgba(88, 28, 135, 0.55)',
                    border: '1px solid rgba(168, 85, 247, 0.6)',
                    color: '#e9d5ff',
                    mb: 2,
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                  }}
                >
                  <BoltIcon fontSize="small" />
                  <span>La nueva era competitiva</span>
                </Box>
                <Typography
                  variant="h2"
                  className="gl-neon-text gl-glitch-hover"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '1.8rem', md: '2.5rem' },
                    lineHeight: 1.05,
                    mb: 1,
                    color: '#a855f7',
                    textShadow: '0 0 18px rgba(168, 85, 247, 0.7)',
                  }}
                >
                  Ghost
                  <br />
                  <span
                    style={{
                      color: '#a855f7',
                    }}
                  >
                    League
                  </span>
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    color: '#9ca3af',
                    mb: 2,
                    maxWidth: '600px',
                    lineHeight: 1.6,
                    fontWeight: 400,
                    fontSize: { xs: '0.95rem', md: '1.1rem' },
                  }}
                >
                  El sistema definitivo de gestión de torneos. Compite, sube de
                  rango y reclama tu lugar entre las leyendas.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <HeroButton to={isAuthenticated ? '/tournaments' : '/login'}>
                    {isAuthenticated ? 'Explorar Torneos' : 'Empezar Ahora'}
                    <ArrowIcon sx={{ ml: 1, fontSize: 20 }} />
                  </HeroButton>
                  {!isAuthenticated && (
                    <HeroButton variant="outlined" to="/register">
                      Crear Cuenta
                    </HeroButton>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid
              item
              xs={12}
              md={5}
              sx={{ display: { xs: 'none', md: 'block' } }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: 240,

                  width: '100%',
                  background:
                    'linear-gradient(135deg, rgba(88,28,135,0.4) 0%, rgba(15,23,42,0.9) 100%)',

                  borderRadius: '30px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: -20,
                    background:
                      'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.35), transparent 75%)',
                    zIndex: -1,
                  },
                }}
              >
                <Box
                  sx={{
                    width: '78%',
                    height: '58%',

                    background:
                      'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: 4,
                    boxShadow:
                      '0 25px 50px -12px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 20,
                      left: 20,
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: '#a855f7',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 30,
                      left: 80,
                      width: 120,
                      height: 10,
                      borderRadius: 999,
                      bgcolor: 'rgba(148,163,184,0.45)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 48,
                      left: 80,
                      width: 80,
                      height: 9,
                      borderRadius: 999,
                      bgcolor: 'rgba(148,163,184,0.25)',
                    }}
                  />

                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-around',
                      px: 4,
                      pb: 4,
                    }}
                  >
                    {[40, 70, 50, 90, 60].map((h) => (
                      <Box
                        key={h}
                        sx={{
                          width: '15%',
                          height: `${h}%`,
                          bgcolor:
                            h === 90
                              ? '#a855f7'
                              : 'rgba(255,255,255,0.1)',
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <FeatureCard
              icon={GameIcon}
              title="Torneos Competitivos"
              desc="Sistemas de brackets automatizados, matchmaking justo y seguimiento en tiempo real de tus partidas."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard
              icon={GroupIcon}
              title="Comunidad Activa"
              desc="Únete a miles de jugadores, forma equipos, recluta talento y hazte un nombre en la escena."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard
              icon={TrophyIcon}
              title="Premios Reales"
              desc="Compite por premios en efectivo, hardware gaming y puntos exclusivos para nuestra tienda."
            />
          </Grid>
        </Grid>
        
        {/* Sección prominente de Discord */}
        <Box
          sx={{
            mt: 6,
            mb: 4,
            p: 4,
            background: 'linear-gradient(135deg, rgba(88,28,135,0.3) 0%, rgba(15,23,42,0.6) 100%)',
            border: '2px solid rgba(88, 28, 135, 0.6)',
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.2), transparent 70%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                icon={<ChatIcon />}
                label="COMUNIDAD OFICIAL"
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(88, 28, 135, 0.8)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  height: 32,
                  '& .MuiChip-icon': {
                    color: 'white',
                  },
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 2,
                  background: 'linear-gradient(135deg, #5865F2 0%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Únete a Nuestra Comunidad
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#9ca3af',
                  mb: 4,
                  maxWidth: '700px',
                  mx: 'auto',
                  lineHeight: 1.6,
                }}
              >
                Conecta con otros jugadores, encuentra equipo, participa en eventos exclusivos 
                y mantente al día con todas las novedades de Ghost League.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => window.open('https://discord.com/invite/fuQFVYp448', '_blank')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  borderRadius: '50px',
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #5865F2 0%, #7289DA 100%)',
                  boxShadow: '0 4px 20px rgba(88, 101, 242, 0.5)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4752C4 0%, #5865F2 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(88, 101, 242, 0.7)',
                  },
                  transition: 'all 0.3s ease',
                }}
                startIcon={<ChatIcon />}
              >
                Unirse al Servidor de Discord
              </Button>
            </Box>
          </Container>
        </Box>
      </Container>
    </Box>
  );
}

export default Home;