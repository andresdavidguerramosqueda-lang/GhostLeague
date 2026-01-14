import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmailVerificationModal from './EmailVerificationModal';

const RegisterWithVerification = () => {
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
        // Mostrar modal de verificación en lugar de redirigir
        setPendingEmail(result.email);
        setShowVerificationModal(true);
        
        // Limpiar formulario
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        // Mensaje informativo
        alert(`✅ Usuario registrado exitosamente!\n\n` +
              `Hemos enviado un código de verificación a: ${result.email}\n\n` +
              `Por favor, verifica tu correo para completar el registro.`);
      } else {
        // Caso raro: registro sin verificación
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

  const handleVerificationSuccess = () => {
    // Cerrar modal y limpiar estado
    setShowVerificationModal(false);
    setPendingEmail('');
    
    // El contexto ya manejará la redirección al dashboard
    console.log('✅ Verificación completada, usuario debería estar logueado');
  };

  const handleVerificationClose = () => {
    // Permitir cerrar el modal pero mantener el email pendiente
    setShowVerificationModal(false);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>🎮 Crear Cuenta en Ghost League</h1>
          <p>Únete a la comunidad gaming más competitiva</p>
        </div>
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button onClick={clearError} className="error-close">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Nombre de Usuario</label>
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
                className="form-input"
              />
              <small className="form-hint">Mínimo 3 caracteres</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting || isLoading}
                placeholder="ejemplo@correo.com"
                required
                className="form-input"
              />
              <small className="form-hint">Necesitarás verificar este correo</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
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
                className="form-input"
              />
              <small className="form-hint">Mínimo 6 caracteres</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting || isLoading}
                placeholder="Repite tu contraseña"
                required
                className="form-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="register-btn"
          >
            {isSubmitting || isLoading ? (
              <span>
                <span className="spinner"></span>
                {' '}Registrando...
              </span>
            ) : (
              '🚀 Crear Cuenta'
            )}
          </button>
        </form>

        <div className="register-footer">
          <p>¿Ya tienes una cuenta? <a href="/login" className="login-link">Inicia sesión</a></p>
        </div>
      </div>

      {/* Modal de verificación de correo */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={handleVerificationClose}
        email={pendingEmail}
        onSuccess={handleVerificationSuccess}
      />

      <style jsx>{`
        .register-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .register-card {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          max-width: 450px;
          width: 100%;
          overflow: hidden;
        }

        .register-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }

        .register-header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          font-weight: bold;
        }

        .register-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .register-form {
          padding: 30px;
        }

        .form-row {
          margin-bottom: 20px;
        }

        .form-group {
          position: relative;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .form-input {
          width: 100%;
          padding: 12px 15px;
          border: 2px solid #e1e5e9;
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.3s;
          background: #f8f9fa;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input:disabled {
          background: #e9ecef;
          cursor: not-allowed;
        }

        .form-hint {
          display: block;
          margin-top: 5px;
          color: #6c757d;
          font-size: 12px;
        }

        .register-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 10px;
        }

        .register-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .register-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .register-footer {
          padding: 20px 30px;
          background: #f8f9fa;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }

        .register-footer p {
          margin: 0;
          color: #6c757d;
          font-size: 14px;
        }

        .login-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s;
        }

        .login-link:hover {
          color: #764ba2;
          text-decoration: underline;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 15px;
          margin: 20px 30px;
          border-radius: 10px;
          border: 1px solid #fcc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideIn 0.3s ease-out;
        }

        .error-close {
          background: none;
          border: none;
          color: #c33;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          margin-left: 10px;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
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

        @media (max-width: 768px) {
          .register-container {
            padding: 10px;
          }

          .register-card {
            max-width: 100%;
          }

          .register-header,
          .register-form {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterWithVerification;
