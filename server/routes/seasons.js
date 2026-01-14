const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Season = require('../models/Season');
const User = require('../models/User');

// @route   GET /api/seasons/current
// @desc    Obtener temporada actual o próxima
// @access  Public
router.get('/current', async (req, res) => {
  try {
    const season = await Season.getCurrentOrNext()
      .populate('number name description theme primaryColor secondaryColor status startDate endDate');
    
    if (!season) {
      return res.json({ season: null });
    }
    
    res.json({ season });
  } catch (error) {
    console.error('Error en GET /seasons/current:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/seasons
// @desc    Obtener lista de temporadas
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { limit = 10, skip = 0, status } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const seasons = await Season.find(query)
      .sort({ number: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Season.countDocuments(query);
    
    res.json({
      seasons,
      total,
      hasMore: (parseInt(skip) + seasons.length) < total
    });
  } catch (error) {
    console.error('Error en GET /seasons:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/seasons/:id
// @desc    Obtener detalles de una temporada
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    
    if (!season) {
      return res.status(404).json({ message: 'Temporada no encontrada' });
    }
    
    // Obtener top 100 jugadores de la temporada
    const topPlayers = await User.find()
      .sort({ 'competitive.points': -1 })
      .limit(100)
      .select('username avatar competitive.points competitive.level');
    
    res.json({
      season,
      topPlayers: topPlayers.map((player, index) => ({
        rank: index + 1,
        ...player.toObject()
      }))
    });
  } catch (error) {
    console.error('Error en GET /seasons/:id:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/seasons/:id/stats
// @desc    Obtener estadísticas de una temporada
// @access  Public
router.get('/:id/stats', async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    
    if (!season) {
      return res.status(404).json({ message: 'Temporada no encontrada' });
    }
    
    // Actualizar estadísticas si está activa
    if (season.status === 'active') {
      await season.updateStatistics();
    }
    
    res.json(season.statistics);
  } catch (error) {
    console.error('Error en GET /seasons/:id/stats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   GET /api/seasons/:id/history
// @desc    Obtener historial de temporadas pasadas
// @access  Public
router.get('/:id/history', async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;
    
    const seasons = await Season.getSeasonHistory(
      parseInt(limit),
      parseInt(skip)
    );
    
    res.json({ seasons });
  } catch (error) {
    console.error('Error en GET /seasons/:id/history:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST /api/seasons
// @desc    Crear nueva temporada (solo admin)
// @access  Private (Admin)
router.post('/', auth, require('../middleware/admin'), async (req, res) => {
  try {
    const {
      number,
      name,
      description,
      theme,
      primaryColor,
      secondaryColor,
      startDate,
      endDate,
      rewards,
      communityGoals
    } = req.body;
    
    // Verificar que no exista una temporada activa
    const activeSeason = await Season.getActiveSeason();
    if (activeSeason) {
      return res.status(400).json({
        message: 'Ya existe una temporada activa',
        activeSeason
      });
    }
    
    // Verificar que el número no exista
    const existingNumber = await Season.findOne({ number });
    if (existingNumber) {
      return res.status(400).json({
        message: 'El número de temporada ya existe'
      });
    }
    
    const season = new Season({
      number,
      name,
      description,
      theme,
      primaryColor,
      secondaryColor,
      startDate,
      endDate,
      rewards,
      communityGoals,
      status: 'upcoming'
    });
    
    await season.save();
    
    res.status(201).json({
      message: 'Temporada creada',
      season
    });
  } catch (error) {
    console.error('Error en POST /seasons:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/seasons/:id/start
// @desc    Iniciar una temporada (solo admin)
// @access  Private (Admin)
router.put('/:id/start', auth, require('../middleware/admin'), async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    
    if (!season) {
      return res.status(404).json({ message: 'Temporada no encontrada' });
    }
    
    if (season.status !== 'upcoming') {
      return res.status(400).json({
        message: 'Solo se pueden iniciar temporadas pendientes'
      });
    }
    
    // Verificar que no haya otra temporada activa
    const activeSeason = await Season.getActiveSeason();
    if (activeSeason && activeSeason._id.toString() !== req.params.id) {
      return res.status(400).json({
        message: 'Ya existe una temporada activa'
      });
    }
    
    season.status = 'active';
    await season.save();
    
    // Notificar a todos los usuarios
    const Notification = require('../models/Notification');
    await Notification.insertMany(
      await User.find().select('_id'),
      {
        type: 'season_started',
        title: '¡Nueva temporada!',
        message: `La temporada ${season.number}: ${season.name} ha comenzado`,
        data: { seasonId: season._id }
      }
    );
    
    res.json({
      message: 'Temporada iniciada',
      season
    });
  } catch (error) {
    console.error('Error en PUT /seasons/:id/start:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/seasons/:id/finalize
// @desc    Finalizar una temporada (solo admin)
// @access  Private (Admin)
router.put('/:id/finalize', auth, require('../middleware/admin'), async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    
    if (!season) {
      return res.status(404).json({ message: 'Temporada no encontrada' });
    }
    
    if (season.status !== 'active') {
      return res.status(400).json({
        message: 'Solo se pueden finalizar temporadas activas'
      });
    }
    
    // Finalizar temporada y guardar historial
    const seasonHistory = await season.finalize();
    
    // Resetear puntos competitivos
    await User.updateMany(
      {},
      {
        'competitive.points': 0,
        $push: { seasonHistory: { $each: seasonHistory } }
      }
    );
    
    res.json({
      message: 'Temporada finalizada',
      season,
      playersProcessed: seasonHistory.length
    });
  } catch (error) {
    console.error('Error en PUT /seasons/:id/finalize:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   PUT /api/seasons/:id/goals/:goalIndex
// @desc    Actualizar progreso de meta comunitaria
// @access  Private (Admin)
router.put('/:id/goals/:goalIndex', auth, require('../middleware/admin'), async (req, res) => {
  try {
    const { increment = 1 } = req.body;
    const goalIndex = parseInt(req.params.goalIndex);
    
    const season = await Season.findById(req.params.id);
    
    if (!season) {
      return res.status(404).json({ message: 'Temporada no encontrada' });
    }
    
    if (goalIndex < 0 || goalIndex >= season.communityGoals.length) {
      return res.status(400).json({ message: 'Índice de meta inválido' });
    }
    
    await season.updateCommunityGoal(goalIndex, increment);
    
    res.json({
      message: 'Meta actualizada',
      goal: season.communityGoals[goalIndex]
    });
  } catch (error) {
    console.error('Error en PUT /seasons/:id/goals/:goalIndex:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
