import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import { CircularProgress, Box } from '@mui/material';

// Componente Loading para Suspense fallback
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress color="primary" />
  </Box>
);

// Páginas lazy loaded
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Tournaments = lazy(() => import('./pages/Tournaments'));
const TournamentDetail = lazy(() => import('./pages/TournamentDetailPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const Support = lazy(() => import('./pages/Support'));
const Faq = lazy(() => import('./pages/Faq'));
const Ranking = lazy(() => import('./pages/Ranking'));
const PlayersDirectory = lazy(() => import('./pages/PlayersDirectory'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Terms = lazy(() => import('./pages/Terms'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
// const Clans = lazy(() => import('./pages/Clans'));
// const ClanDetail = lazy(() => import('./pages/ClanDetail'));
// const MyClan = lazy(() => import('./pages/MyClan'));
// const ClanInvites = lazy(() => import('./pages/ClanInvites'));

// Componente de ruta protegida
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Componente de ruta protegida para admin
const AdminRoute = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner' && currentUser.role !== 'creator')) {
    return <Navigate to="/" />;
  }
  return children;
};

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Ruta Pública */}
          <Route path="/" element={<Home />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/u/:username" element={<PublicProfile />} />

          {/* Rutas públicas de clanes - BLOQUEADAS TEMPORALMENTE */}
          {/* <Route path="/clans" element={<Clans />} /> */}
          {/* <Route path="/clans/:id" element={<ClanDetail />} /> */}
        
        {/* Rutas Protegidas */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/support"
          element={
            <PrivateRoute>
              <Support />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin-settings"
          element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          }
        />
    
       <Route 
          path="/tournaments/:id" 
          element={
         <PrivateRoute>
           <TournamentDetail />
         </PrivateRoute>
         } 
        />
        <Route 
          path="/tournaments" 
          element={
            <PrivateRoute>
              <Tournaments />
            </PrivateRoute>
          } 
        />

        <Route
          path="/ranking"
          element={
            <PrivateRoute>
              <Ranking />
            </PrivateRoute>
          }
        />

        <Route
          path="/players"
          element={
            <PrivateRoute>
              <PlayersDirectory />
            </PrivateRoute>
          }
        />

        {/* Rutas de clanes - BLOQUEADAS TEMPORALMENTE */}
        {/* <Route
          path="/my-clan"
          element={
            <PrivateRoute>
              <MyClan />
            </PrivateRoute>
          }
        />

        <Route
          path="/clan-invites"
          element={
            <PrivateRoute>
              <ClanInvites />
            </PrivateRoute>
          }
        /> */}

          {/* Ruta 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;