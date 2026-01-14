import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SimpleVerificationModal from './SimpleVerificationModal';

const SimpleRegister = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

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
      console.log('⚠️ Formulario ya en proceso');
      return;
    }

    // Validación básica
    if (!formData.username || !formData.email || !formData.password) {
      alert('Todos los campos son requeridos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📝 Enviando registro...');
      
      const result = await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      console.log('✅ Respuesta del servidor:', result);

      if (result.requiresVerification) {
        // ✅ MOSTRAR MODAL DE VERIFICACIÓN
        setPendingEmail(result.email);
        setShowVerificationModal(true);
        
        // Limpiar formulario
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        alert(`✅ Usuario registrado exitosamente!\n\n` +
              `Hemos enviado un código de verificación a: ${result.email}\n\n` +
              `Por favor, verifica tu correo para completar el registro.`);
      } else {
        alert('✅ ¡Registro completado! Ya puedes iniciar sesión.');
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      }

    } catch (error) {
      console.error('❌ Error en registro:', error);
      alert('❌ ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSuccess = () => {
    console.log('✅ Verificación completada');
    setShowVerificationModal(false);
    setPendingEmail('');
    // Aquí podrías redirigir al dashboard
    window.location.href = '/dashboard';
  };

  const handleVerificationClose = () => {
    console.log('📴 Modal cerrado sin verificar');
    setShowVerificationModal(false);
    // Opcional: redirigir al login
    // window.location.href = '/login';
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
        maxWidth: '450px',
        width: '100%'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px',
          textAlign: 'center',
          borderRadius: '20px 20px 0 0'
        }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>🎮 Crear Cuenta</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            Únete a Ghost League
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
              Nombre de Usuario
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
              placeholder="Ej: Player123"
              minLength="3"
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
            <small style={{
              display: 'block',
              marginTop: '5px',
              color: '#6c757d',
              fontSize: '12px'
            }}>
              Necesitarás verificar este correo
            </small>
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
              placeholder="Mínimo 6 caracteres"
              minLength="6"
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
            <small style={{
              display: 'block',
              marginTop: '5px',
              color: '#6c757d',
              fontSize: '12px'
            }}>
              Mínimo 6 caracteres
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#333',
              fontSize: '14px'
            }}>
              Confirmar Contraseña
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
              placeholder="Repite tu contraseña"
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
                Registrando...
              </span>
            ) : (
              '🚀 Crear Cuenta'
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
            ¿Ya tienes una cuenta? <a href="/login" style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600'
            }}>Inicia sesión</a>
          </p>
        </div>
      </div>

      {/* Modal de verificación */}
      <SimpleVerificationModal
        isOpen={showVerificationModal}
        onClose={handleVerificationClose}
        email={pendingEmail}
      />

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SimpleRegister;
