import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { RealtimeProvider } from './context/RealtimeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute, { AdminRoute, OwnerRoute } from './components/ProtectedRoute';
import CompleteProfileModal from './components/CompleteProfileModal';
import { useAuth } from './context/AuthContext';

// Route-based Code Splitting with React.lazy
const Home = lazy(() => import('./pages/Home'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const VehicleDetails = lazy(() => import('./pages/VehicleDetails'));
const BookingCheckout = lazy(() => import('./pages/BookingCheckout'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Profile = lazy(() => import('./pages/Profile'));
const VerifyKYC = lazy(() => import('./pages/VerifyKYC'));

// Auth Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

// Partner & Admin Portals
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'));
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal'));

// Suspense Page Loading Spinner
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
        <p className="text-xs text-slate-400 font-medium animate-pulse">Loading view...</p>
      </div>
    </div>
  );
}

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
        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30"
      >
        Return to Home Fleet
      </Link>
    </div>
  );
}

function GlobalProfileChecker() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);

  // If user is verified and phone number is missing (e.g. from Google OAuth)
  const isMissingPhone = Boolean(user && user.is_verified && (!user.phone || user.phone.trim() === ''));

  return (
    <CompleteProfileModal
      isOpen={isMissingPhone && !dismissed}
      onClose={() => setDismissed(true)}
    />
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <RealtimeProvider>
            <GlobalProfileChecker />
            <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-indigo-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Suspense fallback={<PageLoader />}>
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
                    path="/verify-kyc"
                    element={
                      <ProtectedRoute>
                        <VerifyKYC />
                      </ProtectedRoute>
                    }
                  />
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

                  {/* Owner Partner Portal */}
                  <Route
                    path="/owner"
                    element={
                      <OwnerRoute>
                        <OwnerDashboard />
                      </OwnerRoute>
                    }
                  />
                  <Route
                    path="/owner/*"
                    element={
                      <OwnerRoute>
                        <OwnerDashboard />
                      </OwnerRoute>
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
              </Suspense>
            </main>
            <Footer />
          </div>
        </RealtimeProvider>
      </NotificationProvider>
    </AuthProvider>
  </Router>
  );
}
