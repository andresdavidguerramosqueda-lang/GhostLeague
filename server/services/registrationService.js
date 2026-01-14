const VerificationCode = require('../models/VerificationCode');
const User = require('../models/User');
const EmailVerificationService = require('./emailVerificationService');

class RegistrationService {
  /**
   * Inicia el proceso de registro con verificación
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.username - Nombre de usuario
   * @param {string} userData.email - Correo electrónico
   * @param {string} userData.password - Contraseña
   * @param {string} ipAddress - IP del cliente
   * @param {string} userAgent - User Agent del cliente
   * @returns {Object} Resultado del proceso
   */
  static async initiateRegistration(userData, ipAddress, userAgent) {
    try {
      console.log('📝 Iniciando proceso de registro con verificación...');
      
      // Paso 1: Validar que el correo no esté en proceso de verificación
      const existingCode = await VerificationCode.findOne({
        email: userData.email.toLowerCase().trim(),
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });
      
      if (existingCode) {
        return {
          success: false,
          message: 'Ya existe un proceso de verificación en curso para este correo. Por favor, revisa tu correo o espera a que el código expire.',
          reason: 'verification_in_progress'
        };
      }
      
      // Paso 2: Validar que el nombre de usuario no esté en uso
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username.trim() },
          { email: userData.email.toLowerCase().trim() }
        ]
      });
      
      if (existingUser) {
        if (existingUser.email === userData.email.toLowerCase().trim()) {
          return {
            success: false,
            message: 'El correo electrónico ya está registrado',
            reason: 'email_exists'
          };
        }
        
        if (existingUser.username === userData.username.trim()) {
          return {
            success: false,
            message: 'El nombre de usuario ya está en uso',
            reason: 'username_exists'
          };
        }
      }
      
      // Paso 3: Generar código de verificación
      const verificationCode = await VerificationCode.generateCode(
        userData.email,
        ipAddress,
        userAgent
      );
      
      console.log('🔢 Código generado:', verificationCode);
      
      // Paso 4: Enviar código por correo
      const emailService = new EmailVerificationService();
      const emailResult = await emailService.sendVerificationEmail(
        userData.email,
        verificationCode
      );
      
      if (!emailResult.success) {
        return {
          success: false,
          message: 'Error al enviar el correo de verificación',
          reason: 'email_send_failed'
        };
      }
      
      console.log('📧 Correo enviado exitosamente');
      
      return {
        success: true,
        message: 'Código de verificación enviado. Por favor, revisa tu correo.',
        email: userData.email,
        username: userData.username,
        previewUrl: emailResult.previewUrl
      };
      
    } catch (error) {
      console.error('❌ Error en initiateRegistration:', error);
      return {
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
  
  /**
   * Completa el registro verificando el código
   * @param {string} email - Correo electrónico
   * @param {string} code - Código de verificación
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   * @returns {Object} Resultado del proceso
   */
  static async completeRegistration(email, code, username, password) {
    try {
      console.log('🔍 Verificando código para completar registro...');
      
      // Paso 1: Verificar el código
      const verificationResult = await VerificationCode.verifyCode(email, code);
      
      if (!verificationResult.valid) {
        let message = 'Código inválido o expirado';
        
        switch (verificationResult.reason) {
          case 'invalid_or_expired':
            message = 'Código inválido o expirado';
            break;
          case 'max_attempts':
            message = 'Máximo de intentos alcanzado. Por favor, solicita un nuevo código.';
            break;
          default:
            message = 'Código inválido o expirado';
        }
        
        return {
          success: false,
          message: message,
          reason: verificationResult.reason
        };
      }
      
      // Paso 2: Marcar código como usado
      await VerificationCode.markAsUsed(email, code);
      
      // Paso 3: Crear el usuario
      const { generateUniquePlayerId } = require('../utils/playerIdGenerator');
      const playerId = await generateUniquePlayerId(User);
      
      const user = new User({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: password,
        role: 'user',
        emailVerified: true, // ✅ Usuario ya está verificado
        emailVerifiedAt: new Date(),
        registrationDate: new Date(),
        playerId: playerId
      });
      
      await user.save();
      
      console.log('✅ Usuario creado exitosamente:', user.username);

      try {
        const emailService = new EmailVerificationService();
        console.log('📧 Enviando correo de bienvenida a:', user.email);
        const welcomeResult = await emailService.sendWelcomeEmail(user.email, user.username);
        if (welcomeResult?.success) {
          console.log('📧 Correo de bienvenida enviado: ✅');
          if (welcomeResult.previewUrl) {
            console.log(`🔗 Vista previa del correo de bienvenida: ${welcomeResult.previewUrl}`);
          }
        } else {
          console.log('📧 Correo de bienvenida enviado: ❌');
          if (welcomeResult?.error) {
            console.log('📧 Error correo de bienvenida:', welcomeResult.error);
          }
        }
      } catch (emailError) {
        console.error('❌ Error enviando correo de bienvenida:', emailError);
      }
      
      // Paso 4: Generar token JWT
      const jwt = require('jsonwebtoken');
      const payload = {
        userId: user.id,
        role: user.role
      };
      
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        success: true,
        message: '¡Registro completado exitosamente! Bienvenido a Ghost League.',
        user: {
          id: user.id,
          username: user.username,
          playerId: user.playerId,
          email: user.email,
          emailVerified: user.emailVerified,
          emailVerifiedAt: user.emailVerifiedAt,
          role: user.role
        },
        token: token
      };
      
    } catch (error) {
      console.error('❌ Error en completeRegistration:', error);
      return {
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
  
  /**
   * Reenvía el código de verificación
   * @param {string} email - Correo electrónico
   * @param {string} ipAddress - IP del cliente
   * @param {string} userAgent - User Agent del cliente
   * @returns {Object} Resultado del proceso
   */
  static async resendVerificationCode(email, ipAddress, userAgent) {
    try {
      console.log('📧 Reenviando código de verificación...');
      
      // Paso 1: Buscar código existente no usado
      const existingCode = await VerificationCode.findOne({
        email: email.toLowerCase().trim(),
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });
      
      if (!existingCode) {
        return {
          success: false,
          message: 'No hay un proceso de verificación activo para este correo. Por favor, inicia el registro nuevamente.',
          reason: 'no_active_verification'
        };
      }
      
      // Paso 2: Eliminar código anterior
      await VerificationCode.deleteOne({
        _id: existingCode._id
      });
      
      // Paso 3: Generar nuevo código
      const newCode = await VerificationCode.generateCode(email, ipAddress, userAgent);
      
      // Paso 4: Enviar nuevo código por correo
      const emailService = new EmailVerificationService();
      const emailResult = await emailService.sendVerificationEmail(email, newCode);
      
      if (!emailResult.success) {
        return {
          success: false,
          message: 'Error al enviar el correo de verificación',
          reason: 'email_send_failed'
        };
      }
      
      console.log('📧 Nuevo código enviado exitosamente');
      
      return {
        success: true,
        message: 'Nuevo código de verificación enviado. Por favor, revisa tu correo.',
        verificationCode: newCode,
        previewUrl: emailResult.previewUrl
      };
      
    } catch (error) {
      console.error('❌ Error en resendVerificationCode:', error);
      return {
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

module.exports = RegistrationService;
