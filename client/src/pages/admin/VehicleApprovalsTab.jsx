import React, { useState, useEffect } from 'react';
import {
  Car,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText,
  ShieldCheck,
  ChevronRight,
  X
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function VehicleApprovalsTab() {
  const { showToast } = useNotifications();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [rejectVehicleModal, setRejectVehicleModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPendingVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('rental_token') || localStorage.getItem('token');
      const res = await fetch('/api/admin/vehicles/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to load pending vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVehicles();
    const interval = setInterval(fetchPendingVehicles, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (vehicleId) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('rental_token') || localStorage.getItem('token');
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Approved' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Vehicle listing approved and published live!', 'success');
      setSelectedVehicle(null);
      fetchPendingVehicles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (vehicleId) => {
    if (!rejectionReason.trim()) {
      showToast('Please provide a specific rejection reason.', 'error');
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('rental_token') || localStorage.getItem('token');
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Rejected', reason: rejectionReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Vehicle listing rejected. Reason sent to owner.', 'success');
      setRejectVehicleModal(null);
      setSelectedVehicle(null);
      setRejectionReason('');
      fetchPendingVehicles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Partner Vehicle Approvals</h1>
          <p className="text-xs text-slate-400 mt-1">Review photos, RC, and insurance documents for partner-listed vehicles before making them live</p>
        </div>

        <button
          onClick={fetchPendingVehicles}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {vehicles.length === 0 && !loading && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">All Clear! No Pending Vehicle Approvals</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All submitted partner vehicles have been reviewed and published.
          </p>
        </div>
      )}

      {/* Grid of Pending Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => (
          <div key={v.vehicle_id} className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="relative h-44 bg-slate-950 overflow-hidden">
                <img
                  src={v.image_url}
                  alt={v.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/vehicles/maruti-suzuki-swift.jpg'; }}
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-950/90 text-amber-400 border border-amber-800/80 text-[11px] font-bold flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Pending Review</span>
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 font-mono text-[11px] text-white">
                  {v.registration_number}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-indigo-400 font-bold uppercase">{v.category} • {v.fuel_type}</span>
                  <span className="text-xs font-black text-white">₹{v.price_per_day} / day</span>
                </div>

                <h3 className="text-lg font-bold text-white">{v.brand} {v.name}</h3>

                {/* Owner Info Box */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Owner Details</div>
                  <div className="font-bold text-white">{v.owner_name}</div>
                  <div className="text-[11px] text-slate-400">{v.owner_email} • {v.owner_phone}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Owner KYC: {v.owner_kyc_status}</div>
                </div>

                {/* Photo & Doc Counts */}
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span>📸 {v.photos?.length || 0} Photos</span>
                  <span>📄 {v.documents?.length || 0} Documents</span>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex space-x-2">
              <button
                onClick={() => setSelectedVehicle(v)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Assets</span>
              </button>
              <button
                onClick={() => handleApprove(v.vehicle_id)}
                disabled={processing}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Approve
              </button>
              <button
                onClick={() => setRejectVehicleModal(v)}
                disabled={processing}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* INSPECT VEHICLE ASSETS MODAL */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Asset Review</span>
                <h2 className="text-xl font-bold text-white">{selectedVehicle.brand} {selectedVehicle.name} ({selectedVehicle.registration_number})</h2>
                <div className="text-xs text-slate-400">Hosted by {selectedVehicle.owner_name} ({selectedVehicle.owner_email})</div>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            {/* Photos Gallery */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multi-Angle Photos ({selectedVehicle.photos?.length || 0})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {selectedVehicle.photos?.map((p, idx) => (
                  <div key={idx} className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                    <img src={p.file_path} alt="car angle" className="w-full h-24 object-cover" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-bold">
                      {p.image_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle Compliance Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedVehicle.documents?.map((doc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">{doc.doc_type}</div>
                      <div className="text-slate-400 text-[11px]">{doc.expiry_date ? `Expires: ${doc.expiry_date}` : 'Lifetime validity'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 font-semibold text-[10px]">
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setRejectVehicleModal(selectedVehicle)}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Reject Listing
              </button>
              <button
                onClick={() => handleApprove(selectedVehicle.vehicle_id)}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Approve & Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT VEHICLE REASON MODAL */}
      {rejectVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reject Vehicle Listing</h3>
            <p className="text-xs text-slate-400">
              Provide a clear reason why {rejectVehicleModal.brand} {rejectVehicleModal.name} cannot be approved. This reason will be emailed to {rejectVehicleModal.owner_email}.
            </p>

            <textarea
              rows="3"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Unclear RC copy, expired insurance policy, or invalid registration format..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
            />

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setRejectVehicleModal(null)}
                className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectVehicleModal.vehicle_id)}
                disabled={processing || !rejectionReason.trim()}
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
