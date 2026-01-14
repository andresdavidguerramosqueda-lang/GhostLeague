require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');
const gameEvents = require('./services/gameEvents');
const authRoutes = require('./routes/auth');
const registrationRoutes = require('./routes/registration');
const tournamentRoutes = require('./routes/tournaments');
const userRoutes = require('./routes/users');
const socialRoutes = require('./routes/social');
const clanRoutes = require('./routes/clans');
const clanInviteRoutes = require('./routes/clanInvites');
const clanChallengeRoutes = require('./routes/clanChallenges');
const missionRoutes = require('./routes/missions');
const seasonRoutes = require('./routes/seasons');
const achievementRoutes = require('./routes/achievements');
const emailVerificationRoutes = require('./routes/emailVerification');
const authVerificationRoutes = require('./routes/authVerification');

const app = express();

app.set('trust proxy', 1);

// Middleware de seguridad y rendimiento
// Desactivar CORP estricto para permitir cargar imágenes de /uploads desde localhost:3000
app.use(helmet({
  crossOriginResourcePolicy: false,
})); // Seguridad HTTP headers
app.use(compression()); // Compresión gzip
app.use(cors({
  origin: (origin, callback) => {
    const raw = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000';
    const allowedOrigins = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting para prevenir ataques DoS (ajustado para uso normal)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 peticiones por IP (aumentado)
  message: 'Demasiadas peticiones desde esta IP, intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Omitir rate limiting para rutas de autenticación frecuentes
    return req.url.includes('/auth/me') || req.url.includes('/health');
  },
});
app.use('/api/', limiter);

// Rate limiting más estricto solo para login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 intentos de login por IP (aumentado)
  message: 'Demasiados intentos de login, intenta más tarde',
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);

// Middleware para parsing con límites reducidos
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Función de conexión a MongoDB Atlas con reintentos y optimización
const connectDB = async () => {
  try {
    console.log(' Conectando a MongoDB Atlas...');

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI/MONGODB_URI no está configurado');
    }

    const conn = await mongoose.connect(mongoUri, {
      // Configuración optimizada para MongoDB Atlas
      serverSelectionTimeoutMS: 10000, // Timeout para selección de servidor
      socketTimeoutMS: 45000, // Timeout para operaciones de socket
      connectTimeoutMS: 10000, // Timeout de conexión inicial
      maxPoolSize: 10, // Máximo 10 conexiones en pool
      minPoolSize: 2, // Mínimo 2 conexiones siempre activas
      maxIdleTimeMS: 30000, // Cerrar conexiones inactivas después de 30s
      retryWrites: true, // Reintentar escrituras fallidas
      w: 'majority', // Write concern majority
      readPreference: 'primary', // Preferir lecturas del primario
    });

    console.log(` MongoDB Atlas conectado exitosamente!`);
    console.log(` Cluster: ${conn.connection.host}`);
    console.log(` Base de datos: ${conn.connection.name}`);

    // Manejar eventos de conexión
    mongoose.connection.on('error', (err) => {
      console.error(' Error de conexión MongoDB Atlas:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log(' MongoDB Atlas desconectado');
    });

    mongoose.connection.on('reconnected', () => {
      console.log(' MongoDB Atlas reconectado');
    });

    mongoose.connection.on('connected', () => {
      console.log(' MongoDB Atlas conectado');
    });

  } catch (error) {
    console.error(' Error conectando a MongoDB Atlas:', error.message);
    console.error(' Verifica:');
    console.error('  - Las credenciales en .env');
    console.error('  - La whitelist de IPs en MongoDB Atlas');
    console.error('  - El estado del cluster');

    // En desarrollo, no cerrar el proceso para permitir debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(' Modo desarrollo: servidor continuará sin MongoDB');
      return;
    }

    // En producción, cerrar el proceso
    process.exit(1);
  }
};

// Conectar a la base de datos
connectDB();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/clans', clanRoutes);
app.use('/api/clan-invites', clanInviteRoutes);
app.use('/api/clan-challenges', clanChallengeRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/auth-verification', authVerificationRoutes);

// Middleware de logging de errores (después de las rutas)
app.use((err, req, res, next) => {
  console.error('Error en middleware:', err);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'API de Liga Dorada funcionando',
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Ruta de health check
app.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
  res.status(200).json(health);
});

// Captura de excepciones no controladas
process.on('uncaughtException', (err, origin) => {
  console.error('EXCEPCIÓN NO CAPTURADA:', err);
  console.error('Origen:', origin);
  // No cerrar el proceso, solo loggear el error
});

// Captura de promesas rechazadas no manejadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('PROMESA RECHAZADA NO MANEJADA:', reason);
  console.error('Promise:', promise);
  // No cerrar el proceso, solo loggear el error
});

// Captura de advertencias
process.on('warning', (warning) => {
  console.warn('ADVERTENCIA:', warning);
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PID: ${process.pid}`);
});

// Manejo graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`Señal ${signal} recibida. Cerrando servidor gracefulmente...`);

  try {
    // Cerrar servidor HTTP
    server.close(async () => {
      console.log('Servidor HTTP cerrado');

      try {
        // Cerrar conexión a MongoDB (sin callback, usando await)
        await mongoose.connection.close();
        console.log('Conexión MongoDB cerrada');
        process.exit(0);
      } catch (mongooseError) {
        console.error('Error cerrando MongoDB:', mongooseError);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error en graceful shutdown:', error);
    process.exit(1);
  }

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('Forzando cierre del servidor...');
    process.exit(1);
  }, 10000);
};

// Escuchar señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejar errores del servidor
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} ya está en uso`);
  } else if (err.code === 'EACCES') {
    console.error(`No hay permisos para usar el puerto ${PORT}`);
  } else {
    console.error('Error del servidor:', err);
  }

  // Intentar usar otro puerto
  if (err.code === 'EADDRINUSE') {
    const altPort = PORT + 1;
    console.log(`Intentando puerto alternativo ${altPort}...`);
    server.listen(altPort, HOST, () => {
      console.log(`Servidor corriendo en http://${HOST}:${altPort}`);
    });
  }
});

module.exports = app;
