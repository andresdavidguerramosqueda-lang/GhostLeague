import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
} from '@mui/material';
import RuleIcon from '@mui/icons-material/Rule';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

const TournamentParticipantsTab = ({
  tournament,
  leaderboard,
  isAdmin,
  isOrganizer,
  onParticipantClick,
  onOpenPaymentReview,
  onOpenExpelParticipant,
}) => {
  if (!tournament) return null;

  const formatGameLabel = (value) => {
    const key = typeof value === 'string' ? value.trim() : '';
    if (!key) return 'Juego';
    if (key === 'brawlstars') return 'Brawl Stars';
    if (key === 'clash_royale') return 'Clash Royale';
    return key
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const fileBase = apiBase.replace(/\/api\/?$/, '');

  const hasFee = Number(tournament.registrationFee) > 0;

  const overallRows = Array.isArray(leaderboard?.overall) ? leaderboard.overall : [];
  const byGame = leaderboard?.byGame && typeof leaderboard.byGame === 'object' ? leaderboard.byGame : {};

  const overallById = new Map();
  overallRows.forEach((row) => {
    const id = row?.id != null ? String(row.id) : '';
    if (!id) return;
    overallById.set(id, row);
  });

  const gameKey = typeof tournament.game === 'string' ? tournament.game : '';
  const gameRows = gameKey && Array.isArray(byGame[gameKey]) ? byGame[gameKey] : [];

  const gameById = new Map();
  gameRows.forEach((row) => {
    const id = row?.id != null ? String(row.id) : '';
    if (!id) return;
    gameById.set(id, row);
  });

  const participants = Array.isArray(tournament.participants)
    ? [...tournament.participants].sort(
        (a, b) => new Date(a.joinDate) - new Date(b.joinDate)
      )
    : [];

  return (
    <Box>
      {participants.length > 0 ? (
        <List>
          {participants.map((p) => {
            if (!p || !p.user) return null;

            const user = typeof p.user === 'object' ? p.user : null;
            const username = user?.username || 'Jugador';
            const userId = user?._id != null ? String(user._id) : user?.id != null ? String(user.id) : '';
            const avatarRaw = typeof user?.avatar === 'string' ? user.avatar : '';
            const avatarSrc = avatarRaw
              ? avatarRaw.startsWith('/uploads')
                ? `${fileBase}${avatarRaw}`
                : avatarRaw
              : '';
            const paymentStatus = p.paymentProof?.status || null;
            const participantStatus = p.status || 'registered';
            const expelledReason = typeof p.expelledReason === 'string' ? p.expelledReason : '';

            let paymentLabel = '';
            let paymentColor = 'default';

            let statusLabel = '';
            let statusColor = 'default';

            if (hasFee) {
              if (paymentStatus === 'approved') {
                paymentLabel = 'Pago verificado';
                paymentColor = 'success';
              } else if (paymentStatus === 'pending') {
                paymentLabel = 'Pago pendiente';
                paymentColor = 'warning';
              } else if (paymentStatus === 'rejected') {
                paymentLabel = 'Pago rechazado';
                paymentColor = 'error';
              }
            }

            if (participantStatus === 'expelled') {
              statusLabel = 'Expulsado';
              statusColor = 'error';
            } else if (participantStatus === 'disqualified') {
              statusLabel = 'Descalificado';
              statusColor = 'default';
            }

            const canReviewPayment =
              (isAdmin || isOrganizer) &&
              hasFee &&
              !!p.paymentProof &&
              participantStatus !== 'expelled' &&
              participantStatus !== 'disqualified';

            const canExpel =
              (isAdmin || isOrganizer) &&
              participantStatus !== 'expelled' &&
              participantStatus !== 'disqualified';

            const overallEntry = userId ? overallById.get(userId) : null;
            const overallRank = overallEntry?.rank;
            const overallLevel = overallEntry?.overall?.level;

            const gameEntry = userId ? gameById.get(userId) : null;
            const gameRank = gameEntry?.rank;

            const gameLabel = formatGameLabel(gameKey);
            const secondaryLabel =
              participantStatus === 'expelled'
                ? expelledReason || 'Expulsado'
                : `Nivel ${overallLevel || '-'} • Top General #${overallRank || '-'} • Top ${gameLabel} #${gameRank || '-'}`;

            return (
              <ListItem
                key={p._id || username}
                disableGutters
                button
                onClick={() => onParticipantClick?.(p)}
              >
                <ListItemAvatar>
                  <Avatar
                    src={avatarSrc || undefined}
                    imgProps={{ referrerPolicy: 'no-referrer' }}
                  >
                    {username.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={username}
                  secondary={secondaryLabel}
                  secondaryTypographyProps={{ noWrap: true }}
                />
                {statusLabel && (
                  <Chip
                    label={statusLabel}
                    color={statusColor}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                )}
                {paymentLabel && participantStatus !== 'expelled' && (
                  <Chip
                    label={paymentLabel}
                    color={paymentColor}
                    size="small"
                    sx={{ mr: canReviewPayment ? 1 : 0 }}
                  />
                )}
                {canReviewPayment && (
                  <IconButton
                    size="small"
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPaymentReview?.(p);
                    }}
                  >
                    <RuleIcon fontSize="small" />
                  </IconButton>
                )}
                {canExpel && (
                  <IconButton
                    size="small"
                    edge="end"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenExpelParticipant?.(p);
                    }}
                  >
                    <PersonRemoveIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', py: 2 }}
        >
          Aún no hay participantes inscritos.
        </Typography>
      )}
    </Box>
  );
};

export default TournamentParticipantsTab;
