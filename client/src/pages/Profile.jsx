import React, { useState } from 'react';
import { User, Mail, Phone, FileText, CheckCircle2, Upload, AlertCircle, Save } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.drivingLicenseNumber || '');

  const [licenseFile, setLicenseFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/auth/profile', {
        firstName,
        lastName,
        phone,
        drivingLicenseNumber: licenseNumber,
      });

      if (res.data.success) {
        updateUser(res.data.data);
        setSuccessMsg('Profile updated successfully!');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLicense = async (e) => {
    e.preventDefault();
    if (!licenseFile) return;

    setUploadingLicense(true);
    const formData = new FormData();
    formData.append('license', licenseFile);
    formData.append('drivingLicenseNumber', licenseNumber || 'DL-NY-' + Math.floor(1000000 + Math.random() * 9000000));

    try {
      const res = await api.post('/auth/upload-license', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        updateUser(res.data.data);
        setSuccessMsg('Driving license uploaded & verified!');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload license');
    } finally {
      setUploadingLicense(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Account Settings</span>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Profile & Verification</h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your personal details, contact information, and verified driver credentials.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Col: Avatar Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md">
            {user?.firstName ? user.firstName[0] : 'U'}
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-xs text-slate-600">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
              {user?.role}
            </span>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2 text-left">
            <div className="flex justify-between">
              <span>Account Status:</span>
              <span className="font-semibold text-emerald-600">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Role Clearance:</span>
              <span className="font-semibold text-slate-900">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdateProfile} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Personal Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Driving License Number</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. DL-NY-9823411"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>

          {/* License Document Upload */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Driver License Verification Document</span>
            </h3>

            {user?.drivingLicenseUrl ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 block">
                        License Document On File: {user.drivingLicenseNumber || 'Verified'}
                      </span>
                      <span className="text-[11px] text-emerald-700">Digital verification completed</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    Verified
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUploadLicense} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs text-slate-600">
                  Upload an image (JPEG, PNG, WebP) or PDF of your government-issued driver license.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setLicenseFile(e.target.files[0])}
                    className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                    required
                  />
                  <button
                    type="submit"
                    disabled={uploadingLicense}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {uploadingLicense ? 'Uploading...' : 'Upload & Verify'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
