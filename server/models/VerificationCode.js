const mongoose = require('mongoose');

const VerificationCodeSchema = new mongoose.Schema({
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
    length: 4  // Exactamente 4 dígitos
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000)
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3  // Máximo 3 intentos
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  collection: 'verification_codes'
});

// Índices para optimizar búsquedas
VerificationCodeSchema.index({ email: 1, isUsed: 1 });
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Método estático para generar y guardar código
VerificationCodeSchema.statics.generateCode = async function(email, ipAddress, userAgent) {
  // Limpiar códigos anteriores para este email
  await this.deleteMany({ 
    email: email.toLowerCase().trim(),
    isUsed: false 
  });
  
  // Generar código de 4 dígitos
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Crear nuevo código
  const verificationCode = new this({
    email: email.toLowerCase().trim(),
    code: code,
    ipAddress,
    userAgent
  });
  
  await verificationCode.save();
  return code;
};

// Método estático para verificar código
VerificationCodeSchema.statics.verifyCode = async function(email, code) {
  const verificationCode = await this.findOne({
    email: email.toLowerCase().trim(),
    code: code,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!verificationCode) {
    return { valid: false, reason: 'invalid_or_expired' };
  }
  
  // Verificar intentos máximos
  if (verificationCode.attempts >= 3) {
    await this.updateOne(
      { _id: verificationCode._id },
      { isUsed: true }
    );
    return { valid: false, reason: 'max_attempts' };
  }
  
  // Incrementar intentos
  await this.updateOne(
    { _id: verificationCode._id },
    { $inc: { attempts: 1 } }
  );
  
  return { valid: true, verificationCode };
};

// Método estático para marcar código como usado
VerificationCodeSchema.statics.markAsUsed = async function(email, code) {
  await this.updateOne(
    { 
      email: email.toLowerCase().trim(),
      code: code,
      isUsed: false 
    },
    { isUsed: true }
  );
};

// Método estático para limpiar códigos expirados
VerificationCodeSchema.statics.cleanupExpired = async function() {
  await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('VerificationCode', VerificationCodeSchema);
