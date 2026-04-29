import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { db } from './lib/firebase';
import firebaseConfig from '../firebase-applet-config.json';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import TrackApplication from './pages/TrackApplication';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Ledger from './pages/Ledger';
import Users from './pages/Users';
import Applications from './pages/Applications';
import ApplyService from './pages/ApplyService';
import Wallet from './pages/Wallet';
import Support from './pages/Support';
import StaffManagement from './pages/StaffManagement';
import Settings from './pages/Settings';
import PortalConfig from './pages/PortalConfig';
import RecycleBin from './pages/RecycleBin';
import SecurityControls from './pages/admin/SecurityControls';
import SystemPermissions from './pages/admin/SystemPermissions';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminWalletManagement from './pages/admin/AdminWalletManagement';
import AdminPayments from './pages/admin/AdminPayments';
import ServiceFormBuilder from './pages/admin/ServiceFormBuilder';
import LedgerAnalytics from './pages/admin/LedgerAnalytics';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'user' ? '/app/user/dashboard' : (user.role === 'admin' ? '/app/admin-dashboard' : '/app/dashboard')} />;
  }

  return <>{children}</>;
};

const DefaultRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'user') {
    return <Navigate to="/app/user/dashboard" replace />;
  }
  if (user?.role === 'admin') {
    return <Navigate to="/app/admin-dashboard" replace />;
  }
  return <Navigate to="/app/dashboard" replace />;
};

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <ConfigProvider>
        <AuthProvider>
          <Router>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/track" element={<TrackApplication />} />
            <Route path="/track/:ref" element={<TrackApplication />} />
          </Route>
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Aliases for common routes */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/admin" element={<Navigate to="/app/admin-dashboard" replace />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
          
          <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DefaultRedirect />} />
            <Route path="dashboard" element={<ProtectedRoute roles={['admin', 'staff']}><Dashboard /></ProtectedRoute>} />
            <Route path="admin-dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="admin/wallets" element={<ProtectedRoute roles={['admin']}><AdminWalletManagement /></ProtectedRoute>} />
            <Route path="admin/payments" element={<ProtectedRoute roles={['admin']}><AdminPayments /></ProtectedRoute>} />
            <Route path="admin/ledger-analytics" element={<ProtectedRoute roles={['admin']}><LedgerAnalytics /></ProtectedRoute>} />
            <Route path="services" element={<Services />} />
            <Route path="services/:id/builder" element={<ProtectedRoute roles={['admin']}><ServiceFormBuilder /></ProtectedRoute>} />
            <Route path="ledger" element={<ProtectedRoute roles={['admin', 'staff']}><Ledger /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
            <Route path="staff-management" element={<ProtectedRoute roles={['admin']}><StaffManagement /></ProtectedRoute>} />
            <Route path="applications" element={<ProtectedRoute roles={['admin', 'staff']}><Applications /></ProtectedRoute>} />
            <Route path="support" element={<ProtectedRoute roles={['admin', 'staff']}><Support /></ProtectedRoute>} />
            <Route path="recycle-bin" element={<ProtectedRoute roles={['admin']}><RecycleBin /></ProtectedRoute>} />
            <Route path="wallet" element={<Wallet />} />
            
            {/* Staff Specific Routes */}
            <Route path="staff/dashboard" element={<ProtectedRoute roles={['staff']}><Dashboard /></ProtectedRoute>} />
            <Route path="staff/applications" element={<ProtectedRoute roles={['staff']}><Applications /></ProtectedRoute>} />
            <Route path="staff/apply-service" element={<ProtectedRoute roles={['staff']}><Services /></ProtectedRoute>} />
            
            {/* User Specific Routes */}
            <Route path="user/dashboard" element={<ProtectedRoute roles={['user']}><Dashboard /></ProtectedRoute>} />
            <Route path="user/applications" element={<ProtectedRoute roles={['user']}><Applications /></ProtectedRoute>} />
            <Route path="user/apply/:serviceType" element={<ProtectedRoute roles={['user', 'staff', 'admin']}><ApplyService /></ProtectedRoute>} />
            <Route path="user/support" element={<ProtectedRoute roles={['user']}><Support /></ProtectedRoute>} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/services" element={<ProtectedRoute roles={['admin']}><Services /></ProtectedRoute>} />
            <Route path="settings/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
            <Route path="settings/staff" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
            <Route path="settings/permissions" element={<ProtectedRoute roles={['admin']}><SystemPermissions /></ProtectedRoute>} />
            <Route path="settings/security" element={<ProtectedRoute roles={['admin']}><SecurityControls /></ProtectedRoute>} />
            <Route path="settings/portal" element={<ProtectedRoute roles={['admin']}><PortalConfig /></ProtectedRoute>} />
          </Route>
        </Routes>
          </Router>
        </AuthProvider>
      </ConfigProvider>
    </ThemeProvider>
  );
}
