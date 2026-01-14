const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuración del transporter (usa tus credenciales reales)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verificar configuración de email
const isEmailConfigured = () => {
  return process.env.EMAIL_USER && process.env.EMAIL_PASS;
};

// Generar token seguro
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Enviar correo de restablecimiento
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  // Verificar si el email está configurado
  if (!isEmailConfigured()) {
    console.warn('⚠️  Email no configurado. Simulando envío a:', userEmail);
    console.log('🔗 Enlace de restablecimiento:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
    console.log('🔑 Token para pruebas:', resetToken);
    return true; // Simular envío exitoso para desarrollo
  }
  
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Ghost League" <noreply@ghostleague.com>',
    to: userEmail,
    subject: '🔑 Restablecer contraseña - Ghost League',
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer Contraseña - Ghost League</title>
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
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
        .message-box {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
        }
        .message-box p {
            color: rgba(255, 255, 255, 0.85);
            font-size: 1.02em;
            line-height: 1.7;
            margin: 0 0 12px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1.05em;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            margin: 20px 0;
        }
        .link-box {
            background: rgba(245, 158, 11, 0.08);
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 10px;
            padding: 18px;
            margin: 24px 0;
            word-break: break-all;
        }
        .link-box p {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.85em;
            margin-bottom: 10px;
        }
        .link-box a {
            color: #fbbf24;
            font-size: 0.9em;
            text-decoration: none;
        }
        .warning-box {
            background: rgba(239, 68, 68, 0.1);
            border-left: 4px solid #ef4444;
            padding: 18px 20px;
            margin: 28px 0;
            border-radius: 8px;
            font-size: 0.92em;
            line-height: 1.6;
        }
        .warning-box strong {
            color: #fca5a5;
            display: block;
            margin-bottom: 6px;
            font-size: 1.05em;
        }
        .warning-box p {
            color: rgba(255, 255, 255, 0.85);
            margin: 0;
        }
        .expiry-notice {
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.9em;
            margin-top: 28px;
            padding: 16px;
            background: rgba(251, 191, 36, 0.08);
            border-radius: 10px;
        }
        .expiry-notice strong {
            color: #fbbf24;
            font-weight: 600;
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
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="container">
            <div class="header">
                <div class="logo">🔑</div>
                <h1>Ghost League</h1>
                <p>Restablecimiento de Contraseña</p>
            </div>
            
            <div class="content">
                <p class="greeting">
                    Hola, recibimos una solicitud para restablecer tu contraseña.
                </p>
                
                <div class="message-box">
                    <p>
                        Si realizaste esta solicitud, haz clic en el botón de abajo para crear una nueva contraseña.
                    </p>
                    <p style="margin-bottom: 0;">
                        Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                    </p>
                </div>
                
                <div style="text-align: center;">
                    <a class="cta-button" href="${resetUrl}">
                        Restablecer Contraseña
                    </a>
                </div>

                <div class="link-box">
                    <p>O copia y pega este enlace en tu navegador:</p>
                    <a href="${resetUrl}">${resetUrl}</a>
                </div>
                
                <div class="warning-box">
                    <strong>⚠️ Importante</strong>
                    <p>
                        Nunca compartas este enlace con nadie. Nuestro equipo jamás te pedirá 
                        tu enlace de restablecimiento por teléfono, email o redes sociales.
                    </p>
                </div>

                <div class="expiry-notice">
                    ⏱️ Este enlace expirará en <strong>1 hora</strong> por razones de seguridad.
                </div>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Ghost League. Todos los derechos reservados.</p>
                <p>Este es un correo automático, por favor no responder directamente.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Correo de restablecimiento enviado a:', userEmail);
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de restablecimiento:', error.message);
    console.log('📧 Enlace de restablecimiento (fallback):', resetUrl);
    console.log('🔑 Token para pruebas:', resetToken);
    
    // No lanzar error para que el proceso continúe
    return true;
  }
};

module.exports = {
  generateResetToken,
  sendPasswordResetEmail
};
