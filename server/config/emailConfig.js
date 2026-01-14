// Configuración de Nodemailer para diferentes entornos

const emailConfig = {
  // Configuración para desarrollo (usando Ethereal)
  development: {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USER || '',
      pass: process.env.ETHEREAL_PASS || ''
    }
  },

  // Configuración para producción con Gmail
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_PASS || ''
    }
  },

  // Configuración para producción con SendGrid
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY || ''
    }
  },

  // Configuración para producción con Outlook/Hotmail
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.OUTLOOK_USER || '',
      pass: process.env.OUTLOOK_PASS || ''
    }
  },

  // Configuración personalizada desde variables de entorno
  custom: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  }
};

// Función para obtener la configuración apropiada
function getEmailConfig() {
  const env = process.env.NODE_ENV || 'development';
  const emailProvider = process.env.EMAIL_PROVIDER || 'ethereal';

  // Si se especifica un proveedor, usarlo sin importar el entorno
  if (emailProvider !== 'ethereal') {
    switch (emailProvider.toLowerCase()) {
      case 'gmail':
        return emailConfig.gmail;
      case 'sendgrid':
        return emailConfig.sendgrid;
      case 'outlook':
        return emailConfig.outlook;
      case 'custom':
        return emailConfig.custom;
      default:
        return emailConfig.development;
    }
  }

  // En desarrollo sin proveedor específico, usar Ethereal
  if (env === 'development') {
    return emailConfig.development;
  }

  // En producción sin proveedor específico, usar Gmail por defecto
  return emailConfig.gmail;
}

// Función para validar la configuración
function validateEmailConfig() {
  const config = getEmailConfig();
  
  if (!config.host || !config.auth.user || !config.auth.pass) {
    console.warn('⚠️ Configuración de correo incompleta:');
    console.warn(`   Host: ${config.host || 'NO CONFIGURADO'}`);
    console.warn(`   User: ${config.auth.user || 'NO CONFIGURADO'}`);
    console.warn(`   Pass: ${config.auth.pass ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
    return false;
  }

  console.log('✅ Configuración de correo válida');
  return true;
}

module.exports = {
  emailConfig,
  getEmailConfig,
  validateEmailConfig
};
