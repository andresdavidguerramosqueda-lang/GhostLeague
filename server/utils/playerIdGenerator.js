const crypto = require('crypto');

/**
 * Genera un playerId único en formato #XRGH91F
 * @returns {string} playerId único
 */
function generatePlayerId() {
  return `#${crypto.randomBytes(4).toString('hex').toUpperCase().substr(0, 7)}`;
}

/**
 * Genera un playerId único verificando que no exista en la base de datos
 * @param {Model} UserModel - Modelo de usuario de Mongoose
 * @returns {Promise<string>} playerId único garantizado
 */
async function generateUniquePlayerId(UserModel) {
  let playerId;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    playerId = generatePlayerId();
    attempts++;
    
    // Verificar si ya existe
    const existingUser = await UserModel.findOne({ playerId });
    
    if (!existingUser) {
      return playerId;
    }
    
    // Si existe después de varios intentos, usar timestamp como fallback
    if (attempts >= maxAttempts) {
      const timestamp = Date.now().toString(36).toUpperCase().substr(-4);
      const random = crypto.randomBytes(2).toString('hex').toUpperCase().substr(0, 3);
      return `#${timestamp}${random}`;
    }
  } while (true);
}

/**
 * Convierte un playerId antiguo al nuevo formato
 * @param {string} oldPlayerId - playerId antiguo
 * @returns {string} playerId nuevo en formato #XRGH91F
 */
function convertOldPlayerId(oldPlayerId) {
  if (!oldPlayerId) return generatePlayerId();
  
  // Si ya tiene el formato correcto, retornarlo
  if (oldPlayerId.startsWith('#') && oldPlayerId.length === 8) {
    return oldPlayerId;
  }
  
  // Extraer caracteres del ID antiguo y convertir
  const cleanId = oldPlayerId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const hash = crypto.createHash('md5').update(cleanId).digest('hex').toUpperCase();
  
  return `#${hash.substr(0, 7)}`;
}

module.exports = {
  generatePlayerId,
  generateUniquePlayerId,
  convertOldPlayerId
};
