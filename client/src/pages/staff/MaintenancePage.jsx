import React, { useState, useEffect } from 'react';
import { Wrench, Plus, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function MaintenancePage() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Schedule modal
  const [showModal, setShowModal] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [serviceType, setServiceType] = useState('OIL_CHANGE');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(3500);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [recRes, vehRes] = await Promise.all([
        api.get('/maintenance'),
        api.get('/vehicles'),
      ]);
      if (recRes.data.success) {
        setRecords(recRes.data.data);
      }
      if (vehRes.data.success) {
        setVehicles(vehRes.data.data);
        if (vehRes.data.data.length > 0 && !vehicleId) {
          setVehicleId(vehRes.data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load maintenance records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/maintenance', {
        vehicleId,
        serviceType,
        description,
        cost: Number(cost),
        scheduledDate,
      });
      if (res.data.success) {
        setShowModal(false);
        setDescription('');
        fetchRecords();
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/maintenance/${id}`, {
        status,
        ...(status === 'COMPLETED' && { completedDate: new Date().toISOString() }),
      });
      fetchRecords();
    } catch (err) {
      alert('Failed to update service status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Fleet Workshop</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Service & Maintenance Logs</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track routine oil changes, brake inspections, recalls, and vehicle readiness.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Service</span>
        </button>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-6">Vehicle</th>
                <th className="py-4 px-6">Service Type</th>
                <th className="py-4 px-6">Scheduled Date</th>
                <th className="py-4 px-6">Cost ($)</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-600">Loading records...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-600">No maintenance records recorded.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6">
                      <strong className="text-slate-900 block font-bold">
                        {r.vehicle?.make} {r.vehicle?.model}
                      </strong>
                      <span className="font-mono text-[10px] text-slate-600">
                        {r.vehicle?.licensePlate}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800">{r.serviceType}</span>
                      <p className="text-[11px] text-slate-600 mt-0.5 max-w-xs truncate">{r.description}</p>
                    </td>
                    <td className="py-4 px-6 text-slate-800">
                      {formatDate(r.scheduledDate)}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {formatCurrency(r.cost)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {r.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'COMPLETED')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition"
                        >
                          Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Schedule Service Appointment</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-600 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} ({v.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="OIL_CHANGE">Oil Change</option>
                    <option value="BRAKE_SERVICE">Brake Service</option>
                    <option value="TIRE_ROTATION">Tire Rotation</option>
                    <option value="ANNUAL_INSPECTION">Annual Inspection</option>
                    <option value="ENGINE_REPAIR">Engine & Powertrain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Technician Instructions</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Synthetic 5W-30 oil replace and filter flush..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
