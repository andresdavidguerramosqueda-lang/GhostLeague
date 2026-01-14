import React from 'react';
import { Paper, Box, Typography, Divider } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const TournamentAsideCard = ({ tournament, participantsCount }) => {
  if (!tournament) return null;

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SportsEsportsIcon sx={{ mr: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Juego
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {tournament.game === 'brawlstars'
          ? 'Brawl Stars'
          : tournament.game === 'clash_royale'
          ? 'Clash Royale'
          : tournament.game}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <AccessTimeIcon sx={{ mr: 1 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Fechas
        </Typography>
      </Box>
      <Typography variant="body2">
        Inicio: {new Date(tournament.startDate).toLocaleString()}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Fin: {new Date(tournament.endDate).toLocaleString()}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <GroupIcon sx={{ mr: 1 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Participantes
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {participantsCount} / {tournament.maxParticipants}
      </Typography>

      <Divider sx={{ my: 2 }} />

      {Number(tournament.registrationFee) > 0 && (
        <>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 0.5 }}
          >
            Cuota de inscripción
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            ${tournament.registrationFee}
          </Typography>
        </>
      )}

      {tournament.prizes && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <EmojiEventsIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Premios
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-line' }}
          >
            {tournament.prizes}
          </Typography>
        </>
      )}
    </Paper>
  );
};

export default TournamentAsideCard;
