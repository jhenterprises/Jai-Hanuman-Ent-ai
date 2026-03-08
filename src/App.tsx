import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import TrackApplication from './pages/TrackApplication';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Ledger from './pages/Ledger';
import Users from './pages/Users';
import Applications from './pages/Applications';
import ApplyService from './pages/ApplyService';
import Support from './pages/Support';
import StaffManagement from './pages/StaffManagement';
import Settings from './pages/Settings';
import PortalConfig from './pages/admin/PortalConfig';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'user' ? '/app/user/dashboard' : '/app/dashboard'} />;
  }

  return <>{children}</>;
};

const DefaultRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'user') {
    return <Navigate to="/app/user/dashboard" replace />;
  }
  return <Navigate to="/app/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <Router>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/track" element={<TrackApplication />} />
          </Route>
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DefaultRedirect />} />
            <Route path="dashboard" element={<ProtectedRoute roles={['admin', 'staff']}><Dashboard /></ProtectedRoute>} />
            <Route path="services" element={<Services />} />
            <Route path="ledger" element={<ProtectedRoute roles={['admin', 'staff']}><Ledger /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
            <Route path="staff-management" element={<ProtectedRoute roles={['admin']}><StaffManagement /></ProtectedRoute>} />
            <Route path="applications" element={<ProtectedRoute roles={['admin', 'staff']}><Applications /></ProtectedRoute>} />
            <Route path="support" element={<ProtectedRoute roles={['admin', 'staff']}><Support /></ProtectedRoute>} />
            
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
            <Route path="settings/permissions" element={<ProtectedRoute roles={['admin']}><div className="text-white">Permissions Module</div></ProtectedRoute>} />
            <Route path="settings/portal" element={<ProtectedRoute roles={['admin']}><PortalConfig /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
      </ConfigProvider>
    </AuthProvider>
  );
}
