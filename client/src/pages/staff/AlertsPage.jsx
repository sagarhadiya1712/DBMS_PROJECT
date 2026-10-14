import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Calendar, CheckCircle2, FileText, Wrench } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function AlertsPage() {
  const [expiringDocuments, setExpiringDocuments] = useState([]);
  const [pendingMaintenance, setPendingMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/maintenance/alerts');
        if (res.data.success) {
          setExpiringDocuments(res.data.data.expiringDocuments || []);
          setPendingMaintenance(res.data.data.pendingMaintenance || []);
        }
      } catch (e) {
        console.error('Failed to load alerts:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Compliance & Health</span>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Fleet Expiration & Service Alerts</h1>
        <p className="text-sm text-slate-600 mt-1">
          Automated scans continuously check for upcoming registration renewals, insurance expirations, and scheduled maintenance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expiring Documents Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Document Expirations ({expiringDocuments.length})
              </h3>
              <p className="text-xs text-slate-600">Insurance & registration compliance</p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-600">Checking documents...</div>
          ) : expiringDocuments.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-600 font-semibold flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>All vehicle policies & documents are up to date!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringDocuments.map((doc) => {
                const now = new Date();
                const expiry = new Date(doc.expiryDate);
                const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                const isUrgent = daysRemaining <= 7;

                return (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      isUrgent
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs uppercase">{doc.documentType}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white shadow-sm">
                          {doc.vehicle?.licensePlate}
                        </span>
                      </div>
                      <p className="text-xs font-semibold">
                        {doc.vehicle?.make} {doc.vehicle?.model}
                      </p>
                      <p className="text-[11px] opacity-80">
                        Expires: {formatDate(expiry)} ({daysRemaining} days left)
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                        isUrgent ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {isUrgent ? 'URGENT' : 'RENEWAL DUE'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Maintenance Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Scheduled Maintenance Due ({pendingMaintenance.length})
              </h3>
              <p className="text-xs text-slate-600">Pending mechanical inspections</p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-600">Checking maintenance queue...</div>
          ) : pendingMaintenance.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-600 font-semibold flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>No pending maintenance records flagged!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMaintenance.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900">{m.serviceType}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200">
                        {m.vehicle?.licensePlate}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      {m.vehicle?.make} {m.vehicle?.model}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Date: {formatDate(m.scheduledDate)} • Est: {formatCurrency(m.cost)}
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
