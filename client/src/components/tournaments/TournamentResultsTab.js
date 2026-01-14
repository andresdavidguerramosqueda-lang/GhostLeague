import React from 'react';
import { Box, Typography, Button, Paper, Avatar, Divider, LinearProgress } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import EditIcon from '@mui/icons-material/Edit';
import { styled, alpha } from '@mui/material/styles';

// -- STYLED COMPONENTS --

const BracketContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  // Un gap amplio para que se vean las "líneas" imaginarias
  gap: theme.spacing(3),
  padding: theme.spacing(2),
  paddingBottom: theme.spacing(1.5),
  overflowX: 'auto',
  // Asegura que el contenedor ocupe espacio y centre verticalmente si hay pocos items
  minHeight: '360px', 
  alignItems: 'stretch', // Para que las columnas tengan el mismo alto y justify-content funcione
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  
  // Scrollbar styling
  '&::-webkit-scrollbar': {
    height: '10px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.paper,
    borderRadius: '5px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: '5px',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
}));

const RoundColumn = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  minWidth: '210px',
  maxWidth: '210px',
  position: 'relative',
  flexShrink: 0, // No permitir que se encojan
  paddingTop: theme.spacing(0.5),
}));

const RoundTitle = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(1.5),
  fontWeight: 700,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  fontSize: '0.7rem',
  letterSpacing: '0.8px',
  position: 'sticky',
  top: 0,
  zIndex: 2,
  width: '100%',
  padding: theme.spacing(0.75, 0.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(6px)',
}));

const MatchCard = styled(Paper)(({ theme, isFinished }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 64,
  borderRadius: theme.shape.borderRadius * 1.5,
  border: '1px solid',
  borderColor: isFinished ? theme.palette.divider : theme.palette.divider,
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.2s ease-in-out',
  overflow: 'hidden',
  boxShadow: theme.shadows[1],
  zIndex: 1, // Para estar sobre conectores si los hubiera

  '&:hover': {
    boxShadow: theme.shadows[4],
    borderColor: theme.palette.primary.main,
    transform: 'translateY(-2px)',
  },

  // Conector derecho (salida hacia la siguiente ronda)
  // Usamos pseudo-elementos para simular la línea
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    right: -12,
    width: 12,
    height: 2,
    backgroundColor: theme.palette.divider,
    display: 'none', // Se activa condicionalmente o por clase
  },
  
  '&.has-next-round::after': {
    display: 'block',
  }
}));

// Fila de participante dentro de la tarjeta
const ParticipantRow = styled(Box)(({ theme, isWinner, isLoser, isBye }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 1.25),
  backgroundColor: isWinner 
    ? alpha(theme.palette.success.main, 0.08) 
    : isBye 
      ? alpha(theme.palette.action.disabledBackground, 0.3)
      : 'transparent',
  opacity: isLoser ? 0.5 : 1,
  position: 'relative',
  
  // Borde entre participantes
  '&:first-of-type': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },

  // Indicador de ganador (borde izquierdo)
  ...(isWinner && {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: theme.palette.success.main,
    }
  })
}));

const ChampionContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  minWidth: '180px',
  border: `2px solid ${theme.palette.warning.main}`,
  background: `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.1)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
  gap: theme.spacing(1),
  boxShadow: theme.shadows[4],
}));

// -- COMPONENT --

const TournamentResultsTab = ({
  eliminationBracket,
  championName,
  tournamentStatus,
  isAdmin,
  isOrganizer,
  onOpenManageBracket,
  pointsAwards,
  currentUserId,
  currentUserCompetitive,
}) => {

  const awards = Array.isArray(pointsAwards) ? pointsAwards : [];
  const showAwards = tournamentStatus === 'completed' && awards.length > 0;

  const formatNumber = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toFixed(2);
  };

  const renderAwards = () => {
    if (!showAwards) return null;

    const competitive =
      currentUserCompetitive && typeof currentUserCompetitive === 'object'
        ? currentUserCompetitive
        : null;
    const rawPoints = Number(competitive?.points);
    const safePoints = Number.isFinite(rawPoints) ? Math.max(0, rawPoints) : 0;
    const storedLevel = Number(competitive?.level);
    const safeLevel = Number.isFinite(storedLevel)
      ? Math.max(1, storedLevel)
      : Math.floor(safePoints / 100) + 1;

    const levelStart = (safeLevel - 1) * 100;
    const inLevel = Math.max(0, safePoints - levelStart);
    const progressPercent = Math.max(0, Math.min(100, (inLevel / 100) * 100));
    const pointsToNext = Math.max(0, safeLevel * 100 - safePoints);

    return (
      <Box sx={{ mt: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            Puntos competitivos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Aquí verás cómo se calculó el puntaje de cada jugador.
          </Typography>

          {competitive && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Tu nivel: {safeLevel}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                {formatNumber(safePoints)} pts | faltan {formatNumber(pointsToNext)} pts para nivel {safeLevel + 1}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 8, borderRadius: 5 }}
              />
            </Box>
          )}

          {awards.map((award, index) => {
            const user = award?.user && typeof award.user === 'object' ? award.user : null;
            const userId = user?._id || award?.user;
            const username = user?.username || 'Jugador';
            const placement = Number(award?.placement) || index + 1;
            const points = Number(award?.points);
            const pointsSafe = Number.isFinite(points) ? points : 0;
            const isCurrentUser =
              currentUserId && userId && String(userId) === String(currentUserId);

            const wins = Number.isFinite(Number(award?.wins)) ? Number(award.wins) : 0;
            const losses = Number.isFinite(Number(award?.losses)) ? Number(award.losses) : 0;
            const difficultyAvg = Number(award?.difficultyAvg);
            const difficultySafe = Number.isFinite(difficultyAvg) ? difficultyAvg : 0;
            const breakdown = award?.breakdown || {};

            return (
              <Box
                key={award?._id || `${placement}-${username}`}
                sx={{
                  py: 1.75,
                  px: 1.5,
                  borderRadius: 2,
                  backgroundColor: isCurrentUser ? 'action.selected' : 'transparent',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, minWidth: 42 }}>
                      #{placement}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: isCurrentUser ? 900 : 700 }}>
                      {username}
                    </Typography>
                    {Number.isFinite(Number(user?.competitive?.level)) && (
                      <Typography variant="caption" color="text.secondary">
                        Nivel {user.competitive.level}
                      </Typography>
                    )}
                  </Box>

                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 900,
                      color: pointsSafe >= 0 ? 'success.main' : 'error.main',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pointsSafe >= 0 ? '+' : ''}
                    {formatNumber(pointsSafe)}
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {wins}W - {losses}L | Dificultad {formatNumber(difficultySafe)}
                </Typography>

                {isCurrentUser && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Base: {formatNumber(breakdown.basePlacement)} | Victorias: {formatNumber(
                        breakdown.winsPoints
                      )} | Dificultad: {formatNumber(breakdown.difficultyPoints)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Penalizaciones: {formatNumber(breakdown.penalties)} | Decay: {formatNumber(
                        breakdown.decay
                      )} | Total: {formatNumber(breakdown.total)}
                    </Typography>
                  </Box>
                )}

                {index < awards.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            );
          })}
        </Paper>
      </Box>
    );
  };

  if (!eliminationBracket) {
    return (
      <Box>
        <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
          <EmojiEventsOutlinedIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            El bracket aún no está disponible
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Necesitas al menos 2 participantes para generar el cuadro de torneo.
          </Typography>
          {(isAdmin || isOrganizer) && (
            <Typography variant="caption" color="primary">
              Los brackets se generarán automáticamente cuando haya participantes inscritos.
            </Typography>
          )}
        </Box>
        {renderAwards()}
      </Box>
    );
  }

  const { rounds, matches } = eliminationBracket.bracket;

  // Agrupar partidos por índice de ronda
  const matchesByRound = rounds.reduce((acc, round) => {
    acc[round.roundIndex] = matches.filter(m => m.roundIndex === round.roundIndex);
    return acc;
  }, {});

  const totalRounds = rounds.length;

  // Layout triangular "real": calculamos el TOP de cada match según su centro en la ronda anterior.
  // Fórmula: top = (i * 2^(r-1) + (2^(r-1)-1)/2) * unit
  // donde unit es (alto_aprox_match + gap).
  const BASE_CARD_HEIGHT = 64;
  const BASE_GAP = 14;
  const BASE_UNIT = BASE_CARD_HEIGHT + BASE_GAP;

  const firstRoundCount = (matchesByRound[1] || []).length;
  const bracketHeight = Math.max(1, firstRoundCount * BASE_UNIT - BASE_GAP);

  const getMatchTop = (roundIndex, matchIndex) => {
    const pow = Math.pow(2, roundIndex - 1);
    const centerIndex = matchIndex * pow + (pow - 1) / 2;
    return centerIndex * BASE_UNIT;
  };

  const hasChampion = !!championName;
  const canManageResults = tournamentStatus === 'ongoing' && !hasChampion;

  return (
    <Box>
      {/* Header Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEventsIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Resultados del Torneo
            </Typography>
        </Box>
        
        {(isAdmin || isOrganizer) && (
          <Button
            variant="contained"
            size="small"
            startIcon={<EditIcon />}
            onClick={onOpenManageBracket}
            disabled={!canManageResults}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Gestionar Resultados
          </Button>
        )}
      </Box>

      {/* Bracket Scroll Container */}
      <Box sx={{ position: 'relative', pt: 3 }}> 
        <BracketContainer>
          {rounds.map((round, rIndex) => {
            const roundMatches = matchesByRound[round.roundIndex] || [];
            const isLastRound = rIndex === rounds.length - 1;

            return (
              <RoundColumn key={round.roundIndex}>
                <RoundTitle>{round.roundName}</RoundTitle>

                <Box sx={{ position: 'relative', height: bracketHeight }}>
                  {roundMatches.map((match, matchIndex) => {
                    // Lógica para determinar estado de participantes
                    const winnerId = match.winnerId;

                    const teamA = match.teamA;
                    const teamB = match.teamB;

                    const isABye = !teamA; // Si teamA es null, es un hueco (raro en seeded, pero posible)
                    const isBBye = !teamB; // Si teamB es null, es BYE

                    const isAWinner = winnerId && teamA && String(teamA.id) === String(winnerId);
                    const isBWinner = winnerId && teamB && String(teamB.id) === String(winnerId);

                    const isALoser = winnerId && teamA && String(teamA.id) !== String(winnerId);
                    const isBLoser = winnerId && teamB && String(teamB.id) !== String(winnerId);

                    return (
                      <MatchCard
                        key={match.matchId}
                        isFinished={!!winnerId}
                        className={!isLastRound ? 'has-next-round' : ''}
                        sx={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: getMatchTop(round.roundIndex, matchIndex),
                        }}
                      >
                      {/* Participante A */}
                      <ParticipantRow 
                        isWinner={isAWinner} 
                        isLoser={isALoser}
                        isBye={isABye}
                      >
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflow: 'hidden' }}>
                            {teamA ? (
                                <>
                                    <Avatar 
                                        sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: isAWinner ? 'success.main' : 'primary.main' }}
                                    >
                                        {teamA.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: isAWinner ? 700 : 500, fontSize: '0.8rem' }}>
                                        {teamA.name}
                                    </Typography>
                                </>
                            ) : (
                                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
                                    BYE
                                </Typography>
                            )}
                         </Box>
                         {isAWinner && <EmojiEventsIcon color="success" sx={{ fontSize: 14 }} />}
                      </ParticipantRow>

                      {/* Participante B */}
                      <ParticipantRow 
                        isWinner={isBWinner} 
                        isLoser={isBLoser}
                        isBye={isBBye}
                      >
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflow: 'hidden' }}>
                            {teamB ? (
                                <>
                                    <Avatar 
                                        sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: isBWinner ? 'success.main' : 'secondary.main' }}
                                    >
                                        {teamB.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: isBWinner ? 700 : 500, fontSize: '0.8rem' }}>
                                        {teamB.name}
                                    </Typography>
                                </>
                            ) : (
                                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
                                    BYE
                                </Typography>
                            )}
                         </Box>
                         {isBWinner && <EmojiEventsIcon color="success" sx={{ fontSize: 14 }} />}
                      </ParticipantRow>
                    </MatchCard>
                    );
                  })}
                </Box>
              </RoundColumn>
            );
          })}

          {/* Champion Column (si hay campeón) */}
          {championName && (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', ml: 2 }}>
               <ChampionContainer elevation={3}>
                  <EmojiEventsIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                  <Typography variant="overline" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                    CAMPEÓN
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center' }}>
                    {championName}
                  </Typography>
               </ChampionContainer>
            </Box>
          )}

        </BracketContainer>
      </Box>

      {renderAwards()}
    </Box>
  );
};

export default TournamentResultsTab;
