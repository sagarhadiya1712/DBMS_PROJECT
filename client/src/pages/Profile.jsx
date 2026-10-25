import React, { useState } from 'react';
import { User, Mail, Phone, ShieldCheck, CheckCircle2, AlertCircle, Save, Calendar } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useNotifications();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await api.patch('/users/profile', {
        name: name.trim(),
        phone: phone.trim(),
      });

      updateUser(res.data.user);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Account Profile</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal details and view your fleet membership status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Card */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 bg-slate-900/80 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-xl shadow-indigo-600/30">
            {user?.name?.charAt(0) || 'U'}
          </div>

          <div>
            <h3 className="text-base font-bold text-white">{user?.name}</h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/50">
              {user?.role}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 flex items-center justify-center space-x-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-IN')}</span>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white pb-3 border-b border-slate-800">
            Personal Information
          </h2>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-950/40 border border-slate-800/50 text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Email address is verified and permanently linked.</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
