import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Calendar,
  Car,
  MapPin,
  FileDown,
  Star,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function MyBookings() {
  const [searchParams] = useSearchParams();
  const showConfirmedNotice = searchParams.get('confirmed') === 'true';

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeBookingForReview, setActiveBookingForReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/my-bookings');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch bookings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await api.post(`/bookings/${id}/cancel`, {
        cancellationReason: 'Cancelled by customer online',
      });
      if (res.data.success) {
        alert('Booking cancelled successfully.');
        fetchBookings();
      }
    } catch (err) {
      alert('Cancellation error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDownloadInvoice = (bookingId, bookingRef) => {
    const token = localStorage.getItem('fleet_access_token');
    // Open stream URL in browser with auth token query or direct fetch
    const url = `http://localhost:5000/api/invoices/${bookingId}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const fileURL = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileURL;
        a.download = `Invoice-${bookingRef}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Error opening invoice: ' + err.message));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!activeBookingForReview) return;
    setSubmittingReview(true);
    try {
      const res = await api.post('/reviews', {
        bookingId: activeBookingForReview.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      if (res.data.success) {
        alert('Thank you! Your review has been published.');
        setReviewModalOpen(false);
        setReviewComment('');
        fetchBookings();
      }
    } catch (err) {
      alert('Review failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === 'ALL') return true;
    return b.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Confirmed</span>;
      case 'CHECKED_OUT':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">On The Road (Checked Out)</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Completed & Invoiced</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Banner on successful new reservation */}
      {showConfirmedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="font-bold">Reservation Confirmed!</strong>
              <p className="text-xs text-emerald-700">
                Your payment was captured in test mode. A confirmation alert was sent to your email and in-app notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Account History</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">My Bookings & Invoices</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your upcoming rentals, check pickup details, download PDF tax invoices, or leave reviews.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
          {['ALL', 'CONFIRMED', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl transition ${
                filterStatus === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-xs text-slate-600 mt-2">Loading reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Car className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800">No bookings found in this category</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Ready to hit the road? Explore our current fleet of vehicles available for instant reservation.
          </p>
          <Link
            to="/vehicles"
            className="inline-block mt-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20"
          >
            Explore Fleet
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookings.map((b) => {
            const primaryImage =
              b.vehicle?.images?.find((img) => img.isPrimary)?.imageUrl ||
              b.vehicle?.images?.[0]?.imageUrl ||
              '/vehicles/placeholder.jpg';

            const hasReview = b.reviews && b.reviews.length > 0;

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:border-indigo-200 transition-all"
              >
                {/* Vehicle & Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 w-full lg:w-auto">
                  <img
                    src={primaryImage}
                    alt={`${b.vehicle?.make || ''} ${b.vehicle?.model || ''}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/vehicles/placeholder.jpg';
                    }}
                    className="w-full sm:w-44 aspect-[16/10] object-cover rounded-2xl bg-slate-100 flex-shrink-0"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {b.bookingReference}
                      </span>
                      {b.vehicle?.category === 'LUXURY_TAXI' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center space-x-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Chauffeur</span>
                        </span>
                      )}
                      {getStatusBadge(b.status)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {b.vehicle?.year} {b.vehicle?.make} {b.vehicle?.model}
                    </h3>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {formatDate(b.startDateTime)} to {formatDate(b.endDateTime)} ({b.totalDays} Days)
                        </span>
                      </p>
                      <p className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Pickup: {b.pickupBranch?.name}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 space-y-3 sm:space-y-0 lg:space-y-3">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-600 block">Total Amount</span>
                    <span className="text-2xl font-extrabold text-slate-900 font-display">
                      {formatCurrency(b.totalPrice)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      Paid via Razorpay Test
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Invoice PDF download */}
                    <button
                      onClick={() => handleDownloadInvoice(b.id, b.bookingReference)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center space-x-1.5 transition"
                    >
                      <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Invoice PDF</span>
                    </button>

                    {/* Write Review button if completed and not reviewed */}
                    {b.status === 'COMPLETED' && !hasReview && (
                      <button
                        onClick={() => {
                          setActiveBookingForReview(b);
                          setReviewModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center space-x-1.5 transition"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Write Review</span>
                      </button>
                    )}

                    {/* Cancel button if pending or confirmed */}
                    {['PENDING', 'CONFIRMED'].includes(b.status) && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center space-x-1.5 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewModalOpen && activeBookingForReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Review {activeBookingForReview.vehicle?.make} {activeBookingForReview.vehicle?.model}
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Rating (1 to 5 Stars)</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Feedback & Experience</label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was the ride quality, cleanliness, and branch pickup experience?"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
