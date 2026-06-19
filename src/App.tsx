import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider } from './context/WalletContext';
import { ServiceControlProvider } from './context/ServiceControlContext';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Services = lazy(() => import('./pages/Services'));
import Users from './pages/Users';
const Applications = lazy(() => import('./pages/Applications'));
const ApplyService = lazy(() => import('./pages/ApplyService'));
const Support = lazy(() => import('./pages/Support'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const SupportCenter = lazy(() => import('./pages/SupportCenter'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const ServiceControlSettings = lazy(() => import('./pages/admin/ServiceControlSettings'));
const IDCardSettings = lazy(() => import('./pages/IDCardSettings'));
const RecycleBin = lazy(() => import('./pages/RecycleBin'));
const Documents = lazy(() => import('./pages/Documents'));
const SecurityControls = lazy(() => import('./pages/admin/SecurityControls'));
const SystemPermissions = lazy(() => import('./pages/admin/SystemPermissions'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ServiceFormBuilder = lazy(() => import('./pages/admin/ServiceFormBuilder'));
const Ledger = lazy(() => import('./pages/Ledger'));

const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoader />;
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

import { Toaster } from 'react-hot-toast';

import { ChatWidget } from './components/support/ChatWidget';
import { AIChatWidget } from './components/AIChatWidget';

export default function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <ConfigProvider>
        <AuthProvider>
          <WalletProvider>
             <ServiceControlProvider>
              <Router>
              <Suspense fallback={<FullPageLoader />}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
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
                  <Route path="ledger" element={<ProtectedRoute roles={['admin', 'staff']}><Ledger /></ProtectedRoute>} />
                  <Route path="admin-dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="services" element={<Services />} />
                  <Route path="services/:id/builder" element={<ProtectedRoute roles={['admin']}><ServiceFormBuilder /></ProtectedRoute>} />
                  <Route path="users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
                  <Route path="staff-management" element={<ProtectedRoute roles={['admin']}><StaffManagement /></ProtectedRoute>} />
                  <Route path="admin/id-card-designer" element={<ProtectedRoute roles={['admin']}><IDCardSettings /></ProtectedRoute>} />
                  <Route path="applications" element={<ProtectedRoute roles={['admin', 'staff']}><Applications /></ProtectedRoute>} />
                  <Route path="support" element={<ProtectedRoute roles={['admin', 'staff']}><Support /></ProtectedRoute>} />
                  <Route path="support-center" element={<ProtectedRoute roles={['admin', 'staff']}><SupportCenter /></ProtectedRoute>} />
                  <Route path="recycle-bin" element={<ProtectedRoute roles={['admin']}><RecycleBin /></ProtectedRoute>} />
                  <Route path="documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                  <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  
                  {/* Staff Specific Routes */}
                  <Route path="staff/dashboard" element={<ProtectedRoute roles={['staff']}><Dashboard /></ProtectedRoute>} />
                  <Route path="staff/applications" element={<ProtectedRoute roles={['staff']}><Applications /></ProtectedRoute>} />
                  <Route path="staff/apply-service" element={<ProtectedRoute roles={['staff']}><Services /></ProtectedRoute>} />
                  
                  {/* User Specific Routes */}
                  <Route path="user/dashboard" element={<ProtectedRoute roles={['user']}><Dashboard /></ProtectedRoute>} />
                  <Route path="user/applications" element={<ProtectedRoute roles={['user']}><Applications /></ProtectedRoute>} />
                  <Route path="user/apply/:serviceType" element={<ProtectedRoute roles={['user', 'staff', 'admin']}><ApplyService /></ProtectedRoute>} />
                  <Route path="user/support" element={<ProtectedRoute roles={['user']}><Support /></ProtectedRoute>} />
                  
                  <Route path="settings" element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>}>
                    <Route path="services" element={<Services />} />
                    <Route path="service-control" element={<ServiceControlSettings />} />
                    <Route path="users" element={<Users />} />
                    <Route path="staff" element={<Users />} />
                    <Route path="permissions" element={<SystemPermissions />} />
                    <Route path="security" element={<SecurityControls />} />
                  </Route>
                </Route>
                
                {/* 404 Catch-All Route */}
                <Route path="*" element={
                  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-4">404 - Not Found</h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">The page you are looking for doesn't exist or has been moved.</p>
                    <a href="/" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Go to Home</a>
                  </div>
                } />
              </Routes>
              <AIChatWidget />
              <ChatWidget />
            </Suspense>
            </Router>
            </ServiceControlProvider>
          </WalletProvider>
        </AuthProvider>
      </ConfigProvider>
    </ThemeProvider>
  );
}
