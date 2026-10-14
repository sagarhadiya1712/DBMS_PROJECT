import React, { useState, useEffect } from 'react';
import { Tag, Plus, Percent, Calendar, Sparkles, X, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function PricingRulesPage() {
  const [rules, setRules] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Promo modal
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(15);
  const [maxDiscount, setMaxDiscount] = useState(1000);
  const [minAmount, setMinAmount] = useState(2000);
  const [validUntil, setValidUntil] = useState('2026-12-31');
  const [description, setDescription] = useState('');
  const [submittingPromo, setSubmittingPromo] = useState(false);

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      const [rulesRes, promosRes] = await Promise.all([
        api.get('/pricing/rules'),
        api.get('/pricing/promos'),
      ]);
      if (rulesRes.data.success) setRules(rulesRes.data.data);
      if (promosRes.data.success) setPromos(promosRes.data.data);
    } catch (e) {
      console.error('Failed to load pricing data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, []);

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    setSubmittingPromo(true);
    try {
      const res = await api.post('/pricing/promos', {
        code: promoCode,
        discountPercent: Number(discountPercent),
        maxDiscount: Number(maxDiscount),
        minBookingAmount: Number(minAmount),
        validUntil,
        description,
      });
      if (res.data.success) {
        setShowPromoModal(false);
        setPromoCode('');
        setDescription('');
        fetchPricingData();
      }
    } catch (err) {
      alert('Error creating promo: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingPromo(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Revenue Optimization</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Dynamic Pricing & Promo Engine</h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure automated duration discounts, weekend demand surges, and promotional coupon codes.
          </p>
        </div>

        <button
          onClick={() => setShowPromoModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Promo Code</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dynamic Rules Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Active Fleet Pricing Rules</h3>
              <p className="text-xs text-slate-600">Surge multipliers and duration discounts</p>
            </div>
          </div>

          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">{r.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div>
                    <span>Weekly Discount: </span>
                    <strong className="text-slate-900">{Math.round((1 - r.weeklyMultiplier) * 100)}% Off</strong>
                  </div>
                  <div>
                    <span>Weekend Surge: </span>
                    <strong className="text-slate-900">+{Math.round((r.weekendMultiplier - 1) * 100)}%</strong>
                  </div>
                  {r.category && (
                    <div>
                      <span>Category Scope: </span>
                      <strong className="text-slate-900">{r.category}</strong>
                    </div>
                  )}
                  {r.seasonalMultiplier > 1 && (
                    <div>
                      <span>Seasonal Multiplier: </span>
                      <strong className="text-indigo-600">{r.seasonalMultiplier}x</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promo Codes Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Promotional Codes ({promos.length})</h3>
              <p className="text-xs text-slate-600">Customer marketing & coupon redemption</p>
            </div>
          </div>

          <div className="space-y-3">
            {promos.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                    {p.code}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    {p.discountPercent}% Off
                  </span>
                </div>
                <p className="text-xs text-slate-600">{p.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                  <span>Cap: {p.maxDiscount ? formatCurrency(p.maxDiscount) : 'None'} • Min: {formatCurrency(p.minBookingAmount)}</span>
                  <span>Used: {p.timesUsed} / {p.usageLimit || '∞'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Promo Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Create Promo Voucher</h3>
              <button onClick={() => setShowPromoModal(false)} className="text-slate-600 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FLASH25"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Booking (₹)</label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 20% discount on autumn weekend getaways"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPromo}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submittingPromo ? 'Creating...' : 'Create Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
