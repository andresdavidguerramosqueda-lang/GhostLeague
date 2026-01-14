import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const EmailVerification = ({ email, onBack }) => {
  const { verifyEmail, resendVerificationCode, isLoading, error, clearError } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Timer para reenviar código
  React.useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) {
      console.log('⚠️ Verificación ya en progreso');
      return;
    }

    // Validar código
    if (!code.trim()) {
      alert('Por favor, ingresa el código de verificación');
      return;
    }

    if (!/^\d{4}$/.test(code.trim())) {
      alert('El código debe tener exactamente 4 dígitos');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔍 Verificando código...');
      
      const result = await verifyEmail(email, code.trim());
      
      console.log('✅ Verificación exitosa:', result);
      alert('✅ ¡Correo verificado exitosamente! Bienvenido a Ghost League.');
      
      // El contexto manejará la redirección automáticamente
      
    } catch (error) {
      console.error('❌ Error en verificación:', error);
      
      if (error.message.includes('inválido o expirado')) {
        alert('❌ Código inválido o expirado. Por favor, revisa tu correo o solicita un nuevo código.');
      } else if (error.message.includes('Demasiados intentos')) {
        alert('⏰ ' + error.message + '\n\nPor favor, espera unos minutos antes de intentar nuevamente.');
      } else {
        alert('❌ ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0 || isResending || isLoading) {
      return;
    }

    setIsResending(true);

    try {
      console.log('📧 Reenviando código...');
      
      const result = await resendVerificationCode(email);
      
      console.log('✅ Código reenviado:', result);
      alert(`✅ Nuevo código enviado a: ${email}\n\nPor favor, revisa tu correo.` + 
            (result.previewUrl ? `\n\n🔗 Vista previa del correo (desarrollo):\n${result.previewUrl}` : ''));
      
      // Iniciar timer de 60 segundos
      setResendTimer(60);
      
    } catch (error) {
      console.error('❌ Error reenviando código:', error);
      alert('❌ ' + error.message);
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="email-verification">
      <div className="verification-header">
        <h2>📧 Verificar Correo Electrónico</h2>
        <p>Hemos enviado un código de verificación a:</p>
        <div className="email-display">
          <strong>{email}</strong>
        </div>
      </div>

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
          <label htmlFor="verification-code">Código de Verificación:</label>
          <input
            type="text"
            id="verification-code"
            value={code}
            onChange={(e) => {
              // Solo permitir números
              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
              setCode(value);
              if (error) clearError();
            }}
            disabled={isSubmitting || isLoading}
            placeholder="0000"
            maxLength="4"
            pattern="[0-9]{4}"
            required
            style={{
              width: '100%',
              padding: '15px',
              margin: '10px 0',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '24px',
              textAlign: 'center',
              letterSpacing: '8px',
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLoading || code.length !== 4}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: isSubmitting || isLoading || code.length !== 4 ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isSubmitting || isLoading || code.length !== 4 ? 'not-allowed' : 'pointer',
            marginTop: '15px'
          }}
        >
          {isSubmitting || isLoading ? (
            <span>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
              {' '}Verificando...
            </span>
          ) : (
            '✓ Verificar Correo'
          )}
        </button>
      </form>

      <div className="resend-section">
        <p>¿No recibiste el código?</p>
        <button
          onClick={handleResendCode}
          disabled={resendTimer > 0 || isResending || isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: resendTimer > 0 || isResending || isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: resendTimer > 0 || isResending || isLoading ? 'not-allowed' : 'pointer',
            marginTop: '10px'
          }}
        >
          {isResending ? (
            <span>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
              {' '}Enviando...
            </span>
          ) : resendTimer > 0 ? (
            `Reenviar en ${formatTime(resendTimer)}`
          ) : (
            '📧 Reenviar Código'
          )}
        </button>
      </div>

      <div className="help-section">
        <h3>📋 Instrucciones:</h3>
        <ul>
          <li>Revisa tu bandeja de entrada</li>
          <li>Busca un correo de "Ghost League"</li>
          <li>Ingresa el código de 4 dígitos</li>
          <li>El código expira en 5 minutos</li>
          <li>Si no encuentras el correo, revisa tu carpeta de spam</li>
        </ul>
      </div>

      <div className="back-section">
        <button
          onClick={onBack}
          disabled={isSubmitting || isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
            marginTop: '20px'
          }}
        >
          ← Volver al Registro
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .email-verification {
          max-width: 450px;
          margin: 0 auto;
          padding: 30px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .verification-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .verification-header h2 {
          color: #333;
          margin-bottom: 10px;
          font-size: 24px;
        }

        .verification-header p {
          color: #666;
          margin-bottom: 10px;
        }

        .email-display {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border: 2px dashed #007bff;
          margin: 15px 0;
        }

        .email-display strong {
          color: #007bff;
          font-size: 18px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          color: #333;
        }

        .form-group input:focus {
          outline: none;
          border-color: #28a745;
          box-shadow: 0 0 8px rgba(40,167,69,0.3);
        }

        .resend-section {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .resend-section p {
          color: #666;
          margin-bottom: 10px;
        }

        .help-section {
          margin: 30px 0;
          padding: 20px;
          background: #e9ecef;
          border-radius: 8px;
        }

        .help-section h3 {
          color: #495057;
          margin-bottom: 15px;
          font-size: 16px;
        }

        .help-section ul {
          margin: 0;
          paddingLeft: 20px;
        }

        .help-section li {
          color: #666;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .back-section {
          text-align: center;
          margin-top: 20px;
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

export default EmailVerification;
