import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  Calendar,
  MapPin,
  Search,
  Shield,
  Zap,
  Star,
  ArrowRight,
  CheckCircle,
  Clock,
  Sparkles,
  Crown,
  UserCheck,
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function Home() {
  const navigate = useNavigate();
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [branches, setBranches] = useState([]);

  // Search widget state
  const [selectedBranch, setSelectedBranch] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Fetch featured fleet
    const loadData = async () => {
      try {
        const [vehRes, branchRes] = await Promise.all([
          api.get('/vehicles?status=AVAILABLE'),
          api.get('/branches'),
        ]);
        if (vehRes.data.success) {
          setFeaturedVehicles(vehRes.data.data.slice(0, 6));
        }
        if (branchRes.data.success) {
          setBranches(branchRes.data.data);
        }
      } catch (e) {
        console.error('Failed to load home data:', e);
      }
    };
    loadData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedBranch) params.append('branchId', selectedBranch);
    if (category) params.append('category', category);
    if (startDate) params.append('startDateTime', startDate);
    if (endDate) params.append('endDateTime', endDate);
    navigate(`/vehicles?${params.toString()}`);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-16 pb-28 lg:pt-24 lg:pb-36">
        {/* Ambient gradient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/30 via-blue-500/20 to-teal-400/20 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-indigo-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>India's Leading Fleet Network • Surat • Ahmedabad • Mumbai • Pune</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
              Self-Drive & Luxury Fleet <br />
              <span className="bg-gradient-to-r from-indigo-400 via-blue-300 to-teal-300 bg-clip-text text-transparent">
                Across Western India
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal">
              Book Hatchbacks, Sedans, SUVs, Innova Crysta, and Executive Chauffeur Taxi with live availability, zero double-bookings, and transparent INR billing.
            </p>
          </div>

          {/* Quick Search Widget */}
          <div className="mt-12 max-w-4xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="glass p-4 sm:p-5 rounded-3xl shadow-2xl border border-white/20 text-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Branch */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pickup City / Hub</span>
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-white/90 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Operational Hubs</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center space-x-1">
                  <Car className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Vehicle Type</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/90 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="HATCHBACK">Hatchback (Swift, Tiago)</option>
                  <option value="SEDAN">Sedan (Dzire, Amaze)</option>
                  <option value="SUV">SUV (Nexon, Scorpio-N, Thar)</option>
                  <option value="MUV">MUV (Innova, Ertiga)</option>
                  <option value="LUXURY_TAXI">⭐ Luxury Taxi (Mercedes E-Class)</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pickup Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/90 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* End Date & Action */}
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Return Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/90 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-3 sm:mb-0"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 mt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
                >
                  <Search className="w-4 h-4" />
                  <span>Search Available Fleet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* KPI Stats Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 font-display">15</div>
            <div className="text-xs font-semibold text-slate-600 mt-1">Indian Fleet Models</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-display">100%</div>
            <div className="text-xs font-semibold text-slate-600 mt-1">Zero Overlap Guarantee</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-display">
              {branches.length || 4}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {branches.length > 0
                ? [...new Set(branches.map((b) => b.city))].join(' • ')
                : 'Surat • Ahmedabad • Mumbai • Pune'}
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-500 font-display">₹1,200/d</div>
            <div className="text-xs font-semibold text-slate-600 mt-1">Fares Starting From</div>
          </div>
        </div>
      </section>

      {/* Featured Fleet Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Top Indian Fleet</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Featured Vehicles</h2>
          </div>
          <Link
            to="/vehicles"
            className="inline-flex items-center space-x-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 group"
          >
            <span>View All Fleet</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredVehicles.map((vehicle) => {
            const primaryImage =
              vehicle.images?.find((img) => img.isPrimary)?.imageUrl ||
              vehicle.images?.[0]?.imageUrl ||
              '/vehicles/placeholder.jpg';

            const isLuxuryTaxi = vehicle.category === 'LUXURY_TAXI';

            return (
              <div
                key={vehicle.id}
                className={`bg-white rounded-3xl overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 border flex flex-col group ${
                  isLuxuryTaxi ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-100'
                }`}
              >
                {/* Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <img
                    src={primaryImage}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/vehicles/placeholder.jpg';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                    {isLuxuryTaxi ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center space-x-1 shadow-md">
                        <Crown className="w-3.5 h-3.5" />
                        <span>Luxury Taxi</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow">
                        {vehicle.category}
                      </span>
                    )}
                    {isLuxuryTaxi && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/90 text-amber-300 flex items-center space-x-1 shadow-md backdrop-blur-md">
                        <UserCheck className="w-3 h-3 text-amber-400" />
                        <span>Chauffeur included</span>
                      </span>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center space-x-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{vehicle.avgRating || 5.0}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      {vehicle.branch?.name} • {vehicle.seatingCapacity} Seats • {vehicle.transmission} • {vehicle.fuelType}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-slate-900 font-display">
                        {formatCurrency(vehicle.dailyRate)}
                      </span>
                      <span className="text-xs text-slate-600 font-medium"> / day</span>
                    </div>

                    <Link
                      to={`/vehicles/${vehicle.id}`}
                      className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-bold transition-all shadow-sm"
                    >
                      View & Book
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Special Luxury Chauffeur Taxi Highlight Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl border border-amber-500/30">
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1.5 w-fit">
              <Crown className="w-3.5 h-3.5" />
              <span>Exclusive Luxury Chauffeur Experience</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Mercedes-Benz E-Class Luxury Chauffeur Taxi
            </h2>
            <p className="text-sm text-slate-300">
              The only dedicated executive chauffeur service in our fleet. Perfect for corporate travel, airport VIP meet-and-greets, and luxury weddings. Includes courteous uniformed chauffeur, mineral water, and premium cabin amenities.
            </p>
            <div className="pt-2 flex items-center space-x-3">
              <Link
                to="/vehicles?category=LUXURY_TAXI"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/30 transition-all"
              >
                <span>Book Luxury Taxi</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-xs font-semibold text-amber-300">₹10,500/day • Chauffeur Included</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
