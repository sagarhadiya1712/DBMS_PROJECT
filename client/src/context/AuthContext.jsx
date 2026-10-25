import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rental_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('rental_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('rental_user', JSON.stringify(res.data.user));
          }
        } catch (e) {
          localStorage.removeItem('rental_token');
          localStorage.removeItem('rental_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('rental_token', token);
    localStorage.setItem('rental_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const signup = async (payload) => {
    const res = await api.post('/auth/signup', payload);
    return res.data;
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    const { token, user: userData } = res.data;
    localStorage.setItem('rental_token', token);
    localStorage.setItem('rental_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const resendOtp = async (email) => {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data;
  };

  const googleLogin = async (payload) => {
    const res = await api.post('/auth/google', payload);
    const { token, user: userData, needsPhone } = res.data;
    localStorage.setItem('rental_token', token);
    localStorage.setItem('rental_user', JSON.stringify(userData));
    setUser(userData);
    return { user: userData, needsPhone };
  };

  const completeProfile = async (phone) => {
    const res = await api.put('/auth/complete-profile', { phone });
    const { user: updatedUser } = res.data;
    localStorage.setItem('rental_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    localStorage.removeItem('rental_token');
    localStorage.removeItem('rental_user');
    setUser(null);
  };

  const updateUser = (updated) => {
    setUser((prev) => {
      const merged = { ...prev, ...updated };
      localStorage.setItem('rental_user', JSON.stringify(merged));
      return merged;
    });
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'ADMIN';
  const isCustomer = !isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isCustomer,
        login,
        signup,
        verifyOtp,
        resendOtp,
        googleLogin,
        completeProfile,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
