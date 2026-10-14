import React from 'react';
import { Link } from 'react-router-dom';
import { Car, ShieldCheck, Clock, Headphones, Award, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Value props strip */}
      <div className="border-b border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Zero Double Bookings</h4>
                <p className="text-xs text-slate-400">Guaranteed real-time availability</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Instant Digital Pickup</h4>
                <p className="text-xs text-slate-400">Paperless check-in in under 2 mins</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Inspected & Sanitized</h4>
                <p className="text-xs text-slate-400">Continuous fleet maintenance audits</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">24/7 Roadside Assistance</h4>
                <p className="text-xs text-slate-400">Direct concierge: +91 70168 70683</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Car className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Fleet<span className="text-indigo-400">Rentals</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Enterprise vehicle rental & fleet management system. Automating the full rental lifecycle from booking, payments, condition checklist inspections, to transparent digital invoices.
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>📍 Headquarters: Swami Bhavan, SVNIT, Surat, Gujarat - 395007</p>
              <p>
                📞 Phone:{' '}
                <a href="tel:+917016870683" className="hover:text-indigo-400 transition font-medium">
                  +91 70168 70683
                </a>{' '}
                | ✉️{' '}
                <a href="mailto:support@rentfleet.in" className="hover:text-indigo-400 transition font-medium">
                  support@rentfleet.in
                </a>
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Fleet Categories</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/vehicles?category=HATCHBACK" className="hover:text-white transition">Hatchbacks (Swift, Tiago, Alto)</Link></li>
              <li><Link to="/vehicles?category=SEDAN" className="hover:text-white transition">Executive Sedans (Dzire, Amaze)</Link></li>
              <li><Link to="/vehicles?category=SUV" className="hover:text-white transition">SUVs & 4x4 (Nexon, Thar, Scorpio-N)</Link></li>
              <li><Link to="/vehicles?category=MUV" className="hover:text-white transition">MUV / Family (Innova Crysta, Ertiga)</Link></li>
              <li><Link to="/vehicles?category=LUXURY_TAXI" className="hover:text-amber-400 transition font-semibold">⭐ Luxury Taxi (Mercedes E-Class)</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Operational Hubs</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-400">Surat Ring Road Hub (SVNIT Surat)</span></li>
              <li><span className="text-slate-400">Ahmedabad Airport Terminal (AMD)</span></li>
              <li><span className="text-slate-400">Mumbai BKC Executive Station (BOM)</span></li>
              <li><span className="text-slate-400">Pune Hinjewadi Tech Hub (PNQ)</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">System Portals</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/login" className="hover:text-white transition">Customer Sign In</Link></li>
              <li><Link to="/staff/operations" className="hover:text-white transition">Staff Terminal</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-white transition">Fleet Operator Command</Link></li>
              <li><Link to="/support" className="hover:text-white transition">Help & Support Desk</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} FleetRentals System Inc. All rights reserved.</p>
          <p className="flex items-center space-x-1 mt-2 sm:mt-0">
            <span>Built with precision for modern fleet logistics</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
