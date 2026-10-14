import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  User,
  Phone,
  MapPin,
  Mail,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // New ticket modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('BOOKING');
  const [priority, setPriority] = useState('MEDIUM');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);

  // Reply message
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/support');
      if (res.data.success) {
        setTickets(res.data.data);
        if (res.data.data.length > 0 && !selectedTicket) {
          setSelectedTicket(res.data.data[0]);
        } else if (selectedTicket) {
          const updated = res.data.data.find((t) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (e) {
      console.error('Failed to load tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/support', {
        subject,
        category,
        priority,
        message,
      });
      if (res.data.success) {
        setShowNewModal(false);
        setSubject('');
        setMessage('');
        fetchTickets();
      }
    } catch (err) {
      alert('Failed to submit ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const res = await api.post(`/support/${selectedTicket.id}/messages`, {
        text: replyText.trim(),
      });
      if (res.data.success) {
        setReplyText('');
        fetchTickets();
      }
    } catch (err) {
      alert('Reply failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      await api.put(`/support/${ticketId}/status`, { status });
      fetchTickets();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const messages = selectedTicket ? JSON.parse(selectedTicket.messages || '[]') : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Help Desk</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Customer Support Center</h1>
          <p className="text-sm text-slate-600 mt-1">
            24/7 dedicated fleet support for bookings, vehicle queries, billing, and emergencies.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* Quick Contact Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center space-x-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">24/7 Helpline</p>
            <a href="tel:+917016870683" className="text-sm font-bold text-slate-800 hover:text-indigo-600 transition">
              +91 70168 70683
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center space-x-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Headquarters</p>
            <p className="text-xs font-semibold text-slate-800">
              Swami Bhavan, SVNIT, Surat - 395007
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center space-x-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Concierge</p>
            <a href="mailto:support@rentfleet.in" className="text-xs font-bold text-slate-800 hover:text-indigo-600 transition">
              support@rentfleet.in
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tickets List */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-xs text-slate-600 uppercase tracking-wider px-2 py-1">
            Support Conversations ({tickets.length})
          </h3>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-600">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-600">No support tickets found.</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 rounded-2xl cursor-pointer transition border text-left ${
                    selectedTicket?.id === t.id
                      ? 'bg-indigo-50/70 border-indigo-200'
                      : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-indigo-600">
                      {t.ticketNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">{t.subject}</h4>
                  <div className="text-[10px] text-slate-600 mt-2 flex items-center justify-between">
                    <span>{t.category}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Ticket Thread */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {selectedTicket.ticketNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                      {selectedTicket.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Priority: {selectedTicket.priority}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{selectedTicket.subject}</h3>
                </div>

                {/* Status Toggle for staff/admin */}
                {(user?.role === 'STAFF' || user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                )}
              </div>

              {/* Messages Thread */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((m, idx) => {
                  const isMe = m.sender === user?.role?.toLowerCase();
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 mb-1">
                        <span className="font-bold text-slate-800">{m.senderName}</span>
                        <span>•</span>
                        <span>{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 flex items-center space-x-2 bg-white">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center space-x-1"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-600">
              Select a conversation to view details
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-fade-in">
            <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
              Open Support Ticket
            </h3>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Question about deposit refund"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="BOOKING">Booking & Dates</option>
                    <option value="PAYMENT">Payment & Refund</option>
                    <option value="VEHICLE_ISSUE">Vehicle Condition</option>
                    <option value="GENERAL">General Inquiries</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Details</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue with details..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
