import React, { useState, useEffect } from 'react';
import {
  Car,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertTriangle,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Power,
  CreditCard,
  Building,
  UploadCloud,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useRealtime } from '../../context/RealtimeContext';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'vehicles' | 'bookings' | 'payouts' | 'profile'
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State for Add Vehicle
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newVehicle, setNewVehicle] = useState({
    brand: '',
    name: '',
    category: 'SUV',
    fuel_type: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    year: 2023,
    registration_number: '',
    price_per_day: 3000,
    price_per_hour: 250,
    price_per_km: 16,
    security_deposit: 4000,
    city: 'Mumbai',
    address: '',
    photos: [],
    documents: []
  });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    business_name: '',
    address: '',
    city: '',
    bank_account_holder: '',
    bank_account_number: '',
    ifsc: '',
    upi_id: ''
  });

  // Helper to ensure tokens from both keys work reliably
  const getAuthToken = () => localStorage.getItem('rental_token') || localStorage.getItem('token');

  const fetchDashboardData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Dashboard stats
      const statsRes = await fetch('/api/owner/dashboard', { headers });
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Vehicles
      const vehRes = await fetch('/api/owner/vehicles', { headers });
      if (vehRes.ok) setVehicles(await vehRes.json());

      // 3. Bookings
      const bookRes = await fetch('/api/owner/bookings', { headers });
      if (bookRes.ok) setBookings(await bookRes.json());

      // 4. Payouts
      const payRes = await fetch('/api/owner/payouts', { headers });
      if (payRes.ok) setPayouts(await payRes.json());

      // 5. Profile
      const profRes = await fetch('/api/owner/profile', { headers });
      if (profRes.ok) {
        const pData = await profRes.json();
        setProfile(pData.profile);
        // Only initialize form fields if not in the middle of active editing
        if (pData.profile && !isSilent) {
          setProfileForm({
            business_name: pData.profile.business_name || '',
            address: pData.profile.address || '',
            city: pData.profile.city || '',
            bank_account_holder: pData.profile.bank_account_holder || '',
            bank_account_number: '',
            ifsc: pData.profile.ifsc || '',
            upi_id: pData.profile.upi_id || ''
          });
        }
      }
    } catch (err) {
      console.error('Error fetching owner data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, [activeTab]);

  // Real-time synchronization for owner dashboard
  useRealtime(
    ['vehicles', 'vehicle_images', 'bookings', 'payments', 'owner_profiles', 'owner_payouts'],
    () => {
      fetchDashboardData(true);
    }
  );

  const handleToggleAvailability = async (vehicleId) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/owner/vehicles/${vehicleId}/availability`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addNotification(data.message, 'success');
      fetchDashboardData();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleMarkCodReceived = async (bookingId) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/owner/bookings/${bookingId}/cod-received`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addNotification('Cash collection marked as received!', 'success');
      fetchDashboardData();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const res = await fetch('/api/owner/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addNotification('Owner banking details saved securely!', 'success');
      fetchDashboardData();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    try {
      const token = getAuthToken();
      const formData = new FormData();
      files.forEach(f => formData.append('photos', f));

      const res = await fetch('/api/files/upload-vehicle-photos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Default photo types if multiple uploaded
      const types = ['Front', 'Back', 'Left', 'Right', 'Interior', 'Other'];
      const mappedPhotos = data.images.map((img, idx) => ({
        file_path: img.file_path,
        thumb_path: img.thumb_path,
        image_type: types[idx % types.length],
        is_primary: idx === 0 && newVehicle.photos.length === 0
      }));

      setNewVehicle(prev => ({
        ...prev,
        photos: [...prev.photos, ...mappedPhotos]
      }));
      addNotification(`${data.images.length} photos uploaded and optimized!`, 'success');
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleDocUpload = async (docType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('document', file);

      const res = await fetch('/api/files/upload-private-doc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNewVehicle(prev => ({
        ...prev,
        documents: [
          ...prev.documents.filter(d => d.doc_type !== docType),
          { doc_type: docType, file_path: data.stored_path, expiry_date: '2028-01-01' }
        ]
      }));
      addNotification(`${docType} document uploaded!`, 'success');
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleSubmitVehicle = async (isDraft = false) => {
    try {
      const token = getAuthToken();
      const payload = { ...newVehicle, is_draft: isDraft };

      const res = await fetch('/api/owner/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addNotification(data.message, 'success');
      setIsAddModalOpen(false);
      setWizardStep(1);
      fetchDashboardData();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <Car className="w-4 h-4" />
              <span>DriveGrid Partner Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Vehicle Owner Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage your hosted fleet, track daily bookings, review net earnings, and view automated payouts.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (stats?.kyc_status !== 'Approved') {
                  addNotification('Please complete KYC verification before listing vehicles.', 'warning');
                  return;
                }
                setIsAddModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List New Vehicle</span>
            </button>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* KYC Approval Notice Banner if not approved */}
        {stats && stats.kyc_status !== 'Approved' && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/40 p-5 flex items-start space-x-4 shadow-xl">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">Owner Identity Verification Required</h3>
              <p className="text-xs text-amber-200/80 mt-1">
                Before your vehicles can be submitted and listed on DriveGrid, your Owner KYC (Aadhaar, PAN & Selfie) must be reviewed and approved by administrators.
              </p>
            </div>
            <a
              href="/verify-kyc"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md flex-shrink-0"
            >
              Verify KYC
            </a>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview & Analytics' },
            { id: 'vehicles', label: `My Vehicles (${vehicles.length})` },
            { id: 'bookings', label: `Bookings (${bookings.length})` },
            { id: 'payouts', label: `Earnings & Payouts (${payouts.length})` },
            { id: 'profile', label: 'Banking & Payout Profile' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Total Earnings (80% Net)</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  ₹{Number(stats?.total_earnings || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-emerald-400 font-medium">After 20% platform commission</p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Pending Payout</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  ₹{Number(stats?.pending_payout || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-amber-400 font-medium">Processing to your bank account</p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Vehicles Listed</span>
                  <Car className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {stats?.total_vehicles || 0}
                </div>
                <p className="text-[11px] text-indigo-300 font-medium">{stats?.approved_vehicles || 0} active & approved</p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Total Completed Trips</span>
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {stats?.total_bookings || 0}
                </div>
                <p className="text-[11px] text-violet-300 font-medium">Customer bookings served</p>
              </div>
            </div>

            {/* Document Expiry Alerts (15 Days) */}
            {stats?.expiry_alerts && stats.expiry_alerts.length > 0 && (
              <div className="rounded-2xl bg-slate-900/80 border border-rose-500/30 p-5 space-y-3">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Urgent Document Expiry Alerts (Within 15 Days)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.expiry_alerts.map(alert => (
                    <div key={alert.doc_id} className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{alert.brand} {alert.name} ({alert.registration_number})</div>
                        <div className="text-slate-400 mt-0.5">{alert.doc_type} expires on {alert.expiry_date}</div>
                      </div>
                      <span className="px-2 py-1 rounded bg-rose-950/80 text-rose-400 font-bold text-[11px]">
                        {alert.days_remaining <= 0 ? 'EXPIRED' : `${alert.days_remaining} Days Left`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY VEHICLES */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map(v => (
                <div key={v.vehicle_id} className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div>
                    <div className="relative h-44 bg-slate-950 overflow-hidden">
                      <img
                        src={v.image_url}
                        alt={v.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/vehicles/maruti-suzuki-swift.jpg'; }}
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {v.approval_status === 'Approved' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 text-[11px] font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {v.approval_status === 'Pending Approval' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-950/90 text-amber-400 border border-amber-800/80 text-[11px] font-bold flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {v.approval_status === 'Rejected' && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-950/90 text-rose-400 border border-rose-800/80 text-[11px] font-bold flex items-center space-x-1">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 font-mono text-[11px] text-white">
                        {v.registration_number}
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-indigo-400 font-semibold uppercase">{v.category} • {v.fuel_type}</span>
                        <span className="text-xs font-bold text-white">₹{v.price_per_day} / day</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{v.brand} {v.name}</h3>

                      {v.approval_status === 'Rejected' && v.rejection_reason && (
                        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                          <strong>Reason:</strong> {v.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-800/60 flex items-center justify-between mt-3">
                    <span className={`text-xs font-semibold ${v.status === 'Available' ? 'text-emerald-400' : 'text-slate-400'}`}>
                      ● {v.status}
                    </span>

                    {v.approval_status === 'Approved' && (
                      <button
                        onClick={() => handleToggleAvailability(v.vehicle_id)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-all"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Toggle Status</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Booking ID</th>
                    <th className="p-4">Vehicle</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Dates</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Net Payout (80%)</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bookings.map(b => (
                    <tr key={b.booking_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-white">#{b.booking_id}</td>
                      <td className="p-4">
                        <div className="font-semibold text-white">{b.vehicle_brand} {b.vehicle_name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{b.registration_number}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-white">{b.customer_name}</div>
                        <div className="text-[10px] text-slate-500">{b.customer_phone}</div>
                      </td>
                      <td className="p-4 text-[11px]">
                        <div>{new Date(b.start_datetime).toLocaleDateString()}</div>
                        <div className="text-slate-500">to {new Date(b.end_datetime).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4 font-bold text-white">₹{b.total_amount}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.payment_status === 'Paid' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                        }`}>
                          {b.payment_method} ({b.payment_status})
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">
                        ₹{b.payout_amount || Math.round(b.total_amount * 0.8)}
                      </td>
                      <td className="p-4">
                        {b.payment_method === 'COD' && b.payment_status === 'Pending' && (
                          <button
                            onClick={() => handleMarkCodReceived(b.booking_id)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-all"
                          >
                            Mark Cash Received
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Payout ID</th>
                    <th className="p-4">Booking Ref</th>
                    <th className="p-4">Gross Rent</th>
                    <th className="p-4">Platform Fee (20%)</th>
                    <th className="p-4">Net Payout (80%)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Bank Ref / UTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payouts.map(p => (
                    <tr key={p.payout_id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-mono font-bold text-white">#PAY-{p.payout_id}</td>
                      <td className="p-4">Booking #{p.booking_id}</td>
                      <td className="p-4">₹{p.gross_amount}</td>
                      <td className="p-4 text-slate-400">-₹{p.commission_amount}</td>
                      <td className="p-4 font-bold text-emerald-400">₹{p.payout_amount}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'Paid' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-400">{p.reference_no || 'Pending Transfer'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: BANKING & PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <Building className="w-6 h-6 text-indigo-400" />
              <div>
                <h2 className="text-base font-bold text-white">Bank Account & Payout Setup</h2>
                <p className="text-xs text-slate-400">Account numbers are encrypted with AES-256 before storage in rental.db</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Business / Trade Name</label>
                <input
                  type="text"
                  value={profileForm.business_name}
                  onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                  placeholder="e.g. Apex Mobility Fleet"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Registered Address</label>
                  <input
                    type="text"
                    required
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Bank Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.bank_account_holder}
                  onChange={(e) => setProfileForm({ ...profileForm, bank_account_holder: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Bank Account Number</label>
                  <input
                    type="password"
                    placeholder={profile?.bank_account_masked || 'Enter new account number'}
                    value={profileForm.bank_account_number}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_account_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={profileForm.ifsc}
                    onChange={(e) => setProfileForm({ ...profileForm, ifsc: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. mobile@upi"
                  value={profileForm.upi_id}
                  onChange={(e) => setProfileForm({ ...profileForm, upi_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30"
              >
                Save Payout Details
              </button>
            </form>
          </div>
        )}

        {/* MULTI-STEP ADD VEHICLE MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Step {wizardStep} of 4</span>
                  <h2 className="text-lg font-bold text-white">List Your Vehicle</h2>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Step 1: Specs & Rates */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Brand</label>
                      <input
                        type="text"
                        placeholder="e.g. Hyundai, Tata"
                        value={newVehicle.brand}
                        onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Model Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Creta SX(O)"
                        value={newVehicle.name}
                        onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Category</label>
                      <select
                        value={newVehicle.category}
                        onChange={(e) => setNewVehicle({ ...newVehicle, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="Hatchback">Hatchback</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="MUV">MUV</option>
                        <option value="Luxury">Luxury</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Registration No</label>
                      <input
                        type="text"
                        placeholder="GJ05AB1234"
                        value={newVehicle.registration_number}
                        onChange={(e) => setNewVehicle({ ...newVehicle, registration_number: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Seating</label>
                      <input
                        type="number"
                        min="2"
                        max="10"
                        value={newVehicle.seats}
                        onChange={(e) => setNewVehicle({ ...newVehicle, seats: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Price / Day (₹)</label>
                      <input
                        type="number"
                        value={newVehicle.price_per_day}
                        onChange={(e) => setNewVehicle({ ...newVehicle, price_per_day: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Price / Hour (₹)</label>
                      <input
                        type="number"
                        value={newVehicle.price_per_hour}
                        onChange={(e) => setNewVehicle({ ...newVehicle, price_per_hour: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Security Deposit (₹)</label>
                      <input
                        type="number"
                        value={newVehicle.security_deposit}
                        onChange={(e) => setNewVehicle({ ...newVehicle, security_deposit: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setWizardStep(2)}
                    disabled={!newVehicle.brand || !newVehicle.name || !newVehicle.registration_number}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs mt-4 disabled:opacity-50"
                  >
                    Next: Upload Photos (Min 5)
                  </button>
                </div>
              )}

              {/* Step 2: 5 Photos (Front, Back, Left, Right, Interior) */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-semibold">
                      Uploaded Photos: {newVehicle.photos.length} / 5 minimum required
                    </span>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                      Add Photos
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {newVehicle.photos.map((p, idx) => (
                      <div key={idx} className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                        <img src={p.file_path} alt="car" className="w-full h-20 object-cover" />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-white font-bold">
                          {p.image_type}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      disabled={newVehicle.photos.length < 5}
                      className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Next: Documents
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Documents (RC + Insurance) */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">Registration Certificate (RC)</div>
                      <div className="text-[11px] text-slate-400">Mandatory vehicle ownership document</div>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium">
                      {newVehicle.documents.some(d => d.doc_type === 'RC') ? 'Uploaded ✓' : 'Upload RC'}
                      <input type="file" onChange={(e) => handleDocUpload('RC', e)} className="hidden" />
                    </label>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">Comprehensive Insurance</div>
                      <div className="text-[11px] text-slate-400">Must be valid and in force</div>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium">
                      {newVehicle.documents.some(d => d.doc_type === 'Insurance') ? 'Uploaded ✓' : 'Upload Insurance'}
                      <input type="file" onChange={(e) => handleDocUpload('Insurance', e)} className="hidden" />
                    </label>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setWizardStep(4)}
                      disabled={!newVehicle.documents.some(d => d.doc_type === 'RC') || !newVehicle.documents.some(d => d.doc_type === 'Insurance')}
                      className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Next: Review
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Review and Submit */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vehicle:</span>
                      <span className="font-bold text-white">{newVehicle.brand} {newVehicle.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Registration:</span>
                      <span className="font-mono text-white">{newVehicle.registration_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Daily Rate:</span>
                      <span className="font-bold text-emerald-400">₹{newVehicle.price_per_day} / day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Photos:</span>
                      <span className="text-white">{newVehicle.photos.length} uploaded</span>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => handleSubmitVehicle(true)}
                      className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => handleSubmitVehicle(false)}
                      className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                    >
                      Submit for Approval
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
