const rateLimit = require('express-rate-limit');

// Rate limiting específico para recuperación de contraseña
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Máximo 3 intentos por ventana de 15 minutos
  message: {
    msg: 'Demasiados intentos de recuperación de contraseña. Por seguridad, espera 15 minutos antes de intentar de nuevo.',
    headers: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
  // Usar MemoryStore
  store: new rateLimit.MemoryStore(),
  // Handler para cuando se excede el límite
  handler: (req, res) => {
    console.log(`🚫 Rate limit excedido para IP: ${req.ip}`);
    res.status(429).json({
      message: 'Demasiados intentos de recuperación de contraseña',
      retryAfter: '15 minutos',
      maxAttempts: 3
    });
  }
});

// Rate limiting para registro de usuarios
const registrationLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 5 * 60 * 1000 : 60 * 60 * 1000, // 5 min en desarrollo, 1 hora en producción
  max: process.env.NODE_ENV === 'development' ? 10 : 5, // 10 registros en desarrollo, 5 en producción
  message: {
    msg: process.env.NODE_ENV === 'development' 
      ? 'Demasiados intentos de registro. Espera 5 minutos (desarrollo).' 
      : 'Demasiados intentos de registro. Por seguridad, espera 1 hora antes de intentar de nuevo.',
    headers: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new rateLimit.MemoryStore(),
  handler: (req, res) => {
    console.log(`🚫 Rate limit excedido para registro IP: ${req.ip}`);
    res.status(429).json({
      message: 'Demasiados intentos de registro',
      retryAfter: process.env.NODE_ENV === 'development' ? '5 minutos' : '1 hora',
      maxAttempts: process.env.NODE_ENV === 'development' ? 10 : 5,
      isDevelopment: process.env.NODE_ENV === 'development'
    });
  }
});

// Rate limiting para verificación de correos
const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === 'development' ? 20 : 10, // 20 intentos en desarrollo, 10 en producción
  message: {
    msg: process.env.NODE_ENV === 'development' 
      ? 'Demasiados intentos de verificación. Espera 1 hora (desarrollo).' 
      : 'Demasiados intentos de verificación. Por seguridad, espera 1 hora antes de intentar de nuevo.',
    headers: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new rateLimit.MemoryStore(),
  handler: (req, res) => {
    console.log(`🚫 Rate limit excedido para verificación IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de verificación',
      retryAfter: process.env.NODE_ENV === 'development' ? '1 hora' : '1 hora',
      maxAttempts: process.env.NODE_ENV === 'development' ? 20 : 10
    });
  }
});

// Rate limiting para envío de correos
const emailSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 10 : 5, // 10 envíos en desarrollo, 5 en producción
  message: {
    msg: process.env.NODE_ENV === 'development' 
      ? 'Demasiados correos enviados. Espera 15 minutos (desarrollo).' 
      : 'Demasiados correos enviados. Por seguridad, espera 15 minutos antes de intentar de nuevo.',
    headers: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new rateLimit.MemoryStore(),
  handler: (req, res) => {
    console.log(`🚫 Rate limit excedido para envío de correos IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Demasiados correos enviados',
      retryAfter: process.env.NODE_ENV === 'development' ? '15 minutos' : '15 minutos',
      maxAttempts: process.env.NODE_ENV === 'development' ? 10 : 5
    });
  }
});

// Rate limiting para login general
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 intentos de login por 15 minutos
  message: {
    msg: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.',
    headers: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new rateLimit.MemoryStore(),
  handler: (req, res) => {
    console.log(`🚫 Rate limit excedido para login IP: ${req.ip}`);
    res.status(429).json({
      message: 'Demasiados intentos de inicio de sesión',
      retryAfter: '15 minutos',
      maxAttempts: 10
    });
  }
});

// Rate limiting para verificación de correos (más restrictivo)
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 solicitudes por hora
  message: {
    msg: 'Demasiados intentos de verificación. Por seguridad, espera 1 hora antes de intentar de nuevo.',
    headers: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new rateLimit.MemoryStore(),
  handler: (req, res) => {
    console.log(`🚫 Rate limit excedido para verificación IP: ${req.ip}, Email: ${req.body.email}`);
    res.status(429).json({
      message: 'Demasiados intentos de verificación de correo',
      retryAfter: '1 hora',
      maxAttempts: 10
    });
  }
});

// Rate limiting para envío de códigos (muy restrictivo)
const codeSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 envíos por hora
  message: {
    msg: 'Demasiados códigos enviados. Por seguridad, espera 1 hora antes de solicitar otro.',
    headers: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new rateLimit.MemoryStore(),
  handler: (req, res) => {
    console.log(`🚫 Rate limit excedido para envío IP: ${req.ip}, Email: ${req.body.email}`);
    res.status(429).json({
      message: 'Demasiados códigos de verificación enviados',
      retryAfter: '1 hora',
      maxAttempts: 3
    });
  }
});

module.exports = {
  passwordResetLimiter,
  registrationLimiter,
  loginLimiter,
  verificationLimiter,
  emailVerificationLimiter,
  emailSendLimiter,
  codeSendLimiter
};
