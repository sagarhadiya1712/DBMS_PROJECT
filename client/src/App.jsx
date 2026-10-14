import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public & Customer Pages
import Home from './pages/Home';
import Vehicles from './pages/Vehicles';
import VehicleDetails from './pages/VehicleDetails';
import BookingCheckout from './pages/BookingCheckout';
import MyBookings from './pages/MyBookings';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Support from './pages/Support';

// Staff Pages
import OperationsPanel from './pages/staff/OperationsPanel';
import FleetManagement from './pages/staff/FleetManagement';
import MaintenancePage from './pages/staff/MaintenancePage';
import AlertsPage from './pages/staff/AlertsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import PricingRulesPage from './pages/admin/PricingRulesPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/vehicles/:id" element={<VehicleDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/support" element={<Support />} />

                {/* Customer Authenticated */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <BookingCheckout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bookings"
                  element={
                    <ProtectedRoute>
                      <MyBookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Staff / Manager */}
                <Route
                  path="/staff/operations"
                  element={
                    <ProtectedRoute allowedRoles={['STAFF', 'MANAGER', 'ADMIN']}>
                      <OperationsPanel />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff/fleet"
                  element={
                    <ProtectedRoute allowedRoles={['STAFF', 'MANAGER', 'ADMIN']}>
                      <FleetManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff/maintenance"
                  element={
                    <ProtectedRoute allowedRoles={['STAFF', 'MANAGER', 'ADMIN']}>
                      <MaintenancePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff/alerts"
                  element={
                    <ProtectedRoute allowedRoles={['STAFF', 'MANAGER', 'ADMIN']}>
                      <AlertsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin / Manager */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/pricing"
                  element={
                    <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                      <PricingRulesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}
