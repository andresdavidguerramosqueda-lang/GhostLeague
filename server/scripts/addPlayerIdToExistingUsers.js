const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const generatePlayerId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '#';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const addPlayerIds = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/liga-dorada');
    console.log('Connected to MongoDB');

    // Find all users without playerId
    const usersWithoutPlayerId = await User.find({ playerId: { $exists: false } });
    console.log(`Found ${usersWithoutPlayerId.length} users without playerId`);

    for (const user of usersWithoutPlayerId) {
      let playerId;
      let isUnique = false;
      
      // Generate unique playerId
      while (!isUnique) {
        playerId = generatePlayerId();
        const existingUser = await User.findOne({ playerId });
        if (!existingUser) {
          isUnique = true;
        }
      }
      
      user.playerId = playerId;
      await user.save();
      console.log(`Added playerId ${playerId} to user ${user.username}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

addPlayerIds();
