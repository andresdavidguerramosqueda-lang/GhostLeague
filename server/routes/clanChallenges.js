const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { ClanMembership } = require('../models/ClanMembership');
const { ClanChallenge, CHALLENGE_STATUS } = require('../models/ClanChallenge');
const { ClanFeed } = require('../models/ClanFeed');

// @route   GET /api/clan-challenges
// @desc    Obtener desafíos del clan del usuario
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const membership = await ClanMembership.getActiveMembership(req.user.id);
    
    if (!membership) {
      return res.status(400).json({
        message: 'No eres miembro de ningún clan',
        error: 'NOT_IN_CLAN'
      });
    }
    
    const { status } = req.query;
    const challenges = await ClanChallenge.getClanChallenges(membership.clan._id, status);
    
    res.json({ challenges });
  } catch (error) {
    console.error('Error en GET /clan-challenges:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clan-challenges
// @desc    Crear un desafío a otro clan
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      challengedClanId,
      type,
      rules,
      scheduledAt,
      notes
    } = req.body;
    
    // Verificar que el usuario esté en un clan
    const membership = await ClanMembership.getActiveMembership(req.user.id);
    
    if (!membership) {
      return res.status(400).json({
        message: 'No eres miembro de ningún clan',
        error: 'NOT_IN_CLAN'
      });
    }
    
    // Verificar permisos (solo líderes y sublíderes pueden crear desafíos)
    if (!membership.canPerformAction('manage_tournaments')) {
      return res.status(403).json({
        message: 'No tienes permisos para crear desafíos',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Verificar que no se desafíe a su propio clan
    if (membership.clan._id.toString() === challengedClanId) {
      return res.status(400).json({
        message: 'No puedes desafiar a tu propio clan',
        error: 'SAME_CLAN'
      });
    }
    
    // Crear desafío
    const challenge = await ClanChallenge.createChallenge({
      challenger: membership.clan._id,
      challenged: challengedClanId,
      type,
      rules,
      proposedBy: req.user.id,
      scheduledAt,
      notes
    });
    
    res.status(201).json({
      message: 'Desafío creado exitosamente',
      challenge
    });
  } catch (error) {
    console.error('Error en POST /clan-challenges:', error);
    if (error.message.includes('Ya existe un desafío activo')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clan-challenges/:id/accept
// @desc    Aceptar un desafío
// @access  Private
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const challenge = await ClanChallenge.findById(req.params.id)
      .populate('challenged');
    
    if (!challenge) {
      return res.status(404).json({ message: 'Desafío no encontrado' });
    }
    
    // Verificar que el usuario sea miembro del clan desafiado
    const membership = await ClanMembership.getActiveMembership(req.user.id);
    
    if (!membership || membership.clan._id.toString() !== challenge.challenged._id.toString()) {
      return res.status(403).json({
        message: 'No puedes aceptar este desafío',
        error: 'NOT_CHALLENGED_CLAN'
      });
    }
    
    // Verificar permisos
    if (!membership.canPerformAction('manage_tournaments')) {
      return res.status(403).json({
        message: 'No tienes permisos para aceptar desafíos',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Aceptar desafío
    await challenge.accept(req.user.id);
    
    res.json({
      message: 'Desafío aceptado',
      challenge
    });
  } catch (error) {
    console.error('Error en POST /clan-challenges/:id/accept:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clan-challenges/:id/complete
// @desc    Completar un desafío (registrar resultado)
// @access  Private
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { winnerId, score } = req.body;
    
    const challenge = await ClanChallenge.findById(req.params.id)
      .populate('challenger')
      .populate('challenged');
    
    if (!challenge) {
      return res.status(404).json({ message: 'Desafío no encontrado' });
    }
    
    // Verificar que el usuario sea miembro de uno de los clanes
    const membership = await ClanMembership.getActiveMembership(req.user.id);
    
    if (!membership || (
      membership.clan._id.toString() !== challenge.challenger._id.toString() &&
      membership.clan._id.toString() !== challenge.challenged._id.toString()
    )) {
      return res.status(403).json({
        message: 'No puedes completar este desafío',
        error: 'NOT_PARTICIPANT_CLAN'
      });
    }
    
    // Verificar permisos
    if (!membership.canPerformAction('manage_tournaments')) {
      return res.status(403).json({
        message: 'No tienes permisos para completar desafíos',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Verificar que el ganador sea uno de los participantes
    if (winnerId !== challenge.challenger._id.toString() && 
        winnerId !== challenge.challenged._id.toString()) {
      return res.status(400).json({
        message: 'El ganador debe ser uno de los clanes participantes',
        error: 'INVALID_WINNER'
      });
    }
    
    // Completar desafío
    await challenge.complete(winnerId, score);
    
    res.json({
      message: 'Desafío completado',
      challenge
    });
  } catch (error) {
    console.error('Error en POST /clan-challenges/:id/complete:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   DELETE /api/clan-challenges/:id
// @desc    Cancelar un desafío
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const challenge = await ClanChallenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ message: 'Desafío no encontrado' });
    }
    
    // Verificar que el usuario sea miembro del clan desafiante
    const membership = await ClanMembership.getActiveMembership(req.user.id);
    
    if (!membership || membership.clan._id.toString() !== challenge.challenger.toString()) {
      return res.status(403).json({
        message: 'No puedes cancelar este desafío',
        error: 'NOT_CHALLENGER_CLAN'
      });
    }
    
    // Verificar permisos
    if (!membership.canPerformAction('manage_tournaments')) {
      return res.status(403).json({
        message: 'No tienes permisos para cancelar desafíos',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Verificar que esté pendiente
    if (challenge.status !== CHALLENGE_STATUS.PENDING) {
      return res.status(400).json({
        message: 'Solo se pueden cancelar desafíos pendientes',
        error: 'CHALLENGE_NOT_PENDING'
      });
    }
    
    // Cancelar desafío
    challenge.status = CHALLENGE_STATUS.CANCELLED;
    await challenge.save();
    
    // Agregar al feed
    await ClanFeed.createEntry({
      clan: challenge.challenger,
      type: 'challenge_cancelled',
      actor: req.user.id,
      metadata: {
        challengedClan: challenge.challenged,
        challengeId: challenge._id,
        message: 'Canceló el desafío'
      }
    });
    
    res.json({
      message: 'Desafío cancelado'
    });
  } catch (error) {
    console.error('Error en DELETE /clan-challenges/:id:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
