const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendPasswordResetEmail, generateResetToken } = require('../services/emailService');
const EmailValidationService = require('../services/emailValidationService');
const { passwordResetLimiter, registrationLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { generateUniquePlayerId } = require('../utils/playerIdGenerator');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Configuración de subida de archivos para avatar
const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const bannersDir = path.join(__dirname, '..', 'uploads', 'banners');
if (!fs.existsSync(bannersDir)) {
  fs.mkdirSync(bannersDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  },
});

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, bannersDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${req.user.id}-banner-${Date.now()}${ext}`);
  },
});

const uploadBanner = multer({
  storage: bannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  },
});

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registrationLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validación completa del correo electrónico
    const emailValidation = await EmailValidationService.validateForRegistration(email);
    
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        message: 'Correo electrónico inválido',
        details: emailValidation.messages,
        risk: emailValidation.risk
      });
    }

    if (emailValidation.isTemporary) {
      return res.status(400).json({ 
        message: 'No se permiten correos electrónicos temporales',
        details: emailValidation.messages,
        risk: emailValidation.risk
      });
    }

    if (!emailValidation.canRegister) {
      return res.status(400).json({ 
        message: 'El correo electrónico ya está registrado',
        details: emailValidation.messages,
        verificationMethod: emailValidation.verificationMethod
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
    }

    // Create new user (sin verificar correo)
    const playerId = await generateUniquePlayerId(User);
    
    const user = new User({
      username,
      email: email.trim().toLowerCase(),
      password,
      role: 'user', // Default role
      emailVerified: false, // Requerir verificación de correo
      emailValidationMethod: emailValidation.verificationMethod,
      registrationDate: new Date(),
      playerId: playerId // Generar playerId único #XRGH91F
    });

    await user.save();

    // Enviar código de verificación por correo
    const EmailVerificationService = require('../services/emailVerificationService');
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    
    const emailResult = await EmailVerificationService.sendVerificationCode(
      email.trim().toLowerCase(),
      ipAddress,
      userAgent
    );

    console.log('📧 Código de verificación enviado:', emailResult.success ? '✅' : '❌');

    // Retornar respuesta indicando que se requiere verificación
    res.status(201).json({
      message: 'Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para completar el registro.',
      requiresEmailVerification: true,
      email: email.trim().toLowerCase(),
      previewUrl: emailResult.previewUrl, // Solo en desarrollo
      user: {
        id: user.id,
        username: user.username,
        playerId: user.playerId,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and return JWT
    const payload = {
      userId: user.id,
      role: user.role
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            clanId: user.clanId,
            username: user.username,
            playerId: user.playerId,
            email: user.email,
            showEmailOnProfile: user.showEmailOnProfile,
            role: user.role,
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
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      clanId: req.user.clanId,
      username: req.user.username,
      playerId: req.user.playerId,
      email: req.user.email,
      showEmailOnProfile: req.user.showEmailOnProfile,
      role: req.user.role,
      avatar: req.user.avatar,
      banner: req.user.banner,
      country: req.user.country,
      favoriteGame: req.user.favoriteGame,
      bio: req.user.bio,
      socialSpotify: req.user.socialSpotify,
      socialTiktok: req.user.socialTiktok,
      socialTwitch: req.user.socialTwitch,
      socialDiscord: req.user.socialDiscord,
      socialInstagram: req.user.socialInstagram,
      socialX: req.user.socialX,
      socialYoutube: req.user.socialYoutube,
      competitive: req.user.competitive,
    }
  });
});

// Middleware para validar email
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'El correo electrónico es requerido' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'El formato del correo electrónico es inválido' });
  }
  
  next();
};

// Middleware para validar contraseña
const validatePassword = (req, res, next) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: 'La contraseña es requerida' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }
  
  next();
};

// RUTAS DE RESTABLECIMIENTO DE CONTRASEÑA

// 1. Formulario para solicitar restablecimiento (POST)
router.post('/forgot-password', passwordResetLimiter, validateEmail, async (req, res) => {
  try {
    console.log('📧 Iniciando proceso de forgot-password');
    console.log('Email recibido:', req.body.email);
    
    const { email } = req.body;
    
    // Validación completa del correo electrónico
    const emailValidation = await EmailValidationService.validateForPasswordReset(email);
    
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        message: 'El formato del correo electrónico es inválido',
        details: emailValidation.messages
      });
    }

    // Verificar si el correo existe en la base de datos
    if (!emailValidation.exists) {
      console.log('⚠️ Email no encontrado en la base de datos');
      return res.status(400).json({ 
        message: 'Este correo no está registrado',
        details: emailValidation.messages
      });
    }
    
    // Obtener información del usuario
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log('Usuario encontrado:', user ? 'Sí' : 'No');
    
    // Limpiar tokens anteriores para este usuario
    console.log('🗑️ Eliminando tokens anteriores para el usuario:', user._id);
    await PasswordResetToken.deleteMany({ userId: user._id });
    
    // Generar nuevo token
    const resetToken = generateResetToken();
    console.log('🔑 Token generado:', resetToken.substring(0, 10) + '...');
    
    // Guardar información adicional de seguridad
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    
    console.log('💾 Guardando token en la base de datos');
    await PasswordResetToken.create({
      userId: user._id,
      email: email.toLowerCase().trim(),
      token: resetToken,
      expiresAt: new Date(Date.now() + 3600000), // 1 hora
      isUsed: false,
      ipAddress: clientIP,
      userAgent: userAgent
    });
    
    console.log('📧 Enviando correo de restablecimiento');
    // Enviar correo
    await sendPasswordResetEmail(user.email, resetToken);
    
    console.log('✅ Proceso de forgot-password completado exitosamente');
    res.json({ 
      message: EmailValidationService.getGenericEmailMessage(email),
      requestId: resetToken.substring(0, 8) // Para referencia interna
    });
    
  } catch (error) {
    console.error('❌ Error en forgot-password:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 2. Validar token antes de mostrar formulario
router.get('/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Usar el método mejorado del modelo
    const tokenValidation = await PasswordResetToken.isValidToken(token);
    
    if (!tokenValidation.valid) {
      let errorMessage = 'Token inválido o expirado';
      
      if (tokenValidation.reason === 'token_not_found') {
        errorMessage = 'El enlace de restablecimiento no es válido o ha expirado';
      } else if (tokenValidation.reason === 'token_expiring_soon') {
        errorMessage = 'El enlace está por expirar. Solicita uno nuevo.';
      }
      
      return res.status(400).json({ 
        valid: false,
        message: errorMessage,
        reason: tokenValidation.reason
      });
    }
    
    res.json({ 
      valid: true,
      email: tokenValidation.user.email,
      username: tokenValidation.user.username,
      expiresAt: tokenValidation.token.expiresAt
    });
    
  } catch (error) {
    console.error('Error validando token:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// 3. Restablecer contraseña (POST)
router.post('/reset-password', validatePassword, async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'El token es requerido' });
    }
    
    // Buscar token válido
    const resetToken = await PasswordResetToken.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!resetToken) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }
    
    // Obtener usuario
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }
    
    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Actualizar contraseña
    await User.findByIdAndUpdate(user._id, { 
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    // Marcar token como usado
    await PasswordResetToken.findByIdAndUpdate(resetToken._id, { 
      isUsed: true 
    });
    
    // Eliminar todos los tokens restantes para este usuario
    await PasswordResetToken.deleteMany({ 
      userId: user._id,
      _id: { $ne: resetToken._id }
    });
    
    res.json({ 
      message: 'Contraseña restablecida exitosamente' 
    });
    
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT api/auth/profile
// @desc    Actualizar datos básicos de perfil (sin avatar)
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, country, favoriteGame, bio, showEmailOnProfile, socialSpotify, socialTiktok, socialTwitch, socialDiscord, socialInstagram, socialX, socialYoutube } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (country !== undefined) user.country = country;
    if (favoriteGame !== undefined) user.favoriteGame = favoriteGame;
    if (bio !== undefined) user.bio = bio;
    if (showEmailOnProfile !== undefined) user.showEmailOnProfile = !!showEmailOnProfile;
    if (socialSpotify !== undefined) user.socialSpotify = socialSpotify;
    if (socialTiktok !== undefined) user.socialTiktok = socialTiktok;
    if (socialTwitch !== undefined) user.socialTwitch = socialTwitch;
    if (socialDiscord !== undefined) user.socialDiscord = socialDiscord;
    if (socialInstagram !== undefined) user.socialInstagram = socialInstagram;
    if (socialX !== undefined) user.socialX = socialX;
    if (socialYoutube !== undefined) user.socialYoutube = socialYoutube;

    await user.save();

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        showEmailOnProfile: user.showEmailOnProfile,
        role: user.role,
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
  } catch (err) {
    console.error('Error actualizando perfil:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST api/auth/avatar
// @desc    Subir foto de perfil (avatar)
// @access  Private
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ningún archivo' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const publicPath = `/uploads/avatars/${req.file.filename}`;
    user.avatar = publicPath;
    await user.save();

    return res.json({
      message: 'Avatar actualizado correctamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        showEmailOnProfile: user.showEmailOnProfile,
        role: user.role,
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
    console.error('Error al subir avatar:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST api/auth/banner
// @desc    Subir banner de perfil
// @access  Private
router.post('/banner', auth, uploadBanner.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ningún archivo' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const publicPath = `/uploads/banners/${req.file.filename}`;
    user.banner = publicPath;
    await user.save();

    return res.json({
      message: 'Banner actualizado correctamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        showEmailOnProfile: user.showEmailOnProfile,
        role: user.role,
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
    console.error('Error al subir banner:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
