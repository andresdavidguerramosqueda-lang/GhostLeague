const express = require('express');
const router = express.Router();
const RegistrationService = require('../services/registrationService');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * @route   POST /api/registration/initiate
 * @desc    Inicia el proceso de registro con verificación
 * @access  Public
 */
router.post('/initiate', rateLimiter.emailVerificationLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    // Validación básica
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario debe tener al menos 3 caracteres'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del correo electrónico es inválido'
      });
    }

    console.log('📝 Iniciando registro para:', email);

    // Iniciar proceso de registro
    const result = await RegistrationService.initiateRegistration(
      { username, email, password },
      ipAddress,
      userAgent
    );

    if (result.success) {
      console.log('✅ Proceso de registro iniciado exitosamente');
      res.status(200).json({
        success: true,
        message: result.message,
        email: result.email,
        username: result.username,
        previewUrl: result.previewUrl,
        requiresVerification: true
      });
    } else {
      console.log('❌ Error en proceso de registro:', result.reason);
      res.status(400).json({
        success: false,
        message: result.message,
        reason: result.reason
      });
    }

  } catch (error) {
    console.error('❌ Error en /registration/initiate:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/registration/complete
 * @desc    Completa el registro verificando el código
 * @access  Public
 */
router.post('/complete', rateLimiter.emailVerificationLimiter, async (req, res) => {
  try {
    const { email, code, username, password } = req.body;

    // Validación básica
    if (!email || !code || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    if (!/^\d{4}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'El código debe tener exactamente 4 dígitos'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del correo electrónico es inválido'
      });
    }

    console.log('🔍 Completando registro para:', email);

    // Completar registro
    const result = await RegistrationService.completeRegistration(
      email,
      code,
      username,
      password
    );

    if (result.success) {
      console.log('✅ Registro completado exitosamente');
      res.status(200).json({
        success: true,
        message: result.message,
        user: result.user,
        token: result.token
      });
    } else {
      console.log('❌ Error completando registro:', result.reason);
      res.status(400).json({
        success: false,
        message: result.message,
        reason: result.reason
      });
    }

  } catch (error) {
    console.error('❌ Error en /registration/complete:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/registration/resend-code
 * @desc    Reenvía el código de verificación
 * @access  Public
 */
router.post('/resend-code', rateLimiter.emailSendLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Validación básica
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del correo electrónico es inválido'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    console.log('📧 Reenviando código para:', email);

    // Reenviar código
    const result = await RegistrationService.resendVerificationCode(
      email,
      ipAddress,
      userAgent
    );

    if (result.success) {
      console.log('✅ Código reenviado exitosamente');
      res.status(200).json({
        success: true,
        message: result.message,
        previewUrl: result.previewUrl
      });
    } else {
      console.log('❌ Error reenviando código:', result.reason);
      res.status(400).json({
        success: false,
        message: result.message,
        reason: result.reason
      });
    }

  } catch (error) {
    console.error('❌ Error en /registration/resend-code:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
