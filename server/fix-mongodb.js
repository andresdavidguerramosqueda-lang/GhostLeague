const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧹 Limpiando cache y reinstalando...');

try {
  // Eliminar node_modules
  if (fs.existsSync('./node_modules')) {
    execSync('rmdir /s /q node_modules', { stdio: 'inherit' });
    console.log('✅ node_modules eliminado');
  }

  // Limpiar cache de npm
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Cache limpiado');

  // Reinstalar dependencias
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencias reinstaladas');

  console.log('🚀 Ahora ejecuta: npm start');
} catch (error) {
  console.error('❌ Error:', error.message);
}
