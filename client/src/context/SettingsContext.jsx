import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const SettingsContext = createContext(null);

export const defaultSettings = {
  company_name: 'FleetRentals',
  company_tagline:
    'Enterprise vehicle rental & fleet management system. Automating the full rental lifecycle from booking, payments, condition checklist inspections, to transparent digital invoices.',
  headquarters_address: 'Swami Bhavan, SVNIT, Surat, Gujarat - 395007',
  headquarters_city: 'Surat',
  headquarters_pincode: '395007',
  contact_phone: '7016870683',
  contact_phone_display: '+91 70168 70683',
  contact_email: 'support@rentfleet.in',
  roadside_helpline: '+91 70168 70683',
  gstin: '24AAACF1234F1Z5',
  copyright_text: 'FleetRentals System Inc. All rights reserved.',
  support_hours: '24/7 Dedicated Support Helpline',
  fleet_categories: [
    { id: 'HATCHBACK', name: 'Hatchbacks', models: 'Swift, Tiago, Alto K10' },
    { id: 'SEDAN', name: 'Executive Sedans', models: 'Dzire, Amaze, Tigor' },
    { id: 'SUV', name: 'SUVs & 4x4', models: 'Nexon, Thar, Scorpio-N, XUV700' },
    { id: 'MUV', name: 'MUV / Family', models: 'Innova Crysta, Ertiga' },
    { id: 'LUXURY_TAXI', name: '⭐ Luxury Taxi', models: 'Mercedes-Benz E-Class' },
  ],
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSettingsAndBranches = async () => {
    try {
      // 1. Fetch system settings from DB
      const settingsRes = await api.get('/settings');
      if (settingsRes.data?.success && settingsRes.data?.data) {
        setSettings((prev) => ({
          ...prev,
          ...settingsRes.data.data,
        }));
      }

      // 2. Fetch operational branches from DB
      const branchRes = await api.get('/branches');
      if (branchRes.data?.success && Array.isArray(branchRes.data?.data)) {
        setBranches(branchRes.data.data);
      }
    } catch (err) {
      console.warn('Using default settings fallback:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndBranches();
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        branches,
        loading,
        refreshSettings: fetchSettingsAndBranches,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      settings: defaultSettings,
      branches: [],
      loading: false,
      refreshSettings: () => {},
    };
  }
  return context;
}
