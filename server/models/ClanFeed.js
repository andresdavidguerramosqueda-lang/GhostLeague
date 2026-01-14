const mongoose = require('mongoose');
const { CLAN_ROLES, normalizeClanRole } = require('./ClanMembership');

// Tipos de eventos del feed
const FEED_TYPES = {
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  MEMBER_KICKED: 'member_kicked',
  MEMBER_PROMOTED: 'member_promoted',
  MEMBER_DEMOTED: 'member_demoted',
  CLAN_CREATED: 'clan_created',
  CLAN_LEVEL_UP: 'clan_level_up',
  TOURNAMENT_WON: 'tournament_won',
  TOURNAMENT_STARTED: 'tournament_started',
  SCRIM_WON: 'scrim_won',
  SCRIM_LOST: 'scrim_lost',
  CHALLENGE_CREATED: 'challenge_created',
  CHALLENGE_ACCEPTED: 'challenge_accepted',
  CHALLENGE_COMPLETED: 'challenge_completed',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  ANNOUNCEMENT: 'announcement'
};

const feedSchema = new mongoose.Schema({
  clan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(FEED_TYPES),
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    // Datos adicionales según el tipo de evento
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    tournamentName: { type: String },
    oldRole: { type: String },
    newRole: { type: String },
    level: { type: Number },
    achievement: { type: String },
    message: { type: String },
    scrimOpponent: { type: String },
    scrimScore: { type: String },
    challengeDetails: { type: mongoose.Schema.Types.Mixed }
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para rendimiento
feedSchema.index({ clan: 1, createdAt: -1 });
feedSchema.index({ clan: 1, isPinned: -1, createdAt: -1 });
feedSchema.index({ clan: 1, type: 1, createdAt: -1 });
feedSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Método estático para crear entradas del feed
feedSchema.statics.createEntry = async function(data) {
  const entry = new this(data);
  await entry.save();
  
  // Poblar para retorno
  await entry.populate('actor', 'username avatar');
  if (entry.target) {
    await entry.populate('target', 'username avatar');
  }
  
  return entry;
};

// Método estático para obtener feed del clan
feedSchema.statics.getClanFeed = async function(clanId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    type,
    includePinned = true
  } = options;
  
  const query = { clan: clanId };
  
  if (type) {
    query.type = type;
  }
  
  let sort = { createdAt: -1 };
  if (includePinned) {
    sort = { isPinned: -1, createdAt: -1 };
  }
  
  return this.find(query)
    .populate('actor', 'username avatar')
    .populate('target', 'username avatar')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Métodos estáticos para eventos comunes
feedSchema.statics.memberJoined = function(clanId, userId) {
  return this.createEntry({
    clan: clanId,
    type: FEED_TYPES.MEMBER_JOINED,
    actor: userId,
    metadata: {
      message: 'Se unió al clan'
    }
  });
};

feedSchema.statics.memberLeft = function(clanId, userId, reason = 'voluntary') {
  return this.createEntry({
    clan: clanId,
    type: FEED_TYPES.MEMBER_LEFT,
    actor: userId,
    metadata: {
      message: reason === 'kicked' ? 'Fue expulsado del clan' : 'Abandonó el clan'
    },
    isImportant: reason === 'kicked'
  });
};

feedSchema.statics.memberPromoted = function(clanId, actorId, targetId, oldRole, newRole) {
  const normalizedOldRole = normalizeClanRole(oldRole);
  const normalizedNewRole = normalizeClanRole(newRole);

  return this.createEntry({
    clan: clanId,
    type: FEED_TYPES.MEMBER_PROMOTED,
    actor: actorId,
    target: targetId,
    metadata: {
      oldRole: normalizedOldRole,
      newRole: normalizedNewRole,
      message: `Fue ascendido de ${normalizedOldRole} a ${normalizedNewRole}`
    },
    isImportant: [CLAN_ROLES.CO_LEADER, CLAN_ROLES.LEADER].includes(normalizedNewRole)
  });
};

feedSchema.statics.tournamentWon = function(clanId, userId, tournamentId, tournamentName) {
  return this.createEntry({
    clan: clanId,
    type: FEED_TYPES.TOURNAMENT_WON,
    actor: userId,
    metadata: {
      tournamentId,
      tournamentName,
      message: `Ganó el torneo "${tournamentName}"`
    },
    isImportant: true
  });
};

feedSchema.statics.clanLevelUp = function(clanId, newLevel) {
  return this.createEntry({
    clan: clanId,
    type: FEED_TYPES.CLAN_LEVEL_UP,
    actor: null, // Evento del sistema
    metadata: {
      level: newLevel,
      message: `El clan alcanzó el nivel ${newLevel}`
    },
    isImportant: true,
    isPinned: true
  });
};

feedSchema.statics.createAnnouncement = function(clanId, userId, message, isImportant = false) {
  return this.createEntry({
    clan: clanId,
    type: FEED_TYPES.ANNOUNCEMENT,
    actor: userId,
    metadata: {
      message
    },
    isImportant,
    isPinned: isImportant
  });
};

feedSchema.statics.clanCreated = function(clanId, userId) {
  return this.createEntry({
    clan: clanId,
    type: FEED_TYPES.CLAN_CREATED,
    actor: userId,
    metadata: {
      message: 'Creó el clan'
    },
    isImportant: true,
    isPinned: true
  });
};

// Virtual para formato de tiempo relativo
feedSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
  return `hace ${days} día${days > 1 ? 's' : ''}`;
});

// Middleware para limpiar entradas viejas
feedSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = {
  ClanFeed: mongoose.model('ClanFeed', feedSchema),
  FEED_TYPES
};
