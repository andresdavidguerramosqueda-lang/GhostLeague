const mongoose = require('mongoose');
const { CLAN_ROLES, normalizeClanRole } = require('./ClanMembership');

// Estados de las invitaciones
const INVITE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

const inviteSchema = new mongoose.Schema({
  clan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['invite', 'request'], // invite: clan invita usuario | request: usuario solicita unirse
    default: 'invite'
  },
  status: {
    type: String,
    enum: Object.values(INVITE_STATUS),
    default: INVITE_STATUS.PENDING
  },
  message: {
    type: String,
    maxlength: 500,
    default: ''
  },
  role: {
    type: String,
    enum: Object.values(CLAN_ROLES),
    default: CLAN_ROLES.MEMBER
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
  },
  respondedAt: {
    type: Date
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos
inviteSchema.index({ clan: 1, status: 1 });
inviteSchema.index({ to: 1, status: 1 });
inviteSchema.index({ from: 1, status: 1 });
inviteSchema.index(
  { clan: 1, to: 1 },
  { unique: true, partialFilterExpression: { status: INVITE_STATUS.PENDING, type: 'invite' } }
);
inviteSchema.index(
  { clan: 1, from: 1 },
  { unique: true, partialFilterExpression: { status: INVITE_STATUS.PENDING, type: 'request' } }
);
inviteSchema.index({ expiresAt: 1 });

// Virtual para tiempo restante
inviteSchema.virtual('timeRemaining').get(function() {
  if (this.status !== INVITE_STATUS.PENDING) return 0;
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))); // días restantes
});

inviteSchema.pre('validate', function(next) {
  this.role = normalizeClanRole(this.role);
  next();
});

// Método estático para crear invitación
inviteSchema.statics.createInvite = async function(data) {
  // Verificar si ya existe una invitación pendiente
  const existing = await this.findOne({
    clan: data.clan,
    to: data.to,
    type: 'invite',
    status: INVITE_STATUS.PENDING
  });
  
  if (existing) {
    throw new Error('Ya existe una invitación pendiente para este usuario');
  }
  
  const invite = new this(data);
  await invite.save();
  
  // Poblar para retorno
  await invite.populate(['from', 'to', 'clan']);
  
  return invite;
};

// Método estático para obtener invitaciones de un usuario
inviteSchema.statics.getUserInvites = async function(userId, type = 'received') {
  const query = { status: INVITE_STATUS.PENDING };
  
  if (type === 'received') {
    query.to = userId;
  } else {
    query.from = userId;
  }
  
  return this.find(query)
    .populate('clan', 'name tag logo banner primaryColor secondaryColor level')
    .populate('from', 'username avatar')
    .populate('to', 'username avatar')
    .sort({ createdAt: -1 });
};

// Método estático para obtener solicitudes de un clan
inviteSchema.statics.getClanRequests = async function(clanId) {
  return this.find({
    clan: clanId,
    type: 'request',
    status: INVITE_STATUS.PENDING
  })
  .populate('from', 'username avatar level competitive.points')
  .sort({ createdAt: -1 });
};

// Método para aceptar invitación
inviteSchema.methods.accept = async function(userId) {
  if (this.status !== INVITE_STATUS.PENDING) {
    throw new Error('Esta invitación ya no está activa');
  }
  
  if (this.to.toString() !== userId.toString()) {
    throw new Error('No puedes aceptar esta invitación');
  }
  
  this.status = INVITE_STATUS.ACCEPTED;
  this.respondedAt = new Date();
  this.respondedBy = userId;
  
  await this.save();
  
  // Crear membresía en el clan
  const { ClanMembership } = require('./ClanMembership');
  const membership = new ClanMembership({
    user: this.to,
    clan: this.clan,
    role: normalizeClanRole(this.role)
  });
  
  await membership.save();
  
  // Agregar al feed del clan
  const { ClanFeed } = require('./ClanFeed');
  await ClanFeed.memberJoined(this.clan, this.to);
  
  // Crear notificación
  const Notification = mongoose.model('Notification');
  await new Notification({
    user: this.from,
    type: 'clan_invite_accepted',
    title: 'Invitación aceptada',
    message: `${this.to.username} aceptó tu invitación al clan`,
    data: {
      clanId: this.clan,
      userId: this.to
    }
  }).save();
  
  return membership;
};

// Método para declinar invitación
inviteSchema.methods.decline = async function(userId, reason = '') {
  if (this.status !== INVITE_STATUS.PENDING) {
    throw new Error('Esta invitación ya no está activa');
  }
  
  if (this.to.toString() !== userId.toString()) {
    throw new Error('No puedes declinar esta invitación');
  }
  
  this.status = INVITE_STATUS.DECLINED;
  this.respondedAt = new Date();
  this.respondedBy = userId;
  this.message = reason;
  
  await this.save();
  
  // Notificar al remitente
  const Notification = mongoose.model('Notification');
  await new Notification({
    user: this.from,
    type: 'clan_invite_declined',
    title: 'Invitación declinada',
    message: `${this.to.username} declinó tu invitación al clan`,
    data: {
      clanId: this.clan,
      userId: this.to
    }
  }).save();
};

// Método para cancelar invitación
inviteSchema.methods.cancel = async function(userId) {
  if (this.status !== INVITE_STATUS.PENDING) {
    throw new Error('Esta invitación ya no está activa');
  }
  
  if (this.from.toString() !== userId.toString()) {
    throw new Error('No puedes cancelar esta invitación');
  }
  
  this.status = INVITE_STATUS.CANCELLED;
  await this.save();
};

// Middleware para marcar invitaciones expiradas
inviteSchema.pre('save', function(next) {
  if (this.expiresAt < new Date() && this.status === INVITE_STATUS.PENDING) {
    this.status = INVITE_STATUS.EXPIRED;
  }
  next();
});

// Tarea programada para limpiar invitaciones expiradas
inviteSchema.statics.cleanExpiredInvites = async function() {
  const result = await this.updateMany(
    {
      status: INVITE_STATUS.PENDING,
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: INVITE_STATUS.EXPIRED }
    }
  );
  
  console.log(`Invitaciones expiradas limpiadas: ${result.modifiedCount}`);
  return result;
};

module.exports = {
  ClanInvite: mongoose.model('ClanInvite', inviteSchema),
  INVITE_STATUS
};
