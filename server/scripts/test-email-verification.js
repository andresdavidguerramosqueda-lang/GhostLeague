require('dotenv').config();
const EmailVerificationService = require('../services/emailVerificationService');

async function testEmailVerification() {
  console.log('🧪 Iniciando pruebas del sistema de verificación de correos...\n');

  const testEmail = 'test@example.com';
  const ipAddress = '127.0.0.1';
  const userAgent = 'Test Script';

  try {
    // Prueba 1: Enviar código de verificación
    console.log('📧 Prueba 1: Enviando código de verificación...');
    const sendResult = await EmailVerificationService.sendVerificationCode(
      testEmail, 
      ipAddress, 
      userAgent
    );

    console.log('Resultado:', sendResult);
    
    if (!sendResult.success) {
      console.log('❌ Error enviando código:', sendResult.message);
      return;
    }

    console.log('✅ Código enviado exitosamente');
    if (sendResult.previewUrl) {
      console.log(`🔗 Vista previa: ${sendResult.previewUrl}`);
    }

    // Prueba 2: Intentar con código incorrecto
    console.log('\n🔍 Prueba 2: Verificando código incorrecto...');
    const wrongCode = '9999';
    const verifyWrongResult = await EmailVerificationService.verifyCode(
      testEmail, 
      wrongCode
    );

    console.log('Resultado:', verifyWrongResult);
    console.log(verifyWrongResult.success ? '✅' : '❌', verifyWrongResult.message);

    // Prueba 3: Generar un código válido para la prueba
    console.log('\n🔢 Generando código de prueba...');
    const testCode = EmailVerificationService.generateVerificationCode();
    console.log(`Código generado: ${testCode}`);

    // Simular que el código fue guardado en la base de datos
    const EmailVerificationCode = require('../models/EmailVerificationCode');
    await EmailVerificationCode.deleteMany({ email: testEmail }); // Limpiar anteriores
    
    const verificationDoc = new EmailVerificationCode({
      email: testEmail,
      code: testCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
      ipAddress,
      userAgent
    });
    await verificationDoc.save();

    // Prueba 4: Verificar código correcto
    console.log('\n✅ Prueba 4: Verificando código correcto...');
    const verifyCorrectResult = await EmailVerificationService.verifyCode(
      testEmail, 
      testCode
    );

    console.log('Resultado:', verifyCorrectResult);
    console.log(verifyCorrectResult.success ? '✅' : '❌', verifyCorrectResult.message);

    // Prueba 5: Marcar usuario como verificado
    if (verifyCorrectResult.success) {
      console.log('\n🎯 Prueba 5: Marcando usuario como verificado...');
      const markResult = await EmailVerificationService.markUserAsVerified(testEmail);
      
      console.log('Resultado:', markResult);
      console.log(markResult.success ? '✅' : '❌', markResult.message);
    }

    // Prueba 6: Limpiar códigos expirados
    console.log('\n🗑️ Prueba 6: Limpiando códigos expirados...');
    const cleanupResult = await EmailVerificationService.cleanupExpiredCodes();
    console.log(`Códigos eliminados: ${cleanupResult}`);

    console.log('\n🎉 Pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar pruebas
testEmailVerification().catch(console.error);
