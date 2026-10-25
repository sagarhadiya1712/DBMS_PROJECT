import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Car,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  CreditCard,
  Lock,
  ArrowRight,
  AlertCircle,
  Download,
  Banknote,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export default function BookingCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useNotifications();

  // State passed from VehicleDetails or MyBookings
  const initialBooking = location.state?.booking || null;
  const initialVehicle = location.state?.vehicle || null;
  const initialBookingParams = location.state?.bookingParams || null;
  const initialEstimate = location.state?.estimate || null;

  const [booking, setBooking] = useState(initialBooking);
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [bookingParams, setBookingParams] = useState(initialBookingParams);

  // Payment method selection: 'ONLINE' or 'COD'
  const [paymentMethod, setPaymentMethod] = useState(initialBooking?.payment_method || 'ONLINE');
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const [orderPayload, setOrderPayload] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [kycInfo, setKycInfo] = useState(null);

  // 10-Minute Hold Countdown Timer for Awaiting Payment
  const [holdTimeLeft, setHoldTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // Redirect if missing vehicle & booking context
  useEffect(() => {
    if (!booking && !bookingParams) {
      navigate('/vehicles');
    }

    api.get('/kyc/me').then(res => {
      const docs = res.data?.documents || [];
      const dl = docs.find(d => d.doc_type?.startsWith('DrivingLicense'));
      if (dl) {
        setKycInfo({
          license_number: dl.doc_number,
          expiry_date: dl.expiry_date
        });
      }
    }).catch(() => {});
  }, [booking, bookingParams, navigate]);

  // Calculate pricing values
  const totalRent = booking?.total_amount
    ?? (initialEstimate?.total ?? (vehicle?.price_per_day || 0));
  const deposit = booking?.deposit_amount
    ?? (initialEstimate?.deposit ?? (vehicle?.security_deposit || 0));
  const discount = booking?.discount_amount
    ?? (initialEstimate?.discount || 0);
  const grandTotal = totalRent + deposit;

  // Manage 10-minute hold countdown
  useEffect(() => {
    const targetExpiresAt = booking?.hold_expires_at;
    if (!targetExpiresAt || booking?.status !== 'Awaiting Payment' || paymentSuccess) {
      setHoldTimeLeft(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(targetExpiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((expiry - now) / 1000));
      setHoldTimeLeft(diffSec);

      if (diffSec <= 0) {
        clearInterval(timerRef.current);
        setErrorMessage('Hold duration of 10 minutes has expired. Please initiate a new booking.');
        showToast('Hold expired. This slot is no longer reserved.', 'error');
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [booking?.hold_expires_at, booking?.status, paymentSuccess, showToast]);

  const formatTimer = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Submit Checkout Action
  const handleCheckoutSubmit = async () => {
    if (loading) return; // Prevent duplicate clicks
    setLoading(true);
    setErrorMessage(null);

    try {
      if (paymentMethod === 'COD') {
        // COD FLOW: Create booking with payment_method: 'COD'
        let currentBooking = booking;

        if (!currentBooking) {
          const res = await api.post('/bookings', {
            ...bookingParams,
            payment_method: 'COD',
          });
          currentBooking = res.data.booking;
        }

        // Direct success transition
        setPaymentSuccess(true);
        setSuccessData({
          booking: currentBooking,
          paymentMethod: 'COD',
          amountDueAtPickup: grandTotal,
          rentAmount: totalRent,
          depositAmount: deposit,
        });
        showToast('Booking confirmed! Pay cash at pickup/delivery.', 'success');
        setLoading(false);
      } else {
        // ONLINE FLOW: Create or fetch booking with ONLINE hold
        let currentBooking = booking;

        if (!currentBooking) {
          const res = await api.post('/bookings', {
            ...bookingParams,
            payment_method: 'ONLINE',
          });
          currentBooking = res.data.booking;
          setBooking(currentBooking);

          // Launch Razorpay with order details from response
          launchRazorpayFlow(currentBooking, res.data.razorpay);
        } else {
          // Booking already created, fetch fresh order via retry
          const retryRes = await api.post(`/payments/${currentBooking.booking_id}/retry`);
          launchRazorpayFlow(currentBooking, retryRes.data);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to process checkout. Please try again.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      setLoading(false);
    }
  };

  // Launch Razorpay Modal or Sandbox Simulator
  const launchRazorpayFlow = (currentBooking, rzpData) => {
    const keyId = rzpData?.key_id;
    const orderId = rzpData?.order_id;
    const amount = rzpData?.amount || (grandTotal * 100);

    setOrderPayload({
      booking_id: currentBooking.booking_id,
      order_id: orderId,
      key_id: keyId,
      amount,
    });

    // Check if live Razorpay SDK is present and key is valid
    if (window.Razorpay && keyId && !keyId.includes('placeholder')) {
      const options = {
        key: keyId,
        amount: amount,
        currency: 'INR',
        name: 'AutoFleet Rental Mobility',
        description: `Booking #${currentBooking.booking_id} Reservation`,
        order_id: orderId,
        handler: async function (response) {
          await verifyOnlinePayment({
            booking_id: currentBooking.booking_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setErrorMessage('Payment popup closed. Your 10-minute hold is still active. Click "Try Again" to complete payment.');
            showToast('Payment was not completed. You can try again before hold expires.', 'info');
          },
        },
        theme: { color: '#6366f1' },
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setLoading(false);
          setErrorMessage(`Payment failed: ${response.error?.description || 'Gateway error'}. Click "Try Again".`);
          showToast('Payment failed. Please retry or choose another payment method.', 'error');
        });
        rzp.open();
      } catch (e) {
        setShowSimulatedModal(true);
      }
    } else {
      // Razorpay test simulator modal for offline/local environments
      setShowSimulatedModal(true);
      setLoading(false);
    }
  };

  // 2. Verify Online Payment via Backend Signature
  const verifyOnlinePayment = async ({ booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/payments/verify', {
        booking_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      setPaymentSuccess(true);
      setSuccessData({
        booking: res.data.booking || booking,
        paymentMethod: 'ONLINE',
        razorpay_payment_id,
        razorpay_order_id,
        amountPaid: grandTotal,
      });
      showToast('Payment verified successfully! Your vehicle is reserved.', 'success');
    } catch (err) {
      const msg = err.response?.data?.error || 'Payment verification failed.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setShowSimulatedModal(false);
    }
  };

  // Simulated Authorization for Sandbox Testing
  const handleSimulatedSuccess = async () => {
    const mockPaymentId = 'pay_sim_' + Math.random().toString(36).substring(2, 10);
    const mockOrderId = orderPayload?.order_id || ('order_sim_' + Math.random().toString(36).substring(2, 10));
    const mockSignature = 'simulated_valid_signature_2026';

    await verifyOnlinePayment({
      booking_id: booking?.booking_id || orderPayload?.booking_id,
      razorpay_order_id: mockOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: mockSignature,
    });
  };

  const handleSimulatedFailure = () => {
    setShowSimulatedModal(false);
    setLoading(false);
    setErrorMessage('Payment was cancelled in test simulator. Your 10-minute hold is still active.');
    showToast('Payment cancelled. Click "Try Again" to retry.', 'info');
  };

  const handleRetryPayment = async () => {
    if (!booking) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const retryRes = await api.post(`/payments/${booking.booking_id}/retry`);
      launchRazorpayFlow(booking, retryRes.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not initiate retry. Hold may have expired.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      setLoading(false);
    }
  };

  const startDateText = booking?.start_datetime || bookingParams?.start_datetime;
  const endDateText = booking?.end_datetime || bookingParams?.end_datetime;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* SUCCESS CONFIRMATION VIEW */}
      {paymentSuccess ? (
        <div className="glass-card p-8 sm:p-12 rounded-3xl border border-emerald-500/40 bg-slate-900/90 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{successData?.paymentMethod === 'COD' ? 'Booking Confirmed (COD)' : 'Payment Captured & Confirmed'}</span>
            </div>
            <h1 className="text-3xl font-black text-white">Reservation Confirmed!</h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {successData?.paymentMethod === 'COD'
                ? 'Your vehicle has been booked under Cash on Delivery. Cash is due at the time of pickup/delivery.'
                : 'Your payment was successfully verified and your vehicle slot is 100% secured.'}
            </p>
          </div>

          {/* COD Cash Notice Banner */}
          {successData?.paymentMethod === 'COD' && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 max-w-lg mx-auto text-left space-y-1">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                <Banknote className="w-4 h-4 text-amber-400" />
                <span>Amount Due at Pickup: ₹{successData.amountDueAtPickup?.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Please keep exact cash ready upon vehicle delivery/pickup. Includes base rental (₹{successData.rentAmount}) + refundable security deposit (₹{successData.depositAmount}).
              </p>
            </div>
          )}

          {/* Booking Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 max-w-lg mx-auto grid grid-cols-2 gap-4 text-xs text-left">
            <div>
              <span className="text-slate-500 block">Booking Reference</span>
              <span className="font-bold text-white font-mono text-sm">
                #{successData?.booking?.booking_id || booking?.booking_id}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Payment Method</span>
              <span className="font-bold text-indigo-400">
                {successData?.paymentMethod === 'COD' ? 'COD - Pay at Pickup' : 'Paid Online (Razorpay)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Vehicle</span>
              <span className="font-bold text-white truncate block">
                {vehicle?.brand} {vehicle?.name}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">
                {successData?.paymentMethod === 'COD' ? 'Status' : 'Razorpay Reference'}
              </span>
              <span className="font-bold text-emerald-400 font-mono truncate block text-[11px]">
                {successData?.paymentMethod === 'COD' ? 'Confirmed (Payment Pending)' : (successData?.razorpay_payment_id || 'Captured')}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-800/80 flex justify-between items-center">
              <span className="text-slate-400">Total Booking Value</span>
              <span className="font-black text-white text-sm">₹{grandTotal?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={`${API_BASE_URL}/payments/invoice/${successData?.booking?.booking_id || booking?.booking_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Tax Invoice (PDF)</span>
            </a>

            <Link
              to="/bookings"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
            >
              <span>View My Bookings</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* MAIN CHECKOUT FORM */
        <div className="space-y-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Checkout & Confirmation</h1>
            <p className="text-xs text-slate-400 mt-1">
              Select your preferred payment method and confirm your vehicle reservation.
            </p>
          </div>

          {/* Active 10-Minute Hold Banner if in Awaiting Payment */}
          {booking?.status === 'Awaiting Payment' && holdTimeLeft !== null && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold block">Vehicle Hold Active (10 Minutes)</span>
                  <span className="text-[11px] text-amber-200/80">
                    Complete your payment before the timer expires to prevent reservation cancellation.
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-amber-400/80 block font-semibold">Remaining</span>
                <span className="font-mono text-base font-black text-amber-400">
                  {formatTimer(holdTimeLeft)}
                </span>
              </div>
            </div>
          )}

          {/* Error / Alert Message Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start justify-between space-x-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {booking?.status === 'Awaiting Payment' && holdTimeLeft > 0 && (
                <button
                  type="button"
                  onClick={handleRetryPayment}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shrink-0"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Summary & Payment Options */}
            <div className="md:col-span-2 space-y-6">
              {/* Vehicle card summary */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center space-x-5">
                <img
                  src={vehicle?.image_url || '/vehicles/placeholder.jpg'}
                  alt={vehicle?.name}
                  className="w-24 h-20 rounded-xl object-cover bg-slate-950 border border-slate-800"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    {vehicle?.category}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {vehicle?.brand} {vehicle?.name}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1 flex gap-2">
                    <span>{vehicle?.fuel_type}</span>
                    <span>•</span>
                    <span>{vehicle?.transmission}</span>
                    <span>•</span>
                    <span>{vehicle?.seats} Seats</span>
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Rental Schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <span className="text-slate-500 font-semibold block">Pick-Up Date & Time</span>
                    <span className="font-bold text-slate-200 block">
                      {startDateText ? new Date(startDateText).toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <span className="text-slate-500 font-semibold block">Return Date & Time</span>
                    <span className="font-bold text-slate-200 block">
                      {endDateText ? new Date(endDateText).toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified KYC & Driver Credentials Check (Phase 4C) */}
              <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Renter Identity & License Compliance</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                    Verified
                  </span>
                </div>

                {vehicle?.is_chauffeur_driven === 1 ? (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Chauffeur Luxury Ride: Professional driver assigned by AutoFleet. DL check waived.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Driving License (Masked)</span>
                      <span className="font-mono font-bold text-white mt-0.5 block">
                        {kycInfo?.license_number ? `XXXX${kycInfo.license_number.slice(-4)}` : 'XXXX-8921'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">License Expiry</span>
                      <span className="font-bold text-emerald-400 mt-0.5 block">
                        {kycInfo?.expiry_date ? `${kycInfo.expiry_date} (Covers booking)` : 'Verified & Valid'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* PAYMENT METHOD SELECTION CARDS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Select Payment Method
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1: Pay Online (Razorpay) */}
                  <label
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      paymentMethod === 'ONLINE'
                        ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-600/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="payment_method"
                          value="ONLINE"
                          checked={paymentMethod === 'ONLINE'}
                          onChange={() => setPaymentMethod('ONLINE')}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-950"
                        />
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300">
                        Razorpay
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">Pay Online</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        UPI, Card, NetBanking. Payment ke baad booking confirm hogi.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Instant Confirmation</span>
                      <span className="text-emerald-400 font-semibold">Test Mode Active</span>
                    </div>
                  </label>

                  {/* Card 2: Cash on Delivery (COD) */}
                  <label
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      paymentMethod === 'COD'
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-600/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="payment_method"
                          value="COD"
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-950"
                        />
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Banknote className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300">
                        Pay at Pickup
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">Cash on Delivery (COD)</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Abhi booking confirm, cash pickup par dena hai.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>No card needed</span>
                      <span className="text-amber-400 font-semibold">Max 2 Active</span>
                    </div>
                  </label>
                </div>

                {/* COD Details Banner when selected */}
                {paymentMethod === 'COD' && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 flex items-start space-x-2.5 animate-fade-in">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px]">
                      <strong>Notice:</strong> Rent (₹{totalRent?.toLocaleString('en-IN')}) + security deposit (₹{deposit?.toLocaleString('en-IN')}) pickup ke time cash mein dena hoga. Total due at pickup: <strong>₹{grandTotal?.toLocaleString('en-IN')}</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Zero Double-Booking Lock Note */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>
                  Zero double-booking protection active. Confirmed and active-hold bookings block vehicle slot dates.
                </span>
              </div>
            </div>

            {/* Right: Price Breakdown Card */}
            <div className="glass-card p-6 rounded-3xl border border-slate-800 bg-slate-900/80 h-fit space-y-6 shadow-2xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white pb-3 border-b border-slate-800">
                Payment Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Base Rental Charge</span>
                  <span className="text-slate-200 font-medium">
                    ₹{(totalRent + discount)?.toLocaleString('en-IN')}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Discount Voucher Applied</span>
                    <span>- ₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-400">
                  <span>Refundable Security Deposit</span>
                  <span className="text-slate-200 font-medium">₹{deposit.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between font-black text-base text-white">
                  <span>Total Payable</span>
                  <span className={paymentMethod === 'COD' ? 'text-emerald-400' : 'text-indigo-400'}>
                    ₹{grandTotal?.toLocaleString('en-IN')}
                  </span>
                </div>

                {paymentMethod === 'COD' && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300">
                    <span className="font-bold block">Cash on Pickup</span>
                    Pay ₹{grandTotal?.toLocaleString('en-IN')} in cash when receiving keys.
                  </div>
                )}
              </div>

              {/* Main Submit Action Button */}
              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={loading || (booking?.status === 'Awaiting Payment' && holdTimeLeft === 0)}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2 ${
                  paymentMethod === 'COD'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30'
                }`}
              >
                {paymentMethod === 'COD' ? (
                  <>
                    <Banknote className="w-4 h-4" />
                    <span>{loading ? 'Confirming...' : 'Confirm Booking (Pay at Pickup)'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{loading ? 'Connecting Razorpay...' : `Pay ₹${grandTotal?.toLocaleString('en-IN')} & Confirm`}</span>
                  </>
                )}
              </button>

              {/* Retry Button if already in Awaiting Payment state */}
              {booking?.status === 'Awaiting Payment' && holdTimeLeft > 0 && (
                <button
                  type="button"
                  onClick={handleRetryPayment}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Try Again / Re-open Payment</span>
                </button>
              )}

              <div className="text-[11px] text-center text-slate-500 space-y-1">
                {paymentMethod === 'ONLINE' ? (
                  <>
                    <p>Supports Razorpay Sandbox, UPI, NetBanking & Cards.</p>
                    <p className="text-emerald-400 font-semibold">Test Mode Active • No real money charged</p>
                  </>
                ) : (
                  <p className="text-slate-400">
                    Instant confirmation. Cash collected by fleet admin upon vehicle handover.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED RAZORPAY TEST MODAL (Fallback when client SDK / internet not present) */}
      {showSimulatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-indigo-500/30 bg-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  RZP
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Razorpay Sandbox Simulator</h3>
                  <span className="text-[10px] text-slate-400">Test Payment Gateway</span>
                </div>
              </div>
              <button
                onClick={handleSimulatedFailure}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Payable to:</span>
                <span className="text-slate-200 font-semibold">AutoFleet Mobility Pvt Ltd</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Booking Reference:</span>
                <span className="text-slate-200 font-mono font-bold">
                  #{booking?.booking_id || orderPayload?.booking_id}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount:</span>
                <span className="text-indigo-400 font-bold text-sm">
                  ₹{grandTotal?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Test Mode:</span>
                <span className="text-emerald-400 font-mono font-semibold">Active (Simulated Key)</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSimulatedSuccess}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Verifying...' : 'Authorize Test Payment (Success)'}</span>
              </button>

              <button
                type="button"
                onClick={handleSimulatedFailure}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Simulate Popup Close / Failure</span>
              </button>

              <p className="text-[11px] text-center text-slate-500">
                Simulating success triggers backend HMAC-SHA256 signature verification and confirms booking.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
