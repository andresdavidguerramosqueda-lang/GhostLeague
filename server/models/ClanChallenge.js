const mongoose = require('mongoose');

// Estados de los desafíos
const CHALLENGE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Tipos de desafíos
const CHALLENGE_TYPES = {
  SCRIM: 'scrim',
  BEST_OF_3: 'best_of_3',
  BEST_OF_5: 'best_of_5',
  RANKED_MATCH: 'ranked_match',
  CUSTOM: 'custom'
};

const challengeSchema = new mongoose.Schema({
  challenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  challenged: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(CHALLENGE_TYPES),
    default: CHALLENGE_TYPES.SCRIM
  },
  status: {
    type: String,
    enum: Object.values(CHALLENGE_STATUS),
    default: CHALLENGE_STATUS.PENDING
  },
  proposedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  scheduledAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 días
  },
  rules: {
    gameMode: { type: String, required: true },
    map: { type: String },
    teamSize: { type: Number, default: 5 },
    bestOf: { type: Number, default: 1 },
    customRules: { type: String, maxlength: 1000 }
  },
  score: {
    challenger: { type: Number, default: 0 },
    challenged: { type: Number, default: 0 }
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan'
  },
  rewards: {
    experience: { type: Number, default: 100 },
    braggingRights: { type: Boolean, default: true }
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

// Índices
challengeSchema.index({ challenger: 1, status: 1 });
challengeSchema.index({ challenged: 1, status: 1 });
challengeSchema.index({ status: 1, createdAt: -1 });
challengeSchema.index({ expiresAt: 1 });

// Virtual para tiempo restante
challengeSchema.virtual('timeRemaining').get(function() {
  if (this.status !== CHALLENGE_STATUS.PENDING) return 0;
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60))); // horas restantes
});

// Método estático para crear desafío
challengeSchema.statics.createChallenge = async function(data) {
  // Verificar que no exista un desafío activo entre estos clanes
  const existing = await this.findOne({
    $or: [
      { challenger: data.challenger, challenged: data.challenged },
      { challenger: data.challenged, challenged: data.challenger }
    ],
    status: { $in: [CHALLENGE_STATUS.PENDING, CHALLENGE_STATUS.ACCEPTED, CHALLENGE_STATUS.IN_PROGRESS] }
  });
  
  if (existing) {
    throw new Error('Ya existe un desafío activo entre estos clanes');
  }
  
  const challenge = new this(data);
  await challenge.save();
  
  // Poblar para retorno
  await challenge.populate(['challenger', 'challenged', 'proposedBy']);
  
  // Agregar al feed de ambos clanes
  const { ClanFeed } = require('./ClanFeed');
  await ClanFeed.createEntry({
    clan: data.challenger,
    type: 'challenge_created',
    actor: data.proposedBy,
    metadata: {
      challengedClan: data.challenged,
      challengeId: challenge._id,
      message: `Desafió al clan`
    }
  });
  
  return challenge;
};

// Método para aceptar desafío
challengeSchema.methods.accept = async function(userId) {
  if (this.status !== CHALLENGE_STATUS.PENDING) {
    throw new Error('Este desafío ya no puede ser aceptado');
  }
  
  this.status = CHALLENGE_STATUS.ACCEPTED;
  this.acceptedBy = userId;
  this.scheduledAt = new Date();
  
  await this.save();
  
  // Notificar al clan desafiante
  const Notification = mongoose.model('Notification');
  await new Notification({
    user: this.proposedBy,
    type: 'challenge_accepted',
    title: 'Desafío aceptado',
    message: `El clan aceptó tu desafío`,
    data: {
      challengeId: this._id,
      clanId: this.challenged
    }
  }).save();
  
  // Agregar al feed
  const { ClanFeed } = require('./ClanFeed');
  await ClanFeed.createEntry({
    clan: this.challenged,
    type: 'challenge_accepted',
    actor: userId,
    metadata: {
      challengerClan: this.challenger,
      challengeId: this._id,
      message: `Aceptó el desafío del clan`
    }
  });
  
  return this;
};

// Método para completar desafío
challengeSchema.methods.complete = async function(winnerId, finalScore) {
  if (this.status !== CHALLENGE_STATUS.IN_PROGRESS) {
    throw new Error('Este desafío no está en progreso');
  }
  
  this.status = CHALLENGE_STATUS.COMPLETED;
  this.completedAt = new Date();
  this.winner = winnerId;
  this.score = finalScore;
  
  await this.save();
  
  // Dar recompensas al clan ganador
  const Clan = mongoose.model('Clan');
  const winnerClan = await Clan.findById(winnerId);
  
  if (winnerClan) {
    const result = winnerClan.addExperience(this.rewards.experience);
    await winnerClan.save();
    
    // Si subió de nivel, agregar al feed
    if (result.levelUp) {
      const { ClanFeed } = require('./ClanFeed');
      await ClanFeed.clanLevelUp(winnerId, result.newLevel);
    }
  }
  
  // Agregar al feed de ambos clanes
  const { ClanFeed } = require('./ClanFeed');
  await ClanFeed.createEntry({
    clan: this.challenger,
    type: 'challenge_completed',
    actor: null,
    metadata: {
      winner: winnerId,
      score: finalScore,
      message: winnerId.toString() === this.challenger.toString() ? 
        'Ganó el desafío' : 'Perdió el desafío'
    },
    isImportant: true
  });
  
  await ClanFeed.createEntry({
    clan: this.challenged,
    type: 'challenge_completed',
    actor: null,
    metadata: {
      winner: winnerId,
      score: finalScore,
      message: winnerId.toString() === this.challenged.toString() ? 
        'Ganó el desafío' : 'Perdió el desafío'
    },
    isImportant: true
  });
  
  return this;
};

// Método estático para obtener desafíos de un clan
challengeSchema.statics.getClanChallenges = async function(clanId, status) {
  const query = {
    $or: [
      { challenger: clanId },
      { challenged: clanId }
    ]
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('challenger', 'name tag logo')
    .populate('challenged', 'name tag logo')
    .populate('proposedBy', 'username')
    .populate('acceptedBy', 'username')
    .sort({ createdAt: -1 });
};

// Middleware para limpiar desafíos expirados
challengeSchema.pre('save', function(next) {
  if (this.expiresAt < new Date() && this.status === CHALLENGE_STATUS.PENDING) {
    this.status = CHALLENGE_STATUS.EXPIRED;
  }
  next();
});

module.exports = {
  ClanChallenge: mongoose.model('ClanChallenge', challengeSchema),
  CHALLENGE_STATUS,
  CHALLENGE_TYPES
};
