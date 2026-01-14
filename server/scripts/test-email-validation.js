require('dotenv').config();
const ProfessionalEmailValidator = require('../services/professionalEmailValidator');

async function testEmailValidation() {
  console.log('🧪 Iniciando pruebas de validación de correos electrónicos...\n');

  // Casos de prueba
  const testCases = [
    {
      email: 'test@gmail.com',
      description: 'Correo real y válido'
    },
    {
      email: 'user@outlook.com',
      description: 'Correo Outlook válido'
    },
    {
      email: 'invalid-email',
      description: 'Formato inválido'
    },
    {
      email: 'test@nonexistentdomain12345.com',
      description: 'Dominio inexistente'
    },
    {
      email: 'user@tempmail.org',
      description: 'Dominio temporal'
    },
    {
      email: 'test@10minutemail.com',
      description: 'Correo temporal conocido'
    },
    {
      email: 'alreadyregistered@example.com',
      description: 'Correo ya registrado (simulado)'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📧 Probando: ${testCase.email}`);
    console.log(`📝 Descripción: ${testCase.description}`);
    
    try {
      // Validación completa
      const result = await ProfessionalEmailValidator.validateEmail(testCase.email, {
        checkDNS: true,
        checkSMTP: false,
        checkDatabase: false, // Deshabilitado para pruebas
        timeout: 3000
      });

      console.log('✅ Resultado:');
      console.log(`   - Válido: ${result.isValid}`);
      console.log(`   - Entregable: ${result.isDeliverable}`);
      console.log(`   - Formato: ${result.validationSteps.format ? '✅' : '❌'}`);
      console.log(`   - Dominio: ${result.validationSteps.domain ? '✅' : '❌'}`);
      console.log(`   - DNS: ${result.validationSteps.dns ? '✅' : '❌'}`);
      
      if (result.errors.length > 0) {
        console.log(`   - Errores: ${result.errors.join(', ')}`);
      }
      
      if (result.warnings.length > 0) {
        console.log(`   - Advertencias: ${result.warnings.join(', ')}`);
      }

      if (result.details.dns) {
        console.log(`   - DNS MX: ${result.details.dns.hasMX ? '✅' : '❌'}`);
        console.log(`   - DNS A: ${result.details.dns.hasA ? '✅' : '❌'}`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
  }

  // Prueba específica para registro
  console.log('\n🔐 Pruebas específicas para registro:\n');
  
  const registrationTest = await ProfessionalEmailValidator.validateForRegistration('test@gmail.com');
  console.log('📝 Registro - test@gmail.com:');
  console.log(`   - Puede registrarse: ${registrationTest.canRegister}`);
  console.log(`   - Razón: ${registrationTest.reason}`);
  console.log(`   - Existe en BD: ${registrationTest.existsInDatabase}`);

  // Prueba específica para recuperación
  console.log('\n🔑 Pruebas específicas para recuperación:\n');
  
  const resetTest = await ProfessionalEmailValidator.validateForPasswordReset('nonexistent@example.com');
  console.log('📝 Recuperación - nonexistent@example.com:');
  console.log(`   - Puede recuperar: ${resetTest.canReset}`);
  console.log(`   - Razón: ${resetTest.reason}`);
  console.log(`   - Existe en BD: ${resetTest.existsInDatabase}`);

  console.log('\n🎉 Pruebas completadas!');
}

// Ejecutar pruebas
testEmailValidation().catch(console.error);
