import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

const TournamentInfoTab = ({ tournament, progress, participantsCount }) => {
  if (!tournament) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {tournament.description && (
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 0.5 }}
          >
            Descripción
          </Typography>
          <Typography variant="body2">{tournament.description}</Typography>
        </Box>
      )}

      <Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 0.5 }}
        >
          Reglas
        </Typography>
        <Typography
          variant="body2"
          sx={{ whiteSpace: 'pre-line' }}
        >
          {tournament.rules || 'Aún no se han definido reglas.'}
        </Typography>
      </Box>

      {tournament.prizes && (
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 0.5 }}
          >
            Premios
          </Typography>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-line' }}
          >
            {tournament.prizes}
          </Typography>
        </Box>
      )}

      <Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 0.5 }}
        >
          Progreso de inscripciones
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 5, mb: 0.5 }}
        />
        <Typography variant="caption" color="text.secondary">
          {participantsCount} / {tournament.maxParticipants} jugadores
        </Typography>
      </Box>
    </Box>
  );
};

export default TournamentInfoTab;
