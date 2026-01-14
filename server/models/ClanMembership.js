const mongoose = require('mongoose');

// Roles disponibles en el clan
const CLAN_ROLES = {
  LEADER: 'leader',
  CO_LEADER: 'coLeader',
  VETERAN: 'veteran',
  MEMBER: 'member'
};

const LEGACY_ROLE_MAP = {
  subLeader: CLAN_ROLES.CO_LEADER,
  recruiter: CLAN_ROLES.VETERAN,
  analyst: CLAN_ROLES.VETERAN,
  designer: CLAN_ROLES.VETERAN,
  coach: CLAN_ROLES.VETERAN,
  player: CLAN_ROLES.MEMBER
};

const normalizeClanRole = (role) => {
  const raw = typeof role === 'string' ? role : '';
  return LEGACY_ROLE_MAP[raw] || raw || CLAN_ROLES.MEMBER;
};

// Jerarquía de roles (mayor número = más poder)
const ROLE_HIERARCHY = {
  [CLAN_ROLES.MEMBER]: 1,
  [CLAN_ROLES.VETERAN]: 2,
  [CLAN_ROLES.CO_LEADER]: 3,
  [CLAN_ROLES.LEADER]: 4,
  player: 1,
  coach: 2,
  designer: 2,
  analyst: 2,
  recruiter: 2,
  subLeader: 3
};

const membershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  role: {
    type: String,
    enum: Object.values(CLAN_ROLES),
    default: CLAN_ROLES.MEMBER
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  promotedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  leftAt: {
    type: Date
  },
  leaveReason: {
    type: String,
    enum: ['voluntary', 'kicked', 'clan_disbanded'],
    default: 'voluntary'
  },
  contributions: {
    tournamentsWon: { type: Number, default: 0 },
    tournamentsPlayed: { type: Number, default: 0 },
    scrimsWon: { type: Number, default: 0 },
    scrimsPlayed: { type: Number, default: 0 },
    weeklyActivity: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para rendimiento
membershipSchema.index({ user: 1, isActive: 1 });
membershipSchema.index({ clan: 1, isActive: 1 });
membershipSchema.index({ clan: 1, role: 1, isActive: 1 });
membershipSchema.index({ user: 1, clan: 1 }, { unique: true });

// Virtual para días en el clan
membershipSchema.virtual('daysInClan').get(function() {
  const end = this.leftAt || new Date();
  return Math.floor((end - this.joinedAt) / (1000 * 60 * 60 * 24));
});

membershipSchema.pre('validate', function(next) {
  this.role = normalizeClanRole(this.role);
  next();
});

// Método estático para verificar si un usuario está en un clan
membershipSchema.statics.isUserInClan = async function(userId, clanId) {
  const membership = await this.findOne({
    user: userId,
    clan: clanId,
    isActive: true
  });
  return !!membership;
};

// Método estático para obtener membresía activa de un usuario
membershipSchema.statics.getActiveMembership = async function(userId) {
  return this.findOne({
    user: userId,
    isActive: true
  }).populate('clan', 'name tag logo banner primaryColor secondaryColor');
};

// Método estático para obtener miembros de un clan con roles
membershipSchema.statics.getClanMembers = async function(clanId, includeInactive = false) {
  const query = { clan: clanId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  const members = await this.find(query)
    .populate('user', 'username avatar level competitive.points')
    .sort({ joinedAt: 1 });

  return members.sort((a, b) => {
    const aLevel = ROLE_HIERARCHY[normalizeClanRole(a?.role)] || 0;
    const bLevel = ROLE_HIERARCHY[normalizeClanRole(b?.role)] || 0;
    if (aLevel !== bLevel) return bLevel - aLevel;

    const aJoined = a?.joinedAt ? a.joinedAt.getTime() : 0;
    const bJoined = b?.joinedAt ? b.joinedAt.getTime() : 0;
    return aJoined - bJoined;
  });
};

// Método para verificar si un miembro puede realizar una acción
membershipSchema.methods.canPerformAction = function(action) {
  const role = normalizeClanRole(this.role);
  const permissions = {
    [CLAN_ROLES.LEADER]: ['*'], // Puede hacer todo
    [CLAN_ROLES.CO_LEADER]: [
      'invite_members',
      'kick_members',
      'promote_members',
      'manage_tournaments'
    ],
    [CLAN_ROLES.VETERAN]: ['invite_members'],
    [CLAN_ROLES.MEMBER]: ['view_clan_info', 'participate']
  };

  const userPermissions = permissions[role] || [];
  return userPermissions.includes('*') || userPermissions.includes(action);
};

// Método para verificar si puede promover a un rol específico
membershipSchema.methods.canPromoteTo = function(targetRole) {
  const currentLevel = ROLE_HIERARCHY[normalizeClanRole(this.role)] || 0;
  const targetLevel = ROLE_HIERARCHY[normalizeClanRole(targetRole)] || 0;
  
  // No puede promover a roles iguales o superiores
  if (targetLevel >= currentLevel) {
    return false;
  }
  
  // Solo líderes y sublíderes pueden promover
  const role = normalizeClanRole(this.role);
  return [CLAN_ROLES.LEADER, CLAN_ROLES.CO_LEADER].includes(role);
};

// Método para actualizar actividad
membershipSchema.methods.updateActivity = function() {
  this.contributions.weeklyActivity += 1;
  this.contributions.lastActive = new Date();
  return this.save();
};

// Middleware para actualizar contador de miembros en el clan
membershipSchema.pre('save', function(next) {
  this._shouldUpdateMemberCount = this.isNew || this.isModified('isActive');
  next();
});

membershipSchema.post('save', async function(doc) {
  if (!doc._shouldUpdateMemberCount) return;

  const Clan = mongoose.model('Clan');
  const count = await mongoose.model('ClanMembership').countDocuments({
    clan: doc.clan,
    isActive: true
  });

  await Clan.findByIdAndUpdate(doc.clan, { memberCount: count });
});

 membershipSchema.pre('findOneAndUpdate', function(next) {
   const update = this.getUpdate() || {};
   const $set = update.$set || {};
   const $unset = update.$unset || {};
   const $setOnInsert = update.$setOnInsert || {};

   this._shouldUpdateMemberCount =
     Object.prototype.hasOwnProperty.call(update, 'isActive') ||
     Object.prototype.hasOwnProperty.call($set, 'isActive') ||
     Object.prototype.hasOwnProperty.call($unset, 'isActive') ||
     Object.prototype.hasOwnProperty.call($setOnInsert, 'isActive');

   next();
 });

membershipSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  if (!this._shouldUpdateMemberCount) return;

  const Clan = mongoose.model('Clan');
  const count = await mongoose.model('ClanMembership').countDocuments({
    clan: doc.clan,
    isActive: true
  });
  await Clan.findByIdAndUpdate(doc.clan, {
    memberCount: count
  });
});

// Exportar constantes y modelo
module.exports = {
  ClanMembership: mongoose.model('ClanMembership', membershipSchema),
  CLAN_ROLES,
  ROLE_HIERARCHY,
  normalizeClanRole
};
