import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SimpleVerificationModal = ({ isOpen, onClose, email }) => {
  const { verifyEmail, resendVerificationCode, isLoading, error, clearError } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) return;

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
      console.log('🔍 Verificando código para:', email);
      console.log('🔢 Código ingresado:', code.trim());
      
      const result = await verifyEmail(email, code.trim());
      
      console.log('✅ Verificación exitosa:', result);
      alert('✅ ¡Correo verificado exitosamente! Bienvenido a Ghost League.');
      onClose();
      
    } catch (error) {
      console.error('❌ Error en verificación:', error);
      alert('❌ ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
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
          <h2 style={{ margin: 0, color: '#333' }}>📧 Verificar Correo</h2>
          <button
            onClick={onClose}
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
            {email}
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Código de 4 dígitos:
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCode(value);
                if (error) clearError();
              }}
              disabled={isSubmitting || isLoading}
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
            disabled={isSubmitting || isLoading || code.length !== 4}
            style={{
              width: '100%',
              padding: '15px',
              background: isSubmitting || isLoading || code.length !== 4 ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSubmitting || isLoading || code.length !== 4 ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting || isLoading ? 'Verificando...' : '✓ Verificar Correo'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#e9ecef',
          borderRadius: '8px',
          fontSize: '13px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📋 Instrucciones:</h4>
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
  );
};

export default SimpleVerificationModal;
