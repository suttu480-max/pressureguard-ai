import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AddPatientPage from './pages/AddPatientPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AlertsPage from './pages/AlertsPage';
import RiskAssessmentPage from './pages/RiskAssessmentPage';
import ProfilePage from './pages/ProfilePage';
import { useState, useEffect } from 'react';
import { api } from './lib/api';

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      loadAlertCount();
      const interval = setInterval(loadAlertCount, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadAlertCount = async () => {
    try {
      const data = await api.getUnreadCount();
      setAlertCount(data.unread_count || 0);
    } catch {
      // Silently fail
    }
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar alertCount={alertCount} />
      <div className="main-content">
        <Header alertCount={alertCount} />
        <div className="page-content">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/patients" element={
              <ProtectedRoute><PatientsPage /></ProtectedRoute>
            } />
            <Route path="/patients/:id" element={
              <ProtectedRoute><PatientDetailPage /></ProtectedRoute>
            } />
            <Route path="/add-patient" element={
              <ProtectedRoute allowedRoles={['doctor', 'nurse']}>
                <AddPatientPage />
              </ProtectedRoute>
            } />
            <Route path="/risk-assessment" element={
              <ProtectedRoute><RiskAssessmentPage /></ProtectedRoute>
            } />
            <Route path="/alerts" element={
              <ProtectedRoute><AlertsPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1e3a3d',
              border: '1px solid #ddd0c1',
              borderRadius: '10px',
              fontSize: '14px',
              boxShadow: '0 4px 16px rgba(44, 94, 99, 0.1)',
            },
            success: { iconTheme: { primary: '#3a8a6e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#c0392b', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
