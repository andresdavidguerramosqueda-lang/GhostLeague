const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  theme: {
    type: String,
    maxlength: 100
  },
  primaryColor: {
    type: String,
    default: '#6d28d9',
    match: /^#[0-9A-F]{6}$/i
  },
  secondaryColor: {
    type: String,
    default: '#a855f7',
    match: /^#[0-9A-F]{6}$/i
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'archived'],
    default: 'upcoming'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  resetDate: {
    type: Date
  },
  rewards: {
    rank1: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    rank2: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    rank3: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    rankTop10: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    rankTop100: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    participation: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  communityGoals: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    target: {
      type: Number,
      required: true
    },
    current: {
      type: Number,
      default: 0
    },
    reward: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    }
  }],
  statistics: {
    totalPlayers: { type: Number, default: 0 },
    activePlayers: { type: Number, default: 0 },
    totalTournaments: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 },
    averageLevel: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
seasonSchema.index({ number: 1 });
seasonSchema.index({ status: 1 });
seasonSchema.index({ startDate: 1, endDate: 1 });

// Virtual para duración en días
seasonSchema.virtual('durationDays').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual para días restantes
seasonSchema.virtual('daysRemaining').get(function() {
  if (this.status !== 'active') return 0;
  const now = new Date();
  return Math.max(0, Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24)));
});

// Virtual para progreso de la temporada (0-100)
seasonSchema.virtual('progress').get(function() {
  if (this.status !== 'active') return this.status === 'completed' ? 100 : 0;
  const now = new Date();
  const total = this.endDate - this.startDate;
  const elapsed = now - this.startDate;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
});

// Método estático para obtener temporada activa
seasonSchema.statics.getActiveSeason = function() {
  return this.findOne({ status: 'active' });
};

// Método estático para obtener temporada actual o próxima
seasonSchema.statics.getCurrentOrNext = function() {
  return this.findOne({
    $or: [
      { status: 'active' },
      { status: 'upcoming' }
    ]
  }).sort({ status: -1, number: 1 });
};

// Método estático para obtener historial de temporadas
seasonSchema.statics.getSeasonHistory = function(limit = 10, skip = 0) {
  return this.find({ status: { $in: ['completed', 'archived'] } })
    .sort({ number: -1 })
    .limit(limit)
    .skip(skip);
};

// Método para actualizar estadísticas
seasonSchema.methods.updateStatistics = async function() {
  const User = mongoose.model('User');
  const Tournament = mongoose.model('Tournament');
  
  // Estadísticas de jugadores
  const totalPlayers = await User.countDocuments();
  const activePlayers = await User.countDocuments({
    'competitive.lastCompetitiveAt': {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 días
    }
  });
  
  // Estadísticas de torneos
  const tournaments = await Tournament.find({
    status: 'completed',
    completedAt: {
      $gte: this.startDate,
      $lte: this.endDate
    }
  });
  
  const totalMatches = tournaments.reduce((sum, t) => sum + (t.participants?.length || 0), 0);
  
  // Nivel promedio
  const avgLevelResult = await User.aggregate([
    { $group: { _id: null, avgLevel: { $avg: '$competitive.level' } } }
  ]);
  
  this.statistics = {
    totalPlayers,
    activePlayers,
    totalTournaments: tournaments.length,
    totalMatches,
    averageLevel: avgLevelResult[0]?.avgLevel || 0
  };
  
  return this.save();
};

// Método para actualizar progreso de metas comunitarias
seasonSchema.methods.updateCommunityGoal = function(goalIndex, increment = 1) {
  if (this.communityGoals[goalIndex]) {
    this.communityGoals[goalIndex].current += increment;
    
    if (this.communityGoals[goalIndex].current >= this.communityGoals[goalIndex].target && 
        !this.communityGoals[goalIndex].isCompleted) {
      this.communityGoals[goalIndex].isCompleted = true;
      this.communityGoals[goalIndex].completedAt = new Date();
      
      // Notificar a todos los jugadores
      const Notification = mongoose.model('Notification');
      // Aquí se podría implementar una notificación masiva
    }
    
    this.markModified('communityGoals');
    return this.save();
  }
};

// Método para finalizar temporada
seasonSchema.methods.finalize = async function() {
  this.status = 'completed';
  this.resetDate = new Date();
  
  // Guardar historial de jugadores
  const User = mongoose.model('User');
  const topPlayers = await User.find()
    .sort({ 'competitive.points': -1 })
    .limit(100);
  
  const seasonHistory = topPlayers.map((player, index) => ({
    season: this.number,
    points: player.competitive.points,
    rank: index + 1,
    rewards: this.getPlayerRewards(index + 1)
  }));
  
  // Actualizar historial de cada jugador
  for (let i = 0; i < topPlayers.length; i++) {
    await User.findByIdAndUpdate(topPlayers[i]._id, {
      $push: { seasonHistory: seasonHistory[i] }
    });
  }
  
  await this.save();
  return seasonHistory;
};

// Método para obtener recompensas según rango
seasonSchema.methods.getPlayerRewards = function(rank) {
  if (rank === 1) return this.rewards.rank1;
  if (rank === 2) return this.rewards.rank2;
  if (rank === 3) return this.rewards.rank3;
  if (rank <= 10) return this.rewards.rankTop10;
  if (rank <= 100) return this.rewards.rankTop100;
  return this.rewards.participation;
};

// Middleware para actualizar updatedAt
seasonSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Season', seasonSchema);
