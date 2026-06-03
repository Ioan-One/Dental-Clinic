import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MasterView from './pages/MasterView';
import DetailView from './pages/DetailView';
import CalendarView from './pages/CalendarView';
import AdminUsersPage from './pages/AdminUsersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MagicLinkVerifyPage from './pages/MagicLinkVerifyPage';
import Navbar from './components/Navbar';
import Chat from './components/Chat';
import CookieTracker from './components/CookieTracker';
import { AuthProvider, useAuth } from './store/AuthContext';
import { DataProvider } from './store/DataStore';
import './App.css';

// Redirect unauthenticated users to login
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// Only admins can access this route
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/appointments" replace />;
  return children;
}

// Redirect already-logged-in users away from auth pages
function GuestRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/appointments" replace /> : children;
}

function AppContent() {
  return (
    <Router>
      <CookieTracker />
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/appointments" element={<ProtectedRoute><MasterView /></ProtectedRoute>} />
            <Route path="/patient/:id" element={<ProtectedRoute><DetailView /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/magic" element={<MagicLinkVerifyPage />} />
          </Routes>
        </main>
        <Chat />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
