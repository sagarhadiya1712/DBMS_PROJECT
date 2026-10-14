import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Car,
  MapPin,
  Calendar,
  Users,
  Gauge,
  Fuel,
  Star,
  ShieldCheck,
  Check,
  ArrowRight,
  Clock,
  MessageSquare,
  AlertCircle,
  Crown,
  UserCheck,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vehicle, setVehicle] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [loading, setLoading] = useState(true);

  // Reservation widget state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await api.get(`/vehicles/${id}`);
        if (res.data.success) {
          const data = res.data.data;
          setVehicle(data);
          const primary = data.images?.find((img) => img.isPrimary)?.imageUrl || data.images?.[0]?.imageUrl || '';
          setSelectedImage(primary);
        }
      } catch (e) {
        console.error('Error fetching vehicle:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  // Fetch live price quote when dates change
  useEffect(() => {
    if (!startDate || !endDate || !vehicle) return;

    const getQuote = async () => {
      setQuoteLoading(true);
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
        setQuoteError(err.response?.data?.message || 'Date selection conflict');
      } finally {
        setQuoteLoading(false);
      }
    };

    getQuote();
  }, [startDate, endDate, promoCode, vehicle]);

  const handleProceedToBooking = () => {
    if (!startDate || !endDate) {
      alert('Please select both pickup and return dates');
      return;
    }
    navigate(`/checkout?vehicleId=${vehicle.id}&startDate=${startDate}&endDate=${endDate}&promo=${promoCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-800">Vehicle not found</h2>
        <Link to="/vehicles" className="mt-4 inline-block text-indigo-600 font-semibold text-sm">
          Return to fleet catalog
        </Link>
      </div>
    );
  }

  const isLuxuryTaxi = vehicle.category === 'LUXURY_TAXI';
  const featuresList = vehicle.features ? vehicle.features.split(',').map((f) => f.trim()) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Top Breadcrumb & Title */}
      <div>
        <nav className="text-xs text-slate-600 mb-2 flex items-center space-x-2">
          <Link to="/vehicles" className="hover:text-indigo-600">Fleet</Link>
          <span>/</span>
          <span className="text-slate-600">{vehicle.category}</span>
          <span>/</span>
          <span className="font-semibold text-slate-900">{vehicle.make} {vehicle.model}</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              {isLuxuryTaxi && (
                <div className="flex items-center space-x-1.5">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center space-x-1 shadow-md">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Luxury Taxi</span>
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-950 text-amber-300 flex items-center space-x-1 shadow-md">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chauffeur included</span>
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-indigo-500" />
              <span>Stationed at {vehicle.branch?.name} ({vehicle.branch?.city})</span>
              <span>•</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{vehicle.licensePlate}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-2xl flex items-center space-x-1.5 text-amber-700">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-sm">{vehicle.avgRating || 5.0}</span>
              <span className="text-xs text-amber-600">({vehicle.totalReviews || 0} reviews)</span>
            </div>
            <span className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              {vehicle.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Gallery & Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Gallery */}
          <div className="space-y-4">
            <div className={`aspect-[16/10] sm:h-96 w-full rounded-3xl overflow-hidden bg-slate-100 shadow-md ${isLuxuryTaxi ? 'border-2 border-amber-400' : ''}`}>
              <img
                src={selectedImage || '/vehicles/placeholder.jpg'}
                alt={`${vehicle.make} ${vehicle.model}`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/vehicles/placeholder.jpg';
                }}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnail Strip */}
            {vehicle.images && vehicle.images.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                {vehicle.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.imageUrl)}
                    className={`h-20 w-28 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition ${
                      selectedImage === img.imageUrl ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.imageUrl}
                      alt={`${vehicle.make} ${vehicle.model} thumbnail`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/vehicles/placeholder.jpg';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Key Specifications Grid */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Vehicle Specifications</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <Users className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-xs text-slate-600 block">Seating</span>
                <strong className="text-sm text-slate-900">{vehicle.seatingCapacity} Passengers</strong>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <Gauge className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-xs text-slate-600 block">Transmission</span>
                <strong className="text-sm text-slate-900">{vehicle.transmission}</strong>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <Fuel className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-xs text-slate-600 block">Powertrain</span>
                <strong className="text-sm text-slate-900">{vehicle.fuelType}</strong>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <Clock className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-xs text-slate-600 block">Odometer</span>
                <strong className="text-sm text-slate-900">{vehicle.mileage.toLocaleString('en-IN')} km</strong>
              </div>
            </div>
          </div>

          {/* Features & Amenities */}
          {featuresList.length > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-slate-900">Features & Amenities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuresList.map((f, i) => (
                  <div key={i} className="flex items-center space-x-2.5 text-xs text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reserved Dates Calendar Alert */}
          <div className="bg-indigo-50/70 p-6 rounded-3xl border border-indigo-100 space-y-3">
            <h4 className="font-bold text-sm text-indigo-950 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Current Reservation Bookings (Zero Overlap Protection)</span>
            </h4>
            {vehicle.bookings && vehicle.bookings.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-indigo-900">
                  This vehicle is scheduled for the following upcoming dates:
                </p>
                <div className="flex flex-wrap gap-2">
                  {vehicle.bookings.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-white text-indigo-800 border border-indigo-200 shadow-sm"
                    >
                      {formatDate(b.startDateTime)} to {formatDate(b.endDateTime)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-indigo-800">
                No active bookings currently scheduled for this vehicle. Immediate availability guaranteed!
              </p>
            )}
          </div>

          {/* Reviews List */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <span>Verified Renter Reviews ({vehicle.reviews?.length || 0})</span>
              </h3>
            </div>

            <div className="space-y-4">
              {vehicle.reviews?.length === 0 ? (
                <p className="text-xs text-slate-600">No reviews yet for this vehicle.</p>
              ) : (
                vehicle.reviews?.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">
                        {r.customer?.firstName} {r.customer?.lastName}
                      </span>
                      <div className="flex items-center space-x-1">
                        {[...Array(r.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{r.comment}</p>
                    {r.reply && (
                      <div className="mt-2 pl-3 border-l-2 border-indigo-400 text-[11px] text-indigo-900 bg-indigo-50/50 p-2 rounded-r-xl">
                        <strong>Operator Response:</strong> {r.reply}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Booking Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xl space-y-6">
            <div className="flex items-baseline justify-between border-b border-slate-100 pb-5">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 font-display">
                  {formatCurrency(vehicle.dailyRate)}
                </span>
                <span className="text-xs text-slate-600 font-medium"> / day</span>
              </div>
              <span className="text-xs text-slate-600">{formatCurrency(vehicle.hourlyRate)} / hour</span>
            </div>

            {/* Date Pickers */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pickup Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Return Date</label>
                <input
                  type="date"
                  min={startDate || new Date().toISOString().split('T')[0]}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Promo Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. WELCOME10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Conflict or Error alert */}
            {quoteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{quoteError}</span>
              </div>
            )}

            {/* Live Quote Breakdown */}
            {quote && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Rental Period:</span>
                  <span className="font-semibold text-slate-800">{quote.totalDays} Days ({quote.totalHours} hrs)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Base Rate:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(quote.basePrice)}</span>
                </div>
                {quote.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Promo Discount:</span>
                    <span>-{formatCurrency(quote.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST (10%):</span>
                  <span>{formatCurrency(quote.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Security Deposit (Refundable):</span>
                  <span>{formatCurrency(quote.depositAmount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Estimated Total:</span>
                  <span className="text-indigo-600 font-display">{formatCurrency(quote.totalPrice)}</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleProceedToBooking}
              disabled={!quote || quoteError || quoteLoading}
              className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl transition disabled:opacity-40 flex items-center justify-center space-x-2 ${
                isLuxuryTaxi
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
              }`}
            >
              <span>{quoteLoading ? 'Checking Availability...' : isLuxuryTaxi ? 'Reserve Luxury Chauffeur Taxi' : 'Proceed to Reservation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="space-y-1.5 text-[11px] text-slate-600 text-center">
              <p className="flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Instant Confirmation • Razorpay Secure Payment</span>
              </p>
              <p>Free cancellation up to 24h prior to pickup</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
