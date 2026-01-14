import api from './api';

// Actualizar estado del usuario (online/offline)
export const updateUserStatus = async (status) => {
  try {
    const response = await api.put('/users/online', { status });
    return response.data;
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    throw error;
  }
};

// Obtener estado actual del usuario
export const getUserStatus = async () => {
  try {
    const response = await api.get('/users/status');
    return response.data;
  } catch (error) {
    console.error('Error al obtener estado:', error);
    throw error;
  }
};

// Buscar usuario por nombre de usuario
export const getUserByUsername = async (username) => {
  try {
    const response = await api.get(`/users/username/${encodeURIComponent(username)}`);
    return response.data;
  } catch (error) {
    console.error('Error al buscar usuario:', error);
    throw error;
  }
};

// Hook personalizado para manejar estado online/offline
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Marcar como online
  const goOnline = async () => {
    setLoading(true);
    try {
      await updateUserStatus('online');
      setIsOnline(true);
    } catch (error) {
      console.error('Error al conectarse:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como offline
  const goOffline = async () => {
    setLoading(true);
    try {
      await updateUserStatus('offline');
      setIsOnline(false);
    } catch (error) {
      console.error('Error al desconectarse:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isOnline, loading, goOnline, goOffline };
};

export default { updateUserStatus, getUserStatus, useOnlineStatus };
