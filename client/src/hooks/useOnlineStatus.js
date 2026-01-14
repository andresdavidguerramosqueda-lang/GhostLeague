import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const useOnlineStatus = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const heartbeatRef = useRef(null);
  const isOnlineRef = useRef(false);

  useEffect(() => {
    // SISTEMA DESACTIVADO TEMPORALMENTE PARA EVITAR SPAM
    console.log('useOnlineStatus: Sistema desactivado temporalmente');
    return;
    
    // Código original comentado para evitar errores */
    
    if (!isAuthenticated || !currentUser) {
      console.log('useOnlineStatus: No autenticado o sin usuario - saliendo');
      return;
    }

    console.log('useOnlineStatus: Iniciando para usuario', currentUser.username);

    // Marcar como online cuando el componente se monta
    const goOnline = async () => {
      try {
        console.log('useOnlineStatus: Marcando como online para', currentUser.username);
        const response = await api.put('/users/online', { status: 'online' });
        console.log('useOnlineStatus: Online response:', response.data);
        isOnlineRef.current = true;
      } catch (error) {
        console.error('Error going online:', error.response?.data || error.message);
        isOnlineRef.current = false;
      }
    };

    // Marcar como offline cuando el componente se desmonta
    const goOffline = async () => {
      if (!isOnlineRef.current) return; // Evitar múltiples llamadas
      
      try {
        console.log('useOnlineStatus: Marcando como offline...');
        const response = await api.put('/users/online', { status: 'offline' });
        console.log('useOnlineStatus: Offline response:', response.data);
      } catch (error) {
        console.error('Error going offline:', error);
      } finally {
        isOnlineRef.current = false;
      }
    };

    // Heartbeat para mantener el estado online
    const startHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      
      heartbeatRef.current = setInterval(async () => {
        try {
          const response = await api.put('/users/heartbeat');
          console.log('useOnlineStatus: Heartbeat response:', response.data);
        } catch (error) {
          console.error('Heartbeat error:', error);
          // Si falla el heartbeat, intentar marcar offline
          isOnlineRef.current = false;
        }
      }, 15000); // Cada 15 segundos para mayor precisión
    };

    // Eventos del navegador
    const handleVisibilityChange = () => {
      console.log('useOnlineStatus: Visibility changed, hidden:', document.hidden);
      if (document.hidden) {
        goOffline();
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
      } else {
        goOnline();
        startHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      console.log('useOnlineStatus: Before unload, going offline');
      goOffline();
    };

    const handleFocus = () => {
      console.log('useOnlineStatus: Window focused, going online');
      goOnline();
      startHeartbeat();
    };

    const handleBlur = () => {
      console.log('useOnlineStatus: Window blurred, going offline');
      goOffline();
    };

    const handleUserActivity = () => {
      if (!isOnlineRef.current && !document.hidden) {
        console.log('useOnlineStatus: User activity detected, going online');
        goOnline();
      }
    };

    // Inicializar
    console.log('useOnlineStatus: Inicializando - Reset estado online');
    isOnlineRef.current = false; // Resetear estado al iniciar
    
    // Pequeño retraso para asegurar que todo esté cargado
    setTimeout(() => {
      goOnline();
      startHeartbeat();
    }, 100);

    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Detectar actividad del usuario
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);

    // Cleanup
    return () => {
      console.log('useOnlineStatus: Cleanup, going offline');
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      // Remover event listeners de actividad
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('mousemove', handleUserActivity);
      
      goOffline();
    };
  }, [isAuthenticated, currentUser]);

  return null;
};

export default useOnlineStatus;
