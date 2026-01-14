const express = require('express');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const User = require('../models/User');
const Appeal = require('../models/Appeal');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const computeLevelFromPoints = (points) => {
  const safePoints = safeNumber(points, 0);
  return Math.max(1, Math.floor(Math.max(0, safePoints) / 100) + 1);
};

const computeGameStats = (history, gameKey) => {
  const entries = Array.isArray(history)
    ? history.filter((h) => h?.game === gameKey)
    : [];
  const points = entries.reduce((sum, h) => sum + safeNumber(h?.points, 0), 0);
  const wins = entries.reduce((sum, h) => sum + safeNumber(h?.wins, 0), 0);
  const losses = entries.reduce((sum, h) => sum + safeNumber(h?.losses, 0), 0);
  const level = computeLevelFromPoints(points);
  return {
    tournaments: entries.length,
    points,
    wins,
    losses,
    level,
  };
};

const escapeRegex = (value) => {
  if (!value) return '';
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Rutas específicas PRIMERO (antes de /:username)
// GET /api/users/search/:query
// Buscar usuarios por username o playerId
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const isPlayerId = query.startsWith('#');
    
    let searchCriteria = {
      banned: { $ne: true },
      suspended: { $ne: true },
    };
    
    if (isPlayerId) {
      searchCriteria.playerId = query;
    } else {
      searchCriteria.username = { $regex: escapeRegex(query), $options: 'i' };
    }
    
    const users = await User.find(searchCriteria)
      .select('username playerId role avatar banner country favoriteGame competitive isOnline lastSeen createdAt')
      .limit(20)
      .lean();

    const mapped = (users || []).map((user) => {
      const competitive = user?.competitive || {};
      const points = safeNumber(competitive.points, 0);
      const storedLevel = safeNumber(competitive.level, 0);
      const level = storedLevel > 0 ? storedLevel : computeLevelFromPoints(points);
      
      // Calculate online status based on lastSeen
      const now = new Date();
      const lastSeen = new Date(user.lastSeen);
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const isActuallyOnline = lastSeen > fiveMinutesAgo;
      
      return {
        id: user._id,
        username: user.username,
        playerId: user.playerId,
        role: user.role,
        avatar: user.avatar,
        banner: user.banner,
        country: user.country,
        favoriteGame: user.favoriteGame,
        competitive: user.competitive,
        isOnline: isActuallyOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// GET /api/users/username/:username
// Obtener usuario por nombre de usuario exacto
router.get('/username/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ 
      username: { $regex: `^${escapeRegex(username)}$`, $options: 'i' },
      banned: { $ne: true },
      suspended: { $ne: true }
    })
    .select('username playerId role avatar banner country favoriteGame competitive isOnline lastSeen createdAt')
    .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const competitive = user?.competitive || {};
    const points = safeNumber(competitive.points, 0);
    const storedLevel = safeNumber(competitive.level, 0);
    const level = storedLevel > 0 ? storedLevel : computeLevelFromPoints(points);
    
    // Calculate online status based on lastSeen
    const now = new Date();
    const lastSeen = new Date(user.lastSeen);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const isActuallyOnline = lastSeen > fiveMinutesAgo;
    
    const mapped = {
      id: user._id,
      username: user.username,
      playerId: user.playerId,
      role: user.role,
      avatar: user.avatar,
      banner: user.banner,
      country: user.country,
      favoriteGame: user.favoriteGame,
      competitive: user.competitive,
      isOnline: isActuallyOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    };
    
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// GET /api/admin/users
// Solo admins y owners pueden ver todos los usuarios
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const users = await User.find({
      banned: { $ne: true },
      suspended: { $ne: true },
    })
      .select('username playerId role avatar banner country favoriteGame competitive isOnline lastSeen createdAt')
      .lean();

    const gameKeys = ['brawlstars', 'clash_royale'];

    const mapped = (users || []).map((user) => {
      const competitive = user?.competitive || {};
      const points = safeNumber(competitive.points, 0);
      const storedLevel = safeNumber(competitive.level, 0);
      const level = storedLevel > 0 ? storedLevel : computeLevelFromPoints(points);
      const wins = safeNumber(competitive.wins, 0);
      const losses = safeNumber(competitive.losses, 0);
      const tournaments = safeNumber(competitive.tournamentsPlayed, 0);
      const history = Array.isArray(competitive.history) ? competitive.history : [];

      // Calculate online status based on lastSeen
      const now = new Date();
      const lastSeen = new Date(user.lastSeen);
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const isActuallyOnline = lastSeen > fiveMinutesAgo;

      const byGame = {};
      gameKeys.forEach((key) => {
        byGame[key] = computeGameStats(history, key);
      });

      return {
        id: user._id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        banner: user.banner,
        country: user.country,
        favoriteGame: user.favoriteGame,
        isOnline: isActuallyOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        overall: {
          points,
          level,
          wins,
          losses,
        },
        byGame,
      };
    });

    const byUsername = (a, b) => String(a.username || '').localeCompare(String(b.username || ''), 'es', { sensitivity: 'base' });

    const sortOverall = (a, b) => {
      const diffPoints = safeNumber(b?.overall?.points, 0) - safeNumber(a?.overall?.points, 0);
      if (diffPoints) return diffPoints;
      const diffWins = safeNumber(b?.overall?.wins, 0) - safeNumber(a?.overall?.wins, 0);
      if (diffWins) return diffWins;
      return byUsername(a, b);
    };

    const overall = mapped
      .slice()
      .sort(sortOverall)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const byGame = {};
    gameKeys.forEach((key) => {
      const sorted = mapped
        .slice()
        .sort((a, b) => {
          const diffPoints = safeNumber(b?.byGame?.[key]?.points, 0) - safeNumber(a?.byGame?.[key]?.points, 0);
          if (diffPoints) return diffPoints;
          const diffWins = safeNumber(b?.byGame?.[key]?.wins, 0) - safeNumber(a?.byGame?.[key]?.wins, 0);
          if (diffWins) return diffWins;
          return byUsername(a, b);
        })
        .map((item, index) => ({ ...item, rank: index + 1 }));
      byGame[key] = sorted;
    });

    return res.json({ overall, byGame });
  } catch (err) {
    console.error('Error al obtener leaderboard:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.get('/search', auth, async (req, res) => {
  try {
    const rawQuery = req.query.q || req.query.query || '';
    const query = String(rawQuery).trim();

    if (!query) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(escapeRegex(query), 'i');

    const users = await User.find({
      username: { $regex: regex },
      banned: { $ne: true },
    })
      .select('username role avatar banner country favoriteGame competitive isOnline lastSeen createdAt')
      .limit(25)
      .lean();

    const results = (users || []).map((user) => {
      const competitive = user?.competitive || {};
      const points = safeNumber(competitive.points, 0);
      const storedLevel = safeNumber(competitive.level, 0);
      const level = storedLevel > 0 ? storedLevel : computeLevelFromPoints(points);
      const wins = safeNumber(competitive.wins, 0);
      const losses = safeNumber(competitive.losses, 0);
      return {
        id: user._id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        banner: user.banner,
        country: user.country,
        favoriteGame: user.favoriteGame,
        isOnline: !!user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        competitive: {
          points,
          level,
          wins,
          losses,
        },
      };
    });

    results.sort((a, b) => String(a.username || '').localeCompare(String(b.username || ''), 'es', { sensitivity: 'base' }));
    return res.json({ users: results });
  } catch (err) {
    console.error('Error al buscar usuarios:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.get('/admin/users', auth, admin, async (req, res) => {
    try {
        const users = await User.find()
            .select('username email role suspended banned suspensionReason banReason suspensionDate isOnline lastSeen createdAt')
            .lean();
        
        return res.json(users);
    } catch (err) {
        console.error('Error al obtener usuarios:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/admin/users/:id/role
router.put('/admin/users/:id/role', auth, admin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const allowedRoles = ['user', 'creator', 'admin', 'owner', 'suspended', 'banned'];
        if (!role || !allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Rol inválido' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if ((user.role === 'owner' || user.role === 'owener') && req.user.role !== 'owner' && req.user.role !== 'owener') {
            return res.status(403).json({ message: 'No puedes modificar al owner' });
        }

        const wasSanctioned = user.suspended || user.banned;

        user.role = role;

        if (role === 'suspended') {
            user.suspended = true;
            user.banned = false;
            if (!user.suspensionDate) {
                user.suspensionDate = new Date();
            }
            if (!user.suspensionDurationDays || user.suspensionDurationDays <= 0) {
                user.suspensionDurationDays = 7;
            }
        } else if (role === 'banned') {
            user.suspended = false;
            user.banned = true;
        } else {
            user.suspended = false;
            user.banned = false;
            user.suspensionReason = undefined;
            user.banReason = undefined;
            user.suspensionDate = undefined;
            user.suspensionDurationDays = undefined;
        }

        await user.save();

    const isSanctionedNow = user.suspended || user.banned;
    if (wasSanctioned && !isSanctionedNow) {
        await Appeal.updateMany(
            {
                user: user._id,
                $or: [
                    { caseStatus: { $exists: false } },
                    { caseStatus: 'open' },
                ],
            },
            {
                caseStatus: 'closed',
                closedAt: new Date(),
            }
        );
    }

        return res.json({
            message: 'Rol actualizado correctamente',
            user,
        });
    } catch (err) {
        console.error('Error al actualizar rol de usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/admin/users/:id/suspend
router.put('/admin/users/:id/suspend', auth, admin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, durationDays } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if ((user.role === 'owner' || user.role === 'owener') && req.user.role !== 'owner' && req.user.role !== 'owener') {
            return res.status(403).json({ message: 'No puedes suspender al owner' });
        }

        let duration = parseInt(durationDays, 10);
        if (isNaN(duration) || duration <= 0 || duration > 365) {
            duration = 7;
        }

        user.suspended = true;
        user.banned = false;
        user.suspensionReason = reason || 'Incumplimiento de normas de la comunidad';
        user.suspensionDate = new Date();
        user.suspensionDurationDays = duration;

        await user.save();

        return res.json({
            message: 'Usuario suspendido correctamente',
            user,
        });
    } catch (err) {
        console.error('Error al suspender usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/admin/users/:id/ban
router.put('/admin/users/:id/ban', auth, admin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if ((user.role === 'owner' || user.role === 'owener') && req.user.role !== 'owner' && req.user.role !== 'owener') {
            return res.status(403).json({ message: 'No puedes banear al owner' });
        }

        user.banned = true;
        user.suspended = false;
        user.banReason = reason || 'Violación grave de las normas';
        user.suspensionDate = undefined;

        await user.save();

        return res.json({
            message: 'Usuario baneado correctamente',
            user,
        });
    } catch (err) {
        console.error('Error al banear usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/users/support/ticket
// Obtener el último ticket de soporte del usuario autenticado (con conversación)
router.get('/support/ticket', auth, async (req, res) => {
    try {
        const ticket = await SupportTicket.findOne({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        if (!ticket) {
            return res.status(404).json({ message: 'No tienes tickets de soporte abiertos' });
        }

		return res.json(ticket);
	} catch (err) {
		console.error('Error al obtener ticket de soporte del usuario:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

router.put('/admin/support-tickets/:id/take', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		const ticket = await SupportTicket.findById(id);
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';

		if (ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString() && !isOwner) {
			return res.status(403).json({ message: 'Este ticket está asignado a otro administrador' });
		}

		if (!ticket.assignedTo) {
			ticket.assignedTo = req.user._id;
			ticket.assignedAt = new Date();
			ticket.updatedAt = new Date();
			await ticket.save();
		}

		const updatedTicket = await SupportTicket.findById(id)
			.populate('user', 'username email')
			.populate('assignedTo', 'username role');

		return res.json({ message: 'Ticket asignado', ticket: updatedTicket });
	} catch (err) {
		console.error('Error al asignar ticket (admin):', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

router.put('/admin/support-tickets/:id/close', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		const ticket = await SupportTicket.findById(id);
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';

		if (ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString() && !isOwner) {
			return res.status(403).json({ message: 'Este ticket está asignado a otro administrador' });
		}

		ticket.status = 'closed';
		ticket.closedAt = new Date();
		ticket.updatedAt = new Date();
		if (!ticket.assignedTo) {
			ticket.assignedTo = req.user._id;
			ticket.assignedAt = new Date();
		}
		await ticket.save();

		const updatedTicket = await SupportTicket.findById(id)
			.populate('user', 'username email')
			.populate('assignedTo', 'username role');

		return res.json({ message: 'Ticket cerrado', ticket: updatedTicket });
	} catch (err) {
		console.error('Error al cerrar ticket (admin):', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

router.put('/admin/support-tickets/:id/reopen', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		const ticket = await SupportTicket.findById(id);
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';

		if (ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString() && !isOwner) {
			return res.status(403).json({ message: 'Este ticket está asignado a otro administrador' });
		}

		ticket.status = 'open';
		ticket.closedAt = undefined;
		ticket.updatedAt = new Date();
		if (!ticket.assignedTo) {
			ticket.assignedTo = req.user._id;
			ticket.assignedAt = new Date();
		}
		await ticket.save();

		const updatedTicket = await SupportTicket.findById(id)
			.populate('user', 'username email')
			.populate('assignedTo', 'username role');

		return res.json({ message: 'Ticket reabierto', ticket: updatedTicket });
	} catch (err) {
		console.error('Error al reabrir ticket (admin):', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

router.get('/support/tickets', auth, async (req, res) => {
	try {
		const statusFilter = req.query.status || 'open';
		const filter = { user: req.user._id };
		if (statusFilter !== 'all') {
			filter.status = statusFilter;
		}

		const tickets = await SupportTicket.find(filter)
			.sort({ updatedAt: -1, createdAt: -1 })
			.lean();

		const mapped = Array.isArray(tickets)
			? tickets.map((t) => {
				let lastMessage = '';
				let lastFrom = '';
				let lastAt = t.updatedAt || t.createdAt;
				if (Array.isArray(t.conversation) && t.conversation.length > 0) {
					const last = t.conversation[t.conversation.length - 1];
					lastMessage = last?.message || '';
					lastFrom = last?.from || '';
					lastAt = last?.createdAt || lastAt;
				}
				return {
					...t,
					lastMessage,
					lastFrom,
					lastAt,
				};
			})
			: [];

		return res.json({ tickets: mapped });
	} catch (err) {
		console.error('Error al listar tickets de soporte del usuario:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

router.get('/support/ticket/:id', auth, async (req, res) => {
	try {
		const { id } = req.params;
		const ticket = await SupportTicket.findById(id).lean();
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}
		if (ticket.user && ticket.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: 'No tienes permiso para ver este ticket' });
		}
		return res.json(ticket);
	} catch (err) {
		console.error('Error al obtener ticket de soporte por id (usuario):', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/users/support/ticket
// Crear un nuevo ticket de soporte (primer mensaje del hilo)
router.put('/support/ticket', auth, async (req, res) => {
	try {
		const { message, subject, category } = req.body;

		if (!message || !message.trim()) {
			return res.status(400).json({ message: 'El mensaje es requerido' });
		}

		const user = await User.findById(req.user._id);
		if (!user) {
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		const ticket = new SupportTicket({
			user: user._id,
			username: user.username,
			email: user.email,
			subject: subject || 'Soporte técnico',
			category: category || 'technical',
			message: message.trim(),
			conversation: [
				{
					from: 'user',
					message: message.trim(),
					createdAt: new Date(),
				},
			],
			read: false,
			status: 'open',
			updatedAt: new Date(),
		});

		await ticket.save();

		return res.json({
			message: 'Ticket de soporte creado correctamente',
			ticket,
		});
	} catch (err) {
		console.error('Error al crear ticket de soporte:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/users/support/ticket/:id/reply
// Respuesta adicional del usuario en un ticket de soporte existente
router.put('/support/ticket/:id/reply', auth, async (req, res) => {
	try {
		const { id } = req.params;
		const { message } = req.body;

		if (!message || !message.trim()) {
			return res.status(400).json({ message: 'El mensaje es requerido' });
		}

		const ticket = await SupportTicket.findById(id);
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}

		// Verificar que el ticket pertenece al usuario autenticado
		if (ticket.user && ticket.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: 'No tienes permiso para responder este ticket' });
		}

		if (!Array.isArray(ticket.conversation)) {
			ticket.conversation = [];
		}

		ticket.conversation.push({
			from: 'user',
			message: message.trim(),
			createdAt: new Date(),
		});
		ticket.read = false; // hay nuevo mensaje del usuario
		ticket.status = 'open';
		ticket.closedAt = undefined;
		ticket.updatedAt = new Date();

		await ticket.save();

		return res.json({
			message: 'Mensaje enviado correctamente',
			ticket,
		});
	} catch (err) {
		console.error('Error al responder ticket de soporte (usuario):', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

router.put('/support/ticket/:id/close', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		const ticket = await SupportTicket.findById(id);
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';
		if (ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString() && !isOwner) {
			return res.status(403).json({ message: 'Este ticket está asignado a otro administrador' });
		}

		ticket.status = 'closed';
		ticket.closedAt = new Date();
		ticket.updatedAt = new Date();
		if (!ticket.assignedTo) {
			ticket.assignedTo = req.user._id;
			ticket.assignedAt = new Date();
		}
		await ticket.save();

		const updatedTicket = await SupportTicket.findById(id)
			.populate('user', 'username email')
			.populate('assignedTo', 'username role');

		return res.json({ message: 'Ticket cerrado', ticket: updatedTicket });
	} catch (err) {
		console.error('Error al cerrar ticket:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

router.put('/support/ticket/:id/reopen', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		const ticket = await SupportTicket.findById(id);
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';
		if (ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString() && !isOwner) {
			return res.status(403).json({ message: 'Este ticket está asignado a otro administrador' });
		}

		ticket.status = 'open';
		ticket.closedAt = undefined;
		ticket.updatedAt = new Date();
		if (!ticket.assignedTo) {
			ticket.assignedTo = req.user._id;
			ticket.assignedAt = new Date();
		}
		await ticket.save();

		const updatedTicket = await SupportTicket.findById(id)
			.populate('user', 'username email')
			.populate('assignedTo', 'username role');

		return res.json({ message: 'Ticket reabierto', ticket: updatedTicket });
	} catch (err) {
		console.error('Error al reabrir ticket:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// GET /api/support/appeal
// Obtener la última apelación del usuario autenticado (con conversación)
router.get('/support/appeal', auth, async (req, res) => {
	try {
		const appeal = await Appeal.findOne({ user: req.user._id })
			.sort({ createdAt: -1 })
			.lean();

		if (!appeal) {
			return res.status(404).json({ message: 'No tienes apelaciones registradas' });
		}

		return res.json(appeal);
	} catch (err) {
		console.error('Error al obtener apelación del usuario:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/admin/appeals/:id/reply
// Responder a una apelación (admin/owner) y tomar el caso
router.put('/admin/appeals/:id/reply', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		const { message } = req.body;

		if (!message || !message.trim()) {
			return res.status(400).json({ message: 'El mensaje de respuesta es requerido' });
		}

		const appeal = await Appeal.findById(id);
		if (!appeal) {
			return res.status(404).json({ message: 'Apelación no encontrada' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';

		// Si el caso ya está asignado a otro admin y el que responde no es owner, bloquear
		if (
			appeal.assignedTo &&
			appeal.assignedTo.toString() !== req.user._id.toString() &&
			!isOwner
		) {
			return res.status(403).json({ message: 'Este caso está asignado a otro administrador' });
		}

		if (!Array.isArray(appeal.conversation)) {
			appeal.conversation = [];
		}

		appeal.conversation.push({
			from: 'admin',
			message: message.trim(),
			createdAt: new Date(),
		});
		appeal.read = true; // al responder, se marca como leída

		// Asignar caso al admin que responde si aún no tiene assignedTo
		if (!appeal.assignedTo) {
			appeal.assignedTo = req.user._id;
			appeal.assignedAt = new Date();
		}

		await appeal.save();

		return res.json({
			message: 'Respuesta enviada correctamente',
			appeal,
		});
	} catch (err) {
		console.error('Error al responder apelación:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/support/appeal/:id/reply
// Respuesta adicional del usuario en una apelación existente
router.put('/support/appeal/:id/reply', auth, async (req, res) => {
	try {
		const { id } = req.params;
		const { message } = req.body;

		if (!message || !message.trim()) {
			return res.status(400).json({ message: 'El mensaje de respuesta es requerido' });
		}

		const appeal = await Appeal.findById(id);
		if (!appeal) {
			return res.status(404).json({ message: 'Apelación no encontrada' });
		}

		// Verificar que la apelación pertenece al usuario autenticado
		if (appeal.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: 'No tienes permiso para responder esta apelación' });
		}

		if (!Array.isArray(appeal.conversation)) {
			appeal.conversation = [];
		}

		appeal.conversation.push({
			from: 'user',
			message: message.trim(),
			createdAt: new Date(),
		});
		appeal.read = false; // hay nuevo mensaje del usuario, marcar como no leída

		await appeal.save();

		return res.json({
			message: 'Respuesta enviada correctamente',
			appeal,
		});
	} catch (err) {
		console.error('Error al responder apelación (usuario):', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// GET /api/admin/appeals
// Obtener apelaciones para inbox o casos tomados (solo admins y owners) con paginación
router.get('/admin/appeals', auth, admin, async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const skip = (page - 1) * limit;
		const scope = req.query.scope || 'inbox'; // 'inbox' | 'taken'
		const adminId = req.query.adminId;

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';
		let filter = {
			$or: [
				{ caseStatus: { $exists: false } },
				{ caseStatus: 'open' },
			],
		};

		if (scope === 'taken') {
			if (isOwner) {
				if (adminId) {
					filter.assignedTo = adminId;
				} else {
					filter.assignedTo = { $ne: null };
				}
			} else {
				filter.assignedTo = req.user._id;
			}
		} else {
			// inbox: mostrar solo casos sin asignar
			filter.assignedTo = null;
		}
		
		// Optimización: usar lean() para rendimiento y populate selectivo
		const appeals = await Appeal.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate('user', 'username email')
			.populate('assignedTo', 'username role')
			.lean();
		
		// Contar total para paginación
		const total = await Appeal.countDocuments(filter);
		
		return res.json({
			appeals,
			pagination: {
				current: page,
				total: Math.ceil(total / limit),
				count: appeals.length,
				totalItems: total
			}
		});
	} catch (err) {
		console.error('Error al obtener apelaciones:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/admin/appeals/:id/read
// Marcar apelación como leída (solo admin asignado u owner)
router.put('/admin/appeals/:id/read', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		
		const appeal = await Appeal.findById(id).populate('user', 'username email');
		if (!appeal) {
			return res.status(404).json({ message: 'Apelación no encontrada' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';

		if (
			appeal.assignedTo &&
			appeal.assignedTo.toString() !== req.user._id.toString() &&
			!isOwner
		) {
			return res.status(403).json({ message: 'No puedes marcar como leído un caso asignado a otro admin' });
		}

		appeal.read = true;
		await appeal.save();
		
		console.log(`Apelación ${id} marcada como leída por admin ${req.user.username}`);
		
		return res.json({
			message: 'Apelación marcada como leída',
			appeal
		});
	} catch (err) {
		console.error('Error al marcar apelación como leída:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// GET /api/admin/support-tickets
// Bandeja de soporte técnico para admins (inbox o casos tomados)
router.get('/admin/support-tickets', auth, admin, async (req, res) => {
	try {
		const scope = req.query.scope || 'inbox'; // 'inbox' | 'taken'
		const statusFilter = req.query.status || 'open'; // 'open' | 'closed' | 'all'
		const adminId = req.query.adminId;

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';
		let filter = {};

		if (statusFilter !== 'all') {
			filter.status = statusFilter;
		}

		if (scope === 'taken') {
			if (isOwner) {
				if (adminId) {
					filter.assignedTo = adminId;
				} else {
					filter.assignedTo = { $ne: null };
				}
			} else {
				filter.assignedTo = req.user._id;
			}
		} else {
			// inbox: solo tickets sin asignar
			filter.assignedTo = null;
		}

		const tickets = await SupportTicket.find(filter)
			.sort({ updatedAt: -1, createdAt: -1 })
			.populate('user', 'username email')
			.populate('assignedTo', 'username role')
			.lean();

		return res.json({ tickets });
	} catch (err) {
		console.error('Error al obtener tickets de soporte (admin):', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/admin/support-tickets/:id/reply
// Responder a un ticket de soporte (admin/owner) y tomar el caso
router.put('/admin/support-tickets/:id/reply', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		const { message } = req.body;

		if (!message || !message.trim()) {
			return res.status(400).json({ message: 'El mensaje de respuesta es requerido' });
		}

		const ticket = await SupportTicket.findById(id);
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';

		// Si el caso ya está asignado a otro admin y el que responde no es owner, bloquear
		if (
			ticket.assignedTo &&
			ticket.assignedTo.toString() !== req.user._id.toString() &&
			!isOwner
		) {
			return res.status(403).json({ message: 'Este ticket está asignado a otro administrador' });
		}

		if (!Array.isArray(ticket.conversation)) {
			ticket.conversation = [];
		}

		ticket.conversation.push({
			from: 'admin',
			message: message.trim(),
			createdAt: new Date(),
		});
		ticket.read = true; // admin ya ha leído y respondido
		ticket.status = 'open';
		ticket.closedAt = undefined;
		ticket.updatedAt = new Date();

		if (!ticket.assignedTo) {
			ticket.assignedTo = req.user._id;
			ticket.assignedAt = new Date();
		}

		await ticket.save();

		try {
			await Notification.create({
				user: ticket.user,
				type: 'support_reply',
				title: 'Soporte técnico respondió',
				message: message.trim(),
				link: '/support',
				meta: { ticketId: ticket._id },
			});
		} catch (notifyErr) {
			console.error('Error creando notificación de soporte:', notifyErr);
		}

		const updatedTicket = await SupportTicket.findById(id)
			.populate('user', 'username email')
			.populate('assignedTo', 'username role');

		return res.json({
			message: 'Respuesta enviada correctamente',
			ticket: updatedTicket,
		});
	} catch (err) {
		console.error('Error al responder ticket de soporte (admin):', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// GET /api/users/notifications
// Listar notificaciones del usuario autenticado
router.get('/notifications', auth, async (req, res) => {
	try {
		const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
		const skip = Math.max(0, Number(req.query.skip) || 0);
		const unreadOnly = String(req.query.unreadOnly || '') === '1';

		const filter = { user: req.user._id };
		if (unreadOnly) filter.read = false;

		const notifications = await Notification.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		return res.json({ notifications });
	} catch (err) {
		console.error('Error al listar notificaciones:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// GET /api/users/notifications/unread-count
router.get('/notifications/unread-count', auth, async (req, res) => {
	try {
		const count = await Notification.countDocuments({ user: req.user._id, read: false });
		return res.json({ count });
	} catch (err) {
		console.error('Error al contar notificaciones no leídas:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/users/notifications/:id/read
router.put('/notifications/:id/read', auth, async (req, res) => {
	try {
		const { id } = req.params;
		const notif = await Notification.findById(id);
		if (!notif) {
			return res.status(404).json({ message: 'Notificación no encontrada' });
		}
		if (notif.user && notif.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: 'No tienes permiso para modificar esta notificación' });
		}
		notif.read = true;
		await notif.save();
		return res.json({ message: 'Notificación marcada como leída', notification: notif });
	} catch (err) {
		console.error('Error al marcar notificación como leída:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/users/notifications/read-all
router.put('/notifications/read-all', auth, async (req, res) => {
	try {
		await Notification.updateMany(
			{ user: req.user._id, read: false },
			{ $set: { read: true } }
		);
		return res.json({ message: 'Notificaciones marcadas como leídas' });
	} catch (err) {
		console.error('Error al marcar todas las notificaciones como leídas:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/admin/support-tickets/:id/read
// Marcar ticket de soporte como leído (solo admin asignado u owner)
router.put('/admin/support-tickets/:id/read', auth, admin, async (req, res) => {
	try {
		const { id } = req.params;
		const ticket = await SupportTicket.findById(id);
		if (!ticket) {
			return res.status(404).json({ message: 'Ticket de soporte no encontrado' });
		}

		const role = (req.user.role || '').toLowerCase();
		const isOwner = role === 'owner' || role === 'owener';

		if (
			ticket.assignedTo &&
			ticket.assignedTo.toString() !== req.user._id.toString() &&
			!isOwner
		) {
			return res.status(403).json({ message: 'No puedes marcar como leído un ticket asignado a otro admin' });
		}

		ticket.read = true;
		await ticket.save();

		return res.json({
			message: 'Ticket marcado como leído',
			ticket,
		});
	} catch (err) {
		console.error('Error al marcar ticket de soporte como leído:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// GET /api/users/status
// Verificar el estado del usuario actual (suspensión/baneo)
router.get('/status', auth, async (req, res) => {
	try {
		console.log('=== VERIFICANDO ESTADO DE USUARIO ===');
		console.log('Usuario ID:', req.user._id);
		console.log('Usuario username:', req.user.username);
		
		const user = await User.findById(req.user._id);
		if (!user) {
			console.log('Usuario no encontrado en BD');
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		if (user.suspended && user.suspensionDate) {
			const durationDays = user.suspensionDurationDays && user.suspensionDurationDays > 0
				? user.suspensionDurationDays
				: 7;
			const endTime = user.suspensionDate.getTime() + durationDays * 24 * 60 * 60 * 1000;
			if (Date.now() >= endTime) {
				user.suspended = false;
				user.suspensionReason = undefined;
				user.suspensionDate = undefined;
				await user.save();
				await Appeal.updateMany(
					{
						user: user._id,
						$or: [
							{ caseStatus: { $exists: false } },
							{ caseStatus: 'open' },
						],
					},
					{
						caseStatus: 'closed',
						closedAt: new Date(),
					}
				);
				console.log('Suspensión expirada automáticamente, usuario reactivado');
			}
		}

		console.log('Usuario encontrado en BD:', user.username);
		console.log('suspended:', user.suspended);
		console.log('banned:', user.banned);
		console.log('suspensionReason:', user.suspensionReason);
		console.log('banReason:', user.banReason);
		console.log('suspensionDate:', user.suspensionDate);

		let status = 'active';
		let reason = '';
		let suspensionDate = null;

		if (user.banned) {
			status = 'banned';
			reason = user.banReason || 'Violación de los términos de servicio';
			console.log('Estado: BANEADO');
		} else if (user.suspended) {
			status = 'suspended';
			reason = user.suspensionReason || 'Violación de las normas de la comunidad';
			suspensionDate = user.suspensionDate || null;
			console.log('Estado: SUSPENDIDO');
		} else {
			console.log('Estado: ACTIVO');
		}

		console.log('Respuesta status:', status);
		console.log('Respuesta reason:', reason);
		console.log('=== FIN VERIFICACIÓN ESTADO ===');

		return res.json({
			status,
			reason,
			suspensionDate,
			suspensionDurationDays: user.suspensionDurationDays || 7,
			username: user.username,
			isOnline: user.isOnline,
			lastSeen: user.lastSeen
		});
	} catch (err) {
		console.error('Error al verificar estado del usuario:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/support/appeal
// Enviar apelación al soporte
router.put('/support/appeal', auth, async (req, res) => {
	try {
		const { message } = req.body;
		const user = await User.findById(req.user._id);
		
		if (!user) {
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		// Solo permitir apelación si el usuario está suspendido
		if (!user.suspended) {
			if (user.banned) {
				return res.status(400).json({
					message:
						'Tu cuenta está baneada permanentemente. No puedes apelar desde la plataforma. Por favor, contacta con el soporte técnico a través de nuestro servidor de Discord.',
				});
			}
			return res.status(400).json({
				message: 'No puedes enviar una apelación si tu cuenta no está suspendida.',
			});
		}

		// Regla de cooldown: no permitir nueva apelación si la última
		// apelación ABIERTA no tiene respuesta de admin y han pasado menos de 5 horas
		const lastAppeal = await Appeal.findOne({
			user: user._id,
			$or: [
				{ caseStatus: { $exists: false } },
				{ caseStatus: 'open' },
			],
		})
			.sort({ createdAt: -1 })
			.lean();

		if (lastAppeal) {
			const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
			const createdAt = lastAppeal.createdAt ? new Date(lastAppeal.createdAt) : null;
			const diffMs = createdAt ? Date.now() - createdAt.getTime() : FIVE_HOURS_MS + 1;
			const hasAdminReply = Array.isArray(lastAppeal.conversation)
				&& lastAppeal.conversation.some(msg => msg.from === 'admin');

			if (!hasAdminReply && diffMs < FIVE_HOURS_MS) {
				return res.status(400).json({
					message: 'Ya tienes una apelación pendiente de respuesta. Podrás enviar otra cuando recibas respuesta de un administrador o pasen 5 horas desde tu última apelación.',
				});
			}
		}

		// Crear apelación en la base de datos (primer mensaje del hilo)
		const appeal = new Appeal({
			user: user._id,
			username: user.username,
			email: user.email,
			status: 'suspended',
			reason: user.suspensionReason || user.banReason,
			message: message,
			conversation: [
				{
					from: 'user',
					message,
					createdAt: new Date(),
				},
			],
			read: false
		});

		await appeal.save();

		console.log('=== APELACIÓN RECIBIDA ===');
		console.log('Usuario:', user.username);
		console.log('Email:', user.email);
		console.log('Estado:', user.suspended ? 'Suspendido' : user.banned ? 'Baneado' : 'Activo');
		console.log('Motivo original:', user.suspensionReason || user.banReason);
		console.log('Mensaje de apelación:', message);
		console.log('ID de apelación:', appeal._id);
		console.log('========================');

		return res.json({ 
			message: 'Apelación enviada correctamente. Nos pondremos en contacto contigo pronto.',
			appealId: appeal._id
		});
	} catch (err) {
		console.error('Error al enviar apelación:', err);
		return res.status(500).json({ message: 'Error interno del servidor' });
	}
});

// PUT /api/users/heartbeat
// Mantener vivo el estado online del usuario
router.put('/heartbeat', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        isOnline: true,
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    return res.json({
      message: 'Heartbeat recibido',
      user: {
        id: user._id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (err) {
    console.error('Error en heartbeat:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/users/offline
// Marcar usuario como offline explícitamente
router.put('/offline', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        isOnline: false,
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json({
      message: 'Estado actualizado a offline',
      user: {
        id: user._id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (err) {
    console.error('Error al actualizar estado offline:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/users/online
// Actualizar estado online/offline del usuario
router.put('/online', auth, async (req, res) => {
  try {
    // Validar que req.body exista y tenga status
    if (!req.body || typeof req.body.status === 'undefined') {
      return res.status(400).json({ message: 'Estado es requerido' });
    }
    
    const { status } = req.body; // 'online' o 'offline'
    
    if (!['online', 'offline'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido. Debe ser "online" o "offline"' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        isOnline: status === 'online',
        // Actualizar siempre lastSeen cuando cambia el estado
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    console.log(`Usuario ${user.username} ahora está ${status}`);
    
    return res.json({
      message: `Estado actualizado a ${status}`,
      user: {
        id: user._id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Rutas con parámetros AL FINAL
// GET /api/users/:username
// Devuelve 200 con los datos del usuario si existe,
// o 404 con mensaje "Este usuario no se ha encontrado" si no.
router.get('/:username', async (req, res, next) => {
  try {
    const { username } = req.params;

    const reserved = new Set([
      'notifications',
      'status',
      'search',
      'leaderboard',
      'admin',
      'support',
      'online',
    ]);

    if (reserved.has(String(username || '').toLowerCase())) {
      return next();
    }

    const user = await User.findOne({
      username,
      banned: { $ne: true },
    })
      .select('username playerId role avatar banner country favoriteGame bio socialSpotify socialTiktok socialTwitch socialDiscord socialInstagram socialX socialYoutube competitive isOnline lastSeen createdAt')
      .lean();
    if (!user) {
      return res.status(404).json({ message: 'Este usuario no se ha encontrado' });
    }

    return res.status(200).json({
      id: user._id,
      username: user.username,
      playerId: user.playerId,
      role: user.role,
      avatar: user.avatar,
      banner: user.banner,
      country: user.country,
      favoriteGame: user.favoriteGame,
      bio: user.bio,
      socialSpotify: user.socialSpotify,
      socialTiktok: user.socialTiktok,
      socialTwitch: user.socialTwitch,
      socialDiscord: user.socialDiscord,
      socialInstagram: user.socialInstagram,
      socialX: user.socialX,
      socialYoutube: user.socialYoutube,
      competitive: user.competitive,
      isOnline: !!user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('Error buscando usuario:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
