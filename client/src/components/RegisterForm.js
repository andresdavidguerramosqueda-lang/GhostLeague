import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const RegisterForm = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empieza a escribir
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.username.trim()) {
      errors.push('El nombre de usuario es requerido');
    } else if (formData.username.trim().length < 3) {
      errors.push('El nombre de usuario debe tener al menos 3 caracteres');
    }

    if (!formData.email.trim()) {
      errors.push('El correo electrónico es requerido');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.push('El formato del correo electrónico es inválido');
      }
    }

    if (!formData.password) {
      errors.push('La contraseña es requerida');
    } else if (formData.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Las contraseñas no coinciden');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevenir múltiples envíos
    if (isSubmitting || isLoading) {
      console.log('⚠️ Formulario ya en proceso de envío');
      return;
    }

    // Validar formulario
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      clearError();
      alert('Errores de validación:\n\n' + validationErrors.join('\n'));
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📝 Iniciando registro...');
      
      const result = await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      console.log('✅ Registro exitoso:', result);

      if (result.requiresVerification) {
        alert(`✅ Usuario registrado exitosamente!\n\n` +
              `Hemos enviado un código de verificación a: ${result.email}\n\n` +
              `Por favor, revisa tu correo y verifica tu cuenta para poder iniciar sesión.` +
              (result.previewUrl ? `\n\n🔗 Vista previa del correo (desarrollo):\n${result.previewUrl}` : ''));
        
        // Limpiar formulario
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
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
      
      // El error ya está manejado en el contexto, solo mostramos alerta
      if (error.message.includes('Demasiados intentos')) {
        alert('⏰ ' + error.message + '\n\nPor favor, espera unos minutos antes de intentar nuevamente.');
      } else {
        alert('❌ ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-form">
      <h2>Crear Cuenta</h2>
      
      {error && (
        <div className="error-message" style={{
          backgroundColor: '#fee',
          color: '#c33',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '15px',
          border: '1px solid #fcc'
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
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="username">Nombre de Usuario:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            disabled={isSubmitting || isLoading}
            placeholder="Ej: Player123"
            minLength="3"
            required
            style={{
              width: '100%',
              padding: '10px',
              margin: '5px 0',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Correo Electrónico:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isSubmitting || isLoading}
            placeholder="ejemplo@correo.com"
            required
            style={{
              width: '100%',
              padding: '10px',
              margin: '5px 0',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            disabled={isSubmitting || isLoading}
            placeholder="Mínimo 6 caracteres"
            minLength="6"
            required
            style={{
              width: '100%',
              padding: '10px',
              margin: '5px 0',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting || isLoading}
            placeholder="Repite tu contraseña"
            required
            style={{
              width: '100%',
              padding: '10px',
              margin: '5px 0',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSubmitting || isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
            marginTop: '10px'
          }}
        >
          {isSubmitting || isLoading ? (
            <span>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
              {' '}Procesando...
            </span>
          ) : (
            'Registrarse'
          )}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
        <p>¿Ya tienes una cuenta? <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Inicia sesión</a></p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .register-form {
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: #333;
        }

        .form-group input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 5px rgba(0,123,255,0.3);
        }

        .error-message {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterForm;
