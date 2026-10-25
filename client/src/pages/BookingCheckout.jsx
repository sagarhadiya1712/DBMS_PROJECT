import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export default function BookingCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useNotifications();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [vehicle, setVehicle] = useState(location.state?.vehicle || null);
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);

  // If page was loaded directly without state, redirect to fleet
  useEffect(() => {
    if (!booking) {
      navigate('/vehicles');
    }
  }, [booking, navigate]);

  // Handle Payment via Razorpay
  const handleInitiatePayment = async () => {
    setLoading(true);

    try {
      // 1. Create order on backend
      const res = await api.post('/payments/create-order', {
        booking_id: booking.booking_id,
      });

      const orderData = res.data;

      // Check if real Razorpay JS SDK is available in window
      if (window.Razorpay && orderData.key_id && !orderData.key_id.includes('placeholder')) {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'AutoFleet Rental Mobility',
          description: `Booking #${booking.booking_id} Rental & Deposit`,
          order_id: orderData.order_id,
          handler: async function (response) {
            await verifyPayment({
              booking_id: booking.booking_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          theme: { color: '#6366f1' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
      } else {
        // Use test simulator modal
        setShowSimulatedModal(true);
        setLoading(false);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to initialize payment gateway.', 'error');
      setLoading(false);
    }
  };

  // Complete Payment Verification
  const verifyPayment = async ({ booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    setLoading(true);
    try {
      const res = await api.post('/payments/verify', {
        booking_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      setPaymentSuccess(true);
      setPaymentDetails({
        booking_id,
        razorpay_payment_id,
        razorpay_order_id,
      });
      showToast('Payment verified successfully! Your car is reserved.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Payment verification failed.', 'error');
    } finally {
      setLoading(false);
      setShowSimulatedModal(false);
    }
  };

  const handleSimulatedSuccess = async () => {
    const mockPaymentId = 'pay_test_' + Math.random().toString(36).substring(2, 10);
    const mockOrderId = 'order_test_' + Math.random().toString(36).substring(2, 10);
    const mockSignature = 'simulated_valid_signature_2026';

    await verifyPayment({
      booking_id: booking.booking_id,
      razorpay_order_id: mockOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: mockSignature,
    });
  };

  if (!booking) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* SUCCESS CONFIRMATION VIEW */}
      {paymentSuccess ? (
        <div className="glass-card p-8 sm:p-12 rounded-3xl border border-emerald-500/40 bg-slate-900/90 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">Payment Captured</span>
            <h1 className="text-3xl font-black text-white">Booking Confirmed!</h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your vehicle has been successfully reserved in our system. A digital copy of your tax invoice has been generated.
            </p>
          </div>

          {/* Metadata pill */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto grid grid-cols-2 gap-4 text-xs text-left">
            <div>
              <span className="text-slate-500 block">Booking Reference</span>
              <span className="font-bold text-white font-mono">#{booking.booking_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Razorpay Payment ID</span>
              <span className="font-bold text-emerald-400 font-mono truncate block">
                {paymentDetails?.razorpay_payment_id}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Vehicle</span>
              <span className="font-bold text-white truncate block">
                {vehicle?.brand} {vehicle?.name}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Amount Paid</span>
              <span className="font-bold text-indigo-400">
                Rs. {booking.total_amount + (booking.deposit_amount || 0)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={`${API_BASE_URL}/payments/invoice/${booking.booking_id}`}
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
              <span>View in My Bookings</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* CHECKOUT REVIEW VIEW */
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Review & Pay</h1>
            <p className="text-xs text-slate-400 mt-1">
              Complete your reservation with Razorpay sandbox test payment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Summary */}
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
                      {new Date(booking.start_datetime).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <span className="text-slate-500 font-semibold block">Return Date & Time</span>
                    <span className="font-bold text-slate-200 block">
                      {new Date(booking.end_datetime).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Guarantee Note */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>
                  Zero double-booking lock active. Your dates are securely held in transaction state.
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
                    Rs. {booking.total_amount + (booking.discount_amount || 0)}
                  </span>
                </div>

                {booking.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Discount Voucher Applied</span>
                    <span>- Rs. {booking.discount_amount}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-400">
                  <span>Refundable Security Deposit</span>
                  <span className="text-slate-200 font-medium">Rs. {booking.deposit_amount || 0}</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between font-black text-base text-white">
                  <span>Total Payable</span>
                  <span className="text-indigo-400">
                    Rs. {booking.total_amount + (booking.deposit_amount || 0)}
                  </span>
                </div>
              </div>

              {/* Pay Now Button */}
              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? 'Connecting Razorpay...' : 'Pay via Razorpay Test'}</span>
              </button>

              <div className="text-[11px] text-center text-slate-500 space-y-1">
                <p>Supports Razorpay Sandbox, UPI, Netbanking & Cards.</p>
                <p className="text-emerald-400 font-semibold">Test Mode Active • No real card needed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED RAZORPAY TEST MODAL (if live credentials not configured) */}
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
                onClick={() => setShowSimulatedModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Payable to:</span>
                <span className="text-slate-200 font-semibold">AutoFleet Mobility Pvt Ltd</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Amount:</span>
                <span className="text-indigo-400 font-bold text-sm">
                  Rs. {booking.total_amount + (booking.deposit_amount || 0)}
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

              <p className="text-[11px] text-center text-slate-500">
                Clicking Authorize completes HMAC-SHA256 test signature verification on the backend.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
