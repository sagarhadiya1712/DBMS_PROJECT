import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  Calendar,
  Search,
  Shield,
  Zap,
  Star,
  ArrowRight,
  Clock,
  Sparkles,
  Award,
  Users,
  CheckCircle2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';

export default function Home() {
  const navigate = useNavigate();
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [luxuryVehicle, setLuxuryVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search widget state
  const [category, setCategory] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');

  useEffect(() => {
    const fetchFleet = async () => {
      try {
        const res = await api.get('/vehicles');
        const list = res.data || [];
        setFeaturedVehicles(list.slice(0, 6));

        // Find luxury vehicle (Innova Hycross)
        const lux = list.find((v) => v.category === 'Luxury' || v.is_chauffeur_driven === 1);
        setLuxuryVehicle(lux || list[0]);
      } catch (err) {
        console.error('Failed to load featured vehicles:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFleet();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (startDateTime) params.append('start_datetime', new Date(startDateTime).toISOString());
    if (endDateTime) params.append('end_datetime', new Date(endDateTime).toISOString());
    navigate(`/vehicles?${params.toString()}`);
  };

  const categories = [
    { name: 'Hatchback', subtitle: 'Maruti Swift, Tiago, i20', icon: '🚗', count: '3 models' },
    { name: 'Sedan', subtitle: 'Honda City, Dzire, Verna', icon: '🚘', count: '3 models' },
    { name: 'SUV', subtitle: 'Mahindra XUV700, Thar, Nexon', icon: '🚙', count: '5 models' },
    { name: 'MUV', subtitle: 'Innova Crysta, Ertiga', icon: '🚐', count: '2 models' },
    { name: 'Luxury', subtitle: 'Innova Hycross (Chauffeur)', icon: '⭐', count: '1 Exclusive' },
  ];

  return (
    <div className="space-y-24 pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Glow ambient spots */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-violet-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold backdrop-blur-md shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Next-Gen Smart Fleet Rental • Verified • Zero Double Bookings</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white">
              Rent Premium Cars <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
                With Seamless Digital Check-in
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal">
              Experience India's most dependable fleet platform. Guaranteed real-time availability, Razorpay test payments, instant PDF invoices, and luxury chauffeur transfers.
            </p>
          </div>

          {/* Interactive Search Bar Widget */}
          <div className="mt-12 max-w-4xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="glass-panel p-4 sm:p-6 rounded-3xl shadow-2xl border border-slate-800 bg-slate-900/90 text-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1">
                  <Car className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Category</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Categories</option>
                  <option value="Hatchback">Hatchback (Swift, Tiago)</option>
                  <option value="Sedan">Sedan (City, Dzire, Verna)</option>
                  <option value="SUV">SUV (XUV700, Thar, Nexon)</option>
                  <option value="MUV">MUV (Innova Crysta, Ertiga)</option>
                  <option value="Luxury">Luxury Chauffeur Taxi</option>
                </select>
              </div>

              {/* Pick-up Date/Time */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pick-Up Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Return Date/Time */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Return Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Available Cars</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 2. POPULAR CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8">
          <div>
            <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Categories</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Explore by Segment</h2>
          </div>
          <Link
            to="/vehicles"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 mt-2 sm:mt-0"
          >
            <span>View entire fleet</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/vehicles?category=${cat.name}`}
              className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/40 transition-all group"
            >
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                {cat.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{cat.subtitle}</p>
              <span className="inline-block mt-3 text-[10px] uppercase font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                {cat.count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FEATURED FLEET */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Fleet Spotlight</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Top Recommended Vehicles</h2>
          </div>
          <Link
            to="/vehicles"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>Browse All (14)</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredVehicles.map((vehicle) => (
              <div
                key={vehicle.vehicle_id}
                className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/70 flex flex-col group"
              >
                {/* Vehicle Image */}
                <div className="relative h-48 bg-slate-950 overflow-hidden">
                  <img
                    src={vehicle.image_url || '/vehicles/placeholder.jpg'}
                    alt={vehicle.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white border border-slate-700">
                      {vehicle.category}
                    </span>
                    {vehicle.is_chauffeur_driven === 1 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 backdrop-blur-md text-amber-300 border border-amber-600/40">
                        Chauffeur
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-400 border border-slate-700">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{vehicle.avg_rating || '5.0'}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {vehicle.brand} {vehicle.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                      <span>{vehicle.fuel_type}</span>
                      <span>•</span>
                      <span>{vehicle.transmission}</span>
                      <span>•</span>
                      <span>{vehicle.seats} Seats</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Starting at</span>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-lg font-black text-indigo-400">Rs. {vehicle.price_per_day}</span>
                        <span className="text-xs text-slate-500">/ day</span>
                      </div>
                    </div>

                    <Link
                      to={`/vehicles/${vehicle.vehicle_id}`}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1"
                    >
                      <span>Book</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. LUXURY CHAUFFEUR TAXI SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-8 sm:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Executive Chauffeur-Driven Taxi</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Toyota Innova Hycross ZX(O) Hybrid
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                Travel in first-class comfort with our exclusive chauffeur-driven luxury vehicle. Featuring ventilated ottoman captain seats, dual-zone climate control, and our assigned senior certified chauffeur (Rajesh Sharma).
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs text-slate-400">Rate Plan</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">Rs. 6,500 / day</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs text-slate-400">Chauffeur</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">Included</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs text-slate-400">Class</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">7-Seat Hybrid</div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={luxuryVehicle ? `/vehicles/${luxuryVehicle.vehicle_id}` : '/vehicles?category=Luxury'}
                  className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-102"
                >
                  <span>Reserve Luxury Chauffeur Taxi</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl">
                <img
                  src={luxuryVehicle?.image_url || 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80'}
                  alt="Luxury Innova Hycross"
                  className="w-full h-80 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (3 STEPS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Seamless Lifecycle</span>
          <h2 className="text-3xl font-black text-white">How It Works in 3 Simple Steps</h2>
          <p className="text-xs text-slate-400">From digital selection to instant invoice streaming</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-sm mb-4">
              01
            </div>
            <h3 className="text-base font-bold text-white mb-2">Search & Pick Model</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore 14 verified vehicles. Choose your flexible pricing plan (daily, hourly, or per km) with instant live overlap checks.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 relative">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center font-black text-sm mb-4">
              02
            </div>
            <h3 className="text-base font-bold text-white mb-2">Razorpay Test Check-Out</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apply promo vouchers (e.g. WELCOME10), verify your booking summary, and complete secure payment in Razorpay sandbox test mode.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-sm mb-4">
              03
            </div>
            <h3 className="text-base font-bold text-white mb-2">Drive & Instant Invoice</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick up your inspected car. When completed, download itemized tax invoice PDFs generated live with PDFKit.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
