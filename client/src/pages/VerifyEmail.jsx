import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, RefreshCw, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();
  const { showToast } = useNotifications();

  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    // Only accept numeric input
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take latest single digit
    setOtp(newOtp);
    setError('');

    // Auto-focus next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace: move to previous box
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!email) {
      setError('Email address is missing. Please enter your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await verifyOtp(email, fullOtp);
      setSuccess(true);
      showToast('Email verified successfully! Welcome to AutoFleet.', 'success');
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please provide an email address to resend OTP.');
      return;
    }

    setResending(true);
    setError('');

    try {
      await resendOtp(email);
      setTimeLeft(600); // Reset timer to 10 minutes
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      showToast('A fresh 6-digit verification code has been dispatched.', 'info');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 glass-card p-8 sm:p-10 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Verify Your Email
          </h2>
          <p className="text-xs text-slate-400">
            We have sent a 6-digit confirmation code to:
          </p>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold text-indigo-300">
            <Mail className="w-3.5 h-3.5" />
            <span>{email || 'your email'}</span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Code confirmed! Redirecting to fleet portal...</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          {!emailParam && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100"
              />
            </div>
          )}

          {/* 6 OTP Input Boxes */}
          <div className="flex justify-between items-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={loading || success}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center font-bold text-xl rounded-xl bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white transition-all outline-none"
              />
            ))}
          </div>

          {/* Countdown & Resend */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-1">
              <span>Code expires in:</span>
              <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`}>
                {formatTimer(timeLeft)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || loading || timeLeft > 540} // Allow resend after 1 min
              className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-semibold disabled:opacity-40 disabled:hover:text-indigo-400 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>Resend code</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || success || otp.join('').length !== 6}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Verifying Code...' : 'Verify & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800">
          Already verified?{' '}
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
