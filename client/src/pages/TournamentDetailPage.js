import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  Tooltip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  LinearProgress,
  RadioGroup,
  Radio,
  FormControlLabel,
  IconButton,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { generateEliminationBracket } from '../utils/generateEliminationBracket';

import TournamentInfoTab from '../components/tournaments/TournamentInfoTab';
import TournamentParticipantsTab from '../components/tournaments/TournamentParticipantsTab';
import TournamentResultsTab from '../components/tournaments/TournamentResultsTab';
import TournamentAsideCard from '../components/tournaments/TournamentAsideCard';

const TournamentDetailPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin, refreshUser } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [leaderboard, setLeaderboard] = useState({ overall: [], byGame: {} });

  const [openRegisterDialog, setOpenRegisterDialog] = useState(false);
  const [openUnregisterDialog, setOpenUnregisterDialog] = useState(false);
  const [openDeleteTournamentDialog, setOpenDeleteTournamentDialog] =
    useState(false);

  const [loadingAction, setLoadingAction] = useState(false);

  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  const [paymentReviewOpen, setPaymentReviewOpen] = useState(false);
  const [selectedPaymentParticipant, setSelectedPaymentParticipant] =
    useState(null);
  const [paymentReviewReason, setPaymentReviewReason] = useState('');

  const [expelOpen, setExpelOpen] = useState(false);
  const [selectedExpelParticipant, setSelectedExpelParticipant] =
    useState(null);
  const [expelReason, setExpelReason] = useState('');

  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [editRules, setEditRules] = useState('');
  const [editPrizes, setEditPrizes] = useState('');

  const [manageBracketOpen, setManageBracketOpen] = useState(false);
  const [bracketWinners, setBracketWinners] = useState({});
  const [dragOverWinnerKey, setDragOverWinnerKey] = useState(null);
  const [bracketDraft, setBracketDraft] = useState(null);

  const apiRoot = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

  const handleOpenExpelParticipant = (participant) => {
    setSelectedExpelParticipant(participant);
    setExpelReason('');
    setExpelOpen(true);
  };

  const handleCloseExpelParticipant = () => {
    if (loadingAction) return;
    setExpelOpen(false);
    setSelectedExpelParticipant(null);
    setExpelReason('');
  };

  const handleConfirmExpelParticipant = async () => {
    if (!selectedExpelParticipant?._id) return;

    const reason = typeof expelReason === 'string' ? expelReason.trim() : '';
    if (!reason) {
      window.alert('Debes indicar un motivo para expulsar al participante.');
      return;
    }

    const confirmed = window.confirm(
      '¿Confirmas que deseas expulsar a este participante del torneo?'
    );
    if (!confirmed) return;

    setLoadingAction(true);
    try {
      const response = await api.put(
        `tournaments/${id}/participants/${selectedExpelParticipant._id}/expel`,
        { reason }
      );
      setTournament(response.data);
      handleCloseExpelParticipant();
    } catch (err) {
      console.error('Error expelling participant:', err);
      setError('Error al expulsar al participante');
    } finally {
      setLoadingAction(false);
    }
  };

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await api.get(`tournaments/${id}`);
        setTournament(response.data);
      } catch (err) {
        console.error('Error fetching tournament:', err);
        setError('No se pudo cargar el torneo');
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [id]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data } = await api.get('/users/leaderboard');
        setLeaderboard({
          overall: Array.isArray(data?.overall) ? data.overall : [],
          byGame: data?.byGame && typeof data.byGame === 'object' ? data.byGame : {},
        });
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      }
    };

    fetchLeaderboard();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const isUserParticipating = () => {
    if (!tournament || !currentUser || !Array.isArray(tournament.participants)) {
      return false;
    }

    return tournament.participants.some((p) => {
      if (!p || p.user == null) return false;
      const userId =
        typeof p.user === 'string' || typeof p.user === 'number'
          ? String(p.user)
          : p.user._id;
      return userId === currentUser.id;
    });
  };

  const isTournamentFull = () => {
    if (!tournament) return false;
    return tournament.participants.length >= tournament.maxParticipants;
  };

  const getCurrentParticipant = () => {
    if (!tournament || !currentUser || !Array.isArray(tournament.participants)) {
      return null;
    }

    return (
      tournament.participants.find((p) => {
        if (!p || p.user == null) return false;
        const userId =
          typeof p.user === 'string' || typeof p.user === 'number'
            ? String(p.user)
            : p.user._id;
        return userId === currentUser.id;
      }) || null
    );
  };

  const getPaymentImageUrl = (participant) => {
    const rel = participant?.paymentProof?.imageUrl;
    if (!rel) return null;
    return `${apiRoot}${rel}`;
  };

  const handlePaymentFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPaymentError('Solo se permiten imágenes');
      setPaymentFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPaymentError('La imagen no puede superar los 5MB');
      setPaymentFile(null);
      return;
    }

    setPaymentFile(file);
    setPaymentError('');
  };

  const handleRegister = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: `/tournaments/${id}` } });
      return;
    }

    if (!tournament) return;

    setLoadingAction(true);
    try {
      const hasFee = Number(tournament.registrationFee) > 0;
      let response;

      if (hasFee) {
        if (!paymentFile) {
          setPaymentError(
            'Debes adjuntar el capture del pago para completar tu inscripción.'
          );
          setLoadingAction(false);
          return;
        }

        const formData = new FormData();
        formData.append('paymentProof', paymentFile);

        response = await api.post(`tournaments/${id}/payment-proof`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post(`tournaments/${id}/participate`);
        response = await api.get(`tournaments/${id}`);
      }

      setTournament(response.data);
      setOpenRegisterDialog(false);
      setPaymentFile(null);
      setPaymentError('');
    } catch (err) {
      console.error('Error registering for tournament:', err);
      setError('Error al registrarse en el torneo');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUnregister = async () => {
    setLoadingAction(true);
    try {
      await api.delete(`tournaments/${id}/participate`);
      const response = await api.get(`tournaments/${id}`);
      setTournament(response.data);
      setOpenUnregisterDialog(false);
    } catch (err) {
      console.error('Error unregistering from tournament:', err);
      setError('Error al cancelar la inscripción');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStartTournamentNow = async () => {
    setLoadingAction(true);
    try {
      const response = await api.put(`tournaments/${id}/start-now`);
      setTournament(response.data);
    } catch (err) {
      console.error('Error starting tournament early:', err);
      setError('Error al iniciar el torneo');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCompleteTournament = async () => {
    if (!tournament) return;

    const confirmed = window.confirm('¿Confirmas que deseas finalizar este torneo?');
    if (!confirmed) return;

    setLoadingAction(true);
    try {
      const response = await api.put(`tournaments/${id}/complete`);
      setTournament(response.data);
      await refreshUser?.();
    } catch (err) {
      console.error('Error completing tournament:', err);
      setError(err.response?.data?.message || 'Error al finalizar el torneo');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteTournament = async () => {
    setLoadingAction(true);
    try {
      await api.delete(`tournaments/${id}`);
      setOpenDeleteTournamentDialog(false);
      window.alert('Torneo eliminado correctamente');
      navigate('/');
    } catch (err) {
      console.error('Error deleting tournament:', err);
      setError('Error al eliminar el torneo');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenEditInfo = () => {
    if (!tournament) return;
    setEditRules(tournament.rules || '');
    setEditPrizes(tournament.prizes || '');
    setEditInfoOpen(true);
  };

  const handleCloseEditInfo = () => {
    if (loadingAction) return;
    setEditInfoOpen(false);
  };

  const handleSaveEditInfo = async () => {
    if (!tournament) return;
    setLoadingAction(true);
    try {
      const response = await api.put(`tournaments/${id}`, {
        rules: editRules,
        prizes: editPrizes,
      });
      setTournament(response.data);
      setEditInfoOpen(false);
    } catch (err) {
      console.error('Error updating tournament info:', err);
      setError('Error al actualizar reglas y premios');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenPaymentReview = (participant) => {
    setSelectedPaymentParticipant(participant);
    setPaymentReviewReason('');
    setPaymentReviewOpen(true);
  };

  const handleClosePaymentReview = () => {
    setPaymentReviewOpen(false);
    setSelectedPaymentParticipant(null);
    setPaymentReviewReason('');
  };

  const handleApprovePayment = async () => {
    if (!selectedPaymentParticipant?._id) return;

    const confirmed = window.confirm(
      '¿Confirmas que deseas marcar este pago como aprobado?'
    );
    if (!confirmed) return;

    setLoadingAction(true);
    try {
      const response = await api.put(
        `tournaments/${id}/payments/${selectedPaymentParticipant._id}/approve`
      );
      setTournament(response.data);
      handleClosePaymentReview();
    } catch (err) {
      console.error('Error approving payment:', err);
      setError('Error al aprobar el pago');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPaymentParticipant?._id) return;

    const confirmed = window.confirm(
      '¿Confirmas que deseas marcar este pago como rechazado?'
    );
    if (!confirmed) return;

    setLoadingAction(true);
    try {
      const response = await api.put(
        `tournaments/${id}/payments/${selectedPaymentParticipant._id}/reject`,
        {
          reason: paymentReviewReason,
          report: true,
        }
      );
      setTournament(response.data);
      handleClosePaymentReview();
    } catch (err) {
      console.error('Error rejecting payment:', err);
      setError('Error al marcar el pago como falso');
    } finally {
      setLoadingAction(false);
    }
  };

  const buildBracketMatches = () => {
    if (!tournament || !Array.isArray(tournament.participants)) return [];

    const players = tournament.participants
      .filter((p) => p && p.user)
      .sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));

    const totalPlayers = players.length;
    if (totalPlayers < 2) return [];

    const isPowerOfTwo = (n) => (n & (n - 1)) === 0;

    if (!isPowerOfTwo(totalPlayers)) {
      const matches = [];
      const round = 1;
      for (let i = 0; i < players.length; i += 2) {
        const participantA = players[i] || null;
        const participantB = players[i + 1] || null;
        const aId = participantA?.user?._id || '';
        const bId = participantB?.user?._id || '';
        const key = `${round}-${aId}-${bId}`;

        matches.push({
          id: `r${round}-m${i / 2}`,
          key,
          round,
          participantA,
          participantB,
        });
      }
      return matches;
    }

    const totalRounds = Math.log2(totalPlayers);
    const results = Array.isArray(tournament.results)
      ? tournament.results
      : [];

    let currentRound = null;
    for (let round = 1; round <= totalRounds; round += 1) {
      const expectedMatches = totalPlayers / Math.pow(2, round);
      const playedMatches = results.filter(
        (r) => (r.round || 1) === round && r.winner
      ).length;

      if (playedMatches < expectedMatches) {
        currentRound = round;
        break;
      }
    }

    if (currentRound === null) {
      return [];
    }

    if (currentRound === 1) {
      const matches = [];
      for (let i = 0; i < players.length; i += 2) {
        const participantA = players[i] || null;
        const participantB = players[i + 1] || null;
        const aId = participantA?.user?._id || '';
        const bId = participantB?.user?._id || '';
        const key = `${currentRound}-${aId}-${bId}`;

        matches.push({
          id: `r${currentRound}-m${i / 2}`,
          key,
          round: currentRound,
          participantA,
          participantB,
        });
      }
      return matches;
    }

    const participantsByUserId = new Map();
    players.forEach((p) => {
      const rawUser = p.user;
      const idValue =
        (rawUser && (rawUser._id || rawUser.id || rawUser.toString?.())) ||
        null;
      if (idValue) {
        participantsByUserId.set(String(idValue), p);
      }
    });

    const previousRound = currentRound - 1;
    const prevResults = results.filter(
      (r) => (r.round || 1) === previousRound && r.winner
    );

    const winners = prevResults
      .map((r) => {
        const winner = r.winner;
        const winnerId =
          winner && winner._id
            ? String(winner._id)
            : winner
            ? String(winner)
            : null;
        if (!winnerId) return null;
        return participantsByUserId.get(winnerId) || null;
      })
      .filter(Boolean);

    if (winners.length < 2) {
      return [];
    }

    const matches = [];
    for (let i = 0; i < winners.length; i += 2) {
      const participantA = winners[i] || null;
      const participantB = winners[i + 1] || null;
      const aId = participantA?.user?._id || '';
      const bId = participantB?.user?._id || '';
      const key = `${currentRound}-${aId}-${bId}`;

      matches.push({
        id: `r${currentRound}-m${i / 2}`,
        key,
        round: currentRound,
        participantA,
        participantB,
      });
    }

    return matches;
  };

  const handleOpenManageBracket = () => {
    if (!eliminationBracket || !eliminationBracket.bracket) return;
    if (loadingAction) return;
    if (championName) return;

    const initialWinners = {};

    if (Array.isArray(tournament?.results)) {
      tournament.results.forEach((result) => {
        const round = result.round || 1;
        const aId = result.playerA?._id || result.playerA || '';
        const bId = result.playerB?._id || result.playerB || '';
        const winnerId = result.winner?._id || result.winner || '';

        if (!aId || !bId || !winnerId) return;

        const key = `${round}-${aId}-${bId}`;
        initialWinners[key] = String(winnerId);
      });
    }

    setBracketWinners(initialWinners);

    // Draft del bracket para previsualizar avances en el modal.
    // Usamos el bracket ya generado (con BYEs/seed) y propagamos ganadores dentro del draft.
    if (eliminationBracket && eliminationBracket.bracket) {
      const rounds = eliminationBracket.bracket.rounds || [];
      const matches = eliminationBracket.bracket.matches || [];
      const matchesByRound = {};

      rounds.forEach((r) => {
        matchesByRound[r.roundIndex] = matches
          .filter((m) => m.roundIndex === r.roundIndex)
          .map((m) => ({
            matchId: m.matchId,
            roundIndex: m.roundIndex,
            teamAId: m.teamA?.id ? String(m.teamA.id) : null,
            teamAName: m.teamA?.name || null,
            teamBId: m.teamB?.id ? String(m.teamB.id) : null,
            teamBName: m.teamB?.name || null,
            winnerId: m.winnerId ? String(m.winnerId) : null,
          }));
      });

      setBracketDraft({ rounds, matchesByRound });
    } else {
      setBracketDraft(null);
    }

    setManageBracketOpen(true);
  };

  const handleCloseManageBracket = () => {
    if (loadingAction) return;
    setManageBracketOpen(false);
    setDragOverWinnerKey(null);
    setBracketDraft(null);
  };

  const handleDragStartWinner = (event, payload) => {
    try {
      event.dataTransfer.setData('application/json', JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'move';
    } catch (e) {
      // no-op
    }
  };

  const handleAllowDrop = (event) => {
    event.preventDefault();
  };

  const handleDropWinner = (event, matchInfo, allowedIds) => {
    event.preventDefault();
    setDragOverWinnerKey(null);

    const matchKey = typeof matchInfo === 'string' ? matchInfo : matchInfo?.matchKey;
    const roundIndexFromInfo =
      typeof matchInfo === 'object' && matchInfo
        ? Number(matchInfo.roundIndex)
        : Number.NaN;
    const matchIdFromInfo =
      typeof matchInfo === 'object' && matchInfo ? matchInfo.matchId : null;

    try {
      const raw = event.dataTransfer.getData('application/json');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const winnerId = parsed?.winnerId ? String(parsed.winnerId) : '';
      if (!winnerId) return;
      if (!Array.isArray(allowedIds) || !allowedIds.includes(winnerId)) return;

      if (matchKey) {
        setBracketWinners((prev) => ({
          ...prev,
          [matchKey]: winnerId,
        }));
      }

      // Propagar el ganador en el draft, si existe.
      setBracketDraft((prev) => {
        if (!prev || !prev.rounds || !prev.matchesByRound) return prev;

        const next = {
          ...prev,
          matchesByRound: { ...prev.matchesByRound },
        };

        const roundIndex = Number.isNaN(roundIndexFromInfo)
          ? Number(matchKey ? String(matchKey).split('-')[0] || '0' : '0')
          : roundIndexFromInfo;
        if (Number.isNaN(roundIndex) || !next.matchesByRound[roundIndex]) return next;

        const roundMatches = next.matchesByRound[roundIndex].map((m) => ({ ...m }));
        next.matchesByRound[roundIndex] = roundMatches;

        const matchIndex = roundMatches.findIndex((m) => {
          if (matchIdFromInfo && m.matchId === matchIdFromInfo) return true;
          if (!matchKey) return false;
          const a = m.teamAId || '';
          const b = m.teamBId || '';
          return matchKey === `${roundIndex}-${a}-${b}` || matchKey === `${roundIndex}-${b}-${a}`;
        });
        if (matchIndex < 0) return next;

        const currentMatch = roundMatches[matchIndex];
        currentMatch.winnerId = winnerId;

        const totalRounds = next.rounds.length;
        if (roundIndex >= totalRounds) return next;

        const nextRoundIndex = roundIndex + 1;
        if (!next.matchesByRound[nextRoundIndex]) return next;

        const nextRoundMatches = next.matchesByRound[nextRoundIndex].map((m) => ({ ...m }));
        next.matchesByRound[nextRoundIndex] = nextRoundMatches;

        const targetIndex = Math.floor(matchIndex / 2);
        const target = nextRoundMatches[targetIndex];
        if (!target) return next;

        const winnerName =
          currentMatch.teamAId === winnerId
            ? currentMatch.teamAName
            : currentMatch.teamBId === winnerId
            ? currentMatch.teamBName
            : null;

        if (matchIndex % 2 === 0) {
          target.teamAId = winnerId;
          target.teamAName = winnerName;
        } else {
          target.teamBId = winnerId;
          target.teamBName = winnerName;
        }

        // Si el ganador de la siguiente ronda ya no coincide con los participantes, lo limpiamos.
        if (target.winnerId && target.winnerId !== target.teamAId && target.winnerId !== target.teamBId) {
          target.winnerId = null;
        }

        return next;
      });
    } catch (e) {
      // no-op
    }
  };

  const handleSaveBracketResults = async () => {
    if (!tournament) return;

    // Si hay draft, guardamos todos los matches con ganador + ambos jugadores.
    if (bracketDraft && bracketDraft.rounds && bracketDraft.matchesByRound) {
      setLoadingAction(true);
      try {
        let lastResponse = null;

        for (const r of bracketDraft.rounds) {
          const roundIndex = r.roundIndex;
          const roundMatches = bracketDraft.matchesByRound[roundIndex] || [];

          for (const m of roundMatches) {
            const aId = m.teamAId;
            const bId = m.teamBId;
            const winnerId = m.winnerId;
            if (!aId || !bId || !winnerId) continue;

            const payload = {
              round: roundIndex,
              playerA: aId,
              playerB: bId,
              winner: winnerId,
              score: '',
            };

            const response = await api.post(`tournaments/${id}/results`, payload);
            lastResponse = response;
          }
        }

        if (lastResponse) {
          const refreshed = await api.get(`tournaments/${id}`);
          setTournament(refreshed.data);
        }

        setManageBracketOpen(false);
        setBracketDraft(null);
      } catch (err) {
        console.error('Error saving bracket results:', err);
        setError('Error al guardar los resultados del bracket');
      } finally {
        setLoadingAction(false);
      }
      return;
    }

    const matches = buildBracketMatches();
    if (!matches.length) {
      setManageBracketOpen(false);
      return;
    }

    setLoadingAction(true);
    try {
      let lastResponse = null;

      for (const match of matches) {
        const aUserId = match.participantA?.user?._id;
        const bUserId = match.participantB?.user?._id;
        if (!aUserId || !bUserId) continue;

        const winnerId = bracketWinners[match.key];
        if (!winnerId) continue;

        const payload = {
          round: match.round,
          playerA: aUserId,
          playerB: bUserId,
          winner: winnerId,
          score: '',
        };

        const response = await api.post(
          `tournaments/${id}/results`,
          payload
        );
        lastResponse = response;
      }

      if (lastResponse) {
        const refreshed = await api.get(`tournaments/${id}`);
        setTournament(refreshed.data);
      }

      setManageBracketOpen(false);
    } catch (err) {
      console.error('Error saving bracket results:', err);
      setError('Error al guardar los resultados del bracket');
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !tournament) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error || 'Torneo no encontrado'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Volver
        </Button>
      </Container>
    );
  }

  const statusInfo = {
    upcoming: { label: 'Próximamente' },
    ongoing: { label: 'En curso' },
    completed: { label: 'Finalizado' },
    cancelled: { label: 'Cancelado' },
  }[tournament.status] || { label: tournament.status };

  const participantsCount = tournament.participants?.length || 0;
  const progress =
    (participantsCount / (tournament.maxParticipants || 1)) * 100;

  const currentParticipant = getCurrentParticipant();
  const currentPaymentStatus = currentParticipant?.paymentProof?.status;
  const hasPendingPayment =
    currentPaymentStatus === 'pending' &&
    Number(tournament.registrationFee) > 0;

  const isOrganizer =
    tournament.createdBy &&
    (tournament.createdBy._id === currentUser?.id ||
      tournament.createdBy === currentUser?.id);

  const requiresPaymentApproval = Number(tournament.registrationFee || 0) > 0;
  const hasPendingApprovals =
    requiresPaymentApproval &&
    Array.isArray(tournament.participants) &&
    tournament.participants.some((p) => {
      if (!p) return false;
      const status = p.paymentProof?.status;
      return status !== 'approved';
    });

  const allResults = Array.isArray(tournament.results)
    ? tournament.results
    : [];

  let championName = null;

  const activePlayers = Array.isArray(tournament.participants)
    ? tournament.participants.filter((p) => p && p.user)
    : [];

  const totalPlayersForChampion = activePlayers.length;
  const nextPowerOfTwo = (n) => {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  };

  if (totalPlayersForChampion >= 2) {
    const slots = nextPowerOfTwo(totalPlayersForChampion);
    const totalRounds = Math.log2(slots);
    const finalResult = allResults.find(
      (r) => (r.round || 1) === totalRounds && r.winner
    );

    if (finalResult && finalResult.winner) {
      const winner = finalResult.winner;
      if (winner.username) {
        championName = winner.username;
      } else {
        championName = 'Ganador seleccionado';
      }
    }
  }

  let eliminationBracket = null;
  if (Array.isArray(tournament.participants)) {
    try {
      const players = tournament.participants
        .filter((p) => p && p.user)
        .sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));

      const bracketParticipants = players
        .map((p, index) => {
          const rawUser = p.user;
          const userId =
            (rawUser &&
              (rawUser._id || rawUser.id || rawUser.toString?.())) ||
            null;
          if (!userId) return null;
          const name = rawUser.username || 'Jugador';
          return {
            id: String(userId),
            name,
            seed: index + 1,
          };
        })
        .filter(Boolean);

      if (bracketParticipants.length >= 2) {
        eliminationBracket = generateEliminationBracket({
          tournamentId: tournament._id || String(id),
          tournamentName: tournament.name,
          participants: bracketParticipants,
          allowByes: true,
          seedingMethod: 'seeded',
          sides: { leftLabel: 'Group A', rightLabel: 'Group B' },
          results: tournament.results || [],
        });
      }
    } catch (e) {
      console.error('Error generating elimination bracket:', e);
      eliminationBracket = null;
    }
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {tournament.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Estado: {statusInfo.label}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            {/* Sidebar de secciones */}
            <Paper
              elevation={0}
              sx={{
                p: 1,
                minWidth: { xs: 'auto', sm: 180 },
                maxWidth: { xs: '100%', sm: 220 },
                bgcolor: 'background.paper',
                position: { xs: 'static', sm: 'sticky' },
                top: { xs: 'auto', sm: 88 },
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
              }}
            >
              <Tabs
                orientation={isMobile ? 'horizontal' : 'vertical'}
                value={tabValue}
                onChange={handleTabChange}
                textColor="primary"
                indicatorColor="primary"
                variant={isMobile ? 'scrollable' : 'fullWidth'}
                scrollButtons={isMobile ? 'auto' : false}
                allowScrollButtonsMobile
              >
                <Tab label="Información" />
                <Tab label="Participantes" />
                <Tab label="Resultados" />
              </Tabs>
            </Paper>

            {/* Contenido + acciones a la derecha */}
            <Box sx={{ flexGrow: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  mb: 2,
                  gap: 1,
                }}
              >
                {tournament.status === 'upcoming' && (
                  <>
                    {!isUserParticipating() && !isTournamentFull() && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => setOpenRegisterDialog(true)}
                        disabled={loadingAction || hasPendingPayment}
                      >
                        Inscribirse
                      </Button>
                    )}
                    {isUserParticipating() && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => setOpenUnregisterDialog(true)}
                        disabled={loadingAction}
                      >
                        Cancelar inscripción
                      </Button>
                    )}
                  </>
                )}

                {(isAdmin || isOrganizer) && (
                  <>
                    {tournament.status === 'upcoming' && (
                      <Tooltip
                        title={
                          hasPendingApprovals
                            ? 'No puedes iniciar el torneo hasta que todos los pagos estén aprobados.'
                            : ''
                        }
                        disableHoverListener={!hasPendingApprovals}
                      >
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleStartTournamentNow}
                            disabled={loadingAction || hasPendingApprovals}
                          >
                            Iniciar ahora
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                    {tournament.status === 'ongoing' && championName && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={handleCompleteTournament}
                        disabled={loadingAction}
                      >
                        Finalizar torneo
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={() => setOpenDeleteTournamentDialog(true)}
                      disabled={loadingAction}
                    >
                      Eliminar torneo
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleOpenEditInfo}
                      disabled={loadingAction}
                    >
                      Editar info
                    </Button>
                  </>
                )}
              </Box>

              <Paper
                elevation={0}
                sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}
              >
                <Box sx={{ pt: 1 }}>
                  {tabValue === 0 && (
                    <TournamentInfoTab
                      tournament={tournament}
                      progress={progress}
                      participantsCount={participantsCount}
                    />
                  )}

                  {tabValue === 1 && (
                    <TournamentParticipantsTab
                      tournament={tournament}
                      leaderboard={leaderboard}
                      isAdmin={isAdmin}
                      isOrganizer={isOrganizer}
                      onParticipantClick={(participant) => {
                        const user =
                          participant?.user && typeof participant.user === 'object'
                            ? participant.user
                            : null;
                        const username = user?.username;
                        if (username) {
                          navigate(`/u/${encodeURIComponent(username)}`);
                        }
                      }}
                      onOpenPaymentReview={handleOpenPaymentReview}
                      onOpenExpelParticipant={handleOpenExpelParticipant}
                    />
                  )}

                  {tabValue === 2 && (
                    <TournamentResultsTab
                      eliminationBracket={eliminationBracket}
                      championName={championName}
                      tournamentStatus={tournament.status}
                      isAdmin={isAdmin}
                      isOrganizer={isOrganizer}
                      onOpenManageBracket={handleOpenManageBracket}
                      pointsAwards={tournament.pointsAwards}
                      currentUserId={currentUser?.id}
                      currentUserCompetitive={currentUser?.competitive}
                    />
                  )}
                </Box>
              </Paper>
            </Box>
          </Box>
        </Grid>

        {tabValue === 0 && (
          <Grid item xs={12} md={4}>
            <TournamentAsideCard
              tournament={tournament}
              participantsCount={participantsCount}
            />
          </Grid>
        )}
      </Grid>

      {/* Register Dialog */}
      <Dialog
        open={openRegisterDialog}
        onClose={() => setOpenRegisterDialog(false)}
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Confirmar Inscripción
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setOpenRegisterDialog(false)}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas inscribirte en el torneo{' '}
            <strong>{tournament.name}</strong>?
          </DialogContentText>
          {tournament.registrationFee > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="body2"
                color="error"
                sx={{ mb: 1 }}
              >
                Este torneo tiene un costo de inscripción de $
                {tournament.registrationFee}
              </Typography>
              <Typography variant="body2">
                Realiza un pago móvil a la siguiente cuenta y luego adjunta el
                capture del pago:
              </Typography>
              <Box sx={{ mt: 1, ml: 1.5 }}>
                <Typography variant="body2">
                  Banco: Banco Nacional de Crédito (código 0191)
                </Typography>
                <Typography variant="body2">CI: 32.001.263</Typography>
                <Typography variant="body2">Teléfono: 0412-1988379</Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" component="label">
                  Subir capture de pago
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handlePaymentFileChange}
                  />
                </Button>
                {paymentFile && (
                  <Typography
                    variant="caption"
                    sx={{ ml: 1, display: 'inline-block' }}
                  >
                    {paymentFile.name}
                  </Typography>
                )}
                {paymentError && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {paymentError}
                  </Typography>
                )}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1 }}
              >
                Tu inscripción quedará pendiente hasta que un organizador
                verifique el pago.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenRegisterDialog(false)}
            disabled={loadingAction}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRegister}
            variant="contained"
            disabled={loadingAction}
          >
            {loadingAction
              ? 'Procesando...'
              : tournament.registrationFee > 0
              ? 'Enviar comprobante'
              : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Expel Participant Dialog (organizer/admin) */}
      <Dialog
        open={expelOpen}
        onClose={handleCloseExpelParticipant}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Expulsar participante
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Indica el motivo por el cual expulsas a{' '}
            <strong>
              {selectedExpelParticipant?.user?.username || 'este participante'}
            </strong>
            .
          </DialogContentText>
          <TextField
            label="Motivo (obligatorio)"
            multiline
            minRows={3}
            fullWidth
            margin="normal"
            value={expelReason}
            onChange={(e) => setExpelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExpelParticipant} disabled={loadingAction}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmExpelParticipant}
            color="error"
            variant="contained"
            disabled={loadingAction}
          >
            {loadingAction ? 'Expulsando...' : 'Expulsar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Bracket Dialog */}
      <Dialog
        open={manageBracketOpen}
        onClose={handleCloseManageBracket}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gestionar resultados del bracket</DialogTitle>
        <DialogContent dividers>
          {!bracketDraft || !bracketDraft.rounds?.length ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', py: 2 }}
            >
              No hay encuentros para gestionar.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  minWidth: 'fit-content',
                  py: 1,
                }}
              >
                {bracketDraft.rounds.map((round) => {
                  const roundMatches = bracketDraft.matchesByRound[round.roundIndex] || [];

                  return (
                    <Box key={round.roundIndex} sx={{ minWidth: 260 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          textAlign: 'center',
                          mb: 1,
                          textTransform: 'uppercase',
                        }}
                      >
                        {round.roundName}
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {roundMatches.map((m, matchIndex) => {
                          const aId = m.teamAId ? String(m.teamAId) : '';
                          const bId = m.teamBId ? String(m.teamBId) : '';
                          const winnerId = m.winnerId ? String(m.winnerId) : '';
                          const matchKey = `${m.roundIndex}-${aId}-${bId}`;
                          const matchInfo = {
                            matchKey,
                            matchId: m.matchId,
                            roundIndex: m.roundIndex,
                          };
                          const allowedIds = [aId, bId].filter(Boolean);

                          const isAWin = winnerId && aId && winnerId === aId;
                          const isBWin = winnerId && bId && winnerId === bId;

                          return (
                            <Box
                              key={m.matchId}
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                              }}
                            >
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box
                                  role="button"
                                  draggable={!!aId}
                                  onDragStart={(e) =>
                                    handleDragStartWinner(e, {
                                      matchKey,
                                      winnerId: aId,
                                    })
                                  }
                                  onClick={() => aId && handleDropWinner({
                                    preventDefault: () => {},
                                    dataTransfer: { getData: () => JSON.stringify({ winnerId: aId }) },
                                  }, matchInfo, allowedIds)}
                                  sx={{
                                    p: 1,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: isAWin ? 'success.main' : 'divider',
                                    bgcolor: isAWin ? 'rgba(46, 125, 50, 0.10)' : 'background.paper',
                                    cursor: aId ? 'grab' : 'not-allowed',
                                    opacity: aId ? 1 : 0.6,
                                    userSelect: 'none',
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    {m.teamAName || 'BYE'}
                                  </Typography>
                                </Box>

                                <Box
                                  role="button"
                                  draggable={!!bId}
                                  onDragStart={(e) =>
                                    handleDragStartWinner(e, {
                                      matchKey,
                                      winnerId: bId,
                                    })
                                  }
                                  onClick={() => bId && handleDropWinner({
                                    preventDefault: () => {},
                                    dataTransfer: { getData: () => JSON.stringify({ winnerId: bId }) },
                                  }, matchInfo, allowedIds)}
                                  sx={{
                                    p: 1,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: isBWin ? 'success.main' : 'divider',
                                    bgcolor: isBWin ? 'rgba(46, 125, 50, 0.10)' : 'background.paper',
                                    cursor: bId ? 'grab' : 'not-allowed',
                                    opacity: bId ? 1 : 0.6,
                                    userSelect: 'none',
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    {m.teamBName || 'BYE'}
                                  </Typography>
                                </Box>

                                <Box
                                  onDragOver={handleAllowDrop}
                                  onDragEnter={() => setDragOverWinnerKey(matchKey)}
                                  onDragLeave={() =>
                                    setDragOverWinnerKey((prev) => (prev === matchKey ? null : prev))
                                  }
                                  onDrop={(e) => handleDropWinner(e, matchInfo, allowedIds)}
                                  sx={{
                                    mt: 0.5,
                                    p: 1,
                                    borderRadius: 2,
                                    border: '1px dashed',
                                    borderColor:
                                      dragOverWinnerKey === matchKey
                                        ? 'primary.main'
                                        : winnerId
                                        ? 'success.main'
                                        : 'divider',
                                    bgcolor:
                                      dragOverWinnerKey === matchKey
                                        ? 'rgba(25, 118, 210, 0.08)'
                                        : winnerId
                                        ? 'rgba(46, 125, 50, 0.08)'
                                        : 'background.default',
                                    textAlign: 'center',
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary">
                                    Ganador
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                    {winnerId
                                      ? winnerId === aId
                                        ? m.teamAName
                                        : winnerId === bId
                                        ? m.teamBName
                                        : 'Ganador'
                                      : 'Arrastra aquí'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageBracket} disabled={loadingAction}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveBracketResults}
            variant="contained"
            disabled={loadingAction || !bracketDraft || !bracketDraft.rounds?.length}
          >
            {loadingAction ? 'Guardando...' : 'Guardar resultados'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit rules & prizes dialog */}
      <Dialog
        open={editInfoOpen}
        onClose={handleCloseEditInfo}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar reglas y premios</DialogTitle>
        <DialogContent>
          <TextField
            label="Reglas del torneo"
            multiline
            minRows={4}
            fullWidth
            margin="normal"
            value={editRules}
            onChange={(e) => setEditRules(e.target.value)}
          />
          <TextField
            label="Premios"
            multiline
            minRows={3}
            fullWidth
            margin="normal"
            value={editPrizes}
            onChange={(e) => setEditPrizes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditInfo} disabled={loadingAction}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveEditInfo}
            variant="contained"
            disabled={loadingAction}
          >
            {loadingAction ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Review Dialog (organizer/admin) */}
      <Dialog
        open={paymentReviewOpen}
        onClose={handleClosePaymentReview}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Revisar pago de inscripción
            </Typography>
            <IconButton
              aria-label="close"
              onClick={handleClosePaymentReview}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPaymentParticipant && (
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Participante:{' '}
                {selectedPaymentParticipant.user?.username || 'Usuario'}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Verifica que el comprobante de pago coincida con los datos del
                jugador y el monto de inscripción.
              </Typography>
              {getPaymentImageUrl(selectedPaymentParticipant) && (
                <Box
                  sx={{
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <Box
                    component="img"
                    src={getPaymentImageUrl(selectedPaymentParticipant)}
                    alt="Comprobante de pago"
                    loading="lazy"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 400,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          <TextField
            label="Motivo del rechazo (opcional)"
            multiline
            minRows={3}
            fullWidth
            margin="normal"
            value={paymentReviewReason}
            onChange={(e) => setPaymentReviewReason(e.target.value)}
          />

          <DialogContentText sx={{ mt: 1 }}>
            Si el comprobante parece falso, marca el pago como falso y se
            creará un reporte para los administradores.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentReview} disabled={loadingAction}>
            Cerrar
          </Button>
          <Button
            onClick={handleRejectPayment}
            color="error"
            variant="outlined"
            disabled={loadingAction}
          >
            {loadingAction ? 'Procesando...' : 'Marcar como falso y reportar'}
          </Button>
          <Button
            onClick={handleApprovePayment}
            color="primary"
            variant="contained"
            disabled={loadingAction}
          >
            {loadingAction ? 'Procesando...' : 'Validar pago'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unregister Dialog */}
      <Dialog
        open={openUnregisterDialog}
        onClose={() => setOpenUnregisterDialog(false)}
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Cancelar Inscripción
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setOpenUnregisterDialog(false)}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas cancelar tu participación en el torneo{' '}
            <strong>{tournament.name}</strong>?
          </DialogContentText>
          {tournament.registrationFee > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="error">
                Ten en cuenta que el reembolso de la cuota de inscripción está
                sujeto a los términos y condiciones del torneo.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenUnregisterDialog(false)}
            disabled={loadingAction}
          >
            Volver
          </Button>
          <Button
            onClick={handleUnregister}
            color="error"
            variant="contained"
            disabled={loadingAction}
          >
            {loadingAction ? 'Procesando...' : 'Sí, cancelar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Tournament Dialog */}
      <Dialog
        open={openDeleteTournamentDialog}
        onClose={() => setOpenDeleteTournamentDialog(false)}
      >
        <DialogTitle>Eliminar torneo</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que deseas eliminar el torneo{' '}
            <strong>{tournament.name}</strong>? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDeleteTournamentDialog(false)}
            disabled={loadingAction}
          >
            Volver
          </Button>
          <Button
            onClick={handleDeleteTournament}
            color="error"
            variant="contained"
            disabled={loadingAction}
          >
            {loadingAction ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TournamentDetailPage;
