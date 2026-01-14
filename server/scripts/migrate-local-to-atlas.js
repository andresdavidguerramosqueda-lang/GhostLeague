const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const LOCAL_DB = 'liga_dorada';
const ATLAS_URI = 'mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague?retryWrites=true&w=majority';
const BACKUP_DIR = path.join(__dirname, '../migrations');

// Rutas a MongoDB Database Tools
const toolsPath = path.join(__dirname, '../tools/mongodb-tools/bin');
const mongodumpCmd = fs.existsSync(path.join(toolsPath, 'mongodump.exe')) ? 
  path.join(toolsPath, 'mongodump.exe') : 'mongodump';
const mongorestoreCmd = fs.existsSync(path.join(toolsPath, 'mongorestore.exe')) ? 
  path.join(toolsPath, 'mongorestore.exe') : 'mongorestore';

console.log(`🔧 Usando herramientas desde: ${toolsPath}`);
console.log(`📁 mongodump: ${mongodumpCmd}`);
console.log(`📁 mongorestore: ${mongorestoreCmd}`);

console.log('🔄 Iniciando migración de MongoDB local a Atlas...');

// Crear directorio de migraciones
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const migrationDir = path.join(BACKUP_DIR, `migration_${timestamp}`);

console.log(`📂 Directorio temporal: ${migrationDir}`);

try {
  // PASO 1: Exportar desde MongoDB local
  console.log('\n📤 PASO 1: Exportando desde MongoDB local...');
  console.log(`📍 Base de datos local: ${LOCAL_DB}`);
  
  const exportCmd = `"${mongodumpCmd}" --db="${LOCAL_DB}" --out="${migrationDir}" --gzip`;
  console.log(`🔧 Ejecutando: ${exportCmd}`);
  
  execSync(exportCmd, { stdio: 'inherit' });
  console.log('✅ Exportación local completada');

  // Listar colecciones exportadas
  const localDir = path.join(migrationDir, LOCAL_DB);
  if (fs.existsSync(localDir)) {
    const collections = fs.readdirSync(localDir).filter(file => file.endsWith('.bson.gz'));
    console.log(`📋 Colecciones exportadas: ${collections.length}`);
    collections.forEach(col => console.log(`  - ${col.replace('.bson.gz', '')}`));
  }

  // PASO 2: Importar a MongoDB Atlas
  console.log('\n📥 PASO 2: Importando a MongoDB Atlas...');
  console.log(`🎯 Destino: ghostleague`);
  
  const importCmd = `"${mongorestoreCmd}" --uri="${ATLAS_URI}" --drop --gzip "${localDir}"`;
  console.log(`🔧 Ejecutando: ${importCmd}`);
  
  execSync(importCmd, { stdio: 'inherit' });
  console.log('✅ Importación a Atlas completada');

  // PASO 3: Validar migración
  console.log('\n🔍 PASO 3: Validando migración...');
  
  // Contar documentos en Atlas
  const validateCmd = `mongo "${ATLAS_URI}" --eval "db.runCommand('listCollections').cursor.firstBatch.forEach(col => { const count = db[col.name].countDocuments(); console.log(col.name + ': ' + count + ' documentos'); })"`;
  
  try {
    execSync(validateCmd, { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️ Validación manual requerida');
  }

  console.log('\n✅ Migración completada exitosamente!');
  console.log(`📍 Datos migrados a: ${ATLAS_URI.split('/')[3]}`);
  console.log(`📂 Backup local guardado en: ${migrationDir}`);

} catch (error) {
  console.error('❌ Error durante migración:', error.message);
  process.exit(1);
}
