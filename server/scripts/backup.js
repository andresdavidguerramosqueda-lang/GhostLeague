// Cargar variables de entorno
require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ruta a MongoDB Database Tools
const toolsPath = path.join(__dirname, '../tools/mongodb-tools/bin');
const mongodumpCmd = fs.existsSync(path.join(toolsPath, 'mongodump.exe')) ? 
  path.join(toolsPath, 'mongodump.exe') : 'mongodump';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'ghostleague';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no está definido en .env');
  process.exit(1);
}

// Crear directorio de backups si no existe
const backupsDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Generar timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = path.join(backupsDir, `backup_${timestamp}`);

console.log('🔄 Iniciando backup de MongoDB Atlas...');
console.log(`📂 Directorio de destino: ${backupDir}`);

try {
  // Ejecutar mongodump
  const command = `"${mongodumpCmd}" --uri="${MONGODB_URI}" --gzip --out="${backupDir}"`;
  console.log(`🔧 Ejecutando: ${command}`);
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Backup completado exitosamente!');
  console.log(`📍 Ubicación: ${backupDir}`);
  
  // Calcular tamaño del backup
  const stats = fs.statSync(backupDir);
  console.log(`📊 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  // Listar archivos
  console.log('📋 Archivos creados:');
  const files = fs.readdirSync(backupDir, { recursive: true });
  files.forEach(file => {
    console.log(`  - ${file}`);
  });
  
} catch (error) {
  console.error('❌ Error durante el backup:', error.message);
  process.exit(1);
}
