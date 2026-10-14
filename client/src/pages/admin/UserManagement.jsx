import React, { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle2, XCircle, Search, Mail, Phone } from 'lucide-react';
import api from '../../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { roleName: newRole });
      fetchUsers();
    } catch (e) {
      alert('Failed to update role: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleToggleVerify = async (userId, currentVal) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { isVerified: !currentVal });
      fetchUsers();
    } catch (e) {
      alert('Failed to update verification status');
    }
  };

  const filtered = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Access Control</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">User & Role Management (RBAC)</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage system access clearances, staff elevations, and driver license approvals.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search user name or email..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Contact</th>
                <th className="py-4 px-6">Driver License</th>
                <th className="py-4 px-6">Bookings</th>
                <th className="py-4 px-6">Assigned Role</th>
                <th className="py-4 px-6 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-600">Loading user registry...</td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {u.firstName ? u.firstName[0] : 'U'}
                        </div>
                        <div>
                          <strong className="text-slate-900 font-bold block">
                            {u.firstName} {u.lastName}
                          </strong>
                          <span className="text-[11px] text-slate-600">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {u.phone || 'N/A'}
                    </td>
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-800">
                      {u.drivingLicenseNumber || 'Not Uploaded'}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {u.bookingsCount}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : u.role === 'MANAGER'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : u.role === 'STAFF'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="STAFF">STAFF</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleVerify(u.id, u.isVerified)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          u.isVerified
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700'
                            : 'bg-amber-50 text-amber-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        {u.isVerified ? '✓ Verified' : 'Pending'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
