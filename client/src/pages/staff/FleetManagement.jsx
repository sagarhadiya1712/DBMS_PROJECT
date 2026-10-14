import React, { useState, useEffect } from 'react';
import {
  Car,
  Plus,
  Filter,
  Wrench,
  CheckCircle2,
  AlertCircle,
  X,
  Edit,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function FleetManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Add vehicle modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    vin: '',
    licensePlate: '',
    make: '',
    model: '',
    year: 2024,
    category: 'SUV',
    transmission: 'Manual',
    fuelType: 'Petrol',
    seatingCapacity: 5,
    mileage: 1500,
    dailyRate: 2500,
    hourlyRate: 250,
    branchId: '',
    status: 'AVAILABLE',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    features: 'Air Conditioning, Touchscreen Infotainment, Power Steering, ABS',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchFleet = async () => {
    setLoading(true);
    try {
      const [vehRes, branchRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/branches'),
      ]);
      if (vehRes.data.success) {
        setVehicles(vehRes.data.data);
      }
      if (branchRes.data.success) {
        setBranches(branchRes.data.data);
        if (branchRes.data.data.length > 0 && !formData.branchId) {
          setFormData((f) => ({ ...f, branchId: branchRes.data.data[0].id }));
        }
      }
    } catch (e) {
      console.error('Error fetching fleet:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const handleStatusChange = async (vehicleId, newStatus) => {
    try {
      await api.put(`/vehicles/${vehicleId}`, { status: newStatus });
      fetchFleet();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/vehicles', formData);
      if (res.data.success) {
        setShowAddModal(false);
        alert('Vehicle added to fleet successfully!');
        fetchFleet();
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (filterStatus === 'ALL') return true;
    return v.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Fleet Registry</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Fleet Inventory & Lifecycle</h1>
          <p className="text-sm text-slate-600 mt-1">
            Maintain vehicle catalog, service status, license compliance, and fleet additions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold w-fit">
        {['ALL', 'AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl transition ${
              filterStatus === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {s} ({vehicles.filter((v) => (s === 'ALL' ? true : v.status === s)).length})
          </button>
        ))}
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-6">Vehicle</th>
                <th className="py-4 px-6">Category / Specs</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Rates</th>
                <th className="py-4 px-6">Mileage</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <img
                        src={v.primaryImage || v.images?.[0]?.imageUrl || '/vehicles/placeholder.jpg'}
                        alt={`${v.make} ${v.model}`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/vehicles/placeholder.jpg';
                        }}
                        className="w-14 h-10 object-cover rounded-xl bg-slate-100 flex-shrink-0"
                      />
                      <div>
                        <strong className="font-bold text-slate-900 block">
                          {v.year} {v.make} {v.model}
                        </strong>
                        <span className="font-mono text-[10px] text-slate-600">
                          Plate: {v.licensePlate} • VIN: {v.vin.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      v.category === 'LUXURY_TAXI'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {v.category === 'LUXURY_TAXI' ? 'Luxury Taxi' : v.category}
                    </span>
                    {v.category === 'LUXURY_TAXI' && (
                      <span className="block text-[10px] text-amber-700 font-bold mt-0.5">
                        Chauffeur included
                      </span>
                    )}
                    <span className="block text-[11px] text-slate-600 mt-0.5">
                      {v.fuelType} • {v.transmission} • {v.seatingCapacity} seats
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-800">
                    {v.branch?.name || 'Unassigned'}
                  </td>
                  <td className="py-4 px-6">
                    <strong className="text-slate-900">{formatCurrency(v.dailyRate)}</strong>/day
                    <span className="block text-[10px] text-slate-600">{formatCurrency(v.hourlyRate)}/hr</span>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-800">
                    {v.mileage.toLocaleString()} km
                  </td>
                  <td className="py-4 px-6">
                    <select
                      value={v.status}
                      onChange={(e) => handleStatusChange(v.id, e.target.value)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
                        v.status === 'AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : v.status === 'RENTED'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : v.status === 'MAINTENANCE'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="RENTED">RENTED</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleStatusChange(v.id, 'RETIRED')}
                      title="Retire vehicle"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 my-8 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Add Vehicle to Fleet</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-600 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Make</label>
                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="e.g. Tesla"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. Model Y"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="HATCHBACK">Hatchback</option>
                    <option value="SEDAN">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="MUV">MUV</option>
                    <option value="LUXURY_TAXI">Luxury Taxi (Single chauffeur taxi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fuel Type</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">License Plate</label>
                  <input
                    type="text"
                    required
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                    placeholder="GJ05AB1234"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">VIN Number</label>
                  <input
                    type="text"
                    required
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                    placeholder="MB1TA2F83HA009999"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Daily Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Odo (KM)</label>
                  <input
                    type="number"
                    required
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Station Branch</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
