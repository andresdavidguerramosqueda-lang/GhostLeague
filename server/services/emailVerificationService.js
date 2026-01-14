const nodemailer = require('nodemailer');
const EmailVerificationCode = require('../models/EmailVerificationCode');
const User = require('../models/User');

class EmailVerificationService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Inicializa el transporter de Nodemailer
   */
  initializeTransporter() {
    const { getEmailConfig } = require('../config/emailConfig');
    const config = getEmailConfig();
    
    this.transporter = nodemailer.createTransport(config);
    
    if (process.env.EMAIL_PROVIDER === 'gmail') {
      console.log('📧 Email service configurado con Gmail');
      console.log(`📧 Usuario: ${process.env.GMAIL_USER}`);
    } else if (process.env.EMAIL_PROVIDER === 'sendgrid') {
      console.log('📧 Email service configurado con SendGrid');
    } else {
      console.log('📧 Email service configurado con proveedor personalizado');
    }
  }

  /**
   * Genera un código de verificación de 4 dígitos
   * @returns {string} Código de 4 dígitos
   */
  static generateVerificationCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Envía un código de verificación por correo
   * @param {string} email - Correo del destinatario
   * @param {string} ipAddress - IP del solicitante
   * @param {string} userAgent - User agent del solicitante
   * @returns {Promise<Object>} Resultado del envío
   */
  static async sendVerificationCode(email, ipAddress, userAgent) {
    try {
      console.log(`📧 Enviando código de verificación a: ${email}`);

      // Verificar si el usuario ya existe y está verificado
      const existingUser = await User.findOne({ 
        email: email.toLowerCase().trim() 
      });

      if (existingUser && existingUser.emailVerified) {
        return {
          success: false,
          message: 'Este correo ya está verificado',
          alreadyVerified: true
        };
      }

      // Crear código de verificación
      const verificationCode = await EmailVerificationCode.createVerificationCode(
        email, 
        ipAddress, 
        userAgent
      );

      // Enviar correo
      const emailService = new EmailVerificationService();
      const emailResult = await emailService.sendVerificationEmail(
        email, 
        verificationCode.code
      );

      if (emailResult.success) {
        return {
          success: true,
          message: 'Código de verificación enviado',
          email: email,
          expiresIn: 5, // minutos
          previewUrl: emailResult.previewUrl // Solo para desarrollo
        };
      } else {
        return {
          success: false,
          message: 'Error enviando el correo',
          error: emailResult.error
        };
      }

    } catch (error) {
      console.error('Error enviando código de verificación:', error);
      return {
        success: false,
        message: 'Error del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Envía el correo electrónico con el código
   * @param {string} to - Correo destinatario
   * @param {string} code - Código de verificación
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendVerificationEmail(to, code) {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Servicio de correo no configurado'
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Ghost League" <noreply@ghostleague.com>',
      to: to,
      subject: '🎮 Verifica tu correo - Ghost League',
      html: this.generateVerificationEmailTemplate(code),
      text: `Tu código de verificación es: ${code}. Expira en 5 minutos.`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('📧 Correo enviado exitosamente');
      console.log(`📬 Message ID: ${info.messageId}`);
      
      // En desarrollo, mostrar URL de vista previa
      let previewUrl = null;
      if (process.env.NODE_ENV === 'development' && info.messageId) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`🔗 Vista previa del correo: ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl
      };

    } catch (error) {
      console.error('Error enviando correo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendWelcomeEmail(to, username) {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Servicio de correo no configurado'
      };
    }

    const safeUsername = username || 'Jugador';

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Ghost League" <noreply@ghostleague.com>',
      to: to,
      subject: '✅ ¡Bienvenido a Ghost League! Registro completado',
      html: this.generateWelcomeEmailTemplate(safeUsername),
      text: `¡Hola ${safeUsername}! Tu registro en Ghost League se completó exitosamente. ¡Gracias por unirte!`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      console.log('📧 Correo de bienvenida enviado exitosamente');
      console.log(`📬 Message ID: ${info.messageId}`);

      let previewUrl = null;
      if (process.env.NODE_ENV === 'development' && info.messageId) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`🔗 Vista previa del correo: ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl
      };
    } catch (error) {
      console.error('Error enviando correo de bienvenida:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Genera el HTML del correo de verificación
   * @param {string} code - Código de verificación
   * @returns {string} HTML del correo
   */
  generateVerificationEmailTemplate(code) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Correo - Ghost League</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
            color: #ffffff;
            padding: 20px;
            line-height: 1.6;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
        }
        .container {
            background: linear-gradient(135deg, #1e1e3f 0%, #2d2d5e 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .logo {
            font-size: 3em;
            margin-bottom: 12px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        .header h1 {
            font-size: 1.8em;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
            letter-spacing: -0.5px;
        }
        .header p {
            color: rgba(255, 255, 255, 0.9);
            margin-top: 8px;
            font-size: 0.95em;
        }
        .content {
            padding: 45px 35px;
        }
        .greeting {
            font-size: 1.15em;
            color: rgba(255, 255, 255, 0.95);
            margin-bottom: 24px;
            text-align: center;
        }
        .code-section {
            background: rgba(102, 126, 234, 0.08);
            border: 2px solid rgba(102, 126, 234, 0.3);
            border-radius: 14px;
            padding: 32px 24px;
            margin: 28px 0;
            text-align: center;
        }
        .code-label {
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 16px;
            font-weight: 600;
        }
        .code {
            font-size: 3.2em;
            font-weight: 800;
            color: #667eea;
            letter-spacing: 18px;
            font-family: 'Courier New', Consolas, monospace;
            text-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
            margin: 0;
            padding-left: 18px;
        }
        .expiry {
            margin-top: 18px;
            font-size: 0.9em;
            color: rgba(255, 255, 255, 0.7);
        }
        .expiry strong {
            color: #fbbf24;
            font-weight: 600;
        }
        .info-box {
            background: rgba(251, 191, 36, 0.1);
            border-left: 4px solid #fbbf24;
            padding: 18px 20px;
            margin: 28px 0;
            border-radius: 8px;
            font-size: 0.92em;
            line-height: 1.6;
        }
        .info-box strong {
            color: #fbbf24;
            display: block;
            margin-bottom: 6px;
            font-size: 1.05em;
        }
        .info-box p {
            color: rgba(255, 255, 255, 0.85);
            margin: 0;
        }
        .help-text {
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.9em;
            margin-top: 28px;
            line-height: 1.5;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            margin: 32px 0;
        }
        .footer {
            background: rgba(0, 0, 0, 0.4);
            padding: 28px 30px;
            text-align: center;
        }
        .footer p {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.85em;
            margin: 8px 0;
        }
        .footer-links {
            margin-top: 16px;
        }
        .footer-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
            font-size: 0.85em;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="container">
            <div class="header">
                <div class="logo">🎮</div>
                <h1>Ghost League</h1>
                <p>Verificación de Correo Electrónico</p>
            </div>
            
            <div class="content">
                <p class="greeting">
                    ¡Bienvenido a Ghost League! Estás a un paso de unirte a la comunidad.
                </p>
                
                <div class="code-section">
                    <div class="code-label">Tu código de verificación</div>
                    <div class="code">${code}</div>
                    <div class="expiry">
                        Este código expirará en <strong>5 minutos</strong>
                    </div>
                </div>
                
                <div class="info-box">
                    <strong>🔒 Seguridad importante</strong>
                    <p>
                        Nunca compartas este código con nadie. Nuestro equipo jamás te pedirá 
                        tu código por teléfono, email o redes sociales.
                    </p>
                </div>

                <div class="divider"></div>
                
                <p class="help-text">
                    Si no solicitaste esta verificación, puedes ignorar este correo de forma segura.<br>
                    Tu cuenta no será creada sin completar la verificación.
                </p>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Ghost League. Todos los derechos reservados.</p>
                <p>Este es un correo automático, por favor no responder directamente.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  generateWelcomeEmailTemplate(username) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido - Ghost League</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
            color: #ffffff;
            padding: 20px;
            line-height: 1.6;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
        }
        .container {
            background: linear-gradient(135deg, #1e1e3f 0%, #2d2d5e 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .logo {
            font-size: 3em;
            margin-bottom: 12px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        .header h1 {
            font-size: 1.8em;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
            letter-spacing: -0.5px;
        }
        .header p {
            color: rgba(255, 255, 255, 0.9);
            margin-top: 8px;
            font-size: 0.95em;
        }
        .badge {
            display: inline-block;
            background: rgba(16, 185, 129, 0.2);
            border: 2px solid rgba(16, 185, 129, 0.4);
            border-radius: 999px;
            padding: 8px 18px;
            margin: 0 0 24px;
            font-size: 0.9em;
            font-weight: 600;
            color: #10b981;
        }
        .content {
            padding: 45px 35px;
            text-align: center;
        }
        .greeting {
            font-size: 1.25em;
            color: rgba(255, 255, 255, 0.95);
            margin-bottom: 12px;
            font-weight: 600;
        }
        .subtext {
            color: rgba(255, 255, 255, 0.7);
            font-size: 1.05em;
            margin-bottom: 32px;
        }
        .cta-primary {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1.05em;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            transition: transform 0.2s;
        }
        .features-grid {
            display: table;
            width: 100%;
            margin: 36px 0 28px;
        }
        .feature-item {
            display: table-row;
        }
        .feature-icon {
            display: table-cell;
            width: 50px;
            vertical-align: top;
            padding: 12px 0;
            font-size: 1.8em;
        }
        .feature-content {
            display: table-cell;
            vertical-align: top;
            padding: 12px 0 12px 12px;
            text-align: left;
        }
        .feature-title {
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
            font-size: 1.05em;
            margin-bottom: 4px;
        }
        .feature-desc {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.92em;
            line-height: 1.5;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            margin: 32px 0;
        }
        .secondary-cta {
            display: inline-block;
            margin-top: 20px;
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            font-size: 0.95em;
            padding: 10px 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            transition: all 0.2s;
        }
        .footer {
            background: rgba(0, 0, 0, 0.4);
            padding: 28px 30px;
            text-align: center;
        }
        .footer p {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.85em;
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="container">
            <div class="header">
                <div class="logo">🎮</div>
                <h1>Ghost League</h1>
                <p>¡Bienvenido a la comunidad!</p>
            </div>
            
            <div class="content">
                <div class="badge">✅ Cuenta Verificada</div>
                
                <p class="greeting">
                    ¡Hola, ${username}!
                </p>
                <p class="subtext">
                    Tu registro se completó exitosamente. Estás listo para competir y demostrar tus habilidades.
                </p>
                
                <a class="cta-primary" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tournaments">
                    Explorar Torneos
                </a>

                <div class="divider"></div>

                <div class="features-grid">
                    <div class="feature-item">
                        <div class="feature-icon">🏆</div>
                        <div class="feature-content">
                            <div class="feature-title">Compite en Torneos</div>
                            <div class="feature-desc">Participa en torneos, sube en el ranking global y gana premios exclusivos.</div>
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🎯</div>
                        <div class="feature-content">
                            <div class="feature-title">Completa Misiones</div>
                            <div class="feature-desc">Desbloquea logros, gana recompensas y mejora tu perfil de jugador.</div>
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">👥</div>
                        <div class="feature-content">
                            <div class="feature-title">Únete a un Clan</div>
                            <div class="feature-desc">Forma equipo con otros jugadores y compite en desafíos de clanes.</div>
                        </div>
                    </div>
                </div>

                <a class="secondary-cta" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/">
                    Ir al Inicio
                </a>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Ghost League. Todos los derechos reservados.</p>
                <p>Este es un correo automático, por favor no responder directamente.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Verifica un código de verificación
   * @param {string} email - Correo del usuario
   * @param {string} code - Código a verificar
   * @returns {Promise<Object>} Resultado de la verificación
   */
  static async verifyCode(email, code) {
    try {
      console.log(`🔍 Verificando código para: ${email}`);

      const result = await EmailVerificationCode.verifyCode(email, code);

      if (result.valid) {
        // Marcar código como usado
        await EmailVerificationCode.markAsUsed(result.verificationId);
        
        return {
          success: true,
          message: result.message,
          verificationId: result.verificationId
        };
      } else {
        return {
          success: false,
          message: result.message,
          reason: result.reason
        };
      }

    } catch (error) {
      console.error('Error verificando código:', error);
      return {
        success: false,
        message: 'Error del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Marca un usuario como verificado
   * @param {string} email - Correo del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  static async markUserAsVerified(email) {
    try {
      const result = await User.updateOne(
        { email: email.toLowerCase().trim() },
        { 
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      );

      if (result.matchedCount === 0) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      return {
        success: true,
        message: 'Correo verificado exitosamente'
      };

    } catch (error) {
      console.error('Error marcando usuario como verificado:', error);
      return {
        success: false,
        message: 'Error del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Limpia códigos expirados
   * @returns {Promise<number>} Cantidad de códigos eliminados
   */
  static async cleanupExpiredCodes() {
    try {
      const deletedCount = await EmailVerificationCode.cleanupExpired();
      console.log(`🗑️ Limpiados ${deletedCount} códigos expirados`);
      return deletedCount;
    } catch (error) {
      console.error('Error limpiando códigos expirados:', error);
      return 0;
    }
  }
}

module.exports = EmailVerificationService;
