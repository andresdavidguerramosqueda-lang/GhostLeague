const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Mission, MissionProgress, MISSION_TYPES, MISSION_STATUS } = require('../models/Mission');
const User = require('../models/User');

// @route   GET /api/missions
// @desc    Obtener misiones disponibles para el usuario
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    
    const missions = await Mission.getAvailableMissions(req.user.id, type);
    
    // Obtener progreso del usuario
    const userProgress = await MissionProgress.getUserMissions(req.user.id, 'in_progress');
    const progressMap = new Map();
    
    userProgress.forEach(up => {
      if (up.mission) {
        progressMap.set(up.mission._id.toString(), up);
      }
    });
    
    // Combinar misiones con progreso
    const missionsWithProgress = missions.map(mission => {
      const progress = progressMap.get(mission._id.toString());
      return {
        ...mission.toObject(),
        userProgress: progress || null
      };
    });
    
    res.json({ missions: missionsWithProgress });
  } catch (error) {
    console.error('Error en GET /missions:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/missions/progress
// @desc    Obtener progreso de misiones del usuario
// @access  Private
router.get('/progress', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let filterStatus = status;
    if (!filterStatus) {
      filterStatus = ['in_progress', 'completed'];
    }
    
    const progress = await MissionProgress.getUserMissions(req.user.id, filterStatus);
    
    // Filtrar por tipo si se especifica
    let filteredProgress = progress;
    if (type) {
      filteredProgress = progress.filter(p => 
        p.mission && p.mission.type === type
      );
    }
    
    res.json({ progress: filteredProgress });
  } catch (error) {
    console.error('Error en GET /missions/progress:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/missions/:id/start
// @desc    Iniciar una misión
// @access  Private
router.post('/:id/start', auth, async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id);
    
    if (!mission || !mission.isActive) {
      return res.status(404).json({ message: 'Misión no encontrada' });
    }
    
    // Verificar si ya tiene progreso
    const existingProgress = await MissionProgress.findOne({
      user: req.user.id,
      mission: req.params.id
    });
    
    if (existingProgress) {
      return res.status(400).json({ 
        message: 'Ya has iniciado esta misión',
        progress: existingProgress
      });
    }
    
    // Verificar que la misión esté disponible
    const availableMissions = await Mission.getAvailableMissions(req.user.id);
    const isAvailable = availableMissions.some(m => m._id.toString() === req.params.id);
    
    if (!isAvailable) {
      return res.status(400).json({ 
        message: 'Esta misión no está disponible para ti' 
      });
    }
    
    // Crear progreso inicial
    const progress = new MissionProgress({
      user: req.user.id,
      mission: req.params.id,
      progress: mission.requirements.map(req => ({
        requirement: req.type,
        current: 0,
        completed: false
      }))
    });
    
    await progress.save();
    await progress.populate('mission');
    
    res.status(201).json({
      message: 'Misión iniciada',
      progress
    });
  } catch (error) {
    console.error('Error en POST /missions/:id/start:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/missions/:id/claim
// @desc    Reclamar recompensas de una misión completada
// @access  Private
router.post('/:id/claim', auth, async (req, res) => {
  try {
    const progress = await MissionProgress.findOne({
      user: req.user.id,
      mission: req.params.id
    }).populate('mission');
    
    if (!progress) {
      return res.status(404).json({ message: 'Progreso no encontrado' });
    }
    
    if (progress.status !== MISSION_STATUS.COMPLETED) {
      return res.status(400).json({ 
        message: 'La misión no está completada' 
      });
    }
    
    if (progress.rewardsClaimed) {
      return res.status(400).json({ 
        message: 'Recompensas ya reclamadas' 
      });
    }
    
    // Reclamar recompensas
    const rewards = await progress.claimRewards();
    
    res.json({
      message: 'Recompensas reclamadas',
      rewards
    });
  } catch (error) {
    console.error('Error en POST /missions/:id/claim:', error);
    if (error.message.includes('No puedes reclamar')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/missions/update-progress
// @desc    Actualizar progreso de misiones (endpoint interno)
// @access  Private
router.post('/update-progress', auth, async (req, res) => {
  try {
    const { eventType, data } = req.body;
    
    // Obtener misiones en progreso del usuario
    const userProgress = await MissionProgress.find({
      user: req.user.id,
      status: MISSION_STATUS.ACTIVE
    }).populate('mission');
    
    const updatedMissions = [];
    
    for (const progress of userProgress) {
      // Verificar si la misión tiene un requisito que coincide con el evento
      const matchingRequirements = progress.mission.requirements.filter(
        req => req.type === eventType
      );
      
      for (const requirement of matchingRequirements) {
        await progress.updateProgress(requirement.type, data.increment || 1);
        updatedMissions.push(progress._id);
      }
    }
    
    res.json({
      message: 'Progreso actualizado',
      updatedCount: updatedMissions.length
    });
  } catch (error) {
    console.error('Error en POST /missions/update-progress:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/missions/daily
// @desc    Obtener misiones diarias
// @access  Private
router.get('/daily', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dailyMissions = await Mission.find({
      type: MISSION_TYPES.DAILY,
      isActive: true,
      startDate: { $gte: today },
      endDate: { $lt: tomorrow }
    });
    
    // Obtener progreso
    const userProgress = await MissionProgress.find({
      user: req.user.id,
      mission: { $in: dailyMissions.map(m => m._id) }
    });
    
    const progressMap = new Map();
    userProgress.forEach(up => {
      progressMap.set(up.mission.toString(), up);
    });
    
    const missionsWithProgress = dailyMissions.map(mission => ({
      ...mission.toObject(),
      userProgress: progressMap.get(mission._id.toString()) || null
    }));
    
    res.json({ missions: missionsWithProgress });
  } catch (error) {
    console.error('Error en GET /missions/daily:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/missions/generate-daily
// @desc    Generar misiones diarias (solo admin)
// @access  Private (Admin)
router.post('/generate-daily', auth, require('../middleware/admin'), async (req, res) => {
  try {
    const missions = await Mission.generateDailyMissions();
    
    res.json({
      message: 'Misiones diarias generadas',
      count: missions.length,
      missions
    });
  } catch (error) {
    console.error('Error en POST /missions/generate-daily:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
