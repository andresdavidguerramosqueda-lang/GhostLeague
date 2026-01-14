const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const gameEvents = require('../services/gameEvents');
const {
  isClanMember,
  isClanLeader,
  canInviteMembers,
  canManageMembers,
  canEditClan,
  isNotInClan,
  clanAcceptsRequests,
  getClanStats
} = require('../middleware/clanAuth');
const Clan = require('../models/Clan');
const { ClanMembership, CLAN_ROLES, ROLE_HIERARCHY, normalizeClanRole } = require('../models/ClanMembership');
const { ClanFeed } = require('../models/ClanFeed');
const { ClanInvite, INVITE_STATUS } = require('../models/ClanInvite');
const { ClanChallenge } = require('../models/ClanChallenge');
const User = require('../models/User');

// @route   GET /api/clans
// @desc    Obtener lista de clanes públicos
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { limit = 20, skip = 0, search } = req.query;
    
    let query = Clan.findPublicClans(parseInt(limit), parseInt(skip));
    
    if (search) {
      query = Clan.find({
        isActive: true,
        isPublic: true,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { tag: { $regex: search, $options: 'i' } }
        ]
      })
      .select('name tag logo banner primaryColor secondaryColor level experience memberCount maxMembers')
      .sort({ level: -1, experience: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('leader', 'username avatar');
    }
    
    const clans = await query;
    const total = await Clan.countDocuments({ isActive: true, isPublic: true });
    
    res.json({
      clans,
      total,
      hasMore: (parseInt(skip) + clans.length) < total
    });
  } catch (error) {
    console.error('Error en GET /clans:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/clans/:id
// @desc    Obtener detalles de un clan
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id)
      .populate('leader', 'username avatar')
      .populate('subLeaders', 'username avatar')
      .populate('createdBy', 'username avatar');
    
    if (!clan || !clan.isActive) {
      return res.status(404).json({ message: 'Clan no encontrado' });
    }
    
    // Obtener miembros del clan
    const members = await ClanMembership.getClanMembers(req.params.id);
    
    // Obtener feed reciente
    const feed = await ClanFeed.getClanFeed(req.params.id, { limit: 5 });
    
    res.json({
      clan,
      members: members.map(m => ({
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt,
        contributions: m.contributions
      })),
      feed
    });
  } catch (error) {
    console.error('Error en GET /clans/:id:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clans
// @desc    Crear un nuevo clan
// @access  Private
router.post('/', auth, isNotInClan, async (req, res) => {
  try {
    const {
      name,
      tag,
      description,
      motto,
      primaryColor,
      secondaryColor
    } = req.body;
    
    // Validaciones básicas
    if (!name || !tag) {
      return res.status(400).json({ message: 'Nombre y tag son requeridos' });
    }
    
    // Verificar que el tag no exista
    const existingTag = await Clan.findOne({ tag: tag.toUpperCase() });
    if (existingTag) {
      return res.status(400).json({ message: 'El tag ya está en uso' });
    }
    
    // Verificar que el nombre no exista
    const existingName = await Clan.findOne({ name });
    if (existingName) {
      return res.status(400).json({ message: 'El nombre ya está en uso' });
    }
    
    // Crear el clan
    const clan = new Clan({
      name,
      tag: tag.toUpperCase(),
      description,
      motto,
      primaryColor,
      secondaryColor,
      createdBy: req.user._id,
      leader: req.user._id
    });
    
    await clan.save();
    
    // Crear membresía del líder
    const membership = new ClanMembership({
      user: req.user._id,
      clan: clan._id,
      role: CLAN_ROLES.LEADER
    });
    
    await membership.save();
    
    // Agregar al feed
    await ClanFeed.clanCreated(clan._id, req.user._id);
    
    // Emitir evento de clan creado
    gameEvents.emitSafe('clan_created', req.user._id, {
      clanId: clan._id,
      clanName: clan.name
    });
    
    // Actualizar usuario con su clan
    await User.findByIdAndUpdate(req.user._id, { clanId: clan._id });
    
    // Emitir evento de unirse a clan
    gameEvents.emitSafe('clan_joined', req.user._id, {
      clanId: clan._id,
      role: CLAN_ROLES.LEADER
    });
    
    // Poblar para respuesta
    await clan.populate('leader', 'username avatar');
    
    res.status(201).json({
      message: 'Clan creado exitosamente',
      clan,
      membership
    });
  } catch (error) {
    console.error('Error en POST /clans:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/clans/:id
// @desc    Editar información del clan
// @access  Private (requiere permisos de clan)
router.put('/:id', auth, isClanMember, canEditClan, async (req, res) => {
  try {
    const {
      name,
      description,
      motto,
      logo,
      banner,
      primaryColor,
      secondaryColor,
      settings
    } = req.body;
    
    const clan = await Clan.findById(req.params.id);
    
    // Actualizar campos permitidos
    if (name) clan.name = name;
    if (description !== undefined) clan.description = description;
    if (motto !== undefined) clan.motto = motto;
    if (logo !== undefined) clan.logo = logo;
    if (banner !== undefined) clan.banner = banner;
    if (primaryColor) clan.primaryColor = primaryColor;
    if (secondaryColor) clan.secondaryColor = secondaryColor;
    if (settings) clan.settings = { ...clan.settings, ...settings };
    
    await clan.save();
    
    // Agregar al feed si fue una edición importante
    if (name || logo || banner) {
      await ClanFeed.createEntry({
        clan: req.params.id,
        type: 'clan_updated',
        actor: req.user.id,
        metadata: {
          message: 'Actualizó la información del clan'
        }
      });
    }
    
    res.json({
      message: 'Clan actualizado exitosamente',
      clan
    });
  } catch (error) {
    console.error('Error en PUT /clans/:id:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clans/:id/join
// @desc    Solicitar unirse a un clan
// @access  Private
router.post('/:id/join', auth, isNotInClan, clanAcceptsRequests, async (req, res) => {
  try {
    const { message } = req.body;
    const clan = req.clan;
    
    // Verificar si hay espacio
    if (clan.memberCount >= clan.maxMembers) {
      return res.status(400).json({ message: 'El clan está lleno' });
    }
    
    // Verificar nivel mínimo
    const user = await User.findById(req.user.id);
    if (user.competitive.level < clan.settings.minLevelToJoin) {
      return res.status(400).json({
        message: `Nivel mínimo requerido: ${clan.settings.minLevelToJoin}`
      });
    }

    const existingRequest = await ClanInvite.findOne({
      clan: clan._id,
      from: req.user.id,
      type: 'request',
      status: INVITE_STATUS.PENDING
    });

    if (existingRequest) {
      return res.status(400).json({
        message: 'Ya enviaste una solicitud para unirte a este clan'
      });
    }
    
    // Crear solicitud
    const invite = new ClanInvite({
      clan: clan._id,
      from: req.user.id,
      to: clan.leader,
      type: 'request',
      message: message || 'Quiero unirme al clan'
    });
    
    await invite.save();
    
    // Notificar al líder
    const Notification = require('../models/Notification');
    await new Notification({
      user: clan.leader,
      type: 'clan_join_request',
      title: 'Nueva solicitud para unirse',
      message: `${user.username} quiere unirse al clan`,
      data: {
        userId: req.user.id,
        clanId: clan._id,
        inviteId: invite._id
      }
    }).save();
    
    res.status(201).json({
      message: 'Solicitud enviada exitosamente',
      invite
    });
  } catch (error) {
    console.error('Error en POST /clans/:id/join:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.get('/:id/requests', auth, isClanMember, canManageMembers, async (req, res) => {
  try {
    const requests = await ClanInvite.getClanRequests(req.params.id);
    res.json({ requests });
  } catch (error) {
    console.error('Error en GET /clans/:id/requests:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post('/:id/requests/:requestId/accept', auth, isClanMember, canManageMembers, async (req, res) => {
  try {
    const { requestId } = req.params;

    const invite = await ClanInvite.findById(requestId);
    if (!invite || invite.type !== 'request' || invite.clan.toString() !== req.params.id.toString()) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (invite.status !== INVITE_STATUS.PENDING) {
      return res.status(400).json({ message: 'Esta solicitud ya no está activa' });
    }

    const clan = await Clan.findById(req.params.id);
    if (!clan || !clan.isActive) {
      return res.status(404).json({ message: 'Clan no encontrado' });
    }

    if (clan.memberCount >= clan.maxMembers) {
      return res.status(400).json({ message: 'El clan está lleno' });
    }

    const existingMembership = await ClanMembership.getActiveMembership(invite.from);
    if (existingMembership) {
      return res.status(400).json({
        message: 'El usuario ya está en un clan',
        clan: existingMembership.clan
      });
    }

    let membership = await ClanMembership.findOne({
      user: invite.from,
      clan: req.params.id
    });

    if (membership) {
      membership.isActive = true;
      membership.leftAt = undefined;
      membership.leaveReason = 'voluntary';
      membership.role = CLAN_ROLES.MEMBER;
      membership.joinedAt = new Date();
      membership.promotedAt = undefined;
      await membership.save();
    } else {
      membership = new ClanMembership({
        user: invite.from,
        clan: req.params.id,
        role: CLAN_ROLES.MEMBER
      });
      await membership.save();
    }

    await User.findByIdAndUpdate(invite.from, { clanId: req.params.id });

    invite.status = INVITE_STATUS.ACCEPTED;
    invite.respondedAt = new Date();
    invite.respondedBy = req.user.id;
    await invite.save();

    await ClanFeed.memberJoined(req.params.id, invite.from);

    res.json({
      message: 'Solicitud aceptada',
      membership
    });
  } catch (error) {
    console.error('Error en POST /clans/:id/requests/:requestId/accept:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post('/:id/requests/:requestId/decline', auth, isClanMember, canManageMembers, async (req, res) => {
  try {
    const { requestId } = req.params;

    const invite = await ClanInvite.findById(requestId);
    if (!invite || invite.type !== 'request' || invite.clan.toString() !== req.params.id.toString()) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (invite.status !== INVITE_STATUS.PENDING) {
      return res.status(400).json({ message: 'Esta solicitud ya no está activa' });
    }

    invite.status = INVITE_STATUS.DECLINED;
    invite.respondedAt = new Date();
    invite.respondedBy = req.user.id;
    await invite.save();

    res.json({ message: 'Solicitud rechazada' });
  } catch (error) {
    console.error('Error en POST /clans/:id/requests/:requestId/decline:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clans/:id/invite
// @desc    Invitar a un usuario al clan
// @access  Private (requiere permisos de reclutador)
router.post('/:id/invite', auth, isClanMember, canInviteMembers, async (req, res) => {
  try {
    const { userId, message, role = 'member' } = req.body;
    const normalizedRole = normalizeClanRole(role);
    
    // Verificar que el usuario exista
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar que no esté ya en un clan
    const userMembership = await ClanMembership.getActiveMembership(userId);
    if (userMembership) {
      return res.status(400).json({
        message: 'El usuario ya está en un clan',
        clan: userMembership.clan
      });
    }
    
    // Crear invitación
    const invite = await ClanInvite.createInvite({
      clan: req.params.id,
      from: req.user.id,
      to: userId,
      message,
      role: normalizedRole
    });
    
    // Notificar al usuario
    const Notification = require('../models/Notification');
    await new Notification({
      user: userId,
      type: 'clan_invite',
      title: 'Invitación a clan',
      message: `Fuiste invitado a unirte al clan`,
      data: {
        clanId: req.params.id,
        inviterId: req.user.id,
        inviteId: invite._id
      }
    }).save();
    
    res.status(201).json({
      message: 'Invitación enviada exitosamente',
      invite
    });
  } catch (error) {
    console.error('Error en POST /clans/:id/invite:', error);
    if (error.message === 'Ya existe una invitación pendiente para este usuario') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clans/:id/leave
// @desc    Abandonar el clan
// @access  Private
router.post('/:id/leave', auth, isClanMember, async (req, res) => {
  try {
    const membership = req.clanMembership;
    
    // El líder no puede abandonar si hay otros miembros
    if (membership.role === CLAN_ROLES.LEADER) {
      const memberCount = await ClanMembership.countDocuments({
        clan: req.params.id,
        isActive: true
      });
      
      if (memberCount > 1) {
        return res.status(400).json({
          message: 'El líder no puede abandonar el clan mientras haya otros miembros. Transfiere el liderazgo primero'
        });
      }
    }
    
    // Desactivar membresía
    membership.isActive = false;
    membership.leftAt = new Date();
    membership.leaveReason = 'voluntary';
    await membership.save();
    
    // Actualizar usuario
    await User.findByIdAndUpdate(req.user.id, { clanId: null });
    
    // Agregar al feed
    await ClanFeed.memberLeft(req.params.id, req.user.id, 'voluntary');
    
    res.json({
      message: 'Has abandonado el clan exitosamente'
    });
  } catch (error) {
    console.error('Error en POST /clans/:id/leave:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/clans/:id/feed
// @desc    Obtener feed del clan
// @access  Private (solo miembros)
router.get('/:id/feed', auth, isClanMember, async (req, res) => {
  try {
    const { limit = 20, skip = 0, type } = req.query;
    
    const feed = await ClanFeed.getClanFeed(req.params.id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      type
    });
    
    res.json({ feed });
  } catch (error) {
    console.error('Error en GET /clans/:id/feed:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clans/:id/promote
// @desc    Promover a un miembro
// @access  Private (requiere permisos de líder/sublíder)
router.post('/:id/promote', auth, isClanMember, canManageMembers, async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    const normalizedNewRole = normalizeClanRole(newRole);
    
    // Obtener membresía del objetivo
    const targetMembership = await ClanMembership.findOne({
      user: userId,
      clan: req.params.id,
      isActive: true
    });
    
    if (!targetMembership) {
      return res.status(404).json({ message: 'El usuario no es miembro del clan' });
    }

    if (normalizeClanRole(targetMembership.role) === CLAN_ROLES.LEADER) {
      return res.status(403).json({ message: 'No puedes cambiar el rol del líder del clan' });
    }

    if (normalizedNewRole === CLAN_ROLES.LEADER) {
      return res.status(400).json({ message: 'No puedes asignar el rol de líder desde aquí' });
    }
    
    // Verificar permisos
    if (!req.clanMembership.canPromoteTo(newRole)) {
      return res.status(403).json({
        message: 'No tienes permisos para promover a este rol'
      });
    }
    
    const oldRole = targetMembership.role;
    const normalizedOldRole = normalizeClanRole(oldRole);
    targetMembership.role = normalizedNewRole;
    targetMembership.promotedAt = new Date();
    await targetMembership.save();
    
    // Actualizar sublíderes si es necesario
    if (normalizedNewRole === CLAN_ROLES.CO_LEADER) {
      await Clan.findByIdAndUpdate(req.params.id, {
        $addToSet: { subLeaders: userId }
      });
    } else if (normalizedOldRole === CLAN_ROLES.CO_LEADER) {
      await Clan.findByIdAndUpdate(req.params.id, {
        $pull: { subLeaders: userId }
      });
    }
    
    // Agregar al feed
    await ClanFeed.memberPromoted(req.params.id, req.user.id, userId, normalizedOldRole, normalizedNewRole);
    
    res.json({
      message: 'Miembro promovido exitosamente',
      membership: targetMembership
    });
  } catch (error) {
    console.error('Error en POST /clans/:id/promote:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/clans/:id/kick
// @desc    Expulsar a un miembro
// @access  Private (requiere permisos de líder/sublíder)
router.post('/:id/kick', auth, isClanMember, canManageMembers, async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    // No puedes expulsar al líder
    const targetMembership = await ClanMembership.findOne({
      user: userId,
      clan: req.params.id,
      isActive: true
    });
    
    if (!targetMembership) {
      return res.status(404).json({ message: 'El usuario no es miembro del clan' });
    }
    
    if (targetMembership.role === CLAN_ROLES.LEADER) {
      return res.status(403).json({ message: 'No puedes expulsar al líder del clan' });
    }
    
    // No puedes expulsar a alguien de igual o mayor rango
    const targetLevel = ROLE_HIERARCHY[normalizeClanRole(targetMembership.role)] || 0;
    const userLevel = ROLE_HIERARCHY[normalizeClanRole(req.userRole)] || 0;
    
    if (targetLevel >= userLevel) {
      return res.status(403).json({
        message: 'No puedes expulsar a alguien de igual o mayor rango'
      });
    }
    
    // Desactivar membresía
    targetMembership.isActive = false;
    targetMembership.leftAt = new Date();
    targetMembership.leaveReason = 'kicked';
    targetMembership.notes = reason;
    await targetMembership.save();
    
    // Actualizar usuario
    await User.findByIdAndUpdate(userId, { clanId: null });
    
    // Agregar al feed
    await ClanFeed.memberLeft(req.params.id, userId, 'kicked');
    
    // Notificar al usuario expulsado
    const Notification = require('../models/Notification');
    await new Notification({
      user: userId,
      type: 'clan_kicked',
      title: 'Expulsado del clan',
      message: `Fuiste expulsado del clan${reason ? ': ' + reason : ''}`,
      data: { clanId: req.params.id }
    }).save();
    
    res.json({
      message: 'Miembro expulsado exitosamente'
    });
  } catch (error) {
    console.error('Error en POST /clans/:id/kick:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/clans/:id/stats
// @desc    Obtener estadísticas del clan
// @access  Public
router.get('/:id/stats', getClanStats, async (req, res) => {
  try {
    res.json(req.clanStats);
  } catch (error) {
    console.error('Error en GET /clans/:id/stats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
