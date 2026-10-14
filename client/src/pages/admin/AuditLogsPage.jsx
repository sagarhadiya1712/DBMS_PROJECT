import React, { useState, useEffect } from 'react';
import { Shield, Clock, Search, User, Activity } from 'lucide-react';
import api from '../../services/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (e) {
        console.error('Failed to load audit logs:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.entity.toLowerCase().includes(term) ||
      l.actor?.firstName?.toLowerCase().includes(term) ||
      l.actor?.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Security & Compliance</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">System Audit Logs</h1>
          <p className="text-sm text-slate-600 mt-1">
            Immutable log trail of all administrative actions, financial settlements, fleet modifications, and security events.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or actor..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Actor</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Target Entity</th>
                <th className="py-4 px-6">IP / Agent</th>
                <th className="py-4 px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-600">Loading audit records...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-600">No audit logs matching search.</td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      {l.actor ? (
                        <div>
                          <strong className="text-slate-900 block font-bold">
                            {l.actor.firstName} {l.actor.lastName}
                          </strong>
                          <span className="text-[10px] text-slate-600">{l.actor.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">System (Daemon)</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {l.entity}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-[11px]">
                      {l.ipAddress}
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate text-slate-600 font-mono text-[11px]">
                      {l.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
