const { execSync } = require('child_process');

const ATLAS_URI = 'mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague?retryWrites=true&w=majority';

console.log('🔍 Validando datos en MongoDB Atlas...\n');

try {
  // Usar mongosh en lugar de mongo
  const validateCmd = `mongosh "${ATLAS_URI}" --eval "
    print('=== ESTADÍSTICAS DE LA BASE DE DATOS ===');
    const stats = db.stats();
    print('Base de datos: ' + stats.db);
    print('Total colecciones: ' + stats.collections);
    print('Total documentos: ' + stats.objects);
    print('Tamaño total: ' + (stats.dataSize / 1024 / 1024).toFixed(2) + ' MB');
    print('Total índices: ' + stats.indexes);
    
    print('\\n=== COLECCIONES CON DATOS ===');
    db.runCommand('listCollections').cursor.firstBatch.forEach(col => {
      const count = db[col.name].countDocuments();
      if (count > 0) {
        print(col.name + ': ' + count + ' documentos');
      }
    });
  "`;
  
  execSync(validateCmd, { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error validando:', error.message);
  
  // Alternativa: mostrar comandos manuales
  console.log('\n📋 Para validar manualmente:');
  console.log('1. Abre MongoDB Compass');
  console.log('2. Conecta con: ' + ATLAS_URI);
  console.log('3. Verifica las colecciones y documentos');
}
