const EventEmitter = require('events');
const { MissionProgress } = require('../models/Mission');
const { AchievementProgress } = require('../models/Achievement');
const { ClanFeed } = require('../models/ClanFeed');
const Clan = require('../models/Clan');
const User = require('../models/User');
const { CLAN_ROLES, normalizeClanRole } = require('../models/ClanMembership');

class GameEvents extends EventEmitter {
  constructor() {
    super();
    
    // Suscribirse a eventos del juego
    this.on('tournament_won', this.handleTournamentWon.bind(this));
    this.on('tournament_completed', this.handleTournamentCompleted.bind(this));
    this.on('level_up', this.handleLevelUp.bind(this));
    this.on('points_earned', this.handlePointsEarned.bind(this));
    this.on('clan_joined', this.handleClanJoined.bind(this));
    this.on('clan_left', this.handleClanLeft.bind(this));
    this.on('clan_created', this.handleClanCreated.bind(this));
    this.on('clan_promoted', this.handleClanPromoted.bind(this));
    this.on('win_streak', this.handleWinStreak.bind(this));
    this.on('social_share', this.handleSocialShare.bind(this));
    this.on('perfect_tournament', this.handlePerfectTournament.bind(this));
    this.on('season_rank_achieved', this.handleSeasonRankAchieved.bind(this));
  }

  // Manejador de eventos de torneo ganado
  async handleTournamentWon(userId, data) {
    try {
      // Actualizar misiones
      await MissionProgress.updateProgress(userId, 'win_tournaments', 1);
      await MissionProgress.updateProgress(userId, 'play_tournaments', 1);
      
      // Actualizar logros
      await AchievementProgress.checkAchievements(userId, 'first_tournament_win', {
        isFirstWin: data.isFirstWin || false
      });
      await AchievementProgress.checkAchievements(userId, 'tournament_wins_count', {
        increment: 1
      });
      
      // Si es victoria perfecta
      if (data.isPerfect) {
        this.emit('perfect_tournament', userId, data);
      }
      
      // Si es racha de victorias
      if (data.streakLength > 1) {
        this.emit('win_streak', userId, { streakLength: data.streakLength });
      }
      
      // Actualizar puntos del clan si está en uno
      const user = await User.findById(userId).populate('clanId');
      if (user.clanId) {
        const clan = await Clan.findById(user.clanId);
        if (clan) {
          const result = clan.addExperience(100); // 100 XP por torneo ganado
          await clan.save();
          
          // Agregar al feed del clan
          await ClanFeed.tournamentWon(
            clan._id, 
            userId, 
            data.tournamentId, 
            data.tournamentName
          );
          
          // Si el clan subió de nivel
          if (result.levelUp) {
            await ClanFeed.clanLevelUp(clan._id, result.newLevel);
          }
        }
      }
    } catch (error) {
      console.error('Error en handleTournamentWon:', error);
    }
  }

  // Manejador de torneo completado (no necesariamente ganado)
  async handleTournamentCompleted(userId, data) {
    try {
      await MissionProgress.updateProgress(userId, 'play_tournaments', 1);
      
      // Actualizar estadísticas del usuario
      await User.findByIdAndUpdate(userId, {
        $inc: { 'competitive.tournamentsPlayed': 1 },
        'competitive.lastCompetitiveAt': new Date()
      });
    } catch (error) {
      console.error('Error en handleTournamentCompleted:', error);
    }
  }

  // Manejador de subida de nivel
  async handleLevelUp(userId, data) {
    try {
      await MissionProgress.updateProgress(userId, 'reach_level', data.level);
      await AchievementProgress.checkAchievements(userId, 'reach_level', {
        level: data.level
      });
      
      // Notificación de nivel alcanzado
      const Notification = require('../models/Notification');
      await new Notification({
        user: userId,
        type: 'level_up',
        title: '¡Nuevo nivel!',
        message: `Has alcanzado el nivel ${data.level}`,
        data: { level: data.level }
      }).save();
    } catch (error) {
      console.error('Error en handleLevelUp:', error);
    }
  }

  // Manejador de puntos ganados
  async handlePointsEarned(userId, data) {
    try {
      await AchievementProgress.checkAchievements(userId, 'reach_points', {
        points: data.totalPoints
      });
    } catch (error) {
      console.error('Error en handlePointsEarned:', error);
    }
  }

  // Manejador de unirse a un clan
  async handleClanJoined(userId, data) {
    try {
      await MissionProgress.updateProgress(userId, 'join_clan', 1);
      await AchievementProgress.checkAchievements(userId, 'clan_founder', {
        isFounder: false
      });
    } catch (error) {
      console.error('Error en handleClanJoined:', error);
    }
  }

  // Manejador de abandonar un clan
  async handleClanLeft(userId, data) {
    try {
      // Limpiar misiones activas del clan
      const activeMissions = await MissionProgress.find({
        user: userId,
        status: 'in_progress'
      }).populate('mission');
      
      for (const mission of activeMissions) {
        if (mission.mission.requirements.some(req => req.type === 'clan_activity')) {
          mission.status = 'expired';
          await mission.save();
        }
      }
    } catch (error) {
      console.error('Error en handleClanLeft:', error);
    }
  }

  // Manejador de crear un clan
  async handleClanCreated(userId, data) {
    try {
      await AchievementProgress.checkAchievements(userId, 'clan_founder', {
        isFounder: true
      });
    } catch (error) {
      console.error('Error en handleClanCreated:', error);
    }
  }

  // Manejador de promoción en el clan
  async handleClanPromoted(userId, data) {
    try {
      const normalizedNewRole = normalizeClanRole(data?.newRole);
      if ([CLAN_ROLES.LEADER, CLAN_ROLES.CO_LEADER].includes(normalizedNewRole)) {
        await AchievementProgress.checkAchievements(userId, 'clan_leader_duration', {
          role: normalizedNewRole
        });
      }
    } catch (error) {
      console.error('Error en handleClanPromoted:', error);
    }
  }

  // Manejador de racha de victorias
  async handleWinStreak(userId, data) {
    try {
      await AchievementProgress.checkAchievements(userId, 'win_streak', {
        streakLength: data.streakLength
      });
      
      await MissionProgress.updateProgress(userId, 'win_streak', data.streakLength);
    } catch (error) {
      console.error('Error en handleWinStreak:', error);
    }
  }

  // Manejador de compartir en redes sociales
  async handleSocialShare(userId, data) {
    try {
      await MissionProgress.updateProgress(userId, 'social_shares', 1);
      await AchievementProgress.checkAchievements(userId, 'social_shares', {
        increment: 1
      });
    } catch (error) {
      console.error('Error en handleSocialShare:', error);
    }
  }

  // Manejador de torneo perfecto
  async handlePerfectTournament(userId, data) {
    try {
      await AchievementProgress.checkAchievements(userId, 'perfect_tournament', {
        isPerfect: true
      });
    } catch (error) {
      console.error('Error en handlePerfectTournament:', error);
    }
  }

  // Manejador de ranking de temporada alcanzado
  async handleSeasonRankAchieved(userId, data) {
    try {
      await AchievementProgress.checkAchievements(userId, 'season_top_rank', {
        rank: data.rank
      });
    } catch (error) {
      console.error('Error en handleSeasonRankAchieved:', error);
    }
  }

  // Método para emitir eventos de forma segura
  emitSafe(event, userId, data = {}) {
    try {
      this.emit(event, userId, data);
    } catch (error) {
      console.error(`Error en evento ${event}:`, error);
    }
  }

  // Método para inicializar el sistema
  static initialize() {
    const gameEvents = new GameEvents();
    
    // Hacerlo globalmente accesible
    global.gameEvents = gameEvents;
    
    console.log('Sistema de eventos del juego inicializado');
    return gameEvents;
  }
}

// Crear y exportar la instancia
const gameEvents = new GameEvents();
module.exports = gameEvents;
