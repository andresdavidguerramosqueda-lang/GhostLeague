import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginCorrecto = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) {
      console.log('⚠️ Login ya en progreso');
      return;
    }

    if (!formData.email || !formData.password) {
      alert('Por favor, completa todos los campos');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔑 Iniciando sesión...');
      
      const result = await login({
        email: formData.email.trim(),
        password: formData.password
      });

      console.log('✅ Login exitoso:', result);
      
      // El login fue exitoso, el contexto manejará la redirección
      alert('✅ ¡Bienvenido de nuevo a Ghost League!');
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      
      // 🔍 MANEJO ESPECÍFICO DEL ERROR 403
      if (error.message.includes('Debes verificar tu correo electrónico')) {
        // ❌ NO MOSTRAR PANTALLA DE VERIFICACIÓN
        // ✅ MOSTRAR MENSAJE CLARO
        alert('❌ Tu cuenta no está verificada.\n\n' +
              'Por favor, revisa tu correo y busca el código de verificación.\n' +
              'Si no recibiste el correo, puedes registrarte nuevamente.');
        return;
      }
      
      // Otros errores
      alert('❌ ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px',
          textAlign: 'center',
          borderRadius: '20px 20px 0 0'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🔑 Iniciar Sesión</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            Ghost League
          </p>
        </div>
        
        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '15px',
            margin: '20px 30px',
            borderRadius: '10px',
            border: '1px solid #fcc',
            fontSize: '14px'
          }}>
            <strong>Error:</strong> {error}
            <button
              onClick={clearError}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: '#c33',
                cursor: 'pointer',
                fontSize: '16px',
                marginLeft: '10px'
              }}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#333',
              fontSize: '14px'
            }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
              placeholder="ejemplo@correo.com"
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e1e5e9',
                borderRadius: '10px',
                fontSize: '16px',
                background: '#f8f9fa'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#333',
              fontSize: '14px'
            }}>
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
              placeholder="Tu contraseña"
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e1e5e9',
                borderRadius: '10px',
                fontSize: '16px',
                background: '#f8f9fa'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            style={{
              width: '100%',
              padding: '15px',
              background: isSubmitting || isLoading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {isSubmitting || isLoading ? (
              <span>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff',
                  borderRadius: '50%',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s ease-in-out infinite',
                  marginRight: '8px'
                }}></span>
                Iniciando sesión...
              </span>
            ) : (
              '🚀 Iniciar Sesión'
            )}
          </button>
        </form>

        <div style={{
          padding: '20px 30px',
          background: '#f8f9fa',
          textAlign: 'center',
          borderTop: '1px solid #e9ecef'
        }}>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
            ¿No tienes una cuenta? <a href="/register" style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600'
            }}>Regístrate</a>
          </p>
          
          <div style={{
            marginTop: '15px',
            padding: '15px',
            background: '#e9ecef',
            borderRadius: '8px',
            fontSize: '13px'
          }}>
            <p style={{ margin: '0 0 10px 0', color: '#495057', fontWeight: 'bold' }}>
              📋 ¿Tu cuenta no está verificada?
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
              <li style={{ marginBottom: '5px' }}>Revisa tu correo electrónico</li>
              <li style={{ marginBottom: '5px' }}>Busca el código de Ghost League</li>
              <li style={{ marginBottom: '5px' }}>Si no lo encuentras, regístrate nuevamente</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginCorrecto;
