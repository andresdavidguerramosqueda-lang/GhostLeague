const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { ClanInvite, INVITE_STATUS } = require('../models/ClanInvite');
const { ClanMembership } = require('../models/ClanMembership');
const User = require('../models/User');

// @route   GET /api/clan-invites/me
// @desc    Obtener invitaciones del usuario actual
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const { type = 'received' } = req.query;
    
    const invites = await ClanInvite.getUserInvites(req.user.id, type);
    
    res.json({ invites });
  } catch (error) {
    console.error('Error en GET /clan-invites/me:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clan-invites/:id/accept
// @desc    Aceptar una invitación
// @access  Private
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const invite = await ClanInvite.findById(req.params.id)
      .populate('clan')
      .populate('to');
    
    if (!invite) {
      return res.status(404).json({ message: 'Invitación no encontrada' });
    }
    
    if (invite.status !== INVITE_STATUS.PENDING) {
      return res.status(400).json({ message: 'Esta invitación ya no está activa' });
    }
    
    // Verificar que el usuario no esté ya en un clan
    const existingMembership = await ClanMembership.getActiveMembership(req.user.id);
    if (existingMembership) {
      return res.status(400).json({
        message: 'Ya eres miembro de un clan',
        clan: existingMembership.clan
      });
    }
    
    // Aceptar invitación
    const membership = await invite.accept(req.user.id);
    
    // Actualizar usuario
    await User.findByIdAndUpdate(req.user.id, { clanId: invite.clan._id });
    
    res.json({
      message: 'Te has unido al clan exitosamente',
      membership,
      clan: invite.clan
    });
  } catch (error) {
    console.error('Error en POST /clan-invites/:id/accept:', error);
    if (error.message === 'No puedes aceptar esta invitación') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clan-invites/:id/decline
// @desc    Rechazar una invitación
// @access  Private
router.post('/:id/decline', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const invite = await ClanInvite.findById(req.params.id);
    
    if (!invite) {
      return res.status(404).json({ message: 'Invitación no encontrada' });
    }
    
    if (invite.status !== INVITE_STATUS.PENDING) {
      return res.status(400).json({ message: 'Esta invitación ya no está activa' });
    }
    
    if (invite.to.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'No puedes rechazar esta invitación' });
    }
    
    // Rechazar invitación
    await invite.decline(req.user.id, reason);
    
    res.json({
      message: 'Invitación rechazada'
    });
  } catch (error) {
    console.error('Error en POST /clan-invites/:id/decline:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   DELETE /api/clan-invites/:id
// @desc    Cancelar una invitación (solo quien la envió)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const invite = await ClanInvite.findById(req.params.id);
    
    if (!invite) {
      return res.status(404).json({ message: 'Invitación no encontrada' });
    }
    
    if (invite.from.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'No puedes cancelar esta invitación' });
    }
    
    if (invite.status !== INVITE_STATUS.PENDING) {
      return res.status(400).json({ message: 'Esta invitación ya no está activa' });
    }
    
    // Cancelar invitación
    await invite.cancel(req.user.id);
    
    res.json({
      message: 'Invitación cancelada'
    });
  } catch (error) {
    console.error('Error en DELETE /clan-invites/:id:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
