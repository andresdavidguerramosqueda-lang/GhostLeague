import React, { useState } from 'react';
import axios from 'axios';

const RegistrationWithVerification = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState({
    email: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) {
      setError('');
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

  const handleInitiateRegistration = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('⚠️ Formulario ya en proceso de envío');
      return;
    }

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError('Errores de validación:\n\n' + validationErrors.join('\n'));
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📝 Iniciando proceso de registro con verificación...');
      
      const response = await axios.post(`${API_URL}/registration/initiate`, {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      console.log('✅ Respuesta del servidor:', response.data);

      if (response.data.success) {
        // ✅ MOSTRAR MODAL DE VERIFICACIÓN
        setVerificationData({
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password
        });
        setShowVerificationModal(true);
        
        // Limpiar formulario
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        setError('');
        
        alert(`✅ Proceso iniciado exitosamente!\n\n` +
              `Te enviamos un código de verificación a: ${response.data.email}\n\n` +
              `Por favor, revisa tu correo y ingresa el código.`);
      } else {
        setError(response.data.message || 'Error al iniciar el registro');
      }

    } catch (error) {
      console.error('❌ Error en registro:', error);
      
      let errorMessage = 'Error al registrarse';
      
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (isVerifying) {
      console.log('⚠️ Verificación ya en progreso');
      return;
    }

    if (!code.trim()) {
      setError('Por favor, ingresa el código de verificación');
      return;
    }

    if (!/^\d{4}$/.test(code.trim())) {
      setError('El código debe tener exactamente 4 dígitos');
      return;
    }

    setIsVerifying(true);

    try {
      console.log('🔍 Verificando código...');
      
      const response = await axios.post(`${API_URL}/registration/complete`, {
        email: verificationData.email,
        code: code.trim(),
        username: verificationData.username,
        password: verificationData.password
      });

      console.log('✅ Verificación exitosa:', response.data);

      if (response.data.success) {
        alert('✅ ¡Registro completado exitosamente! Bienvenido a Ghost League.');
        
        // Cerrar modal y limpiar
        setShowVerificationModal(false);
        setVerificationData({ email: '', username: '', password: '' });
        setCode('');
        setError('');
        
        // Aquí podrías redirigir al dashboard
        // window.location.href = '/dashboard';
      } else {
        setError(response.data.message || 'Error al verificar el código');
      }

    } catch (error) {
      console.error('❌ Error en verificación:', error);
      
      let errorMessage = 'Error al verificar el código';
      
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('📧 Reenviando código...');
      
      const response = await axios.post(`${API_URL}/registration/resend-code`, {
        email: verificationData.email
      });

      console.log('✅ Código reenviado:', response.data);

      if (response.data.success) {
        alert(`✅ Nuevo código enviado a: ${verificationData.email}\n\nPor favor, revisa tu correo.`);
      } else {
        setError(response.data.message || 'Error al reenviar el código');
      }

    } catch (error) {
      console.error('❌ Error reenviando código:', error);
      setError('Error al reenviar el código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowVerificationModal(false);
    setVerificationData({ email: '', username: '', password: '' });
    setCode('');
    setError('');
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
          <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
            🎮 Crear Cuenta
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            Ghost League - Registro con Verificación
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
              onClick={() => setError('')}
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

        <form onSubmit={handleInitiateRegistration} style={{ padding: '30px' }}>
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
              disabled={isSubmitting}
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
            <small style={{
              display: 'block',
              marginTop: '5px',
              color: '#6c757d',
              fontSize: '12px'
            }}>
              Mínimo 3 caracteres
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
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
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
              Te enviaremos un código de verificación
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '15px',
              background: isSubmitting ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {isSubmitting ? (
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
              '🚀 Iniciar Registro'
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

      {/* Modal de Verificación */}
      {showVerificationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>
                📧 Verificar Correo Electrónico
              </h2>
              <button
                onClick={handleModalClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center',
              border: '2px dashed #007bff'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                Enviamos un código a:
              </p>
              <strong style={{ color: '#007bff', fontSize: '16px' }}>
                {verificationData.email}
              </strong>
            </div>

            {error && (
              <div style={{
                background: '#fee',
                color: '#c33',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <form onSubmit={handleVerifyCode}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  Código de 4 dígitos:
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCode(value);
                    if (error) setError('');
                  }}
                  disabled={isVerifying}
                  placeholder="0000"
                  maxLength="4"
                  pattern="[0-9]{4}"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '24px',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || code.length !== 4}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: isVerifying || code.length !== 4 ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isVerifying || code.length !== 4 ? 'not-allowed' : 'pointer'
                }}
              >
                {isVerifying ? (
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
                    Verificando...
                  </span>
                ) : (
                  '✓ Verificar Código'
                )}
              </button>
            </form>

            <div style={{
              marginTop: '20px',
              textAlign: 'center'
            }}>
              <button
                onClick={handleResendCode}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  background: isLoading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '14px',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? 'Enviando...' : '📧 Reenviar Código'}
              </button>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#e9ecef',
              borderRadius: '8px',
              fontSize: '13px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>
                📋 Instrucciones:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
                <li style={{ marginBottom: '5px' }}>Revisa tu bandeja de entrada</li>
                <li style={{ marginBottom: '5px' }}>Busca un correo de "Ghost League"</li>
                <li style={{ marginBottom: '5px' }}>Ingresa el código de 4 dígitos</li>
                <li style={{ marginBottom: '5px' }}>El código expira en 5 minutos</li>
                <li style={{ marginBottom: '5px' }}>Si no encuentras el correo, revisa tu carpeta de spam</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RegistrationWithVerification;
