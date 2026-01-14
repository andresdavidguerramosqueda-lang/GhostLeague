const ProfessionalEmailValidator = require('./professionalEmailValidator');
const User = require('../models/User');

class EmailValidationService {
  /**
   * Valida formato de correo electrónico (mantener compatibilidad)
   * @param {string} email 
   * @returns {boolean}
   */
  static isValidEmail(email) {
    return ProfessionalEmailValidator.validateFormat(email);
  }

  /**
   * Verifica si un correo ya existe en la base de datos
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  static async emailExistsInDatabase(email) {
    return await ProfessionalEmailValidator.checkIfExistsInDatabase(email);
  }

  /**
   * Validación completa para registro usando el sistema profesional
   * @param {string} email
   * @returns {Promise<object>}
   */
  static async validateForRegistration(email) {
    try {
      const result = await ProfessionalEmailValidator.validateForRegistration(email);
      
      // Convertir al formato esperado por el código existente
      return {
        isValid: result.isValid,
        isTemporary: !result.validationSteps.domain,
        exists: result.existsInDatabase,
        canRegister: result.canRegister,
        messages: [result.reason],
        risk: result.warnings.length > 0 ? 'medium' : 'low',
        verificationMethod: result.validationSteps.dns ? 'dns' : 'basic',
        verificationDetails: result.details
      };
    } catch (error) {
      console.error('Error en validación de registro:', error);
      return {
        isValid: false,
        isTemporary: false,
        exists: false,
        canRegister: false,
        messages: ['Error en la validación del correo'],
        risk: 'high',
        verificationMethod: 'error',
        verificationDetails: { error: error.message }
      };
    }
  }

  /**
   * Validación para recuperación de contraseña
   * @param {string} email
   * @returns {Promise<object>}
   */
  static async validateForPasswordReset(email) {
    try {
      const result = await ProfessionalEmailValidator.validateForPasswordReset(email);
      
      return {
        isValid: result.isValid,
        exists: result.existsInDatabase,
        canReset: result.canReset,
        messages: [result.reason],
        risk: 'low',
        verificationMethod: 'database',
        verificationDetails: result.details
      };
    } catch (error) {
      console.error('Error en validación de recuperación:', error);
      return {
        isValid: false,
        exists: false,
        canReset: false,
        messages: ['Error en la validación del correo'],
        risk: 'high',
        verificationMethod: 'error',
        verificationDetails: { error: error.message }
      };
    }
  }

  /**
   * Genera mensaje genérico para no revelar información
   * @param {string} email
   * @returns {string}
   */
  static getGenericEmailMessage(email) {
    return ProfessionalEmailValidator.getGenericMessage(email);
  }

  /**
   * Analiza dominio de correo (mantener compatibilidad)
   * @param {string} email
   * @returns {object}
   */
  static analyzeEmailDomain(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    const isTemporary = !ProfessionalEmailValidator.validateDomain(domain);
    
    return {
      domain,
      isTemporary,
      isSuspicious: isTemporary,
      risk: isTemporary ? 'high' : 'low'
    };
  }
}

module.exports = EmailValidationService;
