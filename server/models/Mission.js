const mongoose = require('mongoose');

// Tipos de misiones
const MISSION_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  SEASONAL: 'seasonal',
  SPECIAL: 'special'
};

// Estados de las misiones
const MISSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

const missionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: Object.values(MISSION_TYPES),
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 300
  },
  requirements: [{
    type: {
      type: String,
      required: true,
      enum: [
        'win_tournaments',
        'play_tournaments',
        'win_matches',
        'play_matches',
        'reach_level',
        'earn_points',
        'join_clan',
        'clan_activity',
        'invite_players',
        'social_share'
      ]
    },
    target: {
      type: Number,
      required: true,
      min: 1
    },
    game: {
      type: String,
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    }
  }],
  rewards: {
    experience: {
      type: Number,
      default: 0,
      min: 0
    },
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    items: [{
      type: {
        type: String,
        enum: ['banner', 'avatar_frame', 'title', 'badge', 'theme']
      },
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      }
    }],
    currency: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  status: {
    type: String,
    enum: Object.values(MISSION_STATUS),
    default: MISSION_STATUS.ACTIVE
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'new_players', 'veterans', 'clan_members'],
    default: 'all'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxCompletions: {
    type: Number,
    default: 1,
    min: 1
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mission'
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
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

// Esquema para el progreso de misiones de un usuario
const missionProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mission',
    required: true
  },
  progress: [{
    requirement: {
      type: String,
      required: true
    },
    current: {
      type: Number,
      default: 0,
      min: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    }
  }],
  status: {
    type: String,
    enum: Object.values(MISSION_STATUS),
    default: MISSION_STATUS.ACTIVE
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  completionCount: {
    type: Number,
    default: 0,
    min: 0
  },
  rewardsClaimed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para Mission
missionSchema.index({ type: 1, status: 1 });
missionSchema.index({ startDate: 1, endDate: 1 });
missionSchema.index({ isActive: 1, status: 1 });
missionSchema.index({ targetAudience: 1 });

// Índices para MissionProgress
missionProgressSchema.index({ user: 1, status: 1 });
missionProgressSchema.index({ mission: 1, user: 1 }, { unique: true });
missionProgressSchema.index({ user: 1, status: 1, type: 1 });

// Virtual para tiempo restante
missionSchema.virtual('timeRemaining').get(function() {
  if (this.status !== MISSION_STATUS.ACTIVE) return 0;
  const now = new Date();
  const diff = this.endDate - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))); // días restantes
});

// Virtual para dificultad total
missionSchema.virtual('totalDifficulty').get(function() {
  const difficulties = { easy: 1, medium: 2, hard: 3 };
  return this.requirements.reduce((sum, req) => sum + (difficulties[req.difficulty] || 2), 0);
});

// Virtual para progreso total del usuario
missionProgressSchema.virtual('totalProgress').get(function() {
  if (this.progress.length === 0) return 0;
  const completed = this.progress.filter(p => p.completed).length;
  return (completed / this.progress.length) * 100;
});

// Método estático para obtener misiones disponibles para un usuario
missionSchema.statics.getAvailableMissions = async function(userId, type = null) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  const query = {
    isActive: true,
    status: MISSION_STATUS.ACTIVE,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  };
  
  if (type) {
    query.type = type;
  }
  
  // Filtrar por audiencia objetivo
  const missions = await this.find(query);
  
  return missions.filter(mission => {
    if (mission.targetAudience === 'new_players' && user.competitive.level > 10) {
      return false;
    }
    if (mission.targetAudience === 'veterans' && user.competitive.level < 20) {
      return false;
    }
    if (mission.targetAudience === 'clan_members' && !user.clanId) {
      return false;
    }
    return true;
  });
};

// Método estático para obtener misiones activas de un usuario
missionProgressSchema.statics.getUserMissions = async function(userId, status = null) {
  const query = { user: userId };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate({
      path: 'mission',
      match: { isActive: true }
    })
    .sort({ createdAt: -1 });
};

// Método para actualizar progreso de una misión
missionProgressSchema.methods.updateProgress = async function(requirementType, increment = 1) {
  const progressItem = this.progress.find(p => p.requirement === requirementType);
  
  if (!progressItem || progressItem.completed) {
    return this;
  }
  
  progressItem.current += increment;
  
  // Verificar si se completó el requisito
  const mission = await mongoose.model('Mission').findById(this.mission);
  const requirement = mission.requirements.find(r => r.type === requirementType);
  
  if (progressItem.current >= requirement.target) {
    progressItem.completed = true;
    progressItem.completedAt = new Date();
    
    // Verificar si se completó toda la misión
    const allCompleted = this.progress.every(p => p.completed);
    if (allCompleted) {
      this.status = MISSION_STATUS.COMPLETED;
      this.completedAt = new Date();
      this.completionCount += 1;
      
      // Notificar al usuario
      const Notification = mongoose.model('Notification');
      await new Notification({
        user: this.user,
        type: 'mission_completed',
        title: 'Misión completada',
        message: `Has completado la misión: ${mission.title}`,
        data: {
          missionId: this.mission,
          rewards: mission.rewards
        }
      }).save();
    }
  }
  
  await this.save();
  return this;
};

// Método para reclamar recompensas
missionProgressSchema.methods.claimRewards = async function() {
  if (this.status !== MISSION_STATUS.COMPLETED || this.rewardsClaimed) {
    throw new Error('No puedes reclamar recompensas de esta misión');
  }
  
  const mission = await mongoose.model('Mission').findById(this.mission);
  const User = mongoose.model('User');
  
  // Dar recompensas al usuario
  const updateData = {};
  
  if (mission.rewards.experience > 0) {
    updateData['competitive.points'] = mission.rewards.experience;
  }
  
  if (mission.rewards.points > 0) {
    updateData['competitive.points'] = mission.rewards.points;
  }
  
  if (mission.rewards.items.length > 0) {
    updateData.$push = { inventory: { $each: mission.rewards.items } };
  }
  
  await User.findByIdAndUpdate(this.user, updateData);
  
  this.rewardsClaimed = true;
  await this.save();
  
  return mission.rewards;
};

// Método estático para crear misiones diarias
missionSchema.statics.generateDailyMissions = async function() {
  const dailyTemplates = [
    {
      title: 'Ganador del día',
      description: 'Gana 1 torneo',
      requirements: [{ type: 'win_tournaments', target: 1, difficulty: 'easy' }],
      rewards: { experience: 50, points: 25 }
    },
    {
      title: 'Participación activa',
      description: 'Juega 3 torneos',
      requirements: [{ type: 'play_tournaments', target: 3, difficulty: 'easy' }],
      rewards: { experience: 30, points: 15 }
    },
    {
      title: 'Reclutador',
      description: 'Invita a 1 amigo al juego',
      requirements: [{ type: 'invite_players', target: 1, difficulty: 'medium' }],
      rewards: { experience: 100, points: 50 }
    }
  ];
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const missions = [];
  for (const template of dailyTemplates) {
    const mission = new this({
      ...template,
      type: MISSION_TYPES.DAILY,
      startDate: today,
      endDate: tomorrow
    });
    await mission.save();
    missions.push(mission);
  }
  
  return missions;
};

// Middleware para actualizar updatedAt
missionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

missionProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = {
  Mission: mongoose.model('Mission', missionSchema),
  MissionProgress: mongoose.model('MissionProgress', missionProgressSchema),
  MISSION_TYPES,
  MISSION_STATUS
};
