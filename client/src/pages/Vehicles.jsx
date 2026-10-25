import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Car,
  Filter,
  Search,
  Star,
  Users,
  Fuel,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import api from '../services/api';
import { useRealtime } from '../context/RealtimeContext';

export default function Vehicles() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState(new Set());
  const prevVehiclesRef = useRef([]);

  // Filter States
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [fuelType, setFuelType] = useState(searchParams.get('fuel_type') || '');
  const [transmission, setTransmission] = useState(searchParams.get('transmission') || '');
  const [seats, setSeats] = useState(searchParams.get('seats') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '10000');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [startDate, setStartDate] = useState(searchParams.get('start_datetime') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_datetime') || '');
  const [sortBy, setSortBy] = useState('price_asc');

  // Debounce search input by 400ms to reduce backend load
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchVehicles = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (fuelType) params.append('fuel_type', fuelType);
        if (transmission) params.append('transmission', transmission);
        if (seats) params.append('seats', seats);
        if (maxPrice) params.append('max_price', maxPrice);
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (startDate) params.append('start_datetime', startDate);
        if (endDate) params.append('end_datetime', endDate);
        if (sortBy) params.append('sort', sortBy);

        const res = await api.get(`/vehicles?${params.toString()}`);
        const newVehicles = res.data || [];

        // Identify vehicles that were updated or added
        if (isSilent && prevVehiclesRef.current.length > 0) {
          const prevMap = new Map(prevVehiclesRef.current.map((v) => [v.vehicle_id, v]));
          const changed = new Set();
          newVehicles.forEach((v) => {
            const prev = prevMap.get(v.vehicle_id);
            if (!prev || prev.price_per_day !== v.price_per_day || prev.status !== v.status || prev.name !== v.name) {
              changed.add(v.vehicle_id);
            }
          });

          if (changed.size > 0) {
            setRecentlyUpdatedIds(changed);
            setTimeout(() => {
              setRecentlyUpdatedIds(new Set());
            }, 1800);
          }
        }

        prevVehiclesRef.current = newVehicles;
        setVehicles(newVehicles);
        if (!isSilent) setCurrentPage(1);
      } catch (err) {
        console.error('Failed to fetch vehicles:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [category, fuelType, transmission, seats, maxPrice, debouncedSearch, startDate, endDate, sortBy]
  );

  useEffect(() => {
    fetchVehicles(false);
  }, [fetchVehicles]);

  // Real-time synchronization when vehicle catalog, images, or discounts change
  useRealtime(['vehicles', 'vehicle_images', 'discounts'], () => {
    fetchVehicles(true);
  });

  const handleResetFilters = () => {
    setCategory('');
    setFuelType('');
    setTransmission('');
    setSeats('');
    setMaxPrice('10000');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setSortBy('price_asc');
  };

  // Pagination slice
  const totalPages = Math.ceil(vehicles.length / itemsPerPage);
  const paginatedVehicles = vehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Explore Fleet</h1>
          <p className="text-xs text-slate-400 mt-1">
            Showing {vehicles.length} verified Indian rental vehicles with instant reservation
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Swift, City, Thar..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR FILTERS */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 h-fit space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-sm font-bold text-white">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <span>Filter Fleet</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury'].map((cat) => {
                const isSelected = (cat === 'All' && !category) || category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat === 'All' ? '' : cat)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fuel Type */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Fuel Type</label>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Petrol', 'Diesel', 'CNG', 'Hybrid'].map((fuel) => {
                const isSelected = (fuel === 'All' && !fuelType) || fuelType === fuel;
                return (
                  <button
                    key={fuel}
                    onClick={() => setFuelType(fuel === 'All' ? '' : fuel)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {fuel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transmission */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Transmission</label>
            <div className="grid grid-cols-2 gap-2">
              {['Manual', 'Automatic'].map((trans) => {
                const isSelected = transmission === trans;
                return (
                  <button
                    key={trans}
                    onClick={() => setTransmission(isSelected ? '' : trans)}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {trans}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seats */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Minimum Seats</label>
            <div className="grid grid-cols-3 gap-2">
              {[4, 5, 7].map((num) => {
                const isSelected = seats === String(num);
                return (
                  <button
                    key={num}
                    onClick={() => setSeats(isSelected ? '' : String(num))}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {num}+ Seats
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Max Daily Rate</label>
              <span className="text-xs font-bold text-indigo-400">Rs. {maxPrice}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full accent-indigo-500 bg-slate-950 cursor-pointer"
            />
          </div>

          {/* Date range availability filter */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Availability Dates</label>
            <div>
              <span className="text-[10px] text-slate-400">Pick-Up</span>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 mt-0.5"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Return</span>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* VEHICLE LISTING GRID */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : paginatedVehicles.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
              <Car className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No vehicles match your search criteria</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try widening your price range or clearing category filters to view available fleet.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedVehicles.map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className={`glass-card rounded-2xl overflow-hidden border bg-slate-900/70 flex flex-col group transition-all duration-300 ${
                      recentlyUpdatedIds.has(vehicle.vehicle_id)
                        ? 'live-updated-flash ring-2 ring-indigo-500 border-indigo-400'
                        : 'border-slate-800/80'
                    }`}
                  >
                    {/* Vehicle Image */}
                    <div className="relative h-48 bg-slate-950 overflow-hidden">
                      <img
                        src={vehicle.image_url || '/vehicles/placeholder.jpg'}
                        alt={vehicle.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      {/* Category & Status badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white border border-slate-700">
                          {vehicle.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md border ${
                            vehicle.status === 'Available'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                              : vehicle.status === 'Rented'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                              : 'bg-rose-950/80 text-rose-300 border-rose-600/40'
                          }`}
                        >
                          {vehicle.status}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-400 border border-slate-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{vehicle.avg_rating || '5.0'}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {vehicle.brand} {vehicle.name}
                        </h3>

                        {/* Specs row */}
                        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                          <span>{vehicle.fuel_type}</span>
                          <span>•</span>
                          <span>{vehicle.transmission}</span>
                          <span>•</span>
                          <span>{vehicle.seats} Seats</span>
                        </div>

                        {/* Pricing tiers */}
                        <div className="mt-4 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] grid grid-cols-3 text-center">
                          <div>
                            <span className="text-slate-500 block">Daily</span>
                            <span className="font-bold text-slate-200">Rs. {vehicle.price_per_day}</span>
                          </div>
                          <div className="border-x border-slate-800">
                            <span className="text-slate-500 block">Hourly</span>
                            <span className="font-bold text-slate-200">Rs. {vehicle.price_per_hour}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Per KM</span>
                            <span className="font-bold text-slate-200">Rs. {vehicle.price_per_km}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">Security Deposit</span>
                          <span className="text-xs font-bold text-slate-300">Rs. {vehicle.security_deposit}</span>
                        </div>

                        <Link
                          to={`/vehicles/${vehicle.vehicle_id}`}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1"
                        >
                          <span>Reserve</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 pt-6">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
