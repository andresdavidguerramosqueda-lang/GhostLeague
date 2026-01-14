const { execSync } = require('child_process');

const ATLAS_URI = 'mongodb+srv://andresdavidguerramosqueda_db_user:3tEcocu37v1xqdrL@ghostleague-cluster.mm2dqug.mongodb.net/ghostleague?retryWrites=true&w=majority';

console.log('🔍 Validando datos en MongoDB Atlas...\n');

try {
  // Listar colecciones y contar documentos
  const validateCmd = `mongo "${ATLAS_URI}" --eval "
    print('=== COLECCIONES EN ATLAS ===');
    db.runCommand('listCollections').cursor.firstBatch.forEach(col => {
      const count = db[col.name].countDocuments();
      if (count > 0) {
        print(col.name + ': ' + count + ' documentos');
      }
    });
    
    print('\n=== TOTAL DE DOCUMENTOS ===');
    const stats = db.stats();
    print('Total documentos: ' + stats.objects);
    print('Total colecciones: ' + stats.collections);
    print('Tamaño total: ' + (stats.dataSize / 1024 / 1024).toFixed(2) + ' MB');
  "`;
  
  execSync(validateCmd, { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error validando:', error.message);
  
  // Alternativa: mostrar comandos manuales
  console.log('\n📋 Para validar manualmente en MongoDB Compass:');
  console.log(`1. Conectar a: ${ATLAS_URI}`);
  console.log('2. Ir a la pestaña "Collections"');
  console.log('3. Verificar que todas las colecciones tengan datos');
}
