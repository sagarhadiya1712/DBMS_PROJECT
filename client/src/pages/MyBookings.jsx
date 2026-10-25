import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Car,
  Download,
  AlertCircle,
  Star,
  XCircle,
  CheckCircle2,
  FileText,
  X
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export default function MyBookings() {
  const { showToast } = useNotifications();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/my');
      setBookings(res.data || []);
    } catch (err) {
      showToast('Failed to load your bookings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Cancel Booking
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      showToast('Booking cancelled successfully.', 'success');
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel booking.', 'error');
    }
  };

  // Open Review Modal
  const openReviewModal = (booking) => {
    setSelectedBooking(booking);
    setRating(5);
    setComment('');
    setReviewModalOpen(true);
  };

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast('Please enter your review feedback.', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        booking_id: selectedBooking.booking_id,
        rating,
        comment: comment.trim(),
      });
      showToast('Thank you! Your review has been recorded.', 'success');
      setReviewModalOpen(false);
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Tab Filtering
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Upcoming') return b.status === 'Approved' || b.status === 'Pending';
    if (activeTab === 'Active') return b.status === 'Active';
    if (activeTab === 'Completed') return b.status === 'Completed';
    if (activeTab === 'Cancelled') return b.status === 'Cancelled' || b.status === 'Rejected';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">My Bookings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Track reservations, download official tax invoice PDFs, and leave feedback
        </p>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto">
        {['All', 'Upcoming', 'Active', 'Completed', 'Cancelled'].map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                isSelected
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* BOOKINGS LIST */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No {activeTab.toLowerCase()} bookings found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Ready for your next journey? Browse our fleet and reserve your preferred car.
          </p>
          <Link
            to="/vehicles"
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Explore Fleet
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => (
            <div
              key={b.booking_id}
              className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-slate-900/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={b.vehicle_image || '/vehicles/placeholder.jpg'}
                  alt={b.vehicle_name}
                  className="w-24 h-20 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                      #{b.booking_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        b.status === 'Completed'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                          : b.status === 'Active'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-600/40'
                          : b.status === 'Approved'
                          ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600/40'
                          : b.status === 'Cancelled' || b.status === 'Rejected'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-600/40'
                          : 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {b.vehicle_brand} {b.vehicle_name}
                  </h3>

                  <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Pick-up: {new Date(b.start_datetime).toLocaleDateString('en-IN')}</span>
                    <span>Return: {new Date(b.end_datetime).toLocaleDateString('en-IN')}</span>
                    <span>Plan: Per {b.pricing_type}</span>
                  </div>
                </div>
              </div>

              {/* Pricing & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto justify-between border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
                <div className="text-left md:text-right">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Paid</span>
                  <span className="text-lg font-black text-indigo-400">
                    Rs. {b.total_amount + (b.deposit_amount || 0)}
                  </span>
                  {b.late_fee > 0 && (
                    <span className="text-[10px] text-rose-400 font-semibold block">
                      Incl. Late Fee: Rs. {b.late_fee}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Download Invoice PDF */}
                  <a
                    href={`${API_BASE_URL}/payments/invoice/${b.booking_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-slate-200 hover:text-indigo-400 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                    title="Download Tax Invoice"
                  >
                    <Download className="w-4 h-4 text-indigo-400" />
                    <span>Invoice</span>
                  </a>

                  {/* Cancel Button (Pending or Approved) */}
                  {['Pending', 'Approved'].includes(b.status) && (
                    <button
                      onClick={() => handleCancelBooking(b.booking_id)}
                      className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 hover:bg-rose-900/40 text-rose-300 text-xs font-semibold flex items-center space-x-1 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  )}

                  {/* Review Button (Completed) */}
                  {b.status === 'Completed' && (
                    b.review_id ? (
                      <span className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 text-xs flex items-center space-x-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>Rated {b.user_rating}/5</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => openReviewModal(b)}
                        className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                      >
                        <Star className="w-4 h-4" />
                        <span>Rate Car</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RATING & REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Rate Your Experience</h3>
                <p className="text-xs text-slate-400">
                  {selectedBooking?.vehicle_brand} {selectedBooking?.vehicle_name}
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Overall Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700 hover:text-slate-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Review Feedback</label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about the vehicle cleanliness, performance, and overall drive..."
                  className="w-full p-3 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Post Verified Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
