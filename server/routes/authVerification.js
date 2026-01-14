const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailVerificationService = require('../services/emailVerificationService');
const router = express.Router();

/**
 * @route   POST /api/auth-verification/verify-and-login
 * @desc    Verificar código de correo y dar acceso al usuario
 * @access  Public
 */
router.post('/verify-and-login', async (req, res) => {
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

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message,
        reason: verificationResult.reason
      });
    }

    // Marcar usuario como verificado
    const markResult = await EmailVerificationService.markUserAsVerified(email);

    if (!markResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error verificando el correo',
        error: markResult.error
      });
    }

    // Obtener usuario verificado
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear y retornar JWT
    const payload = {
      userId: user.id,
      role: user.role
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Correo verificado exitosamente. ¡Bienvenido a Ghost League!',
      token,
      user: {
        id: user.id,
        clanId: user.clanId,
        username: user.username,
        playerId: user.playerId,
        email: user.email,
        showEmailOnProfile: user.showEmailOnProfile,
        role: user.role,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        avatar: user.avatar,
        banner: user.banner,
        country: user.country,
        favoriteGame: user.favoriteGame,
        bio: user.bio,
        socialSpotify: user.socialSpotify,
        socialTiktok: user.socialTiktok,
        socialTwitch: user.socialTwitch,
        socialDiscord: user.socialDiscord,
        socialInstagram: user.socialInstagram,
        socialX: user.socialX,
        socialYoutube: user.socialYoutube,
        competitive: user.competitive,
      }
    });

  } catch (error) {
    console.error('Error en verify-and-login:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/auth-verification/resend-code
 * @desc    Reenviar código de verificación para un usuario existente
 * @access  Public
 */
router.post('/resend-code', async (req, res) => {
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

    // Verificar si el usuario existe
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si ya está verificado, no enviar código
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Este correo ya está verificado',
        alreadyVerified: true
      });
    }

    // Enviar nuevo código
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    
    const emailResult = await EmailVerificationService.sendVerificationCode(
      email.toLowerCase().trim(),
      ipAddress,
      userAgent
    );

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Nuevo código de verificación enviado',
        email: email.toLowerCase().trim(),
        expiresIn: 5,
        previewUrl: emailResult.previewUrl // Solo en desarrollo
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error enviando el código',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error en resend-code:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
