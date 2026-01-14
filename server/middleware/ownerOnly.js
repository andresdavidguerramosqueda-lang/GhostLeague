const ownerOnly = (req, res, next) => {
  // Verificar si el usuario es owner
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de owner.' });
  }
  next();
};

module.exports = ownerOnly;
