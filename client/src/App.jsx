import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute';

// Customer Pages
import Home from './pages/Home';
import Vehicles from './pages/Vehicles';
import VehicleDetails from './pages/VehicleDetails';
import BookingCheckout from './pages/BookingCheckout';
import MyBookings from './pages/MyBookings';
import Profile from './pages/Profile';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';

// Admin Pages
import AdminPortal from './pages/admin/AdminPortal';

// 404 Page
function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
      <div className="text-6xl font-black text-indigo-500 font-mono">404</div>
      <h2 className="text-2xl font-bold text-white">Page Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm">
        The destination URL does not exist or has been relocated within our fleet network.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all"
      >
        Return to Home Fleet
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-indigo-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public & Customer Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/vehicles/:id" element={<VehicleDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Register />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Customer Authenticated Protected Routes */}
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

                {/* Admin Dashboard Protected Routes */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminPortal />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/*"
                  element={
                    <AdminRoute>
                      <AdminPortal />
                    </AdminRoute>
                  }
                />

                {/* 404 Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}
