import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Car,
  Calendar,
  Clock,
  Star,
  Users,
  Fuel,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  Sparkles,
  Info,
  UserCheck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Widget State
  const [pricingType, setPricingType] = useState('day');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [estimatedKm, setEstimatedKm] = useState(150);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');

  // Conflict state
  const [hasConflict, setHasConflict] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await api.get(`/vehicles/${id}`);
        setVehicle(res.data);

        // Prepopulate default booking window (Tomorrow 10:00 to +3 Days 10:00)
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(10, 0, 0, 0);
        const inThreeDays = new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000);

        const toInputString = (d) => {
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setStartDateTime(toInputString(tomorrow));
        setEndDateTime(toInputString(inThreeDays));
      } catch (err) {
        setError('Failed to load vehicle details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [id]);

  // Live Overlap Check against booked_ranges
  useEffect(() => {
    if (!startDateTime || !endDateTime || !vehicle?.booked_ranges) {
      setHasConflict(false);
      return;
    }

    const s = new Date(startDateTime).getTime();
    const e = new Date(endDateTime).getTime();

    if (e <= s) {
      setHasConflict(false);
      return;
    }

    const conflictFound = vehicle.booked_ranges.some((range) => {
      const rs = new Date(range.start_datetime).getTime();
      const re = new Date(range.end_datetime).getTime();
      // Overlap condition: start < re && end > rs
      return s < re && e > rs;
    });

    setHasConflict(conflictFound);
  }, [startDateTime, endDateTime, vehicle]);

  // Promo code validation
  const handleApplyPromo = async () => {
    if (!discountCode.trim()) return;
    setValidatingPromo(true);
    setPromoMessage('');

    try {
      const res = await api.post('/discounts/validate', { code: discountCode.trim() });
      setAppliedDiscount(res.data);
      setPromoMessage(res.data.message);
      showToast(res.data.message, 'success');
    } catch (err) {
      setAppliedDiscount(null);
      setPromoMessage(err.response?.data?.error || 'Invalid voucher code.');
      showToast(err.response?.data?.error || 'Invalid voucher code.', 'error');
    } finally {
      setValidatingPromo(false);
    }
  };

  // Live Price Calculation
  const calculateEstimate = () => {
    if (!vehicle || !startDateTime || !endDateTime) return { base: 0, total: 0, discount: 0 };

    const s = new Date(startDateTime);
    const e = new Date(endDateTime);
    const diffMs = e.getTime() - s.getTime();

    if (diffMs <= 0) return { base: 0, total: 0, discount: 0 };

    let base = 0;
    if (pricingType === 'hour') {
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      base = hours * vehicle.price_per_hour;
    } else if (pricingType === 'km') {
      base = (Number(estimatedKm) || 100) * vehicle.price_per_km;
    } else {
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      base = days * vehicle.price_per_day;
    }

    let discountAmount = 0;
    if (appliedDiscount) {
      discountAmount = Math.round((base * appliedDiscount.percent) / 100);
    }

    const total = Math.max(0, base - discountAmount);
    return {
      base,
      discount: discountAmount,
      total,
      deposit: vehicle.security_deposit || 0,
      grandTotal: total + (vehicle.security_deposit || 0)
    };
  };

  const estimate = calculateEstimate();

  const handleProceedToBooking = () => {
    if (!user) {
      showToast('Please sign in or create an account to book this vehicle.', 'info');
      navigate('/login', { state: { from: { pathname: `/vehicles/${id}` } } });
      return;
    }

    if (hasConflict) {
      showToast('Selected dates conflict with an existing reservation. Please adjust dates.', 'error');
      return;
    }

    const calculated = calculateEstimate();
    navigate('/checkout', {
      state: {
        vehicle,
        bookingParams: {
          vehicle_id: vehicle.vehicle_id,
          start_datetime: new Date(startDateTime).toISOString(),
          end_datetime: new Date(endDateTime).toISOString(),
          pricing_type: pricingType,
          discount_code: appliedDiscount?.code || null,
          estimated_km: pricingType === 'km' ? Number(estimatedKm) : undefined
        },
        estimate: calculated
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">{error || 'Vehicle not found'}</h2>
        <Link to="/vehicles" className="inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
          Return to Fleet
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link to="/" className="hover:text-white">Home</Link>
        <span>/</span>
        <Link to="/vehicles" className="hover:text-white">Fleet</Link>
        <span>/</span>
        <span className="text-indigo-400 font-medium">{vehicle.brand} {vehicle.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* LEFT COLUMN: Image, Specs, Pricing Table, Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Showcase Image */}
          <div className="glass-card rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/80 relative">
            <div className="h-96 w-full bg-slate-950 overflow-hidden relative">
              <img
                src={vehicle.image_url || '/vehicles/placeholder.jpg'}
                alt={vehicle.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold border border-slate-700">
                  {vehicle.category}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border ${
                    vehicle.status === 'Available'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                  }`}
                >
                  {vehicle.status}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    {vehicle.brand} {vehicle.name}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Premium Indian fleet registered • All permits verified
                  </p>
                </div>
                <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 text-sm font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{vehicle.avg_rating || '5.0'}</span>
                  <span className="text-xs text-slate-500 font-normal">({vehicle.total_reviews || 0})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Assigned Chauffeur Banner (if luxury) */}
          {vehicle.is_chauffeur_driven === 1 && (
            <div className="glass-card p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900 to-amber-950/30 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Assigned Chauffeur</div>
                  <div className="text-base font-bold text-white mt-0.5">{vehicle.driver_name || 'Rajesh Sharma'}</div>
                  <div className="text-xs text-slate-400">License: {vehicle.driver_license || 'DL-0420180098765'}</div>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Chauffeur Included
              </span>
            </div>
          )}

          {/* Specifications Grid */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vehicle Specifications</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block">Fuel Type</span>
                <span className="font-bold text-slate-200 mt-1 block">{vehicle.fuel_type}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block">Transmission</span>
                <span className="font-bold text-slate-200 mt-1 block">{vehicle.transmission}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block">Seating Capacity</span>
                <span className="font-bold text-slate-200 mt-1 block">{vehicle.seats} Passengers</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block">Security Deposit</span>
                <span className="font-bold text-indigo-400 mt-1 block">Rs. {vehicle.security_deposit}</span>
              </div>
            </div>
          </div>

          {/* Transparent Pricing Table */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Flexible Pricing Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setPricingType('day')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  pricingType === 'day'
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>Daily Plan</span>
                  {pricingType === 'day' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="text-xl font-black text-white">Rs. {vehicle.price_per_day}</div>
                <div className="text-[11px] text-slate-500 mt-1">Per 24 hours (Best for roadtrips)</div>
              </div>

              <div
                onClick={() => setPricingType('hour')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  pricingType === 'hour'
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>Hourly Plan</span>
                  {pricingType === 'hour' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="text-xl font-black text-white">Rs. {vehicle.price_per_hour}</div>
                <div className="text-[11px] text-slate-500 mt-1">Per hour (Ideal for city meetings)</div>
              </div>

              <div
                onClick={() => setPricingType('km')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  pricingType === 'km'
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>Per KM Plan</span>
                  {pricingType === 'km' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="text-xl font-black text-white">Rs. {vehicle.price_per_km}</div>
                <div className="text-[11px] text-slate-500 mt-1">Calculated per distance driven</div>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Customer Reviews ({vehicle.reviews?.length || 0})
              </h3>
              <div className="flex items-center space-x-1 text-xs font-bold text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{vehicle.avg_rating || '5.0'} Overall Rating</span>
              </div>
            </div>

            {(!vehicle.reviews || vehicle.reviews.length === 0) ? (
              <p className="text-xs text-slate-400 py-4">
                No customer reviews posted yet for this vehicle. Be the first to rent and review!
              </p>
            ) : (
              <div className="space-y-3 pt-2">
                {vehicle.reviews.map((rev) => (
                  <div key={rev.review_id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-200">{rev.reviewer_name}</span>
                      <div className="flex text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300">{rev.comment}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(rev.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY BOOKING BOX */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-slate-800 bg-slate-900/80 sticky top-24 shadow-2xl space-y-6">
            <div className="flex justify-between items-baseline pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Selected Rate</span>
                <span className="text-2xl font-black text-indigo-400">
                  Rs. {pricingType === 'hour' ? vehicle.price_per_hour : pricingType === 'km' ? vehicle.price_per_km : vehicle.price_per_day}
                </span>
                <span className="text-xs text-slate-400"> / {pricingType}</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-semibold">
                Instant Lock
              </span>
            </div>

            {/* Date Pickers */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Pick-Up Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Return Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {pricingType === 'km' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Estimated KM Travel
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={estimatedKm}
                    onChange={(e) => setEstimatedKm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
              )}
            </div>

            {/* CONFLICT INDICATOR */}
            {hasConflict && (
              <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-start space-x-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Dates Unavailable</span>
                  <span>This vehicle is already reserved for these dates. Please choose another timeframe.</span>
                </div>
              </div>
            )}

            {/* Promo Code Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Discount Promo Voucher
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="WELCOME10 / FLEET20"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={validatingPromo || !discountCode.trim()}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40"
                >
                  {validatingPromo ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {promoMessage && (
                <p className={`text-[11px] mt-1.5 ${appliedDiscount ? 'text-emerald-400 font-semibold' : 'text-rose-400'}`}>
                  {promoMessage}
                </p>
              )}
            </div>

            {/* LIVE PRICE SUMMARY BREAKDOWN */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Base Rental Fee ({pricingType})</span>
                <span className="text-slate-200">Rs. {estimate.base}</span>
              </div>

              {estimate.discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Promo Voucher ({appliedDiscount?.percent}%)</span>
                  <span>- Rs. {estimate.discount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span>Refundable Security Deposit</span>
                <span className="text-slate-200">Rs. {estimate.deposit}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                <span>Total Payable Now</span>
                <span className="text-indigo-400 font-black">Rs. {estimate.grandTotal}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={handleProceedToBooking}
              disabled={bookingLoading || hasConflict || estimate.base <= 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <span>{bookingLoading ? 'Reserving...' : 'Proceed to Checkout'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[11px] text-center text-slate-500 flex items-center justify-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero double-booking guarantee via DB transaction</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
