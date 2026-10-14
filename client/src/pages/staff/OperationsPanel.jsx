import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Car,
  Search,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';
import api from '../../services/api';
import InspectionModal from './InspectionModal';
import { formatDate } from '../../utils/formatters';

export default function OperationsPanel() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PICKUPS'); // 'PICKUPS' (CONFIRMED), 'RETURNS' (CHECKED_OUT), 'ALL'
  const [searchTerm, setSearchTerm] = useState('');

  // Inspection modal
  const [selectedBookingForInspection, setSelectedBookingForInspection] = useState(null);
  const [inspectionType, setInspectionType] = useState('PICKUP');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/all');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch operations bookings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const pickups = bookings.filter((b) => b.status === 'CONFIRMED');
  const returns = bookings.filter((b) => b.status === 'CHECKED_OUT');

  const displayedList = (activeTab === 'PICKUPS'
    ? pickups
    : activeTab === 'RETURNS'
    ? returns
    : bookings
  ).filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.bookingReference.toLowerCase().includes(term) ||
      b.vehicle?.model.toLowerCase().includes(term) ||
      b.vehicle?.licensePlate.toLowerCase().includes(term) ||
      b.customer?.firstName.toLowerCase().includes(term) ||
      b.customer?.lastName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Operations Console</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Front-Desk & Fleet Operations</h1>
          <p className="text-sm text-slate-600 mt-1">
            Dispatch vehicle pickups, execute digital condition inspections, process returns, and log discrepancies.
          </p>
        </div>

        {/* Quick Link to Fleet Management */}
        <div className="flex items-center space-x-2">
          <Link
            to="/staff/fleet"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm"
          >
            Manage Fleet CRUD
          </Link>
          <Link
            to="/staff/maintenance"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm"
          >
            Maintenance Schedule
          </Link>
          <Link
            to="/staff/alerts"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20"
          >
            Expiry Alerts
          </Link>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-600 font-semibold block">Pickups Due Today</span>
            <span className="text-3xl font-extrabold text-indigo-600 font-display">{pickups.length}</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-600 font-semibold block">Active on Road (Returns)</span>
            <span className="text-3xl font-extrabold text-amber-600 font-display">{returns.length}</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Car className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-600 font-semibold block">Total Lifecycle Bookings</span>
            <span className="text-3xl font-extrabold text-slate-800 font-display">{bookings.length}</span>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PICKUPS')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'PICKUPS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pickups Pending ({pickups.length})
          </button>
          <button
            onClick={() => setActiveTab('RETURNS')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'RETURNS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Returns Due ({returns.length})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Bookings ({bookings.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search renter, car or ref..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Bookings Table / Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-600">Loading fleet operations...</div>
      ) : displayedList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">No pending operations in this queue</h3>
          <p className="text-xs text-slate-600">Everything is caught up and running smoothly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedList.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {b.bookingReference}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'CONFIRMED'
                        ? 'bg-blue-100 text-blue-800'
                        : b.status === 'CHECKED_OUT'
                        ? 'bg-amber-100 text-amber-800'
                        : b.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {b.vehicle?.year} {b.vehicle?.make} {b.vehicle?.model}
                  </h3>
                  <p className="text-xs text-slate-600 font-mono">
                    Plate: {b.vehicle?.licensePlate} • Current Odo: {b.vehicle?.mileage} km
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 text-slate-700">
                  <p>
                    <strong>Customer:</strong> {b.customer?.firstName} {b.customer?.lastName}
                  </p>
                  <p className="text-slate-600 truncate">{b.customer?.email}</p>
                  <p className="text-[11px] text-indigo-600 font-medium">
                    {formatDate(b.startDateTime)} → {formatDate(b.endDateTime)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100">
                {b.status === 'CONFIRMED' && (
                  <button
                    onClick={() => {
                      setSelectedBookingForInspection(b);
                      setInspectionType('PICKUP');
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Perform Check-Out (Pickup)</span>
                  </button>
                )}

                {b.status === 'CHECKED_OUT' && (
                  <button
                    onClick={() => {
                      setSelectedBookingForInspection(b);
                      setInspectionType('RETURN');
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Process Return (Check-In)</span>
                  </button>
                )}

                {b.status === 'COMPLETED' && (
                  <div className="text-center text-xs font-bold text-emerald-600 py-1 flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Rental Concluded & Billed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspection Modal */}
      {selectedBookingForInspection && (
        <InspectionModal
          booking={selectedBookingForInspection}
          type={inspectionType}
          onClose={() => setSelectedBookingForInspection(null)}
          onSuccess={() => {
            setSelectedBookingForInspection(null);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}
