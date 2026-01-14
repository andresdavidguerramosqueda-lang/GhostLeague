// Cargar variables de entorno
require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ruta a MongoDB Database Tools
const toolsPath = path.join(__dirname, '../tools/mongodb-tools/bin');
const mongorestoreCmd = fs.existsSync(path.join(toolsPath, 'mongorestore.exe')) ? 
  path.join(toolsPath, 'mongorestore.exe') : 'mongorestore';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'ghostleague';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no está definido en .env');
  process.exit(1);
}

// Obtener directorio de backup desde argumentos
const backupPath = process.argv[2];

if (!backupPath) {
  console.error('❌ Debes especificar la ruta del backup');
  console.log('💡 Uso: node restore.js /ruta/al/backup');
  console.log('📂 Backups disponibles:');
  
  // Listar backups disponibles
  const backupsDir = path.join(__dirname, '../backups');
  if (fs.existsSync(backupsDir)) {
    const backups = fs.readdirSync(backupsDir)
      .filter(dir => dir.startsWith('backup_'))
      .sort()
      .reverse();
    
    backups.forEach(backup => {
      console.log(`  - ${path.join(backupsDir, backup)}`);
    });
  }
  
  process.exit(1);
}

const fullBackupPath = path.resolve(backupPath);
const ghostleagueBackupPath = path.join(fullBackupPath, DB_NAME);

// Verificar que el backup existe
if (!fs.existsSync(ghostleagueBackupPath)) {
  console.error(`❌ No se encuentra el backup en: ${ghostleagueBackupPath}`);
  process.exit(1);
}

console.log('🔄 Iniciando restauración de MongoDB Atlas...');
console.log(`📂 Origen: ${ghostleagueBackupPath}`);
console.log(`🎯 Destino: ${DB_NAME}`);

try {
  // Confirmar restauración
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('⚠️  Esto sobrescribirá todos los datos existentes. ¿Continuar? (s/N): ', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'si') {
      console.log('❌ Restauración cancelada');
      process.exit(0);
    }
    
    performRestore();
  });
  
} catch (error) {
  performRestore();
}

function performRestore() {
  try {
    // Ejecutar mongorestore
    const command = `"${mongorestoreCmd}" --uri="${MONGODB_URI}" --drop --gzip "${ghostleagueBackupPath}"`;
    console.log(`🔧 Ejecutando: ${command}`);
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('✅ Restauración completada exitosamente!');
    console.log(`📊 Base de datos "${DB_NAME}" restaurada desde: ${ghostleagueBackupPath}`);
    
  } catch (error) {
    console.error('❌ Error durante la restauración:', error.message);
    process.exit(1);
  }
}
