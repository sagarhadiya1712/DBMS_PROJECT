import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-slate-400 text-sm animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.role?.toLowerCase();

  if (requireAdmin && role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  return <ProtectedRoute requireAdmin={true}>{children}</ProtectedRoute>;
}
