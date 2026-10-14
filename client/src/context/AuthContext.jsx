import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fleet_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('fleet_access_token');
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('fleet_user', JSON.stringify(res.data.data));
          }
        } catch (e) {
          // Handled by refresh interceptor or logged out
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { user: userData, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('fleet_access_token', accessToken);
      localStorage.setItem('fleet_refresh_token', refreshToken);
      localStorage.setItem('fleet_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    if (res.data.success) {
      const { user: userData, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('fleet_access_token', accessToken);
      localStorage.setItem('fleet_refresh_token', refreshToken);
      localStorage.setItem('fleet_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('fleet_access_token');
      localStorage.removeItem('fleet_refresh_token');
      localStorage.removeItem('fleet_user');
      setUser(null);
    }
  };

  const updateUser = (updated) => {
    setUser((prev) => {
      const merged = { ...prev, ...updated };
      localStorage.setItem('fleet_user', JSON.stringify(merged));
      return merged;
    });
  };

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isStaff = user?.role === 'STAFF' || isManager || isAdmin;
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin,
        isManager,
        isStaff,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
