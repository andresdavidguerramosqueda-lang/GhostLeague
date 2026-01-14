const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Achievement, AchievementProgress, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_DIFFICULTY } = require('../models/Achievement');
const User = require('../models/User');

// @route   GET /api/achievements
// @desc    Obtener logros disponibles
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    
    const achievements = await Achievement.getAvailableAchievements(req.user.id);
    
    // Obtener progreso del usuario
    const userProgress = await AchievementProgress.getUserAchievements(req.user.id);
    const progressMap = new Map();
    
    userProgress.forEach(up => {
      if (up.achievement) {
        progressMap.set(up.achievement._id.toString(), up);
      }
    });
    
    // Filtrar y combinar con progreso
    let filteredAchievements = achievements;
    if (category) {
      filteredAchievements = achievements.filter(a => a.category === category);
    }
    if (difficulty) {
      filteredAchievements = filteredAchievements.filter(a => a.difficulty === difficulty);
    }
    
    const achievementsWithProgress = filteredAchievements.map(achievement => {
      const progress = progressMap.get(achievement._id.toString());
      return {
        ...achievement.toObject(),
        userProgress: progress || null
      };
    });
    
    res.json({ achievements: achievementsWithProgress });
  } catch (error) {
    console.error('Error en GET /achievements:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/achievements/progress
// @desc    Obtener progreso de logros del usuario
// @access  Private
router.get('/progress', auth, async (req, res) => {
  try {
    const { category, status } = req.query;
    
    const progress = await AchievementProgress.getUserAchievements(req.user.id, category);
    
    // Filtrar por estado si se especifica
    let filteredProgress = progress;
    if (status) {
      filteredProgress = progress.filter(p => p.status === status);
    }
    
    res.json({ progress: filteredProgress });
  } catch (error) {
    console.error('Error en GET /achievements/progress:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/achievements/stats
// @desc    Obtener estadísticas de logros del usuario
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await AchievementProgress.getUserStats(req.user.id);
    
    res.json(stats);
  } catch (error) {
    console.error('Error en GET /achievements/stats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/achievements/categories
// @desc    Obtener categorías de logros
// @access  Public
router.get('/categories', (req, res) => {
  try {
    const categories = Object.values(ACHIEVEMENT_CATEGORIES).map(cat => ({
      key: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1)
    }));
    
    res.json({ categories });
  } catch (error) {
    console.error('Error en GET /achievements/categories:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/achievements/difficulties
// @desc    Obtener dificultades de logros
// @access  Public
router.get('/difficulties', (req, res) => {
  try {
    const difficulties = Object.entries(ACHIEVEMENT_DIFFICULTY).map(([key, value]) => ({
      key: value,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      points: {
        bronze: 10,
        silver: 25,
        gold: 50,
        diamond: 100,
        master: 200
      }[value] || 0
    }));
    
    res.json({ difficulties });
  } catch (error) {
    console.error('Error en GET /achievements/difficulties:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/achievements/check
// @desc    Verificar logros basados en eventos del juego
// @access  Private
router.post('/check', auth, async (req, res) => {
  try {
    const { eventType, data } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ message: 'Tipo de evento requerido' });
    }
    
    await AchievementProgress.checkAchievements(req.user.id, eventType, data);
    
    res.json({ message: 'Logros verificados' });
  } catch (error) {
    console.error('Error en POST /achievements/check:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/achievements/create-defaults
// @desc    Crear logros predefinidos (solo admin)
// @access  Private (Admin)
router.post('/create-defaults', auth, require('../middleware/admin'), async (req, res) => {
  try {
    const achievements = await Achievement.createDefaultAchievements();
    
    res.json({
      message: 'Logros predefinidos creados',
      count: achievements.length,
      achievements
    });
  } catch (error) {
    console.error('Error en POST /achievements/create-defaults:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/achievements/leaderboard
// @desc    Obtener ranking de logros
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 50, category } = req.query;
    
    // Agregar para obtener usuarios con más logros completados
    const pipeline = [
      {
        $match: { status: 'completed' }
      },
      {
        $lookup: {
          from: 'achievements',
          localField: 'achievement',
          foreignField: '_id',
          as: 'achievement'
        }
      },
      { $unwind: '$achievement' },
      ...(category ? [{
        $match: { 'achievement.category': category }
      }] : []),
      {
        $group: {
          _id: '$user',
          totalAchievements: { $sum: 1 },
          totalPoints: { $sum: '$achievement.difficultyPoints' },
          achievements: { $push: '$achievement' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          user: {
            _id: '$user._id',
            username: '$user.username',
            avatar: '$user.avatar',
            level: '$user.competitive.level'
          },
          totalAchievements: 1,
          totalPoints: 1,
          achievementCount: { $size: '$achievements' }
        }
      },
      { $sort: { totalPoints: -1, totalAchievements: -1 } },
      { $limit: parseInt(limit) }
    ];
    
    const leaderboard = await AchievementProgress.aggregate(pipeline);
    
    // Agregar ranking
    const leaderboardWithRank = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));
    
    res.json({ leaderboard: leaderboardWithRank });
  } catch (error) {
    console.error('Error en GET /achievements/leaderboard:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/achievements/user/:userId
// @desc    Obtener logros de un usuario específico (perfil público)
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario exista
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Obtener logros completados del usuario
    const completedAchievements = await AchievementProgress.find({
      user: userId,
      status: 'completed'
    })
    .populate({
      path: 'achievement',
      match: { isHidden: false }
    })
    .sort({ completedAt: -1 });
    
    // Filtrar logros ocultos no desbloqueados
    const visibleAchievements = completedAchievements.filter(
      pa => pa.achievement
    );
    
    // Obtener estadísticas
    const stats = await AchievementProgress.getUserStats(userId);
    
    res.json({
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        level: user.competitive.level
      },
      achievements: visibleAchievements.map(pa => ({
        _id: pa.achievement._id,
        name: pa.achievement.name,
        description: pa.achievement.description,
        category: pa.achievement.category,
        difficulty: pa.achievement.difficulty,
        icon: pa.achievement.icon,
        completedAt: pa.completedAt
      })),
      stats: stats.total
    });
  } catch (error) {
    console.error('Error en GET /achievements/user/:userId:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
