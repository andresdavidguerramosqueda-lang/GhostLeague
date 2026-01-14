import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import SimpleRegister from './components/SimpleRegister';

// Importa tus otros componentes aquí
// import Login from './components/Login';
// import Dashboard from './components/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Ruta de registro con verificación */}
            <Route path="/register" element={<SimpleRegister />} />
            
            {/* Tus otras rutas */}
            {/* <Route path="/login" element={<Login />} /> */}
            {/* <Route path="/dashboard" element={<Dashboard />} /> */}
            
            {/* Redirección por defecto */}
            <Route path="/" element={<Navigate to="/register" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
