const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 3600 // 1 hora en segundos - MongoDB eliminará automáticamente
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes y seguridad
passwordResetTokenSchema.index({ token: 1 }, { 
  unique: true,
  sparse: true 
});
passwordResetTokenSchema.index({ userId: 1 });
passwordResetTokenSchema.index({ email: 1 });
passwordResetTokenSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 3600 // TTL automático de 1 hora
});
passwordResetTokenSchema.index({ isUsed: 1 });

// Método para limpiar tokens usados o expirados
passwordResetTokenSchema.statics.cleanupExpiredTokens = async function() {
  try {
    const result = await this.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { isUsed: true }
      ]
    });
    console.log(`🧹 Limpieza de tokens: ${result.deletedCount} eliminados`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error limpiando tokens expirados:', error);
    return 0;
  }
};

// Método para verificar si un token es válido
passwordResetTokenSchema.statics.isValidToken = async function(token) {
  try {
    const resetToken = await this.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).populate('userId', 'email username');

    if (!resetToken) {
      return { valid: false, reason: 'token_not_found' };
    }

    // Verificar si el token está a punto de expirar (menos de 5 minutos)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (resetToken.expiresAt < fiveMinutesFromNow) {
      return { valid: false, reason: 'token_expiring_soon' };
    }

    return { 
      valid: true, 
      token: resetToken,
      user: resetToken.userId 
    };

  } catch (error) {
    console.error('Error validando token:', error);
    return { valid: false, reason: 'validation_error' };
  }
};

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
