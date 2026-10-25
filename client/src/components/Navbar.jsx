import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Car,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Calendar,
  Sparkles,
  ChevronDown,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LiveStatusBadge from './LiveStatusBadge';

export default function Navbar() {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setUserDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 text-slate-100 transition-all shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                Auto<span className="text-indigo-400">Fleet</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 ml-2 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Rental
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/')
                  ? 'text-indigo-400 bg-indigo-950/50 border border-indigo-800/50 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Home
            </Link>
            <Link
              to="/vehicles"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/vehicles')
                  ? 'text-indigo-400 bg-indigo-950/50 border border-indigo-800/50 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Explore Fleet
            </Link>
            <Link
              to="/vehicles?category=Luxury"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-950/30 transition-all border border-amber-500/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Luxury Chauffeur</span>
            </Link>

            {user && (
              <Link
                to="/bookings"
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/bookings')
                    ? 'text-indigo-400 bg-indigo-950/50 border border-indigo-800/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>My Bookings</span>
              </Link>
            )}

            {/* Owner Partner Portal Link */}
            {isOwner && (
              <Link
                to="/owner"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 transition-all shadow-sm shadow-emerald-950/50"
              >
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Owner Portal</span>
              </Link>
            )}

            {/* Admin Command Center Link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-violet-300 bg-violet-950/60 hover:bg-violet-900/60 border border-violet-800/60 transition-all shadow-sm shadow-violet-950/50"
              >
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>

          {/* User Profile / Auth Action */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Host Your Car CTA for unauthenticated visitors */}
            {!user && (
              <Link
                to="/register?role=owner"
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/60 transition"
              >
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                <span>Host Your Car & Earn</span>
              </Link>
            )}

            {/* Customer KYC Quick Status Badge */}
            {user && user.role === 'customer' && (
              user.kyc_status === 'Approved' ? (
                <span className="hidden xl:inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/50">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>KYC Verified</span>
                </span>
              ) : (
                <Link
                  to="/verify-kyc"
                  className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/50 transition animate-pulse"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Verify KYC</span>
                </Link>
              )
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-medium text-slate-200 max-w-[120px] truncate">
                    {user.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl py-2 backdrop-blur-xl animate-fade-in z-50">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
                          {user.role}
                        </span>
                        {user.kyc_status && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            user.kyc_status === 'Approved'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          }`}>
                            KYC: {user.kyc_status}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/70"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </Link>

                    {user.role === 'customer' && (
                      <Link
                        to="/verify-kyc"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/70"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        <span>KYC Verification</span>
                      </Link>
                    )}

                    <Link
                      to="/bookings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/70"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>My Bookings</span>
                    </Link>

                    {isOwner && (
                      <Link
                        to="/owner"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 border-t border-slate-800/60"
                      >
                        <Briefcase className="w-4 h-4 text-emerald-400" />
                        <span>Owner Partner Dashboard</span>
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-violet-300 hover:text-violet-200 hover:bg-violet-950/40 border-t border-slate-800/60"
                      >
                        <ShieldCheck className="w-4 h-4 text-violet-400" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-left border-t border-slate-800"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/30 transition-all hover:scale-102"
                >
                  Create Account
                </Link>
              </div>
            )}
            {/* Live Database Real-time Sync Status */}
            <div className="ml-2 pl-2 border-l border-slate-800">
              <LiveStatusBadge />
            </div>
          </div>

          {/* Mobile menu button and live badge */}
          <div className="flex md:hidden items-center space-x-2">
            <LiveStatusBadge />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Home
          </Link>
          <Link
            to="/vehicles"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Explore Fleet
          </Link>
          <Link
            to="/vehicles?category=Luxury"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-amber-300 hover:bg-amber-950/40"
          >
            Luxury Chauffeur Taxi
          </Link>

          {!user && (
            <Link
              to="/register?role=owner"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50"
            >
              Host Your Car & Earn
            </Link>
          )}

          {user && (
            <>
              <Link
                to="/bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
              >
                My Bookings
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
              >
                Profile
              </Link>
              <Link
                to="/verify-kyc"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-indigo-400 hover:bg-indigo-950/40"
              >
                KYC Verification ({user.kyc_status || 'Pending'})
              </Link>
            </>
          )}

          {isOwner && (
            <Link
              to="/owner"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50"
            >
              Owner Partner Dashboard
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-violet-400 hover:bg-violet-950/50"
            >
              Admin Dashboard
            </Link>
          )}

          <div className="pt-3 border-t border-slate-800">
            {user ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-rose-400 hover:bg-rose-950/30"
              >
                Sign Out ({user.name})
              </button>
            ) : (
              <div className="flex flex-col space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-slate-200 bg-slate-800 rounded-lg text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-white bg-indigo-600 rounded-lg text-sm font-semibold"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
