import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Building,
  RotateCcw,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';

export default function OwnersPayoutsTab() {
  const { showToast } = useNotifications();

  const [subTab, setSubTab] = useState('owners'); // 'owners' | 'payouts'
  const [owners, setOwners] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [payoutFilter, setPayoutFilter] = useState('All');

  // Mark Paid Modal
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [refNumber, setRefNumber] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ownersRes, payoutsRes] = await Promise.all([
        api.get('/admin/owners'),
        api.get('/admin/payouts'),
      ]);
      setOwners(ownersRes.data || []);
      setPayouts(payoutsRes.data || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load owners/payouts data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBlock = async (userId) => {
    try {
      const res = await api.patch(`/users/${userId}/block`);
      showToast(res.data?.message || 'Owner status updated', 'success');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update owner status', 'error');
    }
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    if (!refNumber.trim()) {
      showToast('Please enter bank payment reference / UTR number', 'error');
      return;
    }
    setSubmittingPay(true);
    try {
      await api.patch(`/admin/payouts/${selectedPayout.payout_id}/pay`, {
        reference_no: refNumber.trim(),
      });
      showToast(`Payout #${selectedPayout.payout_id} marked as Paid!`, 'success');
      setSelectedPayout(null);
      setRefNumber('');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to mark payout as paid', 'error');
    } finally {
      setSubmittingPay(false);
    }
  };

  const filteredOwners = owners.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.name?.toLowerCase().includes(q) ||
      o.email?.toLowerCase().includes(q) ||
      o.phone?.includes(q)
    );
  });

  const filteredPayouts = payouts.filter((p) => {
    if (payoutFilter !== 'All' && p.status !== payoutFilter) return false;
    const q = search.toLowerCase();
    return (
      p.owner_name?.toLowerCase().includes(q) ||
      p.vehicle_name?.toLowerCase().includes(q) ||
      p.reference_no?.toLowerCase().includes(q) ||
      String(p.booking_id).includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Building className="w-6 h-6 text-indigo-400" />
            <span>Vehicle Owners & Commission Payouts</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered fleet partners, monitor earnings, and settle 80% rental payouts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setSubTab('owners')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                subTab === 'owners'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Owners ({owners.length})
            </button>
            <button
              onClick={() => setSubTab('payouts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                subTab === 'payouts'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Payouts ({payouts.length})
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={
              subTab === 'owners'
                ? 'Search owner by name, email, or phone...'
                : 'Search payout by owner, vehicle, booking ID, or UTR...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {subTab === 'payouts' && (
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            {['All', 'Pending', 'Paid'].map((st) => (
              <button
                key={st}
                onClick={() => setPayoutFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  payoutFilter === st
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* OWNERS TAB */}
      {subTab === 'owners' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Vehicles Listed</th>
                  <th className="py-3 px-4">Total Earnings</th>
                  <th className="py-3 px-4">Pending Payout</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOwners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No vehicle owners found.
                    </td>
                  </tr>
                ) : (
                  filteredOwners.map((o) => (
                    <tr key={o.user_id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{o.name}</div>
                        <div className="text-[10px] text-slate-500">ID: #{o.user_id}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{o.email}</div>
                        <div className="text-[10px] text-slate-500">{o.phone || 'No phone'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                          {o.vehicle_count} cars
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-400">
                        Rs. {Number(o.total_earnings || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-black text-amber-400">
                        Rs. {Number(o.pending_payout || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        {o.is_blocked ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/50">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleBlock(o.user_id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            o.is_blocked
                              ? 'border-emerald-700 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60'
                              : 'border-rose-700 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60'
                          }`}
                        >
                          {o.is_blocked ? 'Unblock' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYOUTS TAB */}
      {subTab === 'payouts' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Payout ID</th>
                  <th className="py-3 px-4">Owner & Booking</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Gross Rent</th>
                  <th className="py-3 px-4">Fee (20%)</th>
                  <th className="py-3 px-4">Net Payout (80%)</th>
                  <th className="py-3 px-4">Status & UTR</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No commission payouts found.
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((p) => (
                    <tr key={p.payout_id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-indigo-400 font-bold">
                        #{p.payout_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{p.owner_name}</div>
                        <div className="text-[10px] text-slate-500">
                          Booking #{p.booking_id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {p.vehicle_name || 'Vehicle'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        Rs. {Number(p.gross_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-rose-400">
                        Rs. {Number(p.commission_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                        Rs. {Number(p.payout_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.status === 'Paid' ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Paid</span>
                            </span>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Ref: {p.reference_no}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/50">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'Pending' ? (
                          <button
                            onClick={() => {
                              setSelectedPayout(p);
                              setRefNumber('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MARK PAID SETTLEMENT MODAL */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Settle Partner Payout</span>
              </h3>
              <button
                onClick={() => setSelectedPayout(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Owner Name:</span>
                <span className="font-bold text-white">{selectedPayout.owner_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Booking:</span>
                <span className="text-slate-300">#{selectedPayout.booking_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Rent:</span>
                <span className="text-slate-300">
                  Rs. {Number(selectedPayout.gross_amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Platform Commission (20%):</span>
                <span className="text-rose-400">
                  Rs. {Number(selectedPayout.commission_amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                <span className="font-bold text-white">Net Owner Transfer:</span>
                <span className="font-black text-emerald-400">
                  Rs. {Number(selectedPayout.payout_amount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                Banking Coordinates
              </span>
              <div className="text-slate-300">
                Holder: <span className="text-white">{selectedPayout.bank_account_holder || 'N/A'}</span>
              </div>
              <div className="text-slate-300">
                IFSC: <span className="font-mono text-white">{selectedPayout.ifsc || 'N/A'}</span>
              </div>
              {selectedPayout.upi_id && (
                <div className="text-slate-300">
                  UPI ID: <span className="font-mono text-emerald-400">{selectedPayout.upi_id}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleMarkPaid} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bank Transfer Reference / UTR Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR123456789012"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayout(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
                >
                  {submittingPay ? 'Confirming...' : 'Confirm & Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
