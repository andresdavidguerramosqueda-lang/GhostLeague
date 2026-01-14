const { Resend } = require('resend');

class ResendEmailService {
  constructor() {
    // Inicializar Resend con la API key del entorno o la proporcionada
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_LoGf3tAA_LPRUHWhBYMudkMMc96Np8tdH');
    this.fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  }

  // Enviar email de verificación
  async sendVerificationEmail(email, verificationCode) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?email=${encodeURIComponent(email)}&code=${verificationCode}`;
      
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Verifica tu cuenta - Ghost League',
        html: this.getVerificationTemplate(verificationCode, verificationUrl, email)
      });

      if (error) {
        console.error('❌ Error enviando email de verificación con Resend:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Email de verificación enviado con Resend:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error en servicio Resend (verificación):', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar email de bienvenida
  async sendWelcomeEmail(email, username) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: '¡Bienvenido a Ghost League! 🎮',
        html: this.getWelcomeTemplate(username, email)
      });

      if (error) {
        console.error('❌ Error enviando email de bienvenida con Resend:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Email de bienvenida enviado con Resend:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error en servicio Resend (bienvenida):', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar email de reset password
  async sendPasswordResetEmail(email, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Restablece tu contraseña - Ghost League',
        html: this.getPasswordResetTemplate(resetUrl, resetToken, email)
      });

      if (error) {
        console.error('❌ Error enviando email de reset password con Resend:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Email de reset password enviado con Resend:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error en servicio Resend (reset password):', error);
      return { success: false, error: error.message };
    }
  }

  // Template para email de verificación
  getVerificationTemplate(code, verificationUrl, email) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica tu cuenta - Ghost League</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6d28d9, #7c3aed); text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }
        .logo { font-size: 28px; font-weight: bold; color: white; margin-bottom: 10px; }
        .content { background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px; }
        .code-box { background: white; border: 2px solid #6d28d9; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .code { font-size: 32px; font-weight: bold; color: #6d28d9; letter-spacing: 5px; }
        .button { display: inline-block; background: #6d28d9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">👻 Ghost League</div>
            <div style="color: white; opacity: 0.9;">Torneos de Videojuegos Profesionales</div>
        </div>
        
        <div class="content">
            <h2>¡Bienvenido a Ghost League!</h2>
            <p>Gracias por registrarte. Para activar tu cuenta, ingresa el siguiente código de verificación:</p>
            
            <div class="code-box">
                <div class="code">${code}</div>
                <p style="margin-top: 15px; color: #666; font-size: 14px;">Este código expirará en 15 minutos</p>
            </div>
            
            <p>O puedes hacer clic en el siguiente enlace:</p>
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verificar Cuenta</a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Si no creaste esta cuenta, simplemente ignora este email.
            </p>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 Ghost League. Todos los derechos reservados.</p>
            <p>Enviado a: ${email}</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Template para email de bienvenida
  getWelcomeTemplate(username, email) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Bienvenido a Ghost League!</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6d28d9, #7c3aed); text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }
        .logo { font-size: 28px; font-weight: bold; color: white; margin-bottom: 10px; }
        .content { background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px; }
        .welcome { font-size: 24px; color: #6d28d9; margin-bottom: 20px; }
        .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #6d28d9; }
        .button { display: inline-block; background: #6d28d9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">👻 Ghost League</div>
            <div style="color: white; opacity: 0.9;">Torneos de Videojuegos Profesionales</div>
        </div>
        
        <div class="content">
            <h2 class="welcome">¡Bienvenido a Ghost League, ${username}! 🎮</h2>
            <p>Tu cuenta ha sido verificada exitosamente. Estás listo para comenzar tu viaje en la liga más competitiva de videojuegos.</p>
            
            <div class="feature">
                <h3>🏆 Crear Torneos</h3>
                <p>Organiza tus propios torneos con reglas personalizadas y formatos variados.</p>
            </div>
            
            <div class="feature">
                <h3>🎯 Competir</h3>
                <p>Participa en torneos activos y demuestra tu habilidad contra los mejores jugadores.</p>
            </div>
            
            <div class="feature">
                <h3>📊 Estadísticas</h3>
                <p>Seguimiento detallado de tu progreso, historial de partidas y ranking global.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Ir a Ghost League</a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                ¿Necesitas ayuda? Contáctanos en soporte@ghostleague.com
            </p>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 Ghost League. Todos los derechos reservados.</p>
            <p>Enviado a: ${email}</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Template para email de reset password
  getPasswordResetTemplate(resetUrl, token, email) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablece tu contraseña - Ghost League</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #ef4444); text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }
        .logo { font-size: 28px; font-weight: bold; color: white; margin-bottom: 10px; }
        .content { background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">👻 Ghost League</div>
            <div style="color: white; opacity: 0.9;">Torneos de Videojuegos Profesionales</div>
        </div>
        
        <div class="content">
            <h2>Restablece tu contraseña</h2>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no fuiste tú, puedes ignorar este email.</p>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por seguridad.
            </div>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <small>${resetUrl}</small>
            </p>
            
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Token de referencia: ${token.substring(0, 8)}...
            </p>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 Ghost League. Todos los derechos reservados.</p>
            <p>Enviado a: ${email}</p>
        </div>
    </div>
</body>
</html>`;
  }
}

module.exports = ResendEmailService;
