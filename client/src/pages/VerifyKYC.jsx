import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  UploadCloud,
  FileText,
  Calendar,
  Lock,
  RefreshCw,
  Eye,
  Trash2,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function VerifyKYC() {
  const { user, refreshUser } = useAuth();
  const { addNotification } = useNotification();

  const [kycStatus, setKycStatus] = useState('NotSubmitted');
  const [rejectionReason, setRejectionReason] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [dlNumber, setDlNumber] = useState('');
  const [dlExpiry, setDlExpiry] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Selected files & upload progress
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [submittingDoc, setSubmittingDoc] = useState(null);

  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('rental_token') || localStorage.getItem('token');
      const res = await fetch('/api/kyc/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setKycStatus(data.kyc_status);
        setRejectionReason(data.kyc_rejection_reason);
        setDocuments(data.documents || []);

        // Prefill existing numbers if present
        const dlDoc = data.documents?.find(d => d.doc_type === 'DrivingLicense_Front');
        if (dlDoc && dlDoc.expiry_date) {
          setDlExpiry(dlDoc.expiry_date.split('T')[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching KYC status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const handleFileSelect = (docType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addNotification('File exceeds 5MB size limit. Please choose a smaller file.', 'error');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype || file.type)) {
      addNotification('Invalid file format. Only JPG, PNG, WEBP, and PDF documents are supported.', 'error');
      return;
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setSelectedFiles(prev => ({
      ...prev,
      [docType]: { file, previewUrl, name: file.name, size: file.size }
    }));
  };

  const uploadAndSubmit = async (docType) => {
    const fileObj = selectedFiles[docType];
    if (!fileObj) {
      addNotification('Please select a file to upload first.', 'error');
      return;
    }

    // Validation for specific document types
    let docNum = null;
    let expDate = null;

    if (docType.startsWith('DrivingLicense')) {
      if (!dlNumber && !documents.find(d => d.doc_type === 'DrivingLicense_Front')?.doc_number) {
        addNotification('Please enter your Driving License number.', 'error');
        return;
      }
      docNum = dlNumber;

      if (docType === 'DrivingLicense_Front') {
        if (!dlExpiry) {
          addNotification('Please provide the expiry date of your driving license.', 'error');
          return;
        }
        if (new Date(dlExpiry) <= new Date()) {
          addNotification('Driving license expiry date must be in the future.', 'error');
          return;
        }
        expDate = dlExpiry;
      }
    } else if (docType.startsWith('Aadhaar')) {
      docNum = aadhaarNumber;
    } else if (docType === 'PAN') {
      docNum = panNumber;
    }

    try {
      setSubmittingDoc(docType);
      const token = localStorage.getItem('rental_token') || localStorage.getItem('token');

      // 1. Upload private file via Multer
      const formData = new FormData();
      formData.append('document', fileObj.file);

      const uploadRes = await fetch('/api/files/upload-private-doc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload document file.');
      }

      // 2. Submit document record
      const submitRes = await fetch('/api/kyc/submit-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          doc_type: docType,
          doc_number: docNum || null,
          file_path: uploadData.stored_path,
          expiry_date: expDate || null
        })
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(submitData.error || 'Failed to register document.');
      }

      addNotification(`${docType.replace('_', ' ')} uploaded successfully!`, 'success');
      // Clear selected file
      setSelectedFiles(prev => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });

      // Refresh KYC state
      await fetchKYCStatus();
      if (refreshUser) refreshUser();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSubmittingDoc(null);
    }
  };

  const getDocStatusBadge = (docType) => {
    const doc = documents.find(d => d.doc_type === docType);
    if (!doc) {
      return (
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
          Not Uploaded
        </span>
      );
    }

    if (doc.status === 'Approved') {
      return (
        <span className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved</span>
        </span>
      );
    }

    if (doc.status === 'Rejected') {
      return (
        <span className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-rose-950/70 text-rose-400 border border-rose-800/60 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Rejected</span>
        </span>
      );
    }

    return (
      <span className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-amber-950/70 text-amber-400 border border-amber-800/60 font-medium">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending Review</span>
      </span>
    );
  };

  const isApproved = kycStatus === 'Approved';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Identity Verification (KYC)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Verify Your Identity
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              In accordance with Motor Vehicles regulations, valid Driving License and Government ID verification are mandatory before booking any self-drive vehicle.
            </p>
          </div>

          <button
            onClick={fetchKYCStatus}
            disabled={loading}
            className="self-start md:self-auto flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Global Status Banner */}
        {kycStatus === 'Approved' && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-slate-900 border border-emerald-500/30 p-5 shadow-xl shadow-emerald-950/20 flex items-start space-x-4">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">KYC Verification Approved</h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Your documents have been verified and approved by the DriveGrid compliance team. You have full access to book any vehicle across the entire fleet network.
              </p>
            </div>
          </div>
        )}

        {kycStatus === 'Pending' && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/30 p-5 shadow-xl shadow-amber-950/20 flex items-start space-x-4">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Verification in Progress</h3>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Your submitted documents are currently under review by our operations verification team. Reviews typically complete within 24 hours.
              </p>
            </div>
          </div>
        )}

        {kycStatus === 'Rejected' && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-slate-900 border border-rose-500/30 p-5 shadow-xl shadow-rose-950/20 flex items-start space-x-4">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Verification Update Required</h3>
              <p className="text-xs text-rose-200/80 mt-0.5">
                {rejectionReason || 'One or more of your documents was unclear or expired. Please review the notes below and re-upload clear photos.'}
              </p>
            </div>
          </div>
        )}

        {kycStatus === 'NotSubmitted' && (
          <div className="rounded-2xl bg-slate-900/80 border border-indigo-500/30 p-5 flex items-start space-x-4">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Verification Pending Submission</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Upload clear, glare-free photos of your Driving License and Aadhaar card below. Once verified, your status will turn green automatically.
              </p>
            </div>
          </div>
        )}

        {/* KYC Document Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Driving License Front */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4 hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Driving License (Front)</h3>
              </div>
              {getDocStatusBadge('DrivingLicense_Front')}
            </div>

            <p className="text-xs text-slate-400">
              Must show your photo, name, license number, and clear validity date.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL0420190012345"
                  value={dlNumber}
                  onChange={(e) => setDlNumber(e.target.value.toUpperCase())}
                  disabled={isApproved}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={dlExpiry}
                  onChange={(e) => setDlExpiry(e.target.value)}
                  disabled={isApproved}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Upload Input */}
              {!isApproved && (
                <div className="pt-2">
                  <label className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 bg-slate-950/40 hover:bg-slate-950/80 transition-all">
                    <UploadCloud className="w-6 h-6 text-indigo-400" />
                    <span className="text-xs text-slate-300 font-medium text-center">
                      {selectedFiles['DrivingLicense_Front'] ? selectedFiles['DrivingLicense_Front'].name : 'Choose License Front Photo (JPG, PNG, PDF)'}
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(e) => handleFileSelect('DrivingLicense_Front', e)}
                      className="hidden"
                    />
                  </label>

                  {selectedFiles['DrivingLicense_Front'] && (
                    <button
                      onClick={() => uploadAndSubmit('DrivingLicense_Front')}
                      disabled={submittingDoc === 'DrivingLicense_Front'}
                      className="mt-3 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-2"
                    >
                      {submittingDoc === 'DrivingLicense_Front' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading Document...</span>
                        </>
                      ) : (
                        <span>Submit License Front</span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Driving License Back */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4 hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Driving License (Back)</h3>
              </div>
              {getDocStatusBadge('DrivingLicense_Back')}
            </div>

            <p className="text-xs text-slate-400">
              Must show authorized vehicle classes (MCWG, LMV) and issuing authority address.
            </p>

            {!isApproved && (
              <div className="space-y-3 pt-4">
                <label className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 bg-slate-950/40 hover:bg-slate-950/80 transition-all">
                  <UploadCloud className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-medium text-center">
                    {selectedFiles['DrivingLicense_Back'] ? selectedFiles['DrivingLicense_Back'].name : 'Choose License Back Photo (JPG, PNG, PDF)'}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => handleFileSelect('DrivingLicense_Back', e)}
                    className="hidden"
                  />
                </label>

                {selectedFiles['DrivingLicense_Back'] && (
                  <button
                    onClick={() => uploadAndSubmit('DrivingLicense_Back')}
                    disabled={submittingDoc === 'DrivingLicense_Back'}
                    className="mt-3 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-2"
                  >
                    {submittingDoc === 'DrivingLicense_Back' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading Document...</span>
                      </>
                    ) : (
                      <span>Submit License Back</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. Aadhaar / National ID Front */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4 hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Aadhaar Card (Front)</h3>
              </div>
              {getDocStatusBadge('Aadhaar_Front')}
            </div>

            <p className="text-xs text-slate-400">
              Front side of Aadhaar card showing full name and 12-digit UID.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876 5432 1012"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  disabled={isApproved}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {!isApproved && (
                <div>
                  <label className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 bg-slate-950/40 hover:bg-slate-950/80 transition-all">
                    <UploadCloud className="w-6 h-6 text-indigo-400" />
                    <span className="text-xs text-slate-300 font-medium text-center">
                      {selectedFiles['Aadhaar_Front'] ? selectedFiles['Aadhaar_Front'].name : 'Choose Aadhaar Front Photo'}
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(e) => handleFileSelect('Aadhaar_Front', e)}
                      className="hidden"
                    />
                  </label>

                  {selectedFiles['Aadhaar_Front'] && (
                    <button
                      onClick={() => uploadAndSubmit('Aadhaar_Front')}
                      disabled={submittingDoc === 'Aadhaar_Front'}
                      className="mt-3 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-2"
                    >
                      {submittingDoc === 'Aadhaar_Front' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading Document...</span>
                        </>
                      ) : (
                        <span>Submit Aadhaar Front</span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 4. Live Selfie */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4 hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Clear Headshot / Selfie</h3>
              </div>
              {getDocStatusBadge('Selfie')}
            </div>

            <p className="text-xs text-slate-400">
              Clear front-facing photo taken in good lighting without sunglasses or hat.
            </p>

            {!isApproved && (
              <div className="space-y-3 pt-6">
                <label className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 bg-slate-950/40 hover:bg-slate-950/80 transition-all">
                  <UploadCloud className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-medium text-center">
                    {selectedFiles['Selfie'] ? selectedFiles['Selfie'].name : 'Take or Upload Headshot Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => handleFileSelect('Selfie', e)}
                    className="hidden"
                  />
                </label>

                {selectedFiles['Selfie'] && (
                  <button
                    onClick={() => uploadAndSubmit('Selfie')}
                    disabled={submittingDoc === 'Selfie'}
                    className="mt-3 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-2"
                  >
                    {submittingDoc === 'Selfie' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading Photo...</span>
                      </>
                    ) : (
                      <span>Submit Selfie</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Security & Privacy Notice */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800/60 p-4 flex items-center space-x-3 text-xs text-slate-400">
          <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Privacy Guarantee: All documents are stored in secure private server storage (`/server/private_uploads`) with AES encrypted access controls. They are never publicly accessible and are strictly used for identity verification.
          </span>
        </div>
      </div>
    </div>
  );
}
