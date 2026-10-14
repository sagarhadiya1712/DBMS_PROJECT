import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Car,
  MapPin,
  Calendar,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  FileText,
  Upload,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PaymentModal from '../components/PaymentModal';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function BookingCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const vehicleId = searchParams.get('vehicleId');
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';
  const initialPromo = searchParams.get('promo') || '';

  const [vehicle, setVehicle] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [dropBranchId, setDropBranchId] = useState('');
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [promoCode, setPromoCode] = useState(initialPromo);

  // License upload inline state
  const [licenseFile, setLicenseFile] = useState(null);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  // Quote & payment modal state
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const [vehRes, branchRes] = await Promise.all([
          api.get(`/vehicles/${vehicleId}`),
          api.get('/branches'),
        ]);
        if (vehRes.data.success) {
          const v = vehRes.data.data;
          setVehicle(v);
          setPickupBranchId(v.branchId);
          setDropBranchId(v.branchId);
        }
        if (branchRes.data.success) {
          setBranches(branchRes.data.data);
        }
      } catch (e) {
        console.error('Error loading checkout:', e);
      } finally {
        setLoading(false);
      }
    };
    if (vehicleId) loadDetails();
  }, [vehicleId]);

  // Recalculate quote whenever dates, vehicle, or promo changes
  useEffect(() => {
    if (!vehicle || !startDate || !endDate) return;

    const calc = async () => {
      setQuoteError('');
      try {
        const res = await api.post('/bookings/quote', {
          vehicleId: vehicle.id,
          startDateTime: `${startDate}T10:00:00.000Z`,
          endDateTime: `${endDate}T10:00:00.000Z`,
          promoCode,
        });
        if (res.data.success) {
          setQuote(res.data.data);
        }
      } catch (err) {
        setQuote(null);
        setQuoteError(err.response?.data?.message || 'Selected dates are unavailable.');
      }
    };
    calc();
  }, [vehicle, startDate, endDate, promoCode]);

  // Handle driving license upload if missing
  const handleUploadLicense = async (e) => {
    e.preventDefault();
    if (!licenseFile) return;
    setUploadingLicense(true);
    const formData = new FormData();
    formData.append('license', licenseFile);
    formData.append('drivingLicenseNumber', 'DL-' + Math.floor(1000000 + Math.random() * 9000000));

    try {
      const res = await api.post('/auth/upload-license', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        updateUser(res.data.data);
        alert('Driving license uploaded & verified successfully!');
      }
    } catch (err) {
      alert('License upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleInitiateBooking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setQuoteError('');

    try {
      const payload = {
        vehicleId: vehicle.id,
        pickupBranchId,
        dropBranchId,
        startDateTime: `${startDate}T10:00:00.000Z`,
        endDateTime: `${endDate}T10:00:00.000Z`,
        promoCode,
      };

      const res = await api.post('/bookings', payload);

      if (res.data.success) {
        const { booking, razorpayOrder } = res.data.data;
        setActiveBooking(booking);
        setActiveOrder(razorpayOrder);
        setShowPaymentModal(true);
      }
    } catch (err) {
      setQuoteError(err.response?.data?.message || 'Failed to initialize booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 2 of 2</span>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Review & Complete Reservation</h1>
        <p className="text-sm text-slate-600 mt-1">
          Lock in your preferred vehicle with full price transparency and instant payment verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Cols: Form & Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Vehicle Snapshot Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <img
              src={
                vehicle?.images?.[0]?.imageUrl ||
                '/vehicles/placeholder.jpg'
              }
              alt={`${vehicle?.make || ''} ${vehicle?.model || ''}`}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/vehicles/placeholder.jpg';
              }}
              className="w-full sm:w-48 aspect-[16/10] object-cover rounded-2xl bg-slate-100"
            />
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  vehicle?.category === 'LUXURY_TAXI'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-indigo-50 text-indigo-700'
                }`}>
                  {vehicle?.category === 'LUXURY_TAXI' ? 'Luxury Taxi' : vehicle?.category}
                </span>
                {vehicle?.category === 'LUXURY_TAXI' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center space-x-1">
                    <UserCheck className="w-3 h-3" />
                    <span>Chauffeur included</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {vehicle?.year} {vehicle?.make} {vehicle?.model}
              </h3>
              <p className="text-xs text-slate-600">
                Plate: <strong className="font-mono text-slate-800">{vehicle?.licensePlate}</strong> • {vehicle?.seatingCapacity} Seats • {vehicle?.transmission} • {vehicle?.fuelType}
              </p>
              <div className="text-xs text-indigo-600 font-semibold pt-1">
                {formatCurrency(vehicle?.dailyRate)}/day ({formatCurrency(vehicle?.hourlyRate)}/hr)
              </div>
            </div>
          </div>

          {/* Form Options */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">Pickup & Return Stations</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pickup Location</span>
                </label>
                <select
                  value={pickupBranchId}
                  onChange={(e) => setPickupBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Drop-Off Location</span>
                </label>
                <select
                  value={dropBranchId}
                  onChange={(e) => setDropBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Pickup Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Return Date</label>
                <input
                  type="date"
                  min={startDate || new Date().toISOString().split('T')[0]}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Promo Code Input */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Apply Promo Code</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. WELCOME10 or SUMMER20"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full sm:w-64 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => alert(`Promo code ${promoCode} active`)}
                  className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Driving License Verification Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Renter Driving License Verification</span>
            </h3>

            {user?.drivingLicenseNumber ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">
                      License Verified: {user.drivingLicenseNumber}
                    </span>
                    <span className="text-[11px] text-emerald-700">Ready for instant vehicle pickup</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  Active
                </span>
              </div>
            ) : (
              <form onSubmit={handleUploadLicense} className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <p className="text-xs text-amber-800 font-medium">
                  Please upload a photo of your valid driver's license before your first rental.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setLicenseFile(e.target.files[0])}
                    className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                    required
                  />
                  <button
                    type="submit"
                    disabled={uploadingLicense}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {uploadingLicense ? 'Uploading...' : 'Verify License'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Col: Price Breakdown & Payment Button */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xl space-y-6">
            <h3 className="font-bold text-lg text-slate-900 pb-3 border-b border-slate-100">
              Pricing Summary
            </h3>

            {quoteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{quoteError}</span>
              </div>
            )}

            {quote ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Duration:</span>
                  <span className="font-semibold text-slate-800">{quote.totalDays} Days ({quote.totalHours} hrs)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Base Rate:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(quote.basePrice)}</span>
                </div>
                {quote.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Promo Discount:</span>
                    <span>-{formatCurrency(quote.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST (18%):</span>
                  <span>{formatCurrency(quote.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Security Deposit (Refundable):</span>
                  <span>{formatCurrency(quote.depositAmount)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Total Amount:</span>
                  <span className="text-indigo-600 font-display">{formatCurrency(quote.totalPrice)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">Select dates to view price quote.</p>
            )}

            <button
              onClick={handleInitiateBooking}
              disabled={!quote || submitting || quoteError}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>{submitting ? 'Creating Order...' : `Confirm & Pay with Razorpay`}</span>
            </button>

            <div className="space-y-2 text-[11px] text-slate-600 text-center">
              <p className="flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Test Mode Sandbox Active • Instant Activation</span>
              </p>
              <p>Security deposit refunded automatically upon return checklist.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Test Modal */}
      {showPaymentModal && activeBooking && activeOrder && (
        <PaymentModal
          booking={activeBooking}
          razorpayOrder={activeOrder}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(confirmedBooking) => {
            setShowPaymentModal(false);
            navigate('/bookings?confirmed=true');
          }}
        />
      )}
    </div>
  );
}
