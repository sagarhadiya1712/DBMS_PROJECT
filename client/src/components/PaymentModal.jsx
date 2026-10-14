import React, { useState } from 'react';
import { CreditCard, Smartphone, ShieldCheck, CheckCircle2, AlertCircle, X, Lock } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function PaymentModal({ booking, razorpayOrder, onClose, onSuccess }) {
  const [method, setMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [upiId, setUpiId] = useState('renter@okaxis');

  const handlePay = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    try {
      // Simulate Razorpay checkout test handshake and verification call
      const verifyPayload = {
        bookingId: booking.id,
        orderId: razorpayOrder.id || `order_test_${Date.now()}`,
        paymentId: `pay_test_${Date.now()}`,
        signature: 'valid_test_signature',
        amount: booking.totalPrice,
        method,
      };

      const res = await api.post('/payments/verify', verifyPayload);

      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(res.data.data.booking);
        }, 1500);
      } else {
        setError(res.data.message || 'Payment processing failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment processing error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Razorpay Secure Test Checkout</h3>
              <p className="text-xs text-indigo-100">Sandbox Test Environment (INR)</p>
            </div>
          </div>
          {!processing && (
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-800">Payment Verified!</h4>
              <p className="text-sm text-slate-600">
                Your reservation {booking.bookingReference} has been confirmed. Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-5">
              {/* Amount summary card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-600 font-medium block">Total Payable</span>
                  <span className="text-xs text-slate-600 block">Ref: {booking.bookingReference}</span>
                </div>
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatCurrency(booking.totalPrice)}
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Payment Methods */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    method === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    method === 'upi' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI / QR</span>
                </button>
              </div>

              {/* Card inputs */}
              {method === 'card' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Card Number (Sandbox Test)</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder="4242 4242 4242 4242"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Expiry</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">CVV</label>
                      <input
                        type="password"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        maxLength={4}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="user@bank"
                    required
                  />
                  <span className="text-[11px] text-slate-600 mt-1 block">Test mode auto-approves any valid VPA</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Sandbox Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay {formatCurrency(booking.totalPrice)} Test Mode</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-Bit SSL Encrypted • Razorpay Test Network</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
