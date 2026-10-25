import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Car,
  CalendarCheck,
  Users,
  UserCheck,
  Wrench,
  FileText,
  Tag,
  BarChart3,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  X,
  Banknote,
  CreditCard,
  CheckSquare,
  Building2,
  ShieldCheck
} from 'lucide-react';
import KYCTab from './KYCTab';
import VehicleApprovalsTab from './VehicleApprovalsTab';
import OwnersPayoutsTab from './OwnersPayoutsTab';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import api, { API_BASE_URL } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useRealtime } from '../../context/RealtimeContext';

export default function AdminPortal() {
  const { showToast } = useNotifications();

  // Active Sidebar Section
  const [activeSection, setActiveSection] = useState('dashboard');

  // ================= 1. DASHBOARD & STATS =================
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [revenueRange, setRevenueRange] = useState('daily');
  const [mostBooked, setMostBooked] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // ================= 2. VEHICLES =================
  const [vehicles, setVehicles] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    brand: '',
    category: 'Hatchback',
    fuel_type: 'Petrol',
    transmission: 'Manual',
    seats: 5,
    price_per_day: 2000,
    price_per_hour: 200,
    price_per_km: 15,
    security_deposit: 3000,
    status: 'Available',
    image_url: '',
    is_chauffeur_driven: 0,
    insurance_expiry: '',
    permit_expiry: '',
  });

  // ================= 3. BOOKINGS =================
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [collectCashModal, setCollectCashModal] = useState(null);
  const [collectingCash, setCollectingCash] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedBookingForReturn, setSelectedBookingForReturn] = useState(null);
  const [returnDate, setReturnDate] = useState('');
  const [extraFee, setExtraFee] = useState(0);

  // ================= 4. CUSTOMERS =================
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // ================= 5. DRIVERS =================
  const [drivers, setDrivers] = useState([]);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    license_no: '',
    vehicle_id: '',
  });

  // ================= 6. MAINTENANCE & FUEL =================
  const [maintenance, setMaintenance] = useState([]);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicle_id: '',
    service_date: new Date().toISOString().split('T')[0],
    cost: 3000,
    next_due_date: '',
    notes: '',
  });
  const [fuelRecords, setFuelRecords] = useState([]);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    litres: 30,
    cost: 3000,
  });

  // ================= 7. DOCUMENTS =================
  const [documents, setDocuments] = useState([]);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    vehicle_id: '',
    doc_type: 'Insurance Policy',
    file_url: '',
    expiry_date: '',
  });

  // ================= 8. PRICING & DISCOUNTS =================
  const [discounts, setDiscounts] = useState([]);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    code: '',
    percent: 10,
    valid_from: '',
    valid_to: '',
    active: 1,
  });

  // ================= 9. REPORTS =================
  const [idleVehicles, setIdleVehicles] = useState([]);
  const [customerReports, setCustomerReports] = useState([]);

  // Fetch Core Data
  const loadDashboardData = async () => {
    try {
      const [sRes, rRes, mbRes, aRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/reports/revenue?range=${revenueRange}`),
        api.get('/reports/most-booked'),
        api.get('/fleet/alerts'),
      ]);
      setStats(sRes.data);
      setRevenueData(rRes.data || []);
      setMostBooked(mbRes.data || []);
      setAlerts(aRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    }
  };

  const loadVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data || []);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await api.get('/bookings');
      setBookings(res.data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get('/users');
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await api.get('/fleet/drivers');
      setDrivers(res.data || []);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    }
  };

  const loadMaintenanceAndFuel = async () => {
    try {
      const [mRes, fRes] = await Promise.all([
        api.get('/fleet/maintenance'),
        api.get('/fleet/fuel'),
      ]);
      setMaintenance(mRes.data || []);
      setFuelRecords(fRes.data || []);
    } catch (err) {
      console.error('Failed to load maintenance/fuel:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await api.get('/fleet/documents');
      setDocuments(res.data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const loadDiscounts = async () => {
    try {
      const res = await api.get('/discounts');
      setDiscounts(res.data || []);
    } catch (err) {
      console.error('Failed to load discounts:', err);
    }
  };

  const loadReports = async () => {
    try {
      const [iRes, cRes] = await Promise.all([
        api.get('/reports/idle-vehicles'),
        api.get('/reports/customers'),
      ]);
      setIdleVehicles(iRes.data || []);
      setCustomerReports(cRes.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());

  // Function to refresh the currently active section
  const refreshActiveSection = async () => {
    try {
      switch (activeSection) {
        case 'dashboard':
          await loadDashboardData();
          break;
        case 'vehicles':
          await loadVehicles();
          break;
        case 'bookings':
          await loadBookings();
          break;
        case 'customers':
          await loadCustomers();
          break;
        case 'drivers':
          await loadDrivers();
          break;
        case 'maintenance':
          await loadMaintenanceAndFuel();
          break;
        case 'documents':
          await loadDocuments();
          break;
        case 'discounts':
          await loadDiscounts();
          break;
        case 'reports':
          await loadReports();
          break;
        default:
          await loadDashboardData();
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('Section refresh warning:', e);
    }
  };

  // Master refresh for entire database & dashboard
  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        loadDashboardData(),
        loadVehicles(),
        loadBookings(),
        loadCustomers(),
        loadDrivers(),
        loadMaintenanceAndFuel(),
        loadDocuments(),
        loadDiscounts(),
        loadReports(),
      ]);
      setLastSyncTime(new Date().toLocaleTimeString());
      showToast('All fleet data synchronized live from database!', 'success');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDashboardData();
    loadVehicles();
    loadBookings();
    loadCustomers();
    loadDrivers();
    loadMaintenanceAndFuel();
    loadDocuments();
    loadDiscounts();
    loadReports();
  }, []);

  // Immediate refresh whenever user switches active section
  useEffect(() => {
    refreshActiveSection();
  }, [activeSection]);

  // Real-time Database Synchronization across all tables
  useRealtime('*', (changedTables) => {
    const tableSet = new Set(changedTables);
    const has = (t) => tableSet.has('*') || tableSet.has(t);

    if (has('vehicles') || has('vehicle_images')) {
      loadVehicles();
      loadDashboardData();
    }
    if (has('bookings') || has('payments')) {
      loadBookings();
      loadDashboardData();
    }
    if (has('users') || has('kyc_documents')) {
      loadCustomers();
    }
    if (has('maintenance') || has('fuel_records')) {
      loadMaintenanceAndFuel();
      loadDashboardData();
    }
    if (has('vehicle_documents')) {
      loadDocuments();
      loadDashboardData();
    }
    if (has('discounts')) {
      loadDiscounts();
    }
    if (has('drivers')) {
      loadDrivers();
    }

    // Always ensure currently visible section reflects newest data immediately
    refreshActiveSection();
    setLastSyncTime(new Date().toLocaleTimeString());
  });

  // Reload revenue chart when toggle daily/monthly changes
  useEffect(() => {
    api.get(`/reports/revenue?range=${revenueRange}`).then((res) => {
      setRevenueData(res.data || []);
    });
  }, [revenueRange]);

  // ================= VEHICLE ACTIONS =================
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({
      name: '',
      brand: '',
      category: 'Hatchback',
      fuel_type: 'Petrol',
      transmission: 'Manual',
      seats: 5,
      price_per_day: 2000,
      price_per_hour: 200,
      price_per_km: 15,
      security_deposit: 3000,
      status: 'Available',
      image_url: '',
      is_chauffeur_driven: 0,
      insurance_expiry: '',
      permit_expiry: '',
    });
    setVehicleModalOpen(true);
  };

  const handleOpenEditVehicle = (v) => {
    setEditingVehicle(v);
    setVehicleForm({
      name: v.name,
      brand: v.brand,
      category: v.category,
      fuel_type: v.fuel_type,
      transmission: v.transmission,
      seats: v.seats,
      price_per_day: v.price_per_day,
      price_per_hour: v.price_per_hour,
      price_per_km: v.price_per_km,
      security_deposit: v.security_deposit,
      status: v.status,
      image_url: v.image_url || '',
      is_chauffeur_driven: v.is_chauffeur_driven || 0,
      insurance_expiry: v.insurance_expiry || '',
      permit_expiry: v.permit_expiry || '',
    });
    setVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.vehicle_id}`, vehicleForm);
        showToast('Vehicle updated successfully.', 'success');
      } else {
        await api.post('/vehicles', vehicleForm);
        showToast('Vehicle added to fleet.', 'success');
      }
      setVehicleModalOpen(false);
      loadVehicles();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save vehicle.', 'error');
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle from the fleet?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      showToast('Vehicle deleted successfully.', 'success');
      loadVehicles();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete vehicle.', 'error');
    }
  };

  const handleUpdateVehicleStatus = async (id, status) => {
    try {
      await api.patch(`/vehicles/${id}/status`, { status });
      showToast(`Vehicle marked as ${status}.`, 'success');
      loadVehicles();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update vehicle status.', 'error');
    }
  };

  // ================= BOOKING ACTIONS =================
  const handleApproveBooking = async (id) => {
    try {
      await api.patch(`/bookings/${id}/approve`);
      showToast(`Booking #${id} approved!`, 'success');
      loadBookings();
      loadVehicles();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Approval failed.', 'error');
    }
  };

  const handleRejectBooking = async (id) => {
    if (!window.confirm(`Reject booking #${id} and trigger refund?`)) return;
    try {
      await api.patch(`/bookings/${id}/reject`);
      showToast(`Booking #${id} rejected and refunded.`, 'success');
      loadBookings();
      loadVehicles();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Rejection failed.', 'error');
    }
  };

  const openReturnModal = (b) => {
    setSelectedBookingForReturn(b);
    setReturnDate(new Date().toISOString().slice(0, 16));
    setExtraFee(0);
    setReturnModalOpen(true);
  };

  const handleCompleteReturn = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/bookings/${selectedBookingForReturn.booking_id}/complete`, {
        actual_return_datetime: new Date(returnDate).toISOString(),
        extra_fee: Number(extraFee) || 0,
      });
      showToast(`Vehicle returned. Late fee: Rs. ${res.data.late_fee || 0}`, 'success');
      setReturnModalOpen(false);
      loadBookings();
      loadVehicles();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to mark return.', 'error');
    }
  };

  const handleConfirmCollectCash = async () => {
    if (!collectCashModal) return;
    setCollectingCash(true);
    try {
      await api.patch(`/admin/payments/${collectCashModal.payment_id}/collect-cash`);
      showToast(`Cash collected for Booking #${collectCashModal.booking_id}! Payment marked as Paid.`, 'success');
      setCollectCashModal(null);
      loadBookings();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to record cash collection.', 'error');
    } finally {
      setCollectingCash(false);
    }
  };

  // ================= CUSTOMER ACTIONS =================
  const handleToggleBlock = async (id) => {
    try {
      const res = await api.patch(`/users/${id}/block`);
      showToast(res.data.message, 'success');
      loadCustomers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update user status.', 'error');
    }
  };

  // ================= DRIVER ACTIONS =================
  const handleSaveDriver = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await api.put(`/fleet/drivers/${editingDriver.driver_id}`, driverForm);
        showToast('Driver updated.', 'success');
      } else {
        await api.post('/fleet/drivers', driverForm);
        showToast('Driver registered.', 'success');
      }
      setDriverModalOpen(false);
      loadDrivers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save driver.', 'error');
    }
  };

  const handleDeleteDriver = async (id) => {
    if (!window.confirm('Delete this driver?')) return;
    try {
      await api.delete(`/fleet/drivers/${id}`);
      showToast('Driver removed.', 'success');
      loadDrivers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete driver.', 'error');
    }
  };

  // ================= MAINTENANCE & FUEL =================
  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fleet/maintenance', maintenanceForm);
      showToast('Maintenance service logged.', 'success');
      setMaintenanceModalOpen(false);
      loadMaintenanceAndFuel();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to log maintenance.', 'error');
    }
  };

  const handleSaveFuel = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fleet/fuel', fuelForm);
      showToast('Fuel expenditure recorded.', 'success');
      setFuelModalOpen(false);
      loadMaintenanceAndFuel();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to log fuel record.', 'error');
    }
  };

  // ================= DOCUMENTS ACTIONS =================
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fleet/documents', docForm);
      showToast('Document uploaded & recorded.', 'success');
      setDocModalOpen(false);
      loadDocuments();
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save document.', 'error');
    }
  };

  // ================= DISCOUNT ACTIONS =================
  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/discounts', discountForm);
      showToast('Discount promo created.', 'success');
      setDiscountModalOpen(false);
      loadDiscounts();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save discount.', 'error');
    }
  };

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('Delete this discount code?')) return;
    try {
      await api.delete(`/discounts/${id}`);
      showToast('Discount deleted.', 'success');
      loadDiscounts();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete discount.', 'error');
    }
  };

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard },
    { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck, count: stats?.pending_kyc || 0, alert: (stats?.pending_kyc || 0) > 0 },
    { id: 'approvals', label: 'Vehicle Approvals', icon: CheckSquare, count: stats?.pending_vehicle_approvals || 0, alert: (stats?.pending_vehicle_approvals || 0) > 0 },
    { id: 'owners', label: 'Owners & Payouts', icon: Building2, count: stats?.pending_payouts || 0, alert: (stats?.pending_payouts || 0) > 0 },
    { id: 'vehicles', label: 'Fleet Vehicles', icon: Car, count: vehicles.length },
    { id: 'bookings', label: 'Reservations', icon: CalendarCheck, count: bookings.length },
    { id: 'customers', label: 'Customers', icon: Users, count: customers.length },
    { id: 'drivers', label: 'Chauffeur Staff', icon: UserCheck, count: drivers.length },
    { id: 'maintenance', label: 'Maintenance & Fuel', icon: Wrench },
    { id: 'documents', label: 'Compliance & Docs', icon: FileText, alert: alerts.length > 0 },
    { id: 'discounts', label: 'Pricing & Promos', icon: Tag },
    { id: 'reports', label: 'Reports & Export', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 shrink-0 p-4 space-y-6">
        <div className="px-3 py-2">
          <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
            Operator Console
          </div>
          <h2 className="text-lg font-black text-white tracking-tight mt-0.5">Fleet Command</h2>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.alert && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
                {item.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-indigo-900 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto space-y-8">
        {/* Global Live Data Sync Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-md">
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-200">Live Database Sync</span>
            <span className="text-[11px] text-emerald-400 font-mono font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">8s Auto-Refresh</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">• Synced at: {lastSyncTime}</span>
          </div>
          <button
            onClick={refreshAllData}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live Data'}</span>
          </button>
        </div>

        {/* ================= SECTION 1: DASHBOARD ================= */}
        {activeSection === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Fleet Analytics & KPIs</h1>
                <p className="text-xs text-slate-400 mt-1">Live operational metrics and upcoming deadlines</p>
              </div>
              <button
                onClick={loadDashboardData}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Fleet</span>
                <span className="text-2xl font-black text-white mt-1 block">{stats?.total_vehicles || 0}</span>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Available</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats?.available_vehicles || 0}</span>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Rented Out</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block">{stats?.rented_vehicles || 0}</span>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block">Today's Bookings</span>
                <span className="text-2xl font-black text-indigo-400 mt-1 block">{stats?.todays_bookings || 0}</span>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-[10px] uppercase font-bold text-violet-400 block">Total Revenue</span>
                <span className="text-xl font-black text-violet-400 mt-1 block">Rs. {Number(stats?.total_revenue || 0).toLocaleString('en-IN')}</span>
              </div>

              {/* Actionable Pipeline Cards */}
              <button
                onClick={() => setActiveSection('kyc')}
                className="text-left glass-card p-4 rounded-2xl border border-indigo-500/40 bg-indigo-950/20 hover:border-indigo-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">Pending KYC</span>
                  {(stats?.pending_kyc || 0) > 0 && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />}
                </div>
                <span className="text-2xl font-black text-indigo-300 mt-1 block">{stats?.pending_kyc || 0}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Identity verification requests</span>
              </button>

              <button
                onClick={() => setActiveSection('approvals')}
                className="text-left glass-card p-4 rounded-2xl border border-violet-500/40 bg-violet-950/20 hover:border-violet-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-violet-300 block">Vehicle Approvals</span>
                  {(stats?.pending_vehicle_approvals || 0) > 0 && <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />}
                </div>
                <span className="text-2xl font-black text-violet-300 mt-1 block">{stats?.pending_vehicle_approvals || 0}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Owner listings awaiting review</span>
              </button>

              <button
                onClick={() => setActiveSection('owners')}
                className="text-left glass-card p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">Pending Payouts</span>
                  {(stats?.pending_payouts || 0) > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                </div>
                <span className="text-2xl font-black text-emerald-300 mt-1 block">{stats?.pending_payouts || 0}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Owner settlements pending</span>
              </button>

              <div className="glass-card p-4 rounded-2xl border border-amber-500/40 bg-amber-950/20 col-span-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Pending COD Collection</span>
                <span className="text-xl font-black text-amber-400 mt-1 block">Rs. {Number(stats?.pending_cod_collection || 0).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{stats?.pending_cod_count || 0} pending orders awaiting cash pickup</span>
              </div>
            </div>

            {/* ALERTS PANEL (15 Days Deadline) */}
            {alerts.length > 0 && (
              <div className="glass-card p-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                <div className="flex items-center space-x-2 text-amber-300">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Administrative Alerts: Expiring Within 15 Days ({alerts.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {alerts.map((alert, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between items-center font-bold text-white">
                        <span>{alert.brand} {alert.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${alert.days_remaining <= 0 ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'}`}>
                          {alert.days_remaining <= 0 ? 'Expired' : `${alert.days_remaining}d left`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {alert.alert_type} Deadline: {alert.expiry_date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REVENUE LINE CHART & MOST BOOKED BAR CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Trend */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-sm font-bold text-white">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Revenue Trend (INR)</span>
                  </div>
                  <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                    <button
                      onClick={() => setRevenueRange('daily')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${revenueRange === 'daily' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setRevenueRange('monthly')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${revenueRange === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="period" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Most-Booked Vehicles Bar Chart */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                <div className="flex items-center space-x-2 text-sm font-bold text-white">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                  <span>Most Booked Fleet Assets</span>
                </div>

                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostBooked.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} interval={0} angle={-15} textAnchor="end" />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                      />
                      <Bar dataKey="booking_count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Completed Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: VEHICLES ================= */}
        {activeSection === 'vehicles' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Fleet Asset Management</h1>
                <p className="text-xs text-slate-400 mt-1">Add, update specifications, and change operational statuses</p>
              </div>
              <button
                onClick={handleOpenAddVehicle}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Vehicle</span>
              </button>
            </div>

            {/* Filter Search */}
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search fleet by model or brand..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
              />
            </div>

            {/* Vehicles Table */}
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Specs</th>
                      <th className="py-3 px-4">Daily Rate</th>
                      <th className="py-3 px-4">Deposit</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {vehicles
                      .filter((v) =>
                        `${v.brand} ${v.name}`.toLowerCase().includes(vehicleSearch.toLowerCase())
                      )
                      .map((v) => (
                        <tr key={v.vehicle_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={v.image_url || '/vehicles/placeholder.jpg'}
                                alt={v.name}
                                className="w-10 h-10 rounded-lg object-cover bg-slate-950 border border-slate-800"
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
                                }}
                              />
                              <div>
                                <span className="font-bold text-white block">{v.brand} {v.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">ID: #{v.vehicle_id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-300">{v.category}</span>
                            {v.is_chauffeur_driven === 1 && (
                              <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded ml-2">
                                Chauffeur
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {v.fuel_type} • {v.transmission} • {v.seats}s
                          </td>
                          <td className="py-3 px-4 font-bold text-indigo-400">Rs. {v.price_per_day}</td>
                          <td className="py-3 px-4 text-slate-300">Rs. {v.security_deposit}</td>
                          <td className="py-3 px-4">
                            <select
                              value={v.status}
                              onChange={(e) => handleUpdateVehicleStatus(v.vehicle_id, e.target.value)}
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                                v.status === 'Available'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                                  : v.status === 'Rented'
                                  ? 'bg-amber-950 text-amber-300 border-amber-600/40'
                                  : 'bg-rose-950 text-rose-300 border-rose-600/40'
                              }`}
                            >
                              <option value="Available">Available</option>
                              <option value="Rented">Rented</option>
                              <option value="In Service">In Service</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleOpenEditVehicle(v)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title="Edit Vehicle"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteVehicle(v.vehicle_id)}
                                className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 hover:text-white"
                                title="Delete Vehicle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 3: BOOKINGS ================= */}
        {activeSection === 'bookings' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Customer Reservations</h1>
                <p className="text-xs text-slate-400 mt-1">Approve orders, collect COD cash payments, and handle vehicle return check-ins</p>
              </div>

              {/* Status & Payment Filters */}
              <div className="flex flex-wrap gap-2 text-xs">
                {/* Status Filter */}
                <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {['', 'Confirmed', 'Pending', 'Approved', 'Active', 'Completed', 'Cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setBookingFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] ${
                        bookingFilter === st
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st || 'All Status'}
                    </button>
                  ))}
                </div>

                {/* Payment Filter */}
                <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {[
                    { label: 'All Payments', val: '' },
                    { label: 'COD', val: 'COD' },
                    { label: 'Online', val: 'Online' },
                    { label: 'Pending Cash', val: 'Pending Cash' },
                  ].map((pf) => (
                    <button
                      key={pf.val}
                      onClick={() => setPaymentFilter(pf.val)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] ${
                        paymentFilter === pf.val
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {pf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Booking</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Schedule</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bookings
                      .filter((b) => {
                        const statusMatch = !bookingFilter || b.status === bookingFilter;
                        if (!statusMatch) return false;
                        if (paymentFilter === 'COD') return b.payment_method === 'COD';
                        if (paymentFilter === 'Online') return b.payment_method === 'ONLINE';
                        if (paymentFilter === 'Pending Cash') return b.payment_method === 'COD' && b.payment_status === 'Pending';
                        return true;
                      })
                      .map((b) => (
                        <tr key={b.booking_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white">#{b.booking_id}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{b.customer_name}</span>
                            <span className="text-[10px] text-slate-400">{b.customer_email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200">{b.vehicle_brand} {b.vehicle_name}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            <div>{new Date(b.start_datetime).toLocaleDateString('en-IN')}</div>
                            <div className="text-[10px] text-slate-500">to {new Date(b.end_datetime).toLocaleDateString('en-IN')}</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-indigo-400">Rs. {b.total_amount + (b.late_fee || 0)}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                b.status === 'Completed'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                                  : b.status === 'Confirmed'
                                  ? 'bg-teal-950 text-teal-300 border-teal-600/40'
                                  : b.status === 'Approved' || b.status === 'Active'
                                  ? 'bg-indigo-950 text-indigo-300 border-indigo-600/40'
                                  : b.status === 'Pending'
                                  ? 'bg-amber-950 text-amber-300 border-amber-600/40'
                                  : 'bg-rose-950 text-rose-300 border-rose-600/40'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                              b.payment_method === 'COD'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-700/50'
                                : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/50'
                            }`}>
                              {b.payment_method === 'COD' ? <Banknote className="w-3 h-3 text-amber-400" /> : <CreditCard className="w-3 h-3 text-indigo-400" />}
                              <span>{b.payment_method === 'COD' ? 'COD' : 'Online'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              b.payment_status === 'Paid'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                                : b.payment_status === 'Pending'
                                ? 'bg-amber-950 text-amber-300 border-amber-600/40'
                                : b.payment_status === 'Refunded'
                                ? 'bg-slate-900 text-slate-300 border-slate-700'
                                : 'bg-rose-950 text-rose-300 border-rose-600/40'
                            }`}>
                              {b.payment_status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Mark Cash Received Button for Pending COD */}
                              {b.payment_method === 'COD' && b.payment_status === 'Pending' && (
                                <button
                                  onClick={() => setCollectCashModal(b)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center space-x-1 shadow-md shadow-emerald-600/20"
                                  title="Mark Cash Received from Customer"
                                >
                                  <Banknote className="w-3.5 h-3.5" />
                                  <span>Mark Cash Received</span>
                                </button>
                              )}

                              {b.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveBooking(b.booking_id)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectBooking(b.booking_id)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px]"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {(b.status === 'Approved' || b.status === 'Active' || b.status === 'Confirmed') && (
                                <button
                                  onClick={() => openReturnModal(b)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px]"
                                >
                                  Mark Returned
                                </button>
                              )}

                              <a
                                href={`${API_BASE_URL}/payments/invoice/${b.booking_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                                title="Download PDF Invoice"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 4: CUSTOMERS ================= */}
        {activeSection === 'customers' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Customer Directory</h1>
                <p className="text-xs text-slate-400 mt-1">Monitor registered users and toggle account access clearance</p>
              </div>
            </div>

            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search customers by name or email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
              />
            </div>

            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Email Status</th>
                      <th className="py-3 px-4">Total Bookings</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {customers
                      .filter((c) =>
                        `${c.name} ${c.email}`.toLowerCase().includes(customerSearch.toLowerCase())
                      )
                      .map((c) => (
                        <tr key={c.user_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{c.name}</span>
                            <span className="text-[10px] text-slate-400">{c.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-slate-800">
                              {c.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {c.is_verified ? (
                              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="text-amber-400 font-semibold">Unverified</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-200">{c.booking_count || 0}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.is_blocked ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'}`}>
                              {c.is_blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {c.role !== 'admin' && (
                              <button
                                onClick={() => handleToggleBlock(c.user_id)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                  c.is_blocked
                                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60'
                                    : 'bg-rose-950/60 text-rose-300 border border-rose-800 hover:bg-rose-900/60'
                                }`}
                              >
                                {c.is_blocked ? 'Unblock' : 'Block User'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 5: DRIVERS ================= */}
        {activeSection === 'drivers' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Chauffeur Roster</h1>
                <p className="text-xs text-slate-400 mt-1">Assign licensed chauffeurs to premium and luxury fleet vehicles</p>
              </div>
              <button
                onClick={() => {
                  setEditingDriver(null);
                  setDriverForm({ name: '', phone: '', license_no: '', vehicle_id: '' });
                  setDriverModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Chauffeur</span>
              </button>
            </div>

            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Driver Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">License Number</th>
                      <th className="py-3 px-4">Assigned Vehicle</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {drivers.map((d) => (
                      <tr key={d.driver_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{d.name}</td>
                        <td className="py-3 px-4 text-slate-300">{d.phone}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{d.license_no}</td>
                        <td className="py-3 px-4">
                          {d.vehicle_name ? (
                            <span className="font-bold text-amber-300">
                              {d.vehicle_brand} {d.vehicle_name}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned (Relief pool)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteDriver(d.driver_id)}
                            className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/50 text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 6: MAINTENANCE & FUEL ================= */}
        {activeSection === 'maintenance' && (
          <div className="space-y-8 animate-fade-in">
            {/* Maintenance records */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Periodic Maintenance Logs</h2>
                  <p className="text-xs text-slate-400">Track service dates, costs, and next checkup schedules</p>
                </div>
                <button
                  onClick={() => setMaintenanceModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Service</span>
                </button>
              </div>

              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Service Date</th>
                      <th className="py-3 px-4">Service Cost</th>
                      <th className="py-3 px-4">Next Due Date</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {maintenance.map((m) => (
                      <tr key={m.maintenance_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{m.vehicle_brand} {m.vehicle_name}</td>
                        <td className="py-3 px-4 text-slate-300">{m.service_date}</td>
                        <td className="py-3 px-4 font-bold text-rose-400">Rs. {m.cost}</td>
                        <td className="py-3 px-4 font-bold text-amber-400">{m.next_due_date || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{m.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fuel records */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Fuel Records</h2>
                  <p className="text-xs text-slate-400">Log refuels and diesel/petrol fleet expenses</p>
                </div>
                <button
                  onClick={() => setFuelModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Fuel Refill</span>
                </button>
              </div>

              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Quantity (Litres)</th>
                      <th className="py-3 px-4">Cost (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {fuelRecords.map((f) => (
                      <tr key={f.fuel_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{f.vehicle_brand} {f.vehicle_name}</td>
                        <td className="py-3 px-4 text-slate-300">{f.date}</td>
                        <td className="py-3 px-4 text-slate-200">{f.litres} L</td>
                        <td className="py-3 px-4 font-bold text-indigo-400">Rs. {f.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 7: DOCUMENTS & COMPLIANCE ================= */}
        {activeSection === 'documents' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Document Compliance</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Audit insurance, registration, and commercial permits with automated expiry color warnings
                </p>
              </div>
              <button
                onClick={() => setDocModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Document Record</span>
              </button>
            </div>

            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Compliance Status</th>
                    <th className="py-3 px-4">File Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {documents.map((d) => {
                    const daysRemaining = Math.ceil(
                      (new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    const isExpired = daysRemaining < 0;
                    const isUrgent = daysRemaining >= 0 && daysRemaining <= 15;

                    return (
                      <tr key={d.doc_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{d.vehicle_brand} {d.vehicle_name}</td>
                        <td className="py-3 px-4 text-slate-300">{d.doc_type}</td>
                        <td className="py-3 px-4 font-mono text-slate-200">{d.expiry_date || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isExpired
                                ? 'bg-rose-950 text-rose-300 border-rose-600/40'
                                : isUrgent
                                ? 'bg-amber-950 text-amber-300 border-amber-600/40'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                            }`}
                          >
                            {isExpired ? 'EXPIRED' : isUrgent ? 'EXPIRING SOON' : 'VALID'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={d.file_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline"
                          >
                            View Document
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= SECTION 8: PRICING & DISCOUNTS ================= */}
        {activeSection === 'discounts' && (
          <div className="space-y-8 animate-fade-in">
            {/* Promo Vouchers */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Promotional Voucher Codes</h2>
                  <p className="text-xs text-slate-400">Create discount coupons for customers during checkout</p>
                </div>
                <button
                  onClick={() => setDiscountModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Promo Code</span>
                </button>
              </div>

              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Coupon Code</th>
                      <th className="py-3 px-4">Discount %</th>
                      <th className="py-3 px-4">Validity Window</th>
                      <th className="py-3 px-4">Active</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {discounts.map((dc) => (
                      <tr key={dc.discount_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-400">{dc.code}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">{dc.percent}% Off</td>
                        <td className="py-3 px-4 text-slate-400">{dc.valid_from} to {dc.valid_to}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dc.active ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-950 text-slate-500'}`}>
                            {dc.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteDiscount(dc.discount_id)}
                            className="p-1 rounded-lg text-rose-400 hover:bg-rose-950"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fleet Price Table Quick View */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h2 className="text-xl font-bold text-white">Fleet Pricing Schedule</h2>
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Per Day Rate</th>
                      <th className="py-3 px-4">Per Hour Rate</th>
                      <th className="py-3 px-4">Per KM Rate</th>
                      <th className="py-3 px-4">Security Deposit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {vehicles.map((v) => (
                      <tr key={v.vehicle_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{v.brand} {v.name}</td>
                        <td className="py-3 px-4 font-bold text-indigo-400">Rs. {v.price_per_day}</td>
                        <td className="py-3 px-4 text-slate-200">Rs. {v.price_per_hour}</td>
                        <td className="py-3 px-4 text-slate-200">Rs. {v.price_per_km}</td>
                        <td className="py-3 px-4 font-bold text-slate-300">Rs. {v.security_deposit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 9: REPORTS & EXPORT ================= */}
        {activeSection === 'reports' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Executive Reports & Exports</h1>
                <p className="text-xs text-slate-400 mt-1">Export comprehensive analytics data to Excel or formatted PDF</p>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-3">
                <a
                  href={`${API_BASE_URL}/reports/export?type=excel`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export to Excel (.xlsx)</span>
                </a>
                <a
                  href={`${API_BASE_URL}/reports/export?type=pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export to PDF (.pdf)</span>
                </a>
              </div>
            </div>

            {/* Idle Vehicles Table */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">Idle Fleet (Zero / Low Bookings)</h3>
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Daily Rate</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Last Booked At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {idleVehicles.map((v) => (
                      <tr key={v.vehicle_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{v.brand} {v.name}</td>
                        <td className="py-3 px-4 text-slate-300">{v.category}</td>
                        <td className="py-3 px-4 font-bold text-indigo-400">Rs. {v.price_per_day}</td>
                        <td className="py-3 px-4 text-emerald-400">{v.status}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {v.last_booked_at ? new Date(v.last_booked_at).toLocaleDateString('en-IN') : 'Never booked'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Spend Table */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-base font-bold text-white">Top Customer Lifetime Value</h3>
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Completed Bookings</th>
                      <th className="py-3 px-4">Total Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {customerReports.map((c) => (
                      <tr key={c.user_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                        <td className="py-3 px-4 text-slate-300">{c.email}</td>
                        <td className="py-3 px-4 text-slate-400">{c.phone || 'N/A'}</td>
                        <td className="py-3 px-4 font-bold text-slate-200">{c.total_bookings}</td>
                        <td className="py-3 px-4 font-black text-emerald-400">Rs. {c.total_spent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: KYC VERIFICATION ================= */}
        {activeSection === 'kyc' && <KYCTab />}

        {/* ================= SECTION: VEHICLE APPROVALS ================= */}
        {activeSection === 'approvals' && <VehicleApprovalsTab />}

        {/* ================= SECTION: OWNERS & PAYOUTS ================= */}
        {activeSection === 'owners' && <OwnersPayoutsTab />}

        {/* ================= MODAL: ADD / EDIT VEHICLE ================= */}
        {vehicleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-2xl w-full glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">
                  {editingVehicle ? 'Edit Vehicle Specifications' : 'Add Vehicle to Fleet'}
                </h3>
                <button onClick={() => setVehicleModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Model Name</label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.name}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Brand</label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.brand}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Category</label>
                    <select
                      value={vehicleForm.category}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="Hatchback">Hatchback</option>
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="MUV">MUV</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Fuel Type</label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.fuel_type}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, fuel_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Transmission</label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.transmission}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, transmission: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Seats</label>
                    <input
                      type="number"
                      required
                      value={vehicleForm.seats}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, seats: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Price / Day (INR)</label>
                    <input
                      type="number"
                      required
                      value={vehicleForm.price_per_day}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, price_per_day: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Price / Hour</label>
                    <input
                      type="number"
                      required
                      value={vehicleForm.price_per_hour}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, price_per_hour: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Price / KM</label>
                    <input
                      type="number"
                      required
                      value={vehicleForm.price_per_km}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, price_per_km: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Security Deposit (INR)</label>
                    <input
                      type="number"
                      required
                      value={vehicleForm.security_deposit}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, security_deposit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Image URL</label>
                    <input
                      type="text"
                      placeholder="/vehicles/swift.jpg or https://..."
                      value={vehicleForm.image_url}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, image_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Insurance Expiry Date</label>
                    <input
                      type="date"
                      value={vehicleForm.insurance_expiry}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, insurance_expiry: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Permit Expiry Date</label>
                    <input
                      type="date"
                      value={vehicleForm.permit_expiry}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, permit_expiry: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider"
                >
                  Save Vehicle Specifications
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: MARK RETURNED / LATE FEE ================= */}
        {returnModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Check-In Vehicle Return</h3>
                <button onClick={() => setReturnModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCompleteReturn} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Actual Return Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Late Fee / Additional Penalty Charges (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={extraFee}
                    onChange={(e) => setExtraFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Leave as 0 to automatically compute overdue hourly fee if returned late.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
                >
                  Complete Return & Release Vehicle
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD DRIVER ================= */}
        {driverModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Add Licensed Chauffeur</h3>
                <button onClick={() => setDriverModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDriver} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">License Number</label>
                  <input
                    type="text"
                    required
                    value={driverForm.license_no}
                    onChange={(e) => setDriverForm({ ...driverForm, license_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Assigned Vehicle</label>
                  <select
                    value={driverForm.vehicle_id}
                    onChange={(e) => setDriverForm({ ...driverForm, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Unassigned (Relief pool)</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.brand} {v.name} ({v.category})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase"
                >
                  Save Chauffeur Record
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD MAINTENANCE ================= */}
        {maintenanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Log Periodic Maintenance</h3>
                <button onClick={() => setMaintenanceModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMaintenance} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Vehicle</label>
                  <select
                    required
                    value={maintenanceForm.vehicle_id}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>{v.brand} {v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Service Date</label>
                    <input
                      type="date"
                      required
                      value={maintenanceForm.service_date}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Cost (INR)</label>
                    <input
                      type="number"
                      required
                      value={maintenanceForm.cost}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Next Service Due Date</label>
                  <input
                    type="date"
                    value={maintenanceForm.next_due_date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Service Details / Work Done</label>
                  <textarea
                    rows={3}
                    value={maintenanceForm.notes}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase"
                >
                  Save Maintenance Log
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD FUEL RECORD ================= */}
        {fuelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Log Fuel Refill</h3>
                <button onClick={() => setFuelModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFuel} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Vehicle</label>
                  <select
                    required
                    value={fuelForm.vehicle_id}
                    onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>{v.brand} {v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Litres</label>
                    <input
                      type="number"
                      required
                      value={fuelForm.litres}
                      onChange={(e) => setFuelForm({ ...fuelForm, litres: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Total Cost (INR)</label>
                    <input
                      type="number"
                      required
                      value={fuelForm.cost}
                      onChange={(e) => setFuelForm({ ...fuelForm, cost: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase"
                >
                  Record Fuel Expense
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD DOCUMENT ================= */}
        {docModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Record Compliance Document</h3>
                <button onClick={() => setDocModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDocument} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Vehicle</label>
                  <select
                    required
                    value={docForm.vehicle_id}
                    onChange={(e) => setDocForm({ ...docForm, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>{v.brand} {v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Document Type</label>
                  <input
                    type="text"
                    required
                    placeholder="Insurance Policy / Commercial Permit / RC"
                    value={docForm.doc_type}
                    onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={docForm.expiry_date}
                    onChange={(e) => setDocForm({ ...docForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase"
                >
                  Save Document Record
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD DISCOUNT ================= */}
        {discountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Create Promo Coupon</h3>
                <button onClick={() => setDiscountModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDiscount} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVE25"
                    value={discountForm.code}
                    onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={discountForm.percent}
                    onChange={(e) => setDiscountForm({ ...discountForm, percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Valid From</label>
                    <input
                      type="date"
                      value={discountForm.valid_from}
                      onChange={(e) => setDiscountForm({ ...discountForm, valid_from: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Valid To</label>
                    <input
                      type="date"
                      value={discountForm.valid_to}
                      onChange={(e) => setDiscountForm({ ...discountForm, valid_to: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase"
                >
                  Activate Coupon
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CASH COLLECTION CONFIRMATION MODAL */}
        {collectCashModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-slate-900 shadow-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Record Cash Received</h3>
                    <span className="text-[10px] text-slate-400">Booking #{collectCashModal.booking_id}</span>
                  </div>
                </div>
                <button
                  onClick={() => setCollectCashModal(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Customer:</span>
                  <span className="text-white font-bold">{collectCashModal.customer_name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Vehicle:</span>
                  <span className="text-slate-200">{collectCashModal.vehicle_brand} {collectCashModal.vehicle_name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cash Amount to Collect:</span>
                  <span className="text-emerald-400 font-black text-sm">
                    Rs. {(collectCashModal.total_amount + (collectCashModal.deposit_amount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Includes:</span>
                  <span className="text-slate-300">Rental + Security Deposit</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleConfirmCollectCash}
                  disabled={collectingCash}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{collectingCash ? 'Recording...' : 'Confirm Cash Received'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCollectCashModal(null)}
                  disabled={collectingCash}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
