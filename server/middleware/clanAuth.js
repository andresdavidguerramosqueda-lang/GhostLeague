const { ClanMembership, CLAN_ROLES, ROLE_HIERARCHY } = require('../models/ClanMembership');

// Middleware para verificar si el usuario está en un clan
const isClanMember = async (req, res, next) => {
  try {
    const clanId = req.params.clanId || req.params.id;
    const userId = req.user.id;

    if (!clanId) {
      return res.status(400).json({
        message: 'ClanId requerido',
        error: 'MISSING_CLAN_ID'
      });
    }

    const membership = await ClanMembership.findOne({
      user: userId,
      clan: clanId,
      isActive: true
    }).populate('clan', 'name tag');

    if (!membership) {
      return res.status(403).json({
        message: 'No eres miembro de este clan',
        error: 'NOT_CLAN_MEMBER'
      });
    }

    req.clanMembership = membership;
    req.clan = membership.clan;
    req.userRole = membership.role;
    next();
  } catch (error) {
    console.error('Error en isClanMember:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Middleware para verificar rol específico en el clan
const hasClanRole = (requiredRole) => {
  return (req, res, next) => {
    const userRole = req.userRole;
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        message: `No tienes permisos. Se requiere rol: ${requiredRole}`,
        error: 'INSUFFICIENT_CLAN_ROLE'
      });
    }

    next();
  };
};

// Middleware para verificar si puede realizar una acción específica
const canPerformClanAction = (action) => {
  return (req, res, next) => {
    if (!req.clanMembership.canPerformAction(action)) {
      return res.status(403).json({
        message: 'No tienes permisos para realizar esta acción',
        error: 'ACTION_NOT_ALLOWED'
      });
    }
    next();
  };
};

// Middleware para verificar si es líder o sublíder
const isClanLeader = hasClanRole(CLAN_ROLES.LEADER);
const isClanCoLeader = hasClanRole(CLAN_ROLES.CO_LEADER);
const isClanSubLeader = isClanCoLeader;

// Middleware para verificar si es líder, sublíder o reclutador
const canManageMembers = hasClanRole(CLAN_ROLES.CO_LEADER);

const canInviteMembers = hasClanRole(CLAN_ROLES.VETERAN);

// Middleware para verificar si puede editar información del clan
const canEditClan = hasClanRole(CLAN_ROLES.LEADER);

// Middleware para verificar si es líder del clan
const isClanOwner = async (req, res, next) => {
  try {
    const clanId = req.params.clanId || req.params.id;
    const Clan = require('../models/Clan');
    
    const clan = await Clan.findById(clanId);
    if (!clan) {
      return res.status(404).json({ message: 'Clan no encontrado' });
    }

    if (clan.leader.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Solo el líder del clan puede realizar esta acción',
        error: 'NOT_CLAN_LEADER'
      });
    }

    req.clan = clan;
    next();
  } catch (error) {
    console.error('Error en isClanOwner:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Middleware para verificar si el usuario no está en otro clan
const isNotInClan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const membership = await ClanMembership.getActiveMembership(userId);
    if (membership) {
      return res.status(400).json({
        message: 'Ya eres miembro de un clan',
        error: 'ALREADY_IN_CLAN',
        clan: membership.clan
      });
    }

    next();
  } catch (error) {
    console.error('Error en isNotInClan:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Middleware para verificar si el clan está activo
const isClanActive = (req, res, next) => {
  if (!req.clan.isActive) {
    return res.status(400).json({
      message: 'Este clan está inactivo',
      error: 'CLAN_INACTIVE'
    });
  }
  next();
};

// Middleware para verificar si el clan acepta solicitudes
const clanAcceptsRequests = async (req, res, next) => {
  try {
    const clanId = req.params.clanId || req.params.id;
    const Clan = require('../models/Clan');
    
    const clan = await Clan.findById(clanId);
    if (!clan) {
      return res.status(404).json({ message: 'Clan no encontrado' });
    }

    if (!clan.settings.allowJoinRequests) {
      return res.status(400).json({
        message: 'Este clan no acepta solicitudes en este momento',
        error: 'REQUESTS_NOT_ALLOWED'
      });
    }

    if (!clan.isPublic) {
      return res.status(400).json({
        message: 'Este clan es privado y solo acepta invitaciones',
        error: 'CLAN_PRIVATE'
      });
    }

    req.clan = clan;
    next();
  } catch (error) {
    console.error('Error en clanAcceptsRequests:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Middleware para obtener estadísticas del clan
const getClanStats = async (req, res, next) => {
  try {
    const clanId = req.params.clanId || req.params.id;
    const Clan = require('../models/Clan');
    const Tournament = require('../models/Tournament');
    
    const clan = await Clan.findById(clanId);
    if (!clan) {
      return res.status(404).json({ message: 'Clan no encontrado' });
    }

    // Obtener estadísticas adicionales
    const members = await ClanMembership.getClanMembers(clanId);
    const activeMembers = members.filter(m => {
      const lastActive = m.contributions.lastActive;
      const daysSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
      return daysSinceActive <= 7; // Activos en los últimos 7 días
    });

    req.clanStats = {
      ...clan.stats,
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      averageLevel: members.reduce((sum, m) => sum + (m.user.level || 1), 0) / members.length
    };

    next();
  } catch (error) {
    console.error('Error en getClanStats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

module.exports = {
  isClanMember,
  hasClanRole,
  canPerformClanAction,
  isClanLeader,
  isClanSubLeader,
  canInviteMembers,
  canManageMembers,
  canEditClan,
  isClanOwner,
  isNotInClan,
  isClanActive,
  clanAcceptsRequests,
  getClanStats,
  CLAN_ROLES
};
