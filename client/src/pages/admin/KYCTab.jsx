import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Filter,
  RefreshCw,
  FileText,
  User,
  ChevronRight,
  X
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function KYCTab() {
  const { showToast } = useNotifications();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Document Viewer & Verification Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { type: 'doc' | 'user', id }
  const [rejectReasonPreset, setRejectReasonPreset] = useState('Unclear photo or glare');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchKYCList = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('rental_token') || localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/kyc/admin/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load KYC list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKYCList();
    const interval = setInterval(fetchKYCList, 8000);
    return () => clearInterval(interval);
  }, [statusFilter, roleFilter]);

  const handleVerifyDoc = async (docId, status, reason = null) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('rental_token') || localStorage.getItem('token');
      const res = await fetch(`/api/kyc/admin/verify-doc/${docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Document ${status.toLowerCase()} successfully.`, 'success');
      setRejectModal(null);
      setCustomRejectReason('');
      fetchKYCList();
      if (selectedUser) {
        // Refresh selected user
        const updated = users.find(u => u.user_id === selectedUser.user_id);
        if (updated) setSelectedUser(updated);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyUser = async (userId, status, reason = null) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('rental_token') || localStorage.getItem('token');
      const res = await fetch(`/api/kyc/admin/user/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`User KYC marked as ${status}.`, 'success');
      setRejectModal(null);
      setCustomRejectReason('');
      setSelectedUser(null);
      fetchKYCList();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Identity KYC Verifications</h1>
          <p className="text-xs text-slate-400 mt-1">Review government ID proofs, driving licenses, and selfies for customers and partners</p>
        </div>

        <button
          onClick={fetchKYCList}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchKYCList()}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
        >
          <option value="all">All KYC Statuses</option>
          <option value="Pending">Pending Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="NotSubmitted">Not Submitted</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
        >
          <option value="all">All Roles</option>
          <option value="customer">Customers</option>
          <option value="owner">Vehicle Owners</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Submitted Docs</th>
                <th className="p-4">KYC Status</th>
                <th className="p-4">Registered</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => (
                <tr key={u.user_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                    <div className="text-[10px] text-slate-500">{u.phone || 'No phone'}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.role === 'owner' ? 'bg-violet-950 text-violet-300 border border-violet-800' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{u.total_docs || 0} docs</span>
                      {u.pending_docs > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] font-bold">
                          {u.pending_docs} pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {u.kyc_status === 'Approved' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[11px] font-bold inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approved</span>
                      </span>
                    )}
                    {u.kyc_status === 'Pending' && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/80 text-[11px] font-bold inline-flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Pending Review</span>
                      </span>
                    )}
                    {u.kyc_status === 'Rejected' && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/80 text-[11px] font-bold inline-flex items-center space-x-1">
                        <XCircle className="w-3 h-3" />
                        <span>Rejected</span>
                      </span>
                    )}
                    {u.kyc_status === 'NotSubmitted' && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[11px] font-medium">
                        Not Submitted
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-400 text-[11px]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Docs</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER KYC DETAILS MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">{selectedUser.role} Verification</span>
                <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                <div className="text-xs text-slate-400">{selectedUser.email} • {selectedUser.phone}</div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Overall Action */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Overall KYC Profile Status:</div>
                <div className="text-xs text-slate-400 mt-0.5">Current state: <strong className="text-indigo-400">{selectedUser.kyc_status}</strong></div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleVerifyUser(selectedUser.user_id, 'Approved')}
                  disabled={processing}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow-md shadow-emerald-600/30"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve User</span>
                </button>
                <button
                  onClick={() => setRejectModal({ type: 'user', id: selectedUser.user_id })}
                  disabled={processing}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1 shadow-md shadow-rose-600/30"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject User</span>
                </button>
              </div>
            </div>

            {/* Submitted Documents List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Submitted Documents ({selectedUser.documents?.length || 0})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedUser.documents?.map(doc => (
                  <div key={doc.doc_id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">{doc.doc_type.replace(/_/g, ' ')}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        doc.status === 'Approved' ? 'bg-emerald-950 text-emerald-400' : (doc.status === 'Rejected' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400')
                      }`}>
                        {doc.status}
                      </span>
                    </div>

                    {doc.doc_number && (
                      <div className="font-mono text-[11px] text-slate-300">
                        Number: <strong>{doc.doc_number}</strong>
                      </div>
                    )}

                    {doc.expiry_date && (
                      <div className="text-[11px] text-slate-400">
                        Expiry Date: <strong className="text-white">{doc.expiry_date}</strong>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View File</span>
                      </button>

                      {doc.status !== 'Approved' && (
                        <button
                          onClick={() => handleVerifyDoc(doc.doc_id, 'Approved')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                        >
                          ✓
                        </button>
                      )}

                      {doc.status !== 'Rejected' && (
                        <button
                          onClick={() => setRejectModal({ type: 'doc', id: doc.doc_id })}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRIVATE FILE VIEWER MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white">{viewingDoc.doc_type.replace(/_/g, ' ')} ({viewingDoc.doc_number || ''})</span>
              <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>
            <div className="h-[60vh] bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <img
                src={`/api/files/kyc/${viewingDoc.doc_id}`}
                alt="KYC Document"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<p class="text-xs text-slate-400 p-4 text-center">Document file preview (PDF/Protected format). Streamed securely from /server/private_uploads.</p>';
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Enter Rejection Reason</h3>
            <p className="text-xs text-slate-400">
              This message will be recorded in the audit logs and emailed to the user explaining why their document was rejected.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Preset Reason</label>
              <select
                value={rejectReasonPreset}
                onChange={(e) => setRejectReasonPreset(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="Unclear photo or glare on text">Unclear photo or glare on text</option>
                <option value="Document has expired">Document has expired</option>
                <option value="Name on document does not match profile">Name on document does not match profile</option>
                <option value="Corner edges cropped or document incomplete">Corner edges cropped or document incomplete</option>
                <option value="Custom">Custom specific reason...</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Detailed Explanation (Mandatory)</label>
              <textarea
                rows="3"
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                placeholder="Explain what needs to be fixed..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setRejectModal(null)}
                className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const finalReason = customRejectReason.trim() || rejectReasonPreset;
                  if (rejectModal.type === 'doc') {
                    handleVerifyDoc(rejectModal.id, 'Rejected', finalReason);
                  } else {
                    handleVerifyUser(rejectModal.id, 'Rejected', finalReason);
                  }
                }}
                disabled={processing || (!customRejectReason.trim() && !rejectReasonPreset)}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
