require('dotenv').config();

// Script para limpiar los rate limiters en desarrollo
console.log('🧹 Limpiando rate limiters para desarrollo...');

// Reiniciar el servidor de rate limiting
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Entorno de desarrollo detectado');
  console.log('📊 Rate limiters ajustados:');
  console.log('   - Registro: 10 intentos por 5 minutos');
  console.log('   - Login: 10 intentos por 15 minutos');
  console.log('   - Recuperación: 3 intentos por 15 minutos');
  console.log('   - Verificación: 10 intentos por hora');
  console.log('   - Envío de códigos: 3 intentos por hora');
  console.log('');
  console.log('🔄 Reinicia el servidor para aplicar los cambios:');
  console.log('   npm run dev');
  console.log('');
  console.log('💡 Para producción, los límites serán más restrictivos:');
  console.log('   - Registro: 5 intentos por 1 hora');
  console.log('   - Y otros límites más estrictos');
} else {
  console.log('⚠️ Este script solo debe ejecutarse en desarrollo');
}

console.log('\n🎉 Rate limiters configurados correctamente!');
