const express = require('express');
const EmailVerificationService = require('../services/emailVerificationService');
const { emailVerificationLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

/**
 * @route   POST /api/email-verification/send
 * @desc    Enviar código de verificación por correo
 * @access  Public
 * @rateLimit 3 solicitudes por hora por IP
 */
router.post('/send', emailVerificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    // Validar formato básico del correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de correo electrónico inválido'
      });
    }

    // Obtener IP y User Agent para seguridad
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    // Enviar código de verificación
    const result = await EmailVerificationService.sendVerificationCode(
      email,
      ipAddress,
      userAgent
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        email: result.email,
        expiresIn: result.expiresIn,
        previewUrl: result.previewUrl // Solo en desarrollo
      });
    } else {
      if (result.alreadyVerified) {
        return res.status(400).json({
          success: false,
          message: result.message,
          alreadyVerified: true
        });
      }

      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error en /send:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/email-verification/verify
 * @desc    Verificar código de 4 dígitos
 * @access  Public
 * @rateLimit 10 solicitudes por hora por IP
 */
router.post('/verify', emailVerificationLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'El correo y el código son requeridos'
      });
    }

    // Validar formato del código
    if (!/^\d{4}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'El código debe tener exactamente 4 dígitos'
      });
    }

    // Validar formato del correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de correo electrónico inválido'
      });
    }

    // Verificar código
    const verificationResult = await EmailVerificationService.verifyCode(email, code);

    if (verificationResult.success) {
      // Marcar usuario como verificado
      const markResult = await EmailVerificationService.markUserAsVerified(email);

      if (markResult.success) {
        res.json({
          success: true,
          message: 'Correo verificado exitosamente',
          verificationId: verificationResult.verificationId
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error verificando el correo',
          error: markResult.error
        });
      }
    } else {
      // Manejar diferentes tipos de errores
      let statusCode = 400;
      let message = verificationResult.message;

      if (verificationResult.reason === 'max_attempts') {
        statusCode = 429; // Too Many Requests
      }

      res.status(statusCode).json({
        success: false,
        message: message,
        reason: verificationResult.reason,
        remainingAttempts: verificationResult.reason !== 'max_attempts' ? 3 - (verificationResult.attempts || 0) : 0
      });
    }

  } catch (error) {
    console.error('Error en /verify:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/email-verification/resend
 * @desc    Reenviar código de verificación
 * @access  Public
 * @rateLimit 2 solicitudes por hora por IP
 */
router.post('/resend', emailVerificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    // Validar formato del correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de correo electrónico inválido'
      });
    }

    // Obtener IP y User Agent para seguridad
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    // Enviar nuevo código
    const result = await EmailVerificationService.sendVerificationCode(
      email,
      ipAddress,
      userAgent
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Nuevo código de verificación enviado',
        email: result.email,
        expiresIn: result.expiresIn,
        previewUrl: result.previewUrl // Solo en desarrollo
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error en /resend:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/email-verification/status/:email
 * @desc    Verificar estado de verificación de un correo
 * @access  Public (con validación)
 */
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico es requerido'
      });
    }

    // Validar formato del correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de correo electrónico inválido'
      });
    }

    const User = require('../models/User');
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('emailVerified emailVerifiedAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      message: user.emailVerified ? 'Correo verificado' : 'Correo no verificado'
    });

  } catch (error) {
    console.error('Error en /status:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/email-verification/cleanup
 * @desc    Limpiar códigos expirados (mantenimiento)
 * @access  Private (solo admin)
 */
router.post('/cleanup', async (req, res) => {
  try {
    // Esta ruta debería estar protegida por middleware de admin
    // Por ahora la dejamos pública para pruebas
    
    const deletedCount = await EmailVerificationService.cleanupExpiredCodes();
    
    res.json({
      success: true,
      message: `Limpieza completada. ${deletedCount} códigos expirados eliminados.`,
      deletedCount
    });

  } catch (error) {
    console.error('Error en /cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
