const mongoose = require('mongoose');

const EmailVerificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    length: 4
  },
  expiresAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 300 // 5 minutos en segundos (TTL index)
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
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
  timestamps: true,
  collection: 'email_verification_codes'
});

// Índices para optimizar búsquedas
EmailVerificationCodeSchema.index({ email: 1, isUsed: 1 });
EmailVerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
EmailVerificationCodeSchema.index({ createdAt: 1 });

// Método estático para crear un nuevo código
EmailVerificationCodeSchema.statics.createVerificationCode = async function(email, ipAddress, userAgent) {
  // Limpiar códigos anteriores para este email
  await this.deleteMany({ 
    email: email.toLowerCase().trim(),
    isUsed: false 
  });

  // Generar nuevo código
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Crear nuevo documento
  const verificationCode = new this({
    email: email.toLowerCase().trim(),
    code,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
    ipAddress,
    userAgent
  });

  return await verificationCode.save();
};

// Método estático para verificar código
EmailVerificationCodeSchema.statics.verifyCode = async function(email, code) {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Buscar código válido
  const verification = await this.findOne({
    email: normalizedEmail,
    code: code,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!verification) {
    return {
      valid: false,
      reason: 'invalid_or_expired',
      message: 'Código inválido o expirado'
    };
  }

  // Verificar intentos máximos
  if (verification.attempts >= 3) {
    await this.updateOne(
      { _id: verification._id },
      { isUsed: true }
    );
    return {
      valid: false,
      reason: 'max_attempts',
      message: 'Máximo de intentos alcanzado. Solicita un nuevo código.'
    };
  }

  // Incrementar intentos
  await this.updateOne(
    { _id: verification._id },
    { $inc: { attempts: 1 } }
  );

  return {
    valid: true,
    verificationId: verification._id,
    message: 'Código válido'
  };
};

// Método estático para marcar como usado
EmailVerificationCodeSchema.statics.markAsUsed = async function(verificationId) {
  return await this.updateOne(
    { _id: verificationId },
    { isUsed: true }
  );
};

// Método estático para limpiar códigos expirados
EmailVerificationCodeSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
    isUsed: false
  });
  return result.deletedCount;
};

module.exports = mongoose.model('EmailVerificationCode', EmailVerificationCodeSchema);
