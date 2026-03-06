import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './components/Common/AuthPage';
import SplashScreen from './components/Mobile/SplashScreen';
import Navbar from './components/Common/Navbar';
import BottomNav from './components/Mobile/BottomNav';
import DashboardPage from './components/Dashboard/DashboardPage';
import AnalyticsPage from './components/Analytics/AnalyticsPage';
import SettingsPage from './components/Dashboard/SettingsPage';
import EmergencyOverlay from './components/Emergency/EmergencyOverlay';
import VehicleNearbyPopup from './components/Dashboard/VehicleNearbyPopup';
import MobileTrackScreen from './components/Mobile/MobileTrackScreen';
import { useIsMobile } from './hooks/useIsMobile';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function TrackRoute() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileTrackScreen />;
  return <Navigate to="/" replace />;
}

function MobileLoginGate() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [splashDone, setSplashDone] = useState(false);

  if (isAuthenticated) return null; // redirect handled by parent
  if (isMobile && !splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }
  return <AuthPage />;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  const isMobile = useIsMobile();
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(() =>
    typeof window !== 'undefined' && window.sessionStorage.getItem('cas_show_welcome_splash') === '1'
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (isAuthenticated && isMobile && showWelcomeSplash) {
    return (
      <SplashScreen
        onFinish={() => {
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('cas_show_welcome_splash');
          setShowWelcomeSplash(false);
        }}
      />
    );
  }

  return (
    <>
      {isAuthenticated && <Navbar />}
      {isAuthenticated && <EmergencyOverlay />}
      {isAuthenticated && <VehicleNearbyPopup />}
      {isAuthenticated && <BottomNav />}
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <MobileLoginGate />
        } />
        <Route path="/" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        } />
        <Route path="/track" element={
          <PrivateRoute><TrackRoute /></PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute><AnalyticsPage /></PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute><SettingsPage /></PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
              },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
