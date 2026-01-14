const dns = require('dns').promises;
const validator = require('validator');
const User = require('../models/User');

class ProfessionalEmailValidator {
  /**
   * Valida un correo electrónico de forma profesional y completa
   * @param {string} email - Correo electrónico a validar
   * @param {Object} options - Opciones de validación
   * @returns {Promise<Object>} Resultado de la validación
   */
  static async validateEmail(email, options = {}) {
    const {
      checkDNS = true,
      checkSMTP = false, // Deshabilitado por defecto por ser lento
      checkDatabase = true,
      timeout = 5000
    } = options;

    const result = {
      email: email,
      isValid: false,
      isDeliverable: false,
      existsInDatabase: false,
      validationSteps: {
        format: false,
        domain: false,
        dns: false,
        smtp: false,
        database: false
      },
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // 1. Validación básica de formato
      if (!this.validateFormat(email)) {
        result.errors.push('Formato de correo electrónico inválido');
        return result;
      }
      result.validationSteps.format = true;
      result.isValid = true;

      // 2. Validación de dominio
      const domain = email.split('@')[1].toLowerCase();
      if (!this.validateDomain(domain)) {
        result.errors.push('Dominio inválido o sospechoso');
        return result;
      }
      result.validationSteps.domain = true;

      // 3. Verificación DNS (MX records)
      if (checkDNS) {
        const dnsResult = await this.checkDNSRecords(domain, timeout);
        result.validationSteps.dns = dnsResult.valid;
        result.details.dns = dnsResult;
        
        if (!dnsResult.valid) {
          result.errors.push('El dominio no tiene servidores de correo configurados');
          result.warnings.push('El dominio podría no recibir correos');
        }
      }

      // 4. Verificación SMTP (opcional, puede ser lento)
      if (checkSMTP && result.validationSteps.dns) {
        try {
          const smtpResult = await this.checkSMTP(email, timeout);
          result.validationSteps.smtp = smtpResult.valid;
          result.details.smtp = smtpResult;
          result.isDeliverable = smtpResult.valid;
        } catch (error) {
          result.warnings.push('No se pudo verificar la entrega por SMTP');
          result.details.smtp = { error: error.message };
        }
      }

      // 5. Verificación en base de datos
      if (checkDatabase) {
        const existsInDB = await this.checkIfExistsInDatabase(email);
        result.validationSteps.database = true;
        result.existsInDatabase = existsInDB;
        result.details.database = { exists: existsInDB };
      }

      // Determinar si es entregable
      result.isDeliverable = result.validationSteps.dns && 
                            (!checkSMTP || result.validationSteps.smtp);

    } catch (error) {
      result.errors.push(`Error en validación: ${error.message}`);
      console.error('Error en validación de email:', error);
    }

    return result;
  }

  /**
   * Valida el formato básico del correo
   * @param {string} email 
   * @returns {boolean}
   */
  static validateFormat(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Validación básica con validator
    if (!validator.isEmail(email)) {
      return false;
    }

    // Validación mejorada
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim().toLowerCase());
  }

  /**
   * Valida que el dominio no sea sospechoso
   * @param {string} domain 
   * @returns {boolean}
   */
  static validateDomain(domain) {
    // Lista de dominios temporales conocidos
    const temporaryDomains = [
      'tempmail.org',
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'temp-mail.org',
      'throwaway.email',
      'fakeinbox.com',
      'maildrop.cc',
      'dispostable.com'
    ];

    // Patrones sospechosos
    const suspiciousPatterns = [
      /.*temp.*/,
      /.*10minute.*/,
      /.*guerrilla.*/,
      /.*mailinator.*/,
      /.*yopmail.*/,
      /.*throwaway.*/,
      /.*disposable.*/
    ];

    const isTemporary = temporaryDomains.includes(domain) || 
                     suspiciousPatterns.some(pattern => pattern.test(domain));

    return !isTemporary && domain.length >= 3 && domain.includes('.');
  }

  /**
   * Verifica los registros DNS del dominio
   * @param {string} domain 
   * @param {number} timeout 
   * @returns {Promise<Object>}
   */
  static async checkDNSRecords(domain, timeout = 5000) {
    const result = {
      valid: false,
      hasMX: false,
      hasA: false,
      mxRecords: [],
      aRecords: []
    };

    try {
      // Verificar registros MX (servidores de correo)
      const mxRecords = await dns.resolveMx(domain);
      result.mxRecords = mxRecords;
      result.hasMX = mxRecords.length > 0;

      // Si no hay MX, verificar registros A (fallback)
      if (!result.hasMX) {
        const aRecords = await dns.resolve4(domain);
        result.aRecords = aRecords;
        result.hasA = aRecords.length > 0;
      }

      result.valid = result.hasMX || result.hasA;

    } catch (error) {
      // Error DNS significa que el dominio no existe o no tiene registros
      result.valid = false;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Verifica si el correo existe en la base de datos
   * @param {string} email 
   * @returns {Promise<boolean>}
   */
  static async checkIfExistsInDatabase(email) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ 
        email: normalizedEmail 
      }).select('_id').lean();
      
      return !!existingUser;
    } catch (error) {
      console.error('Error verificando email en base de datos:', error);
      return false;
    }
  }

  /**
   * Verificación SMTP básica (experimental)
   * @param {string} email 
   * @param {number} timeout 
   * @returns {Promise<Object>}
   */
  static async checkSMTP(email, timeout = 5000) {
    // Implementación básica de SMTP
    // NOTA: Esta es una implementación simplificada
    // Para producción, considera usar una librería especializada
    
    return new Promise((resolve) => {
      const result = {
        valid: false,
        error: null,
        details: null
      };

      // Simulación - en producción implementar conexión SMTP real
      setTimeout(() => {
        result.valid = true; // Simulación exitosa
        result.details = 'SMTP verification simulated';
        resolve(result);
      }, 1000);
    });
  }

  /**
   * Validación específica para registro
   * @param {string} email 
   * @returns {Promise<Object>}
   */
  static async validateForRegistration(email) {
    const validation = await this.validateEmail(email, {
      checkDNS: true,
      checkSMTP: false, // Deshabilitado para mejor UX
      checkDatabase: true,
      timeout: 3000
    });

    // Lógica específica para registro
    const registrationResult = {
      ...validation,
      canRegister: false,
      reason: ''
    };

    if (!validation.isValid) {
      registrationResult.reason = 'Correo electrónico inválido';
      return registrationResult;
    }

    if (validation.existsInDatabase) {
      registrationResult.reason = 'El correo electrónico ya está registrado';
      return registrationResult;
    }

    if (!validation.validationSteps.dns) {
      registrationResult.reason = 'El dominio no puede recibir correos';
      return registrationResult;
    }

    registrationResult.canRegister = true;
    registrationResult.reason = 'Correo electrónico válido para registro';

    return registrationResult;
  }

  /**
   * Validación específica para recuperación de contraseña
   * @param {string} email 
   * @returns {Promise<Object>}
   */
  static async validateForPasswordReset(email) {
    const validation = await this.validateEmail(email, {
      checkDNS: false, // No necesario para recuperación
      checkSMTP: false,
      checkDatabase: true,
      timeout: 1000
    });

    const resetResult = {
      ...validation,
      canReset: false,
      reason: ''
    };

    if (!validation.isValid) {
      resetResult.reason = 'Correo electrónico inválido';
      return resetResult;
    }

    if (!validation.existsInDatabase) {
      resetResult.reason = 'Este correo no está registrado';
      return resetResult;
    }

    resetResult.canReset = true;
    resetResult.reason = 'Correo verificado para recuperación';

    return resetResult;
  }

  /**
   * Genera mensaje genérico para no revelar información
   * @param {string} email
   * @returns {string}
   */
  static getGenericMessage(email) {
    return 'Si el correo electrónico está registrado en nuestra plataforma, recibirás instrucciones en tu bandeja de entrada.';
  }
}

module.exports = ProfessionalEmailValidator;
