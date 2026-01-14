const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const Tournament = require('../models/Tournament');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const Notification = require('../models/Notification');
const gameEvents = require('../services/gameEvents');

const paymentsDir = path.join(__dirname, '..', 'uploads', 'payments');
if (!fs.existsSync(paymentsDir)) {
    fs.mkdirSync(paymentsDir, { recursive: true });
}

const paymentsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, paymentsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `${req.user.id}-${Date.now()}${ext}`);
    }
});

const paymentUpload = multer({
    storage: paymentsStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten imágenes'));
        }
        cb(null, true);
    }
});

const isAdminUser = (user) => {
    const role = (user?.role || '').toLowerCase();
    return (
        role === 'admin' ||
        role === 'owner' ||
        role === 'creator' ||
        role === 'owener'
    );
};

// Calcula el estado actual del torneo en base a sus fechas
const computeTournamentStatusFromDates = (tournament) => {
    if (!tournament) return 'upcoming';

    // Respetar siempre los torneos cancelados
    if (tournament.status === 'cancelled') {
        return 'cancelled';
    }

    if (tournament.status === 'completed') {
        return 'completed';
    }

    const now = new Date();
    const start = tournament.startDate ? new Date(tournament.startDate) : null;
    const end = tournament.endDate ? new Date(tournament.endDate) : null;

    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
        // Si las fechas son inválidas, devolver el estado actual o 'upcoming'
        return tournament.status || 'upcoming';
    }

    if (hasPendingPaidParticipants(tournament)) {
        return 'upcoming';
    }

    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'ongoing';
};

const hasPendingPaidParticipants = (tournament) => {
    if (!tournament) return false;
    const fee = Number(tournament.registrationFee || 0);
    if (!fee) return false;
    if (!Array.isArray(tournament.participants)) return false;

    return tournament.participants.some((p) => {
        if (!p) return false;
        if (p.status === 'expelled' || p.status === 'disqualified') return false;
        if (!p.paymentProof) return true;
        return p.paymentProof.status !== 'approved';
    });
};

// Aplica el estado calculado al documento de torneo
const applyComputedStatus = (tournament) => {
    if (!tournament) return tournament;
    const computed = computeTournamentStatusFromDates(tournament);
    if (computed && tournament.status !== computed) {
        tournament.status = computed;
    }
    return tournament;
};

const getIdString = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        if (value._id) return value._id.toString();
        if (value.id) return value.id.toString();
    }
    if (typeof value.toString === 'function') return value.toString();
    return null;
};

const computeLevelFromPoints = (points) => {
    const safe = Number.isFinite(points) ? points : 0;
    const level = Math.floor(Math.max(0, safe) / 100) + 1;
    return Math.max(1, level);
};

const computeDecay = (currentPoints, lastCompetitiveAt, now = new Date()) => {
    const points = Number.isFinite(currentPoints) ? currentPoints : 0;
    if (!lastCompetitiveAt || !points) return 0;
    const last = new Date(lastCompetitiveAt);
    if (Number.isNaN(last.getTime())) return 0;

    const diffDays = Math.floor(
        (now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000)
    );
    const graceDays = 14;
    if (diffDays <= graceDays) return 0;
    const weeks = Math.ceil((diffDays - graceDays) / 7);
    const percentLoss = Math.floor(points * 0.01 * weeks);
    const minLoss = weeks;
    const loss = Math.max(minLoss, percentLoss);
    return Math.min(50, Math.min(points, loss));
};

const computeCompetitiveAwardsForTournament = async ({ tournament, activePlayers, totalRounds, now }) => {
    const participants = Array.isArray(activePlayers) ? activePlayers : [];
    const participantIds = participants
        .map((p) => getIdString(p?.user))
        .filter(Boolean);
    const uniqueParticipantIds = Array.from(new Set(participantIds));

    if (!uniqueParticipantIds.length) {
        return { pointsAwards: [], usersToSave: [] };
    }

    const users = await User.find({ _id: { $in: uniqueParticipantIds } }).select(
        'username competitive'
    );
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    const levelById = new Map();
    uniqueParticipantIds.forEach((id) => {
        const user = userById.get(id);
        const points = user?.competitive?.points;
        const storedLevel = user?.competitive?.level;
        const level = Number.isFinite(storedLevel)
            ? storedLevel
            : computeLevelFromPoints(Number.isFinite(points) ? points : 0);
        levelById.set(id, Math.max(1, level));
    });

    const participantMetaById = new Map();
    participants.forEach((p) => {
        const id = getIdString(p?.user);
        if (!id) return;
        participantMetaById.set(id, p);
    });

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const round2 = (value) => Math.round(value * 100) / 100;

    const basePointsByStage = (lostRound) => {
        if (!lostRound) return 0;
        if (lostRound >= totalRounds + 1) return 25;
        if (lostRound === totalRounds) return 18;
        if (lostRound === totalRounds - 1) return 14;
        if (lostRound === totalRounds - 2) return 10;
        return 6;
    };

    const resultsByKey = new Map();
    const rawResults = Array.isArray(tournament?.results) ? tournament.results : [];
    rawResults.forEach((r) => {
        if (!r || !r.winner) return;
        const round = Number(r.round || 1);
        const aId = getIdString(r.playerA);
        const bId = getIdString(r.playerB);
        if (!aId || !bId) return;
        const key = `${round}:${[aId, bId].sort().join('-')}`;
        resultsByKey.set(key, r);
    });

    const results = Array.from(resultsByKey.values());

    const statsById = new Map();
    uniqueParticipantIds.forEach((id) => {
        statsById.set(id, {
            wins: 0,
            losses: 0,
            winPoints: 0,
            difficultySum: 0,
            difficultyCount: 0,
            opponents: new Set(),
            defeated: new Set(),
            highlightedOpponents: new Set(),
        });
    });

    const lostRoundById = {};

    results.forEach((r) => {
        if (!r || !r.winner) return;
        const round = Number(r.round || 1);
        const aId = getIdString(r.playerA);
        const bId = getIdString(r.playerB);
        const wId = getIdString(r.winner);
        if (!aId || !bId || !wId) return;
        if (!statsById.has(aId) || !statsById.has(bId)) return;

        const loserId = wId === aId ? bId : wId === bId ? aId : null;
        if (!loserId) return;

        const wStats = statsById.get(wId);
        const lStats = statsById.get(loserId);

        wStats.wins += 1;
        lStats.losses += 1;
        wStats.opponents.add(loserId);
        lStats.opponents.add(wId);

        if (!wStats.defeated.has(loserId)) {
            wStats.defeated.add(loserId);

            const playerLevel = levelById.get(wId) || 1;
            const opponentLevel = levelById.get(loserId) || 1;

            const winWeight = clamp(
                opponentLevel / Math.max(1, playerLevel),
                0.1,
                1.25
            );
            wStats.winPoints += 3 * winWeight;

            const difficulty = clamp(
                Math.max(0, opponentLevel - playerLevel),
                0,
                10
            );
            wStats.difficultySum += difficulty;
            wStats.difficultyCount += 1;

            if (opponentLevel >= playerLevel + 3) {
                wStats.highlightedOpponents.add(loserId);
            }
        }

        if (!lostRoundById[loserId] || round > lostRoundById[loserId]) {
            lostRoundById[loserId] = round;
        }
    });

    const finalResult = results.find(
        (r) => (r.round || 1) === totalRounds && r.winner
    );
    const championId = getIdString(finalResult?.winner);
    if (championId) {
        lostRoundById[championId] = totalRounds + 1;
    }

    const rankedIds = [...uniqueParticipantIds].sort((a, b) => {
        const aRound = lostRoundById[a] || 0;
        const bRound = lostRoundById[b] || 0;
        if (bRound !== aRound) return bRound - aRound;
        const aWins = statsById.get(a)?.wins || 0;
        const bWins = statsById.get(b)?.wins || 0;
        if (bWins !== aWins) return bWins - aWins;
        return a.localeCompare(b);
    });

    const placementById = {};
    rankedIds.forEach((id, index) => {
        placementById[id] = index + 1;
    });

    const pointsAwards = [];
    const usersToSave = [];

    uniqueParticipantIds.forEach((id) => {
        const user = userById.get(id);
        if (!user) return;

        if (!user.competitive) user.competitive = {};
        if (!Number.isFinite(user.competitive.points)) user.competitive.points = 0;
        if (!Number.isFinite(user.competitive.level)) {
            user.competitive.level = computeLevelFromPoints(user.competitive.points);
        }
        if (!Number.isFinite(user.competitive.wins)) user.competitive.wins = 0;
        if (!Number.isFinite(user.competitive.losses)) user.competitive.losses = 0;
        if (!Number.isFinite(user.competitive.tournamentsPlayed)) {
            user.competitive.tournamentsPlayed = 0;
        }
        if (!Number.isFinite(user.competitive.decayTotal)) user.competitive.decayTotal = 0;
        if (!Array.isArray(user.competitive.history)) user.competitive.history = [];
        if (!Array.isArray(user.competitive.highlightedWins)) {
            user.competitive.highlightedWins = [];
        }

        const meta = participantMetaById.get(id);
        const status = meta?.status;

        const stats = statsById.get(id) || {
            wins: 0,
            losses: 0,
            winPoints: 0,
            difficultySum: 0,
            difficultyCount: 0,
            opponents: new Set(),
            highlightedOpponents: new Set(),
        };

        const playerLevel = levelById.get(id) || 1;

        let avgOpponentLevel = playerLevel;
        if (stats.opponents && stats.opponents.size) {
            let sum = 0;
            let count = 0;
            stats.opponents.forEach((oppId) => {
                const lvl = levelById.get(oppId) || 1;
                sum += lvl;
                count += 1;
            });
            if (count) avgOpponentLevel = sum / count;
        }

        const baseWeight = clamp(
            avgOpponentLevel / Math.max(1, playerLevel),
            0.3,
            1.2
        );

        const lostRound = lostRoundById[id] || 0;
        const basePlacement = basePointsByStage(lostRound) * baseWeight;

        const difficultyAvg = stats.difficultyCount
            ? stats.difficultySum / stats.difficultyCount
            : 0;
        const winsPoints = Number.isFinite(stats.winPoints) ? stats.winPoints : 0;
        const difficultyPoints = difficultyAvg * 2;

        let penalties = 0;
        if (status === 'disqualified') penalties -= 10;
        if (status === 'expelled') penalties -= 15;

        const decayLoss = computeDecay(
            user.competitive.points,
            user.competitive.lastCompetitiveAt,
            now
        );

        const totalDelta = basePlacement + winsPoints + difficultyPoints + penalties - decayLoss;
        const pointsDelta = round2(totalDelta);
        const decaySigned = round2(-decayLoss);

        const nextPoints = Math.max(
            0,
            round2((Number.isFinite(user.competitive.points) ? user.competitive.points : 0) + pointsDelta)
        );

        user.competitive.points = nextPoints;
        user.competitive.level = computeLevelFromPoints(user.competitive.points);
        user.competitive.wins += stats.wins;
        user.competitive.losses += stats.losses;
        user.competitive.tournamentsPlayed += 1;
        user.competitive.decayTotal += decayLoss;
        user.competitive.lastCompetitiveAt = now;

        user.competitive.history.push({
            tournament: tournament._id,
            tournamentName: tournament.name,
            game: tournament.game,
            completedAt: tournament.completedAt || now,
            placement: placementById[id],
            points: pointsDelta,
            wins: stats.wins,
            losses: stats.losses,
            difficultyAvg: round2(difficultyAvg),
            breakdown: {
                basePlacement: round2(basePlacement),
                winsPoints: round2(winsPoints),
                difficultyPoints: round2(difficultyPoints),
                penalties: round2(penalties),
                decay: decaySigned,
                total: pointsDelta,
            },
        });

        if (stats.highlightedOpponents && stats.highlightedOpponents.size) {
            stats.highlightedOpponents.forEach((oppId) => {
                const exists = user.competitive.highlightedWins.some((w) => {
                    const tId = getIdString(w?.tournament);
                    const oId = getIdString(w?.opponent);
                    return (
                        tId === tournament._id.toString() &&
                        oId === oppId.toString()
                    );
                });

                if (exists) return;

                const oppUser = userById.get(oppId);
                user.competitive.highlightedWins.push({
                    tournament: tournament._id,
                    tournamentName: tournament.name,
                    game: tournament.game,
                    opponent: oppId,
                    opponentUsername: oppUser?.username,
                    opponentLevel: levelById.get(oppId) || 1,
                    createdAt: now,
                });
            });
        }

        pointsAwards.push({
            user: user._id,
            placement: placementById[id],
            wins: stats.wins,
            losses: stats.losses,
            difficultyAvg: round2(difficultyAvg),
            points: pointsDelta,
            breakdown: {
                basePlacement: round2(basePlacement),
                winsPoints: round2(winsPoints),
                difficultyPoints: round2(difficultyPoints),
                penalties: round2(penalties),
                decay: decaySigned,
                total: pointsDelta,
            },
        });

        usersToSave.push(user);
    });

    pointsAwards.sort((a, b) => {
        const aPlace = Number.isFinite(a?.placement) ? a.placement : 9999;
        const bPlace = Number.isFinite(b?.placement) ? b.placement : 9999;
        return aPlace - bPlace;
    });

    return { pointsAwards, usersToSave };
};

// @route   GET api/tournaments
// @desc    Get all tournaments
// @access  Public
router.get('/', async (req, res) => {
    try {
        const tournaments = await Tournament.find()
            .populate('createdBy', 'username')
            .sort({ startDate: 1 });

        // Actualizar el estado en memoria según fechas antes de responder
        tournaments.forEach((t) => applyComputedStatus(t));

        res.json(tournaments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/tournaments/:id/payment-proof
// @desc    Upload payment proof and create/update pending participation
// @access  Private
router.post('/:id/payment-proof', auth, paymentUpload.single('paymentProof'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se envió ninguna imagen de pago' });
        }

        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        // Actualizar estado según fechas antes de validar si se puede pagar
        applyComputedStatus(tournament);

        if (tournament.status !== 'upcoming') {
            return res.status(400).json({ message: 'Solo se puede pagar la inscripción de torneos próximos' });
        }

        const imageUrl = `/uploads/payments/${req.file.filename}`;

        let participant = tournament.participants.find(
            (p) => p.user && p.user.toString() === req.user.id
        );

        if (!participant) {
            participant = {
                user: req.user.id,
                status: 'waiting',
                joinDate: new Date(),
                paymentProof: {
                    imageUrl,
                    status: 'pending',
                    uploadedAt: new Date(),
                    reported: false,
                    reportReason: undefined,
                }
            };
            tournament.participants.push(participant);
        } else {
            participant.status = 'waiting';
            participant.joinDate = new Date();
            participant.paymentProof = {
                imageUrl,
                status: 'pending',
                uploadedAt: new Date(),
                reported: false,
                reportReason: undefined,
            };
        }

        await tournament.save();

        // Crear notificación para admins sobre nueva validación de pago pendiente
        try {
            // Cerrar tickets de validación de pago abiertos anteriores para este usuario y torneo
            await SupportTicket.updateMany(
                {
                    user: req.user._id,
                    category: 'tournaments',
                    subtype: 'payment_validation',
                    tournament: tournament._id,
                    status: 'open',
                },
                {
                    status: 'closed',
                    read: true,
                }
            );

            const validationTicket = new SupportTicket({
                user: req.user._id,
                username: req.user.username,
                email: req.user.email,
                subject: `Validación de pago - ${tournament.name}`,
                category: 'tournaments',
                tournament: tournament._id,
                subtype: 'payment_validation',
                message:
                    `El usuario ${req.user.username} ha enviado un comprobante de pago para el torneo "${tournament.name}".`,
                conversation: [
                    {
                        from: 'user',
                        message: 'Comprobante de pago enviado para validación.',
                        createdAt: new Date(),
                    },
                ],
                status: 'open',
                read: false,
            });

            await validationTicket.save();
        } catch (ticketErr) {
            console.error('Error creando ticket de validación de pago:', ticketErr);
        }

        await tournament.populate([
            { path: 'createdBy', select: 'username' },
            { path: 'participants.user', select: 'username avatar' },
            { path: 'participants.paymentProof.verifiedBy', select: 'username' },
        ]);

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/tournaments/:id/participants/:participantId/expel
// @desc    Expel a participant with reason (Admin or organizer)
// @access  Private
router.put('/:id/participants/:participantId/expel', auth, async (req, res) => {
    try {
        const { reason } = req.body || {};
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const isAdmin = isAdminUser(req.user);
        const isOrganizer =
            tournament.createdBy &&
            tournament.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({ message: 'No tienes permisos para expulsar participantes en este torneo' });
        }

        const participant = tournament.participants.id(req.params.participantId);
        if (!participant) {
            return res.status(404).json({ message: 'Participante no encontrado' });
        }

        // Evitar expulsar al organizador (createdBy) si está inscrito
        if (
            participant.user &&
            tournament.createdBy &&
            participant.user.toString() === tournament.createdBy.toString()
        ) {
            return res.status(400).json({ message: 'No puedes expulsar al organizador del torneo' });
        }

        const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
        if (!trimmedReason) {
            return res.status(400).json({ message: 'Debes indicar un motivo de expulsión' });
        }

        participant.status = 'expelled';
        participant.expelledReason = trimmedReason;
        participant.expelledAt = new Date();
        participant.expelledBy = req.user._id;

        // Si tenía comprobante de pago, mantenerlo; pero marcarlo como no aprobado para evitar inicio.
        if (participant.paymentProof && participant.paymentProof.status === 'approved') {
            participant.paymentProof.status = 'rejected';
        }

        await tournament.save();

        await tournament.populate([
            { path: 'createdBy', select: 'username' },
            { path: 'participants.user', select: 'username avatar' },
            { path: 'participants.expelledBy', select: 'username' },
            { path: 'participants.paymentProof.verifiedBy', select: 'username' },
        ]);

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/tournaments/:id/payments/:participantId/approve
// @desc    Approve a participant payment proof
// @access  Private (organizer or admin)
router.put('/:id/payments/:participantId/approve', auth, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const isAdmin = isAdminUser(req.user);
        const isOrganizer =
            tournament.createdBy &&
            tournament.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({ message: 'No tienes permisos para validar pagos en este torneo' });
        }

        const participant = tournament.participants.id(req.params.participantId);

        if (!participant || !participant.paymentProof) {
            return res.status(404).json({ message: 'Participante o comprobante de pago no encontrado' });
        }

        participant.paymentProof.status = 'approved';
        participant.paymentProof.verifiedAt = new Date();
        participant.paymentProof.verifiedBy = req.user._id;
        participant.paymentProof.reported = false;
        participant.paymentProof.reportReason = undefined;
        participant.status = 'registered';

        await tournament.save();

        // Cerrar tickets de validación de pago relacionados para este usuario y torneo
        try {
            await SupportTicket.updateMany(
                {
                    user: participant.user,
                    category: 'tournaments',
                    subtype: 'payment_validation',
                    tournament: tournament._id,
                    status: 'open',
                },
                {
                    status: 'closed',
                    read: true,
                    assignedTo: req.user._id,
                    assignedAt: new Date(),
                }
            );
        } catch (ticketErr) {
            console.error('Error cerrando tickets de validación de pago:', ticketErr);
        }

        try {
            await Notification.create({
                user: participant.user,
                type: 'payment_approved',
                title: 'Pago confirmado',
                message: `Tu pago para "${tournament.name}" fue confirmado.`,
                link: `/tournaments/${tournament._id}`,
                meta: { tournamentId: tournament._id, participantId: participant._id },
            });
        } catch (notifyErr) {
            console.error('Error creando notificación de pago confirmado:', notifyErr);
        }

        await tournament.populate([
            { path: 'createdBy', select: 'username' },
            { path: 'participants.user', select: 'username avatar' },
        ]);

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/tournaments/:id/payments/:participantId/reject
// @desc    Reject a participant payment proof and optionally create a report ticket
// @access  Private (organizer or admin)
router.put('/:id/payments/:participantId/reject', auth, async (req, res) => {
    try {
        const { reason, report } = req.body || {};
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const isAdmin = isAdminUser(req.user);
        const isOrganizer =
            tournament.createdBy &&
            tournament.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({ message: 'No tienes permisos para rechazar pagos en este torneo' });
        }

        const participant = tournament.participants.id(req.params.participantId);

        if (!participant || !participant.paymentProof) {
            return res.status(404).json({ message: 'Participante o comprobante de pago no encontrado' });
        }

        const previousImageUrl = participant.paymentProof.imageUrl;

        participant.paymentProof.status = 'rejected';
        participant.paymentProof.verifiedAt = new Date();
        participant.paymentProof.verifiedBy = req.user._id;
        participant.paymentProof.reported = !!report;
        participant.paymentProof.reportReason = reason;
        participant.paymentProof.imageUrl = previousImageUrl;
        participant.status = 'disqualified';

        // Cerrar tickets de validación de pago relacionados para este usuario y torneo
        try {
            await SupportTicket.updateMany(
                {
                    user: participant.user,
                    category: 'tournaments',
                    subtype: 'payment_validation',
                    tournament: tournament._id,
                    status: 'open',
                },
                {
                    status: 'closed',
                    read: true,
                }
            );
        } catch (ticketErr) {
            console.error('Error cerrando tickets de validación de pago:', ticketErr);
        }

        if (report && participant.user) {
            try {
                const reportedUser = await User.findById(participant.user);
                if (reportedUser) {
                    const ticket = new SupportTicket({
                        user: reportedUser._id,
                        username: reportedUser.username,
                        email: reportedUser.email,
                        subject: 'Reporte de pago de inscripción de torneo',
                        category: 'tournaments',
                        tournament: tournament._id,
                        subtype: 'payment_report',
                        message:
                            `Se ha reportado un posible comprobante de pago falso en el torneo "${tournament.name}".\n` +
                            `ID Torneo: ${tournament._id}\n` +
                            `Usuario reportado: ${reportedUser.username} (${reportedUser.email})\n` +
                            (previousImageUrl
                                ? `Ruta de la imagen reportada: ${previousImageUrl}`
                                : ''),
                        conversation: [
                            {
                                from: 'admin',
                                message:
                                    reason ||
                                    'Comprobante de pago marcado como falso por el organizador del torneo.',
                                createdAt: new Date(),
                            },
                        ],
                        status: 'open',
                        read: false,
                    });

                    await ticket.save();
                }
            } catch (ticketErr) {
                console.error('Error creando ticket de reporte de pago:', ticketErr);
            }
        }

        await tournament.save();

        await tournament.populate([
            { path: 'createdBy', select: 'username' },
            { path: 'participants.user', select: 'username avatar' },
            { path: 'participants.expelledBy', select: 'username' },
        ]);

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/tournaments/:id
// @desc    Get tournament by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate('createdBy', 'username')
            .populate('participants.user', 'username avatar')
            .populate('participants.expelledBy', 'username')
            .populate('participants.paymentProof.verifiedBy', 'username')
            .populate('results.playerA', 'username')
            .populate('results.playerB', 'username')
            .populate('results.winner', 'username')
            .populate('pointsAwards.user', 'username avatar competitive.level');

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        // Asegurar que el estado que ve el frontend refleje las fechas actuales
        applyComputedStatus(tournament);

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/tournaments
// @desc    Create a tournament (Admin only)
// @access  Private/Admin
router.post('/', [auth, admin], async (req, res) => {
    try {
        const newTournament = new Tournament({
            ...req.body,
            createdBy: req.user.id
        });

        const tournament = await newTournament.save();
        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/tournaments/:id/start-now
// @desc    Start a tournament early (Admin or organizer) if it is upcoming
// @access  Private
router.put('/:id/start-now', auth, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const isAdmin = isAdminUser(req.user);
        const isOrganizer =
            tournament.createdBy &&
            tournament.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({ message: 'No tienes permisos para iniciar este torneo' });
        }

        applyComputedStatus(tournament);

        if (hasPendingPaidParticipants(tournament)) {
            return res.status(400).json({
                message:
                    'No puedes iniciar el torneo hasta que todos los pagos de inscripción hayan sido aprobados.',
            });
        }

        if (tournament.status !== 'upcoming') {
            return res.status(400).json({ message: 'Solo se pueden iniciar torneos próximos' });
        }

        const now = new Date();
        const originalStart = tournament.startDate ? new Date(tournament.startDate) : null;
        const originalEnd = tournament.endDate ? new Date(tournament.endDate) : null;

        tournament.startDate = now;

        if (
            originalStart &&
            originalEnd &&
            !Number.isNaN(originalStart.getTime()) &&
            !Number.isNaN(originalEnd.getTime()) &&
            originalEnd > originalStart
        ) {
            const durationMs = originalEnd.getTime() - originalStart.getTime();
            tournament.endDate = new Date(now.getTime() + durationMs);
        }

        tournament.status = 'ongoing';

        await tournament.save();

        await tournament.populate([
            { path: 'createdBy', select: 'username' },
            { path: 'participants.user', select: 'username avatar' },
            { path: 'participants.paymentProof.verifiedBy', select: 'username' },
        ]);

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/:id/complete', auth, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const isAdmin = isAdminUser(req.user);
        const isOrganizer =
            tournament.createdBy &&
            tournament.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({ message: 'No tienes permisos para finalizar este torneo' });
        }

        applyComputedStatus(tournament);

        const alreadyAwarded =
            !!tournament.pointsAwardedAt ||
            (Array.isArray(tournament.pointsAwards) && tournament.pointsAwards.length > 0);

        if (tournament.status === 'completed' && alreadyAwarded) {
            await tournament.populate([
                { path: 'createdBy', select: 'username' },
                { path: 'participants.user', select: 'username avatar' },
                { path: 'participants.expelledBy', select: 'username' },
                { path: 'participants.paymentProof.verifiedBy', select: 'username' },
                { path: 'results.playerA', select: 'username' },
                { path: 'results.playerB', select: 'username' },
                { path: 'results.winner', select: 'username' },
                { path: 'pointsAwards.user', select: 'username avatar competitive.level' },
            ]);
            return res.json(tournament);
        }

        if (tournament.status !== 'ongoing' && tournament.status !== 'completed') {
            return res.status(400).json({ message: 'Solo se pueden finalizar torneos en curso' });
        }

        const activePlayers = Array.isArray(tournament.participants)
            ? tournament.participants.filter((p) => p && p.user)
            : [];
        const totalPlayers = activePlayers.length;

        if (totalPlayers < 2) {
            return res
                .status(400)
                .json({ message: 'No hay suficientes participantes para finalizar este torneo' });
        }

        const nextPowerOfTwo = (n) => {
            let p = 1;
            while (p < n) p *= 2;
            return p;
        };

        const slots = nextPowerOfTwo(totalPlayers);
        const totalRounds = Math.log2(slots);

        const results = Array.isArray(tournament.results) ? tournament.results : [];
        const finalResult = results.find(
            (r) => (r.round || 1) === totalRounds && r.winner
        );

        if (!finalResult) {
            return res
                .status(400)
                .json({ message: 'Aún no hay un ganador final para finalizar el torneo' });
        }

        const now = new Date();

        if (tournament.status !== 'completed') {
            tournament.status = 'completed';
        }
        if (!tournament.completedAt) {
            tournament.completedAt = now;
        }

        if (!alreadyAwarded) {
            const { pointsAwards, usersToSave } = await computeCompetitiveAwardsForTournament({
                tournament,
                activePlayers,
                totalRounds,
                now,
            });

            tournament.pointsAwards = Array.isArray(pointsAwards) ? pointsAwards : [];
            tournament.pointsAwardedAt = now;

            if (Array.isArray(usersToSave) && usersToSave.length) {
                await Promise.all(usersToSave.map((u) => u.save()));
                
                // Emitir eventos para cada participante
                const winnerId = finalResult.winner?.toString();
                usersToSave.forEach(user => {
                    const userId = user._id.toString();
                    const isWinner = userId === winnerId;
                    const placement = pointsAwards.find(p => p.user?.toString() === userId)?.placement || 999;
                    
                    // Evento de torneo completado
                    gameEvents.emitSafe('tournament_completed', userId, {
                        tournamentId: tournament._id,
                        tournamentName: tournament.name,
                        placement
                    });
                    
                    // Evento de torneo ganado (solo para el ganador)
                    if (isWinner) {
                        const userWins = user.competitive.wins || 0;
                        gameEvents.emitSafe('tournament_won', userId, {
                            tournamentId: tournament._id,
                            tournamentName: tournament.name,
                            isFirstWin: userWins === 1,
                            isPerfect: placement === 1 && userWins > 0,
                            streakLength: userWins
                        });
                    }
                    
                    // Evento de puntos ganados
                    const points = user.competitive.points || 0;
                    gameEvents.emitSafe('points_earned', userId, {
                        totalPoints: points,
                        tournamentPoints: pointsAwards.find(p => p.user?.toString() === userId)?.points || 0
                    });
                    
                    // Evento de subida de nivel
                    const newLevel = computeLevelFromPoints(points);
                    const oldLevel = computeLevelFromPoints(points - (pointsAwards.find(p => p.user?.toString() === userId)?.points || 0));
                    if (newLevel > oldLevel) {
                        gameEvents.emitSafe('level_up', userId, {
                            level: newLevel,
                            oldLevel
                        });
                    }
                });
            }
        }

        await tournament.save();

        await tournament.populate([
            { path: 'createdBy', select: 'username' },
            { path: 'participants.user', select: 'username avatar' },
            { path: 'participants.expelledBy', select: 'username' },
            { path: 'participants.paymentProof.verifiedBy', select: 'username' },
            { path: 'results.playerA', select: 'username' },
            { path: 'results.playerB', select: 'username' },
            { path: 'results.winner', select: 'username' },
            { path: 'pointsAwards.user', select: 'username avatar competitive.level' },
        ]);

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/tournaments/:id
// @desc    Update a tournament (Admin or organizer)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        // Update fields
        const { name, description, type, startDate, endDate, maxParticipants, rules, prizes, status } = req.body;
        
        if (name) tournament.name = name;
        if (description) tournament.description = description;
        if (type) tournament.type = type;
        if (startDate) tournament.startDate = startDate;
        if (endDate) tournament.endDate = endDate;
        if (maxParticipants) tournament.maxParticipants = maxParticipants;
        if (typeof rules === 'string') tournament.rules = rules;
        if (typeof prizes === 'string') tournament.prizes = prizes;
        if (status) tournament.status = status;

        await tournament.save();

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/tournaments/:id
// @desc    Delete a tournament (Admin or organizer)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const isAdmin = isAdminUser(req.user);
        const isOrganizer =
            tournament.createdBy &&
            tournament.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({ message: 'No tienes permisos para eliminar este torneo' });
        }

        await tournament.deleteOne();

        return res.json({ message: 'Tournament deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/tournaments/:id/participate
// @desc    Cancel registration for a tournament
// @access  Private
router.delete('/:id/participate', auth, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const initialLength = tournament.participants.length;
        tournament.participants = tournament.participants.filter(
            (p) => p.user.toString() !== req.user.id
        );

        if (tournament.participants.length === initialLength) {
            return res.status(400).json({ message: 'You are not registered in this tournament' });
        }

        await tournament.save();
        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/tournaments/:id/participate
// @desc    Register for a tournament
// @access  Private
router.post('/:id/participate', auth, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        // Check if already registered
        if (tournament.participants.some(p => p.user.toString() === req.user.id)) {
            return res.status(400).json({ message: 'Already registered for this tournament' });
        }

        // Check if tournament is full
        if (tournament.participants.length >= tournament.maxParticipants) {
            return res.status(400).json({ message: 'Tournament is full' });
        }

        // Add participant
        tournament.participants.push({
            user: req.user.id,
            status: 'registered'
        });

        await tournament.save();
        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/tournaments/:id/results
// @desc    Add/update tournament results (Admin or organizer)
// @access  Private
router.post('/:id/results', auth, async (req, res) => {
    try {
        const { round, playerA, playerB, winner, score } = req.body;
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        const isAdmin = isAdminUser(req.user);
        const isOrganizer =
            tournament.createdBy &&
            tournament.createdBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOrganizer) {
            return res.status(403).json({ message: 'No tienes permisos para editar resultados de este torneo' });
        }

        const roundNumber = Number(round);
        if (!Number.isFinite(roundNumber) || roundNumber < 1) {
            return res.status(400).json({ message: 'Round inválido' });
        }

        const aId = getIdString(playerA);
        const bId = getIdString(playerB);
        const wId = getIdString(winner);

        if (!aId || !bId || !wId) {
            return res.status(400).json({ message: 'Datos incompletos: playerA/playerB/winner son requeridos' });
        }

        if (aId === bId) {
            return res.status(400).json({ message: 'playerA y playerB no pueden ser el mismo jugador' });
        }

        if (wId !== aId && wId !== bId) {
            return res.status(400).json({ message: 'El winner debe ser playerA o playerB' });
        }

        const result = {
            round: roundNumber,
            playerA: aId,
            playerB: bId,
            winner: wId,
            score: typeof score === 'string' ? score : ''
        };

        // Check if result exists for this match
        const matchIndices = [];
        tournament.results.forEach((r, idx) => {
            if (!r) return;
            const rRound = Number(r.round || 1);
            if (rRound !== roundNumber) return;
            const ra = getIdString(r.playerA);
            const rb = getIdString(r.playerB);
            if (!ra || !rb) return;
            const sameOrder = ra === aId && rb === bId;
            const swappedOrder = ra === bId && rb === aId;
            if (sameOrder || swappedOrder) {
                matchIndices.push(idx);
            }
        });

        if (matchIndices.length > 0) {
            const keepIndex = matchIndices[0];
            tournament.results[keepIndex] = result;

            const duplicates = matchIndices.slice(1).sort((a, b) => b - a);
            duplicates.forEach((idx) => {
                tournament.results.splice(idx, 1);
            });
        } else {
            tournament.results.push(result);
        }

        await tournament.save();

        await tournament.populate([
            { path: 'createdBy', select: 'username' },
            { path: 'participants.user', select: 'username avatar' },
            { path: 'participants.expelledBy', select: 'username' },
            { path: 'participants.paymentProof.verifiedBy', select: 'username' },
            { path: 'results.playerA', select: 'username' },
            { path: 'results.playerB', select: 'username' },
            { path: 'results.winner', select: 'username' },
        ]);

        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
