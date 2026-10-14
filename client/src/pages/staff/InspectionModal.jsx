import React, { useState } from 'react';
import {
  ClipboardCheck,
  Fuel,
  Gauge,
  AlertTriangle,
  X,
  Camera,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function InspectionModal({ booking, type, onClose, onSuccess }) {
  const isPickup = type === 'PICKUP';

  const [odometer, setOdometer] = useState(booking.vehicle?.mileage || 10000);
  const [fuelLevel, setFuelLevel] = useState(100);
  const [damageNotes, setDamageNotes] = useState('');
  const [damageCharge, setDamageCharge] = useState(0);

  // Condition checklist
  const [checklist, setChecklist] = useState({
    tires: true,
    exterior: true,
    interior: true,
    documents: true,
    spareTire: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate prospective late fee
  const now = new Date();
  const endDate = new Date(booking.endDateTime);
  let calculatedLateFee = 0;
  if (!isPickup && now > endDate) {
    const overdueHours = Math.ceil((now - endDate) / (1000 * 60 * 60));
    calculatedLateFee = overdueHours * 250.0;
  }

  // Calculate prospective fuel fee
  let calculatedFuelFee = 0;
  if (!isPickup && fuelLevel < 100) {
    calculatedFuelFee = Math.round((100 - fuelLevel) * 15 * 100) / 100;
  }

  const totalCalculatedAdditional =
    calculatedLateFee + calculatedFuelFee + Number(damageCharge || 0);

  const toggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        bookingId: booking.id,
        type,
        odometerReading: Number(odometer),
        fuelLevel: Number(fuelLevel),
        checklist,
        damageNotes,
        damageCharge: Number(damageCharge || 0),
      };

      const res = await api.post('/inspections', payload);

      if (res.data.success) {
        alert(
          `${isPickup ? 'Pickup Check-out' : 'Return Check-in'} completed successfully!`
        );
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Inspection failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${
                isPickup ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {isPickup ? 'Pickup Inspection (Check-Out)' : 'Return Inspection (Check-In)'}
              </h3>
              <p className="text-xs text-slate-600">
                {booking.vehicle?.make} {booking.vehicle?.model} ({booking.vehicle?.licensePlate})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-800 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Odometer & Fuel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                <span>Odometer (KM)</span>
              </label>
              <input
                type="number"
                required
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Fuel className="w-3.5 h-3.5 text-indigo-600" />
                <span>Fuel Gauge: {fuelLevel}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-2"
              />
            </div>
          </div>

          {/* Condition Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Physical Condition Verification Checklist
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.tires}
                  onChange={() => toggleCheck('tires')}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Tires & Tread Pressure</span>
              </label>
              <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.exterior}
                  onChange={() => toggleCheck('exterior')}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Exterior Bodywork Free of Dents</span>
              </label>
              <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.interior}
                  onChange={() => toggleCheck('interior')}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Cabin Clean & Sanitized</span>
              </label>
              <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.documents}
                  onChange={() => toggleCheck('documents')}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Registration & Insurance Card</span>
              </label>
            </div>
          </div>

          {/* Damage & Additional Fees (Return Mode) */}
          {!isPickup && (
            <div className="space-y-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <h4 className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Return Penalty & Discrepancy Calculator</span>
              </h4>

              <div className="text-xs space-y-1.5 text-amber-800">
                <div className="flex justify-between">
                  <span>Overdue Return Late Fee:</span>
                  <span className="font-bold">{formatCurrency(calculatedLateFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fuel Refill Charge ({fuelLevel}%):</span>
                  <span className="font-bold">{formatCurrency(calculatedFuelFee)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Damage Recovery Surcharge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={damageCharge}
                  onChange={(e) => setDamageCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-amber-300 bg-white"
                />
              </div>

              <div className="pt-2 border-t border-amber-200 flex justify-between text-xs font-extrabold text-amber-950">
                <span>Total Additional Billing:</span>
                <span>{formatCurrency(totalCalculatedAdditional)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Staff Notes / Condition Remarks
            </label>
            <textarea
              rows={2}
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="Note any scratches, interior stains, or observations..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 py-3 rounded-xl text-white text-xs font-bold shadow-lg transition disabled:opacity-50 ${
                isPickup
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              }`}
            >
              {submitting
                ? 'Processing...'
                : isPickup
                ? 'Complete Check-Out (Release Car)'
                : 'Complete Return & Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
