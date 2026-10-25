import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Mail, RefreshCw, AlertCircle, CheckCircle2, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, resendOtp } = useAuth();
  const { showToast } = useNotifications();

  const emailParam = searchParams.get('email') || location.state?.email || '';
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState(location.state?.devOtp || '');
  const [emailWarning, setEmailWarning] = useState(location.state?.emailWarning || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef([]);

  // Calculate initial time left from localStorage or default 60s
  const getInitialTimeLeft = () => {
    if (!email) return 60;
    const storedExpiry = localStorage.getItem(`otp_expiry_${email}`);
    if (storedExpiry) {
      const remaining = Math.max(0, Math.ceil((Number(storedExpiry) - Date.now()) / 1000));
      return remaining;
    }
    // Set 60-second expiration and persist
    const newExpiry = Date.now() + 60 * 1000;
    localStorage.setItem(`otp_expiry_${email}`, String(newExpiry));
    return 60;
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);

  // Auto-focus first box on initial mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Update timer on email change
  useEffect(() => {
    if (email) {
      setTimeLeft(getInitialTimeLeft());
    }
  }, [email]);

  // Persistent Countdown Timer (recalculates against target timestamp)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!email) {
        setTimeLeft((prev) => Math.max(0, prev - 1));
        return;
      }
      const storedExpiry = localStorage.getItem(`otp_expiry_${email}`);
      if (storedExpiry) {
        const remaining = Math.max(0, Math.ceil((Number(storedExpiry) - Date.now()) / 1000));
        setTimeLeft(remaining);
      } else {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [email]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    if (timeLeft <= 0) return;
    // Accept only digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take single digit
    setOtp(newOtp);
    setError('');

    // Auto-advance to next box
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
    if (timeLeft <= 0) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      setError('');
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');

    if (timeLeft <= 0) {
      setError('OTP expire ho gaya, naya code mangao.');
      return;
    }

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!email) {
      setError('Email address is missing. Please confirm your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await verifyOtp(email, fullOtp);
      setSuccess(true);
      // Clean up timer storage
      localStorage.removeItem(`otp_expiry_${email}`);
      showToast('Email verified successfully! Welcome to Vehicle Rental System.', 'success');
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;
    if (!email) {
      setError('Please provide your email address to request a new code.');
      return;
    }

    setResending(true);
    setError('');

    try {
      const data = await resendOtp(email);
      if (data?.devOtp || data?.simulatedOtp) {
        setDevOtp(data.devOtp || data.simulatedOtp);
      }
      if (data?.emailWarning) {
        setEmailWarning(data.emailWarning);
      }
      // Reset 60s timer and persist expiry
      const newExpiry = Date.now() + 60 * 1000;
      localStorage.setItem(`otp_expiry_${email}`, String(newExpiry));
      setTimeLeft(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      showToast(data?.message || 'A fresh 6-digit verification code has been dispatched.', 'info');
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.retry_after) {
        setTimeLeft(resp.retry_after);
        const newExpiry = Date.now() + resp.retry_after * 1000;
        localStorage.setItem(`otp_expiry_${email}`, String(newExpiry));
      }
      setError(resp?.error || err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const isExpired = timeLeft <= 0;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 glass-card p-8 sm:p-10 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Verify Your Email
          </h2>
          <p className="text-xs text-slate-400">
            Enter the 6-digit confirmation code dispatched to:
          </p>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold text-indigo-300">
            <Mail className="w-3.5 h-3.5" />
            <span>{email || 'your email'}</span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/70 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Code verified! Redirecting to dashboard...</span>
          </div>
        )}

        {/* Demo / SMTP fallback banner if Gmail credentials are not configured */}
        {devOtp && !success && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 to-indigo-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2.5 shadow-lg shadow-amber-900/10">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-amber-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Verification Code Generated:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const digits = String(devOtp).split('').slice(0, 6);
                  setOtp(digits);
                  setError('');
                  inputRefs.current[5]?.focus();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold border border-amber-500/40 transition-all text-[11px] shadow-sm flex items-center space-x-1"
              >
                <span>⚡ Auto-Fill Code</span>
              </button>
            </div>
            <div className="flex items-baseline justify-between pt-0.5 border-t border-amber-800/40">
              <span className="text-[11px] text-slate-300">
                Your 6-digit code: <strong className="font-mono text-base tracking-widest text-amber-300 ml-1">{devOtp}</strong>
              </span>
              <span className="text-[10px] text-slate-400">Valid 60s</span>
            </div>
            {emailWarning && (
              <p className="text-[10px] text-amber-400/80 leading-relaxed italic">
                {emailWarning}
              </p>
            )}
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
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100"
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
                disabled={loading || success || isExpired}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-bold text-xl rounded-xl border-2 transition-all outline-none ${
                  isExpired
                    ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white'
                }`}
              />
            ))}
          </div>

          {/* 60s Countdown Timer & Resend Button */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Valid for:</span>
              <span
                className={`font-mono font-bold ${
                  isExpired
                    ? 'text-rose-400'
                    : timeLeft <= 15
                    ? 'text-amber-400 animate-pulse'
                    : 'text-indigo-400'
                }`}
              >
                {formatTimer(timeLeft)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={!isExpired || resending || loading}
              className={`flex items-center space-x-1 text-xs font-semibold transition-colors ${
                isExpired
                  ? 'text-indigo-400 hover:text-indigo-300 underline cursor-pointer'
                  : 'text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{isExpired ? 'Resend code' : `Resend in ${timeLeft}s`}</span>
            </button>
          </div>

          {isExpired && (
            <p className="text-center text-xs text-amber-400/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl">
              ⚠️ OTP expire ho gaya, naya code mangao. Click "Resend code" above.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || success || isExpired || otp.join('').length !== 6}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
