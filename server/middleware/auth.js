const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const now = new Date();
        const thresholdMs = Number(process.env.LAST_SEEN_UPDATE_MS) || 5 * 60 * 1000;
        const existingUser = await User.findById(decoded.userId).select('-password');
        if (!existingUser) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        const lastSeen = existingUser.lastSeen ? new Date(existingUser.lastSeen) : null;
        const shouldUpdateLastSeen = !lastSeen || (now.getTime() - lastSeen.getTime() >= thresholdMs);
        if (shouldUpdateLastSeen || existingUser.isOnline !== true) {
            await User.updateOne(
                { _id: existingUser._id },
                { $set: { isOnline: true, lastSeen: now } }
            );
            existingUser.isOnline = true;
            existingUser.lastSeen = now;
        }
        const user = existingUser;

        if (!user) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        
        // Manejo específico de errores JWT
        if (err.name === 'JsonWebTokenError') {
            if (err.message === 'jwt malformed') {
                return res.status(401).json({ 
                    message: 'Token malformado',
                    code: 'JWT_MALFORMED'
                });
            } else if (err.message === 'jwt expired') {
                return res.status(401).json({ 
                    message: 'Token expirado',
                    code: 'JWT_EXPIRED'
                });
            } else {
                return res.status(401).json({ 
                    message: 'Token inválido',
                    code: 'JWT_INVALID'
                });
            }
        } else if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expirado',
                code: 'JWT_EXPIRED'
            });
        } else {
            return res.status(401).json({ 
                message: 'Error de autenticación',
                code: 'AUTH_ERROR'
            });
        }
    }
};

// Helper para roles admin
const isAdminRole = (role) => {
    const normalized = (role || '').toLowerCase();
    // Aceptar 'owener' como alias legacy de 'owner'
    return normalized === 'admin' || normalized === 'owner' || normalized === 'creator' || normalized === 'owener';
};

const admin = (req, res, next) => {
    // Evitar spam de logs en producción
    if (process.env.ADMIN_LOGS === 'true') {
        console.log('Admin middleware - Usuario:', req.user?.username, 'Rol:', req.user?.role);
    }
    if (req.user && isAdminRole(req.user.role)) {
        return next();
    }
    if (process.env.ADMIN_LOGS === 'true') {
        console.log('Admin access denied para usuario:', req.user?.username, 'con rol:', req.user?.role);
    }
    return res.status(403).json({ message: 'Admin access required' });
};

const ownerOnly = (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase();
    if (role === 'owner' || role === 'owener') {
        return next();
    }
    return res.status(403).json({ message: 'Owner access required' });
};

const creatorOrAdmin = (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase();
    if (role === 'creator' || role === 'admin' || role === 'owner' || role === 'owener') {
        return next();
    }
    return res.status(403).json({ message: 'Creator access required' });
};

module.exports = { auth, admin, ownerOnly, creatorOrAdmin };
