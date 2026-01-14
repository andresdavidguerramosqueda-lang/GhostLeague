import React, { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { resolveUploadUrl } from '../../utils/resolveUploadUrl';

const ClanCard = ({ clan }) => {
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api$/, '');

  const logoSrc = useMemo(() => resolveUploadUrl(fileBase, clan?.logo), [fileBase, clan?.logo]);

  const primary = clan?.primaryColor || '#6d28d9';
  const secondary = clan?.secondaryColor || '#a855f7';

  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      <CardActionArea
        component={RouterLink}
        to={`/clans/${clan?._id}`}
        aria-label={`Ver clan ${clan?.name || 'sin nombre'}`}
        sx={{
          height: '100%',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: 88,
            position: 'relative',
            background: `linear-gradient(135deg, ${primary}33 0%, rgba(15,23,42,0.9) 55%, ${secondary}22 100%)`,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        />

        <CardContent sx={{ pt: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: -3 }}>
            <Avatar
              src={logoSrc}
              alt={clan?.name || 'Clan'}
              sx={{
                width: 52,
                height: 52,
                border: '2px solid rgba(255,255,255,0.12)',
                bgcolor: 'rgba(2,6,23,0.65)',
              }}
            >
              {(clan?.tag || clan?.name || '?').slice(0, 1).toUpperCase()}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 900, lineHeight: 1.2 }}
                noWrap
              >
                {clan?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                [{clan?.tag}] · Nivel {clan?.level ?? 1}
              </Typography>
            </Box>

            <Chip
              label={`${clan?.memberCount ?? 0}/${clan?.maxMembers ?? 0}`}
              size="small"
              sx={{
                borderRadius: '999px',
                bgcolor: 'rgba(168,85,247,0.14)',
                border: '1px solid rgba(168,85,247,0.35)',
                fontWeight: 800,
              }}
              aria-label={`Miembros ${clan?.memberCount ?? 0} de ${clan?.maxMembers ?? 0}`}
            />
          </Stack>

          {clan?.motto ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              “{clan.motto}”
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Un clan listo para competir y crecer.
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ClanCard;
