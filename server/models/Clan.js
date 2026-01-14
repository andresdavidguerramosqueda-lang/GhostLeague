const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30,
    unique: true
  },
  tag: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 5,
    unique: true,
    match: /^[A-Z0-9]+$/
  },
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  motto: {
    type: String,
    maxlength: 100,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  banner: {
    type: String,
    default: ''
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
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  memberCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxMembers: {
    type: Number,
    default: 50,
    min: 10,
    max: 200
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subLeaders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  stats: {
    tournamentsWon: { type: Number, default: 0 },
    tournamentsPlayed: { type: Number, default: 0 },
    scrimsWon: { type: Number, default: 0 },
    scrimsPlayed: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 }
  },
  settings: {
    allowJoinRequests: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    minLevelToJoin: { type: Number, default: 1 },
    autoPromoteAfterDays: { type: Number, default: 0 }
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

// Índices para rendimiento
clanSchema.index({ name: 1 });
clanSchema.index({ tag: 1 });
clanSchema.index({ leader: 1 });
clanSchema.index({ createdBy: 1 });
clanSchema.index({ isActive: 1, isPublic: 1 });

// Virtual para experiencia necesaria para siguiente nivel
clanSchema.virtual('expToNextLevel').get(function() {
  return this.level * 1000 - this.experience;
});

// Virtual para progreso al siguiente nivel (0-100)
clanSchema.virtual('levelProgress').get(function() {
  const expForCurrentLevel = (this.level - 1) * 1000;
  const expNeeded = 1000;
  const progress = ((this.experience - expForCurrentLevel) / expNeeded) * 100;
  return Math.min(100, Math.max(0, progress));
});

// Middleware para actualizar updatedAt
clanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método estático para buscar clanes públicos
clanSchema.statics.findPublicClans = function(limit = 20, skip = 0) {
  return this.find({ isActive: true, isPublic: true })
    .select('name tag logo banner primaryColor secondaryColor level experience memberCount maxMembers')
    .sort({ level: -1, experience: -1 })
    .limit(limit)
    .skip(skip)
    .populate('leader', 'username avatar');
};

// Método para verificar si un usuario puede unirse
clanSchema.methods.canUserJoin = function(userLevel) {
  return this.isActive && 
         this.isPublic && 
         this.memberCount < this.maxMembers && 
         userLevel >= this.settings.minLevelToJoin &&
         this.settings.allowJoinRequests;
};

// Método para agregar experiencia
clanSchema.methods.addExperience = function(amount) {
  this.experience += amount;
  
  // Verificar si sube de nivel
  const expNeeded = this.level * 1000;
  if (this.experience >= expNeeded) {
    this.level += 1;
    this.experience -= expNeeded;
    return { levelUp: true, newLevel: this.level };
  }
  
  return { levelUp: false, newLevel: this.level };
};

module.exports = mongoose.model('Clan', clanSchema);
