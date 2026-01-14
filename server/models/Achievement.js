const mongoose = require('mongoose');

// Categorías de logros
const ACHIEVEMENT_CATEGORIES = {
  TOURNAMENTS: 'tournaments',
  COMPETITIVE: 'competitive',
  SOCIAL: 'social',
  CLAN: 'clan',
  SEASONAL: 'seasonal',
  SPECIAL: 'special'
};

// Dificultades de logros
const ACHIEVEMENT_DIFFICULTY = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  DIAMOND: 'diamond',
  MASTER: 'master'
};

const achievementSchema = new mongoose.Schema({
  name: {
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
  category: {
    type: String,
    enum: Object.values(ACHIEVEMENT_CATEGORIES),
    required: true
  },
  difficulty: {
    type: String,
    enum: Object.values(ACHIEVEMENT_DIFFICULTY),
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  badgeColor: {
    type: String,
    default: '#6d28d9'
  },
  requirements: [{
    type: {
      type: String,
      required: true,
      enum: [
        'first_tournament_win',
        'tournament_wins_count',
        'reach_level',
        'reach_points',
        'win_streak',
        'participation_streak',
        'perfect_tournament',
        'comeback_victory',
        'domination_win',
        'clan_founder',
        'clan_leader_duration',
        'recruit_members',
        'social_shares',
        'helpful_player',
        'season_top_rank',
        'all_games_master'
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
    timeframe: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'all_time'],
      default: 'all_time'
    }
  }],
  rewards: {
    title: {
      type: String,
      trim: true
    },
    banner: {
      type: String
    },
    avatarFrame: {
      type: String
    },
    badge: {
      type: String
    },
    experience: {
      type: Number,
      default: 0,
      min: 0
    },
    points: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  isRepeatable: {
    type: Boolean,
    default: false
  },
  maxCompletions: {
    type: Number,
    default: 1,
    min: 1
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  sortOrder: {
    type: Number,
    default: 0
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

// Esquema para el progreso de logros de un usuario
const achievementProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
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
    enum: ['in_progress', 'completed', 'expired'],
    default: 'in_progress'
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
  },
  lastProgressUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para Achievement
achievementSchema.index({ category: 1, difficulty: 1 });
achievementSchema.index({ isActive: 1 });
achievementSchema.index({ isHidden: 1 });
achievementSchema.index({ sortOrder: 1 });

// Índices para AchievementProgress
achievementProgressSchema.index({ user: 1, status: 1 });
achievementProgressSchema.index({ achievement: 1, user: 1 }, { unique: true });
achievementProgressSchema.index({ user: 1, 'achievement.category': 1 });

// Virtual para progreso total
achievementProgressSchema.virtual('totalProgress').get(function() {
  if (this.progress.length === 0) return 0;
  const completed = this.progress.filter(p => p.completed).length;
  return (completed / this.progress.length) * 100;
});

// Virtual para puntos de dificultad
achievementSchema.virtual('difficultyPoints').get(function() {
  const points = {
    [ACHIEVEMENT_DIFFICULTY.BRONZE]: 10,
    [ACHIEVEMENT_DIFFICULTY.SILVER]: 25,
    [ACHIEVEMENT_DIFFICULTY.GOLD]: 50,
    [ACHIEVEMENT_DIFFICULTY.DIAMOND]: 100,
    [ACHIEVEMENT_DIFFICULTY.MASTER]: 200
  };
  return points[this.difficulty] || 0;
});

// Método estático para obtener logros disponibles
achievementSchema.statics.getAvailableAchievements = async function(userId = null) {
  const query = { isActive: true };
  
  // Si se proporciona userId, filtrar logros ocultos no desbloqueados
  if (userId) {
    const unlockedAchievements = await mongoose.model('AchievementProgress')
      .find({ user: userId, status: 'completed' })
      .distinct('achievement');
    
    query.$or = [
      { isHidden: false },
      { _id: { $in: unlockedAchievements } }
    ];
  }
  
  return this.find(query)
    .sort({ category: 1, difficulty: 1, sortOrder: 1 });
};

// Método estático para obtener logros de un usuario
achievementProgressSchema.statics.getUserAchievements = async function(userId, category = null) {
  const query = { user: userId };
  
  return this.find(query)
    .populate({
      path: 'achievement',
      match: category ? { category } : {}
    })
    .sort({ 'achievement.category': 1, 'achievement.difficulty': 1 });
};

// Método estático para obtener estadísticas de logros de un usuario
achievementProgressSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'achievements',
        localField: 'achievement',
        foreignField: '_id',
        as: 'achievement'
      }
    },
    { $unwind: '$achievement' },
    {
      $group: {
        _id: '$achievement.category',
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        points: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              '$achievement.difficultyPoints',
              0
            ]
          }
        }
      }
    }
  ]);
  
  const totalStats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'achievements',
        localField: 'achievement',
        foreignField: '_id',
        as: 'achievement'
      }
    },
    { $unwind: '$achievement' },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalPoints: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              '$achievement.difficultyPoints',
              0
            ]
          }
        }
      }
    }
  ]);
  
  return {
    byCategory: stats,
    total: totalStats[0] || { total: 0, completed: 0, totalPoints: 0 }
  };
};

// Método para actualizar progreso de un logro
achievementProgressSchema.methods.updateProgress = async function(requirementType, increment = 1) {
  const progressItem = this.progress.find(p => p.requirement === requirementType);
  
  if (!progressItem || progressItem.completed) {
    return this;
  }
  
  progressItem.current += increment;
  this.lastProgressUpdate = new Date();
  
  // Verificar si se completó el requisito
  const achievement = await mongoose.model('Achievement').findById(this.achievement);
  const requirement = achievement.requirements.find(r => r.type === requirementType);
  
  if (progressItem.current >= requirement.target) {
    progressItem.completed = true;
    progressItem.completedAt = new Date();
    
    // Verificar si se completó todo el logro
    const allCompleted = this.progress.every(p => p.completed);
    if (allCompleted) {
      this.status = 'completed';
      this.completedAt = new Date();
      this.completionCount += 1;
      
      // Notificar al usuario
      const Notification = mongoose.model('Notification');
      await new Notification({
        user: this.user,
        type: 'achievement_unlocked',
        title: '¡Logro desbloqueado!',
        message: `Has desbloqueado: ${achievement.name}`,
        data: {
          achievementId: this.achievement,
          difficulty: achievement.difficulty,
          rewards: achievement.rewards
        }
      }).save();
      
      // Agregar al perfil del usuario
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(this.user, {
        $push: {
          achievements: {
            type: achievement.name,
            unlockedAt: new Date(),
            data: {
              difficulty: achievement.difficulty,
              category: achievement.category
            }
          }
        }
      });
    }
  }
  
  await this.save();
  return this;
};

// Método para verificar logros basados en eventos del juego
achievementProgressSchema.statics.checkAchievements = async function(userId, eventType, data = {}) {
  const User = mongoose.model('User');
  const Achievement = mongoose.model('Achievement');
  
  // Obtener logros activos del usuario
  const userAchievements = await this.find({
    user: userId,
    status: 'in_progress'
  }).populate('achievement');
  
  for (const userAchievement of userAchievements) {
    const achievement = userAchievement.achievement;
    
    // Verificar si el logro tiene un requisito que coincide con el evento
    const matchingRequirements = achievement.requirements.filter(
      req => req.type === eventType
    );
    
    for (const requirement of matchingRequirements) {
      let increment = 0;
      
      // Calcular incremento según el tipo de evento
      switch (eventType) {
        case 'first_tournament_win':
          if (data.isFirstWin) increment = 1;
          break;
        case 'tournament_wins_count':
          increment = 1;
          break;
        case 'reach_level':
          if (data.level >= requirement.target) increment = requirement.target;
          break;
        case 'reach_points':
          if (data.points >= requirement.target) increment = requirement.target;
          break;
        case 'win_streak':
          increment = data.streakLength || 0;
          break;
        case 'participation_streak':
          increment = data.streakLength || 0;
          break;
        case 'perfect_tournament':
          if (data.isPerfect) increment = 1;
          break;
        case 'comeback_victory':
          if (data.isComeback) increment = 1;
          break;
        case 'domination_win':
          if (data.isDomination) increment = 1;
          break;
        case 'clan_founder':
          if (data.isFounder) increment = 1;
          break;
        case 'recruit_members':
          increment = data.recruitsCount || 0;
          break;
        case 'social_shares':
          increment = 1;
          break;
        case 'season_top_rank':
          if (data.rank <= requirement.target) increment = 1;
          break;
      }
      
      if (increment > 0) {
        await userAchievement.updateProgress(requirement.type, increment);
      }
    }
  }
};

// Método estático para crear logros predefinidos
achievementSchema.statics.createDefaultAchievements = async function() {
  const defaultAchievements = [
    // Torneos
    {
      name: 'Primera Victoria',
      description: 'Gana tu primer torneo',
      category: ACHIEVEMENT_CATEGORIES.TOURNAMENTS,
      difficulty: ACHIEVEMENT_DIFFICULTY.BRONZE,
      icon: 'trophy',
      requirements: [{ type: 'first_tournament_win', target: 1 }],
      rewards: { title: 'Campeón Novato', experience: 50 }
    },
    {
      name: 'Dominador',
      description: 'Gana 10 torneos',
      category: ACHIEVEMENT_CATEGORIES.TOURNAMENTS,
      difficulty: ACHIEVEMENT_DIFFICULTY.SILVER,
      icon: 'military_tech',
      requirements: [{ type: 'tournament_wins_count', target: 10 }],
      rewards: { title: 'Dominador', experience: 200 }
    },
    {
      name: 'Leyenda',
      description: 'Gana 100 torneos',
      category: ACHIEVEMENT_CATEGORIES.TOURNAMENTS,
      difficulty: ACHIEVEMENT_DIFFICULTY.GOLD,
      icon: 'emoji_events',
      requirements: [{ type: 'tournament_wins_count', target: 100 }],
      rewards: { title: 'Leyenda', banner: 'legend_banner', experience: 1000 }
    },
    // Competitivo
    {
      name: 'Ascenso',
      description: 'Alcanza el nivel 10',
      category: ACHIEVEMENT_CATEGORIES.COMPETITIVE,
      difficulty: ACHIEVEMENT_DIFFICULTY.BRONZE,
      icon: 'trending_up',
      requirements: [{ type: 'reach_level', target: 10 }],
      rewards: { experience: 100 }
    },
    {
      name: 'Élite',
      description: 'Alcanza el nivel 50',
      category: ACHIEVEMENT_CATEGORIES.COMPETITIVE,
      difficulty: ACHIEVEMENT_DIFFICULTY.SILVER,
      icon: 'stars',
      requirements: [{ type: 'reach_level', target: 50 }],
      rewards: { title: 'Élite', experience: 500 }
    },
    {
      name: 'Maestro',
      description: 'Alcanza el nivel 100',
      category: ACHIEVEMENT_CATEGORIES.COMPETITIVE,
      difficulty: ACHIEVEMENT_DIFFICULTY.GOLD,
      icon: 'workspace_premium',
      requirements: [{ type: 'reach_level', target: 100 }],
      rewards: { title: 'Maestro', avatarFrame: 'master_frame', experience: 1500 }
    },
    // Clan
    {
      name: 'Fundador',
      description: 'Crea tu propio clan',
      category: ACHIEVEMENT_CATEGORIES.CLAN,
      difficulty: ACHIEVEMENT_DIFFICULTY.BRONZE,
      icon: 'group_add',
      requirements: [{ type: 'clan_founder', target: 1 }],
      rewards: { experience: 100 }
    },
    {
      name: 'Liderazgo',
      description: 'Recluta 10 miembros a tu clan',
      category: ACHIEVEMENT_CATEGORIES.CLAN,
      difficulty: ACHIEVEMENT_DIFFICULTY.SILVER,
      icon: 'person_add',
      requirements: [{ type: 'recruit_members', target: 10 }],
      rewards: { experience: 300 }
    }
  ];
  
  const achievements = [];
  for (const template of defaultAchievements) {
    const achievement = new this(template);
    await achievement.save();
    achievements.push(achievement);
  }
  
  return achievements;
};

// Middleware para actualizar updatedAt
achievementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

achievementProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = {
  Achievement: mongoose.model('Achievement', achievementSchema),
  AchievementProgress: mongoose.model('AchievementProgress', achievementProgressSchema),
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_DIFFICULTY
};
