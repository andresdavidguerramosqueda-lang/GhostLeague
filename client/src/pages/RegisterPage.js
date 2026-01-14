import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
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
        // MOSTRAR MODAL DE VERIFICACIÓN en lugar de redirigir
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
        navigate('/login');
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
    // Cerrar modal y redirigir al dashboard
    setShowVerificationModal(false);
    setPendingEmail('');
    
    // El contexto ya manejará la autenticación
    // Redirigir después de un breve delay para que el contexto se actualice
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
    
    console.log('✅ Verificación completada, redirigiendo al dashboard');
  };

  const handleVerificationClose = () => {
    // Permitir cerrar el modal pero mantener el email pendiente
    setShowVerificationModal(false);
    
    // Opcional: redirigir al login si cierra el modal
    // navigate('/login');
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
      {showVerificationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📧 Verificar Correo Electrónico</h2>
              <button className="close-btn" onClick={handleVerificationClose}>×</button>
            </div>

            <div className="modal-body">
              <p>Hemos enviado un código de verificación a:</p>
              <div className="email-display">
                <strong>{pendingEmail}</strong>
              </div>

              <div className="instructions">
                <h3>📋 Sigue estos pasos:</h3>
                <ol>
                  <li>Revisa tu bandeja de entrada</li>
                  <li>Busca un correo de "Ghost League"</li>
                  <li>Encuentra el código de 4 dígitos</li>
                  <li>Ingresa el código en el formulario de verificación</li>
                  <li>El código expira en 5 minutos</li>
                </ol>
              </div>

              <div className="verification-actions">
                <button
                  onClick={() => {
                    // Aquí podrías abrir un componente de verificación
                    // o redirigir a una página de verificación
                    navigate('/verify-email', { state: { email: pendingEmail } });
                  }}
                  className="verify-code-btn"
                >
                  🔍 Ingresar Código de Verificación
                </button>
                
                <button
                  onClick={handleVerificationClose}
                  className="later-btn"
                >
                  Más Tarde
                </button>
              </div>

              <div className="help-section">
                <p><strong>¿No recibiste el correo?</strong></p>
                <ul>
                  <li>Revisa tu carpeta de spam</li>
                  <li>Verifica que el correo esté bien escrito</li>
                  <li>Espera unos minutos y vuelve a intentar</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 15px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 1px solid #eee;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 15px 15px 0 0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.3s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
          padding: 25px;
        }

        .email-display {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border: 2px dashed #007bff;
          margin: 15px 0;
          text-align: center;
        }

        .email-display strong {
          color: #007bff;
          font-size: 16px;
        }

        .instructions {
          margin: 20px 0;
          padding: 20px;
          background: #e9ecef;
          border-radius: 8px;
        }

        .instructions h3 {
          color: #495057;
          margin-bottom: 15px;
          font-size: 16px;
        }

        .instructions ol {
          margin: 0;
          padding-left: 20px;
        }

        .instructions li {
          color: #666;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .verification-actions {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }

        .verify-code-btn {
          flex: 1;
          padding: 15px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        }

        .verify-code-btn:hover {
          background: #218838;
        }

        .later-btn {
          padding: 15px 20px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.3s;
        }

        .later-btn:hover {
          background: #5a6268;
        }

        .help-section {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 13px;
        }

        .help-section p {
          margin: 0 0 10px 0;
          color: #495057;
        }

        .help-section ul {
          margin: 0;
          padding-left: 20px;
        }

        .help-section li {
          color: #6c757d;
          margin-bottom: 5px;
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

          .verification-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
