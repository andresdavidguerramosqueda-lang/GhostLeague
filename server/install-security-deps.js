const { execSync } = require('child_process');

console.log('🔧 Instalando dependencias de validación de correos electrónicos...\n');

try {
  // Instalar validator para validación de formatos de email
  console.log('📦 Instalando validator...');
  execSync('npm install validator@13.11.0', { stdio: 'inherit' });
  
  // Instalar email-existence para verificación de dominios
  console.log('📧 Instalando @stationf/email-existence...');
  execSync('npm install @stationf/email-existence@0.2.4', { stdio: 'inherit' });
  
  console.log('\n✅ Dependencias instaladas exitosamente!');
  console.log('📋 Dependencias agregadas:');
  console.log('  - validator@13.11.0: Validación avanzada de correos electrónicos');
  console.log('  - @stationf/email-existence@0.2.4: Verificación de existencia de correos');
  console.log('\n🚀 Reinicia el servidor para aplicar los cambios:');
  console.log('npm start\n');
  
} catch (error) {
  console.error('❌ Error instalando dependencias:', error.message);
  console.log('\n💡 Intenta instalar manualmente:');
  console.log('npm install validator@13.11.0 @stationf/email-existence@0.2.4');
  process.exit(1);
}
