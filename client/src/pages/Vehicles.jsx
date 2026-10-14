import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Car,
  Filter,
  MapPin,
  Calendar,
  Users,
  Fuel,
  Gauge,
  Star,
  SlidersHorizontal,
  RotateCcw,
  Search,
  CheckCircle,
  Zap,
  Crown,
  UserCheck,
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function Vehicles() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states initialized from URL params
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [branchId, setBranchId] = useState(searchParams.get('branchId') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [seats, setSeats] = useState(searchParams.get('seats') || '');
  const [transmission, setTransmission] = useState(searchParams.get('transmission') || '');
  const [fuelType, setFuelType] = useState(searchParams.get('fuelType') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDateTime') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDateTime') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('price_asc');

  // Load branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        if (res.data.success) {
          setBranches(res.data.data);
        }
      } catch (e) {
        console.error('Failed to load branches:', e);
      }
    };
    fetchBranches();
  }, []);

  // Fetch vehicles whenever filters change
  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (branchId) params.append('branchId', branchId);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
        if (seats) params.append('seats', seats);
        if (transmission) params.append('transmission', transmission);
        if (fuelType) params.append('fuelType', fuelType);
        if (startDate) params.append('startDateTime', startDate);
        if (endDate) params.append('endDateTime', endDate);
        if (search) params.append('search', search);

        const res = await api.get(`/vehicles?${params.toString()}`);
        if (res.data.success) {
          let list = res.data.data;
          // Sort client side
          if (sortBy === 'price_asc') {
            list.sort((a, b) => a.dailyRate - b.dailyRate);
          } else if (sortBy === 'price_desc') {
            list.sort((a, b) => b.dailyRate - a.dailyRate);
          } else if (sortBy === 'rating') {
            list.sort((a, b) => b.avgRating - a.avgRating);
          }
          setVehicles(list);
        }
      } catch (e) {
        console.error('Failed to fetch vehicles:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [category, branchId, minPrice, maxPrice, seats, transmission, fuelType, startDate, endDate, search, sortBy]);

  const handleResetFilters = () => {
    setCategory('');
    setBranchId('');
    setMinPrice('');
    setMaxPrice('');
    setSeats('');
    setTransmission('');
    setFuelType('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setSearchParams({});
  };

  const categories = [
    { label: 'All Fleet', value: '' },
    { label: 'Hatchback', value: 'HATCHBACK' },
    { label: 'Sedan', value: 'SEDAN' },
    { label: 'SUV', value: 'SUV' },
    { label: 'MUV', value: 'MUV' },
    { label: '⭐ Luxury Taxi', value: 'LUXURY_TAXI' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Fleet Catalog</span>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Explore Indian Fleet</h1>
        <p className="text-sm text-slate-600 mt-1">
          Showing {vehicles.length} Indian vehicles ready for instant booking across Surat, Ahmedabad, Mumbai, and Pune.
        </p>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
              category === c.value
                ? c.value === 'LUXURY_TAXI'
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/30'
                  : 'bg-indigo-600 text-white shadow-indigo-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Filter Fleet</span>
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Search Make / Model</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-600" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. Swift, Nexon, Innova, E-Class"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Vehicle Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Categories</option>
                <option value="HATCHBACK">Hatchback</option>
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="MUV">MUV</option>
                <option value="LUXURY_TAXI">Luxury Taxi</option>
              </select>
            </div>

            {/* Date Range Availability */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Dates for Availability</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Pickup Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Return Date"
              />
            </div>

            {/* Branch Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Pickup City / Hub</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Hubs (Surat, Ahmedabad, Mumbai, Pune)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Daily Rate (INR ₹)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Seating Capacity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Min Seating Capacity</label>
              <select
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Any Capacity</option>
                <option value="4">4+ Passengers</option>
                <option value="5">5+ Passengers</option>
                <option value="7">7 Passengers (Innova, XUV700, Ertiga)</option>
              </select>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Fuel / Powertrain</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Powertrains</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vehicles Grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Sort Bar */}
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
            <span>
              Showing <strong className="text-slate-900">{vehicles.length}</strong> available results
            </span>
            <div className="flex items-center space-x-2">
              <span>Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="text-xs text-slate-600 mt-2">Loading fleet vehicles...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-800">No vehicles match your criteria</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Try widening your date range, adjusting the price filter, or selecting a different city.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {vehicles.map((v) => {
                const primaryImage =
                  v.images?.find((i) => i.isPrimary)?.imageUrl ||
                  v.images?.[0]?.imageUrl ||
                  '/vehicles/placeholder.jpg';

                const isLuxuryTaxi = v.category === 'LUXURY_TAXI';

                return (
                  <div
                    key={v.id}
                    className={`bg-white rounded-3xl overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 border flex flex-col group ${
                      isLuxuryTaxi ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Image Area */}
                    <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
                      <img
                        src={primaryImage}
                        alt={`${v.make} ${v.model}`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/vehicles/placeholder.jpg';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {isLuxuryTaxi ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center space-x-1 shadow-md">
                            <Crown className="w-3 h-3" />
                            <span>Luxury Taxi</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-sm">
                            {v.category}
                          </span>
                        )}
                        {isLuxuryTaxi && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/90 text-amber-300 flex items-center space-x-1 shadow-md backdrop-blur-md">
                            <UserCheck className="w-2.5 h-2.5 text-amber-400" />
                            <span>Chauffeur included</span>
                          </span>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-bold text-white flex items-center space-x-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{v.avgRating || 5.0}</span>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {v.year} {v.make} {v.model}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-600" />
                          <span>{v.branch?.name} ({v.branch?.city})</span>
                        </p>

                        {/* Specs Pills */}
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 text-center font-medium">
                          <div className="bg-slate-50 py-1 rounded-lg">
                            <Users className="w-3.5 h-3.5 mx-auto text-indigo-500 mb-0.5" />
                            <span>{v.seatingCapacity} Seats</span>
                          </div>
                          <div className="bg-slate-50 py-1 rounded-lg">
                            <Gauge className="w-3.5 h-3.5 mx-auto text-indigo-500 mb-0.5" />
                            <span>{v.transmission}</span>
                          </div>
                          <div className="bg-slate-50 py-1 rounded-lg">
                            <Fuel className="w-3.5 h-3.5 mx-auto text-indigo-500 mb-0.5" />
                            <span>{v.fuelType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing & CTA */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-xl font-extrabold text-slate-900 font-display">
                            {formatCurrency(v.dailyRate)}
                            <span className="text-xs text-slate-600 font-normal"> / day</span>
                          </div>
                          <span className="text-[10px] text-slate-600 block">{formatCurrency(v.hourlyRate)}/hr</span>
                        </div>

                        <Link
                          to={`/vehicles/${v.id}`}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                            isLuxuryTaxi
                              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/25'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                          }`}
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
