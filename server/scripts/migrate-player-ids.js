require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { convertOldPlayerId } = require('../utils/playerIdGenerator');

async function migratePlayerIds() {
  try {
    console.log('🔄 Iniciando migración de playerIds...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Encontrar todos los usuarios con playerId antiguo
    const users = await User.find({
      playerId: { 
        $not: /^#[A-Z0-9]{7}$/  // No tiene el formato nuevo #XRGH91F
      }
    });
    
    console.log(`📊 Encontrados ${users.length} usuarios para migrar`);
    
    if (users.length === 0) {
      console.log('✅ No hay usuarios para migrar');
      process.exit(0);
    }
    
    // Migrar cada usuario
    for (const user of users) {
      const oldPlayerId = user.playerId;
      const newPlayerId = convertOldPlayerId(oldPlayerId);
      
      // Verificar que el nuevo ID no exista
      const existingUser = await User.findOne({ playerId: newPlayerId });
      if (existingUser) {
        console.log(`⚠️  Conflicto: ${newPlayerId} ya existe, generando alternativa...`);
        // Generar uno completamente nuevo si hay conflicto
        const { generatePlayerId } = require('../utils/playerIdGenerator');
        user.playerId = generatePlayerId();
      } else {
        user.playerId = newPlayerId;
      }
      
      await user.save();
      console.log(`✅ Migrado: ${oldPlayerId} → ${user.playerId}`);
    }
    
    console.log('🎉 Migración completada exitosamente!');
    console.log(`📈 Se migraron ${users.length} playerIds al formato #XRGH91F`);
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar migración
migratePlayerIds();
