import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AuthPage from './components/Common/AuthPage';
import LandingPage from './components/Common/LandingPage';
import SplashScreen from './components/Mobile/SplashScreen';
import Navbar from './components/Common/Navbar';
import BottomNav from './components/Mobile/BottomNav';
import DashboardPage from './components/Dashboard/DashboardPage';
import AnalyticsPage from './components/Analytics/AnalyticsPage';
import SettingsPage from './components/Dashboard/SettingsPage';
import EmergencyOverlay from './components/Emergency/EmergencyOverlay';
import VehicleNearbyPopup from './components/Dashboard/VehicleNearbyPopup';
import MobileTrackScreen from './components/Mobile/MobileTrackScreen';
import PwaInstallBanner from './components/Common/PwaInstallBanner';
import { useIsMobile } from './hooks/useIsMobile';
import AdminRoute from './components/Admin/AdminRoute';
import AdminLayout from './components/Admin/AdminLayout';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminUsers from './components/Admin/AdminUsers';
import AdminAlerts from './components/Admin/AdminAlerts';
import AdminEmergencyContacts from './components/Admin/AdminEmergencyContacts';
import AdminSettings from './components/Admin/AdminSettings';

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
  return <Navigate to="/home" replace />;
}

function MobileLoginGate({ initialMode = 'login' }) {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [splashDone, setSplashDone] = useState(false);

  if (isAuthenticated) return null; // redirect handled by parent
  if (isMobile && !splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }
  return <AuthPage initialMode={initialMode} />;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/home/admin');
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(() =>
    typeof window !== 'undefined' && window.sessionStorage.getItem('cas_show_welcome_splash') === '1'
  );

  const hashQuery = (location.hash || '').replace(/^#/, '');
  const ssoSearch = location.search
    || (hashQuery && /(?:^|&)(code|authorization_code|auth_code|sso_code)=/.test(hashQuery) ? `?${hashQuery}` : '');
  const ssoParams = new URLSearchParams(ssoSearch.startsWith('?') ? ssoSearch.slice(1) : ssoSearch);
  const hasAtozasCode = ['code', 'authorization_code', 'auth_code', 'sso_code'].some((key) => ssoParams.get(key));
  if (hasAtozasCode && !ssoParams.get('sso_error') && !location.pathname.startsWith('/auth/')) {
    window.location.replace(`/auth/atozas/callback${ssoSearch}`);
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (location.pathname.length > 1 && location.pathname.endsWith('/')) {
    return (
      <Navigate
        to={`${location.pathname.replace(/\/+$/, '')}${location.search}${location.hash}`}
        replace
      />
    );
  }

  if (isAuthenticated && isMobile && showWelcomeSplash && !isAdminPath) {
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
      {isAuthenticated && !isAdminPath && <Navbar />}
      {isAuthenticated && !isAdminPath && <EmergencyOverlay />}
      {isAuthenticated && !isAdminPath && <VehicleNearbyPopup />}
      {isAuthenticated && !isAdminPath && <BottomNav />}
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/home" replace /> : <MobileLoginGate initialMode="login" />
        } />
        <Route path="/home/admin/login" element={<AdminLogin />} />
        <Route path="/home/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/home/admin/panel" replace />} />
          <Route path="panel/*" element={<AdminDashboard />} />
          <Route path="users/*" element={<AdminUsers />} />
          <Route path="alerts/*" element={<AdminAlerts />} />
          <Route path="emergency-contacts/*" element={<AdminEmergencyContacts />} />
          <Route path="settings/*" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/home/admin/panel" replace />} />
        </Route>
        <Route path="/home" element={
          isAuthenticated ? <DashboardPage /> : <LandingPage />
        } />
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />
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
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
        <SocketProvider>
          <PwaInstallBanner />
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
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
