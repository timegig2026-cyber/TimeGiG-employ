import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Power,
  Upload,
  FileText,
  DollarSign,
  TrendingUp,
  User,
  AlertCircle,
  Clock,
  Sparkles,
  Building2,
  Copy,
  Check,
  HelpCircle
} from 'lucide-react';
import { UserProfileSubmission } from '../types/profile';
import { UserPoPSubmission } from '../types/pop';
import { getStoredProfiles } from '../utils/profileStore';
import { getStoredPoPs, addOrUpdatePoP, getStoredBankingDetails, BankingDetails } from '../utils/popStore';
import { FeatureHelpModal } from './FeatureHelpModal';

export function ActivationFeature() {
  const [profile, setProfile] = useState<UserProfileSubmission | null>(null);
  const [selectedRole, setSelectedRole] = useState<'Normal User' | 'Tenant'>('Normal User');

  // Banking details set by Tenant
  const [banking, setBanking] = useState<BankingDetails>(getStoredBankingDetails());
  const [copiedBank, setCopiedBank] = useState<boolean>(false);

  // PoP Form states
  const [popFile, setPopFile] = useState<{ name: string; size: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stored PoP status
  const [userPoP, setUserPoP] = useState<UserPoPSubmission | null>(null);

  // Tenant count tracking (Max 10 per tenant)
  const [tenantCount, setTenantCount] = useState<number>(3);
  const maxTenantsAllowed = 10;

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync profile, PoP & banking data
  const loadData = useCallback(() => {
    setBanking(getStoredBankingDetails());

    const list = getStoredProfiles();
    if (list.length > 0) {
      setProfile(list[0]);
    } else {
      setProfile(null);
    }

    const pops = getStoredPoPs();
    if (pops.length > 0) {
      setUserPoP(pops[0]);
    } else {
      setUserPoP(null);
    }

    const storedTenantCount = localStorage.getItem('timegig_tenant_count');
    if (storedTenantCount) {
      setTenantCount(parseInt(storedTenantCount, 10));
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('profile_store_updated', loadData);
    window.addEventListener('pop_store_updated', loadData);
    window.addEventListener('banking_details_updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('profile_store_updated', loadData);
      window.removeEventListener('pop_store_updated', loadData);
      window.removeEventListener('banking_details_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [loadData]);

  const copyBankDetails = () => {
    const text = `Bank: ${banking.bankName}\nAccount Holder: ${banking.accountHolder}\nAccount Number: ${banking.accountNumber}\nBranch Code: ${banking.branchCode}\nReference: ${banking.referenceFormat}`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 3000);
  };

  // File Upload Handler for Proof of Payment
  const handlePoPUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPopFile({
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          url: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Proof of Payment
  const handleSubmitPoP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedRole === 'Tenant' && tenantCount >= maxTenantsAllowed) {
      setErrorMsg('Tenant slot limit reached (Max 10 tenants allowed per parent tenant).');
      return;
    }

    if (!popFile) {
      setErrorMsg('Please select and upload a Proof of Payment (PoP) document from your device.');
      return;
    }

    const feeToPay = selectedRole === 'Tenant' ? banking.tenantMonthlyFee : banking.monthlyFee;

    const newPoP: UserPoPSubmission = {
      id: userPoP?.id || 'pop-' + Date.now(),
      submittedAt: new Date().toISOString(),
      userName: profile ? `${profile.firstName} ${profile.surname}` : 'User',
      userEmail: profile?.email || 'user@example.com',
      userContact: profile?.contactNumber || 'N/A',
      planType: selectedRole,
      amountPaid: feeToPay,
      popFileName: popFile.name,
      popFileSize: popFile.size,
      popFileUrl: popFile.url,
      status: 'Pending',
    };

    addOrUpdatePoP(newPoP);
    setUserPoP(newPoP);

    if (selectedRole === 'Tenant') {
      const newCount = Math.min(maxTenantsAllowed, tenantCount + 1);
      setTenantCount(newCount);
      localStorage.setItem('timegig_tenant_count', newCount.toString());
    }

    setSuccessMsg(`Proof of Payment for ${selectedRole} submitted successfully to Tenant for verification!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const slotsRemaining = maxTenantsAllowed - tenantCount;

  return (
    <div className="w-full max-w-lg mx-auto py-6 px-3 text-xs space-y-5">
      {/* Header */}
      <div className="text-center relative">
        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="absolute top-0 right-0 p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-800 transition-all cursor-pointer shadow-xs flex items-center gap-1 font-bold text-[10px]"
          title="Open Activation Guide & Help"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
          <span>Help</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 border border-amber-900/15 text-amber-950 text-[10px] font-black uppercase tracking-wider mb-2 shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-amber-700 fill-amber-700" />
          Account Activation & Membership
        </div>
        <h1 className="text-xl font-black text-stone-900 tracking-tight">
          Choose Account Plan & Activate
        </h1>
        <p className="text-[11px] text-stone-600 mt-0.5">
          Select whether to earn monthly passive income as a Tenant (Max 10 per tenant) or operate as a Normal User.
        </p>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 font-bold flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Alert */}
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-950 font-bold flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Account Type Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Option 1: Become a Tenant */}
        <button
          type="button"
          onClick={() => setSelectedRole('Tenant')}
          className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between space-y-3 cursor-pointer ${
            selectedRole === 'Tenant'
              ? 'border-amber-800 bg-amber-500/10 shadow-sm'
              : 'border-stone-200 bg-white/80 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-900 text-white shadow-xs">
              <TrendingUp className="w-5 h-5 text-amber-300" />
            </div>
            {selectedRole === 'Tenant' && (
              <span className="p-1 bg-amber-900 text-white rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-stone-900">Become a Tenant</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 text-[9px] font-black">
                {tenantCount}/{maxTenantsAllowed} Joined
              </span>
            </div>
            <p className="text-[10px] font-bold text-amber-900 mt-0.5">Fee: {banking.tenantMonthlyFee}/mo</p>
            <p className="text-[10px] text-stone-500 mt-1 leading-tight">
              Only <strong>10 tenants allowed per tenant</strong>. ({slotsRemaining > 0 ? `${slotsRemaining} slot(s) remaining` : 'Fully Occupied'}).
            </p>
          </div>
        </button>

        {/* Option 2: Become a Normal User */}
        <button
          type="button"
          onClick={() => setSelectedRole('Normal User')}
          className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between space-y-3 cursor-pointer ${
            selectedRole === 'Normal User'
              ? 'border-black bg-stone-900 text-white shadow-sm'
              : 'border-stone-200 bg-white/80 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-xl shadow-xs ${selectedRole === 'Normal User' ? 'bg-stone-800 text-amber-400' : 'bg-stone-100 text-stone-700'}`}>
              <User className="w-5 h-5" />
            </div>
            {selectedRole === 'Normal User' && (
              <span className="p-1 bg-amber-400 text-stone-950 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div>
            <h3 className={`text-xs font-black ${selectedRole === 'Normal User' ? 'text-white' : 'text-stone-900'}`}>
              Become a Normal User
            </h3>
            <p className={`text-[10px] font-bold ${selectedRole === 'Normal User' ? 'text-amber-300' : 'text-stone-700'} mt-0.5`}>
              Fee: {banking.monthlyFee}/mo
            </p>
            <p className={`text-[10px] ${selectedRole === 'Normal User' ? 'text-stone-300' : 'text-stone-500'} mt-1 leading-tight`}>
              Upload Proof of Payment (PoP) documents from device to submit for Tenant approval.
            </p>
          </div>
        </button>
      </div>

      {/* Official Bank Transfer Details Box */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <div className="flex items-center gap-1.5 font-black text-xs text-stone-900">
            <Building2 className="w-4 h-4 text-amber-800" />
            Tenant Official Bank Details
          </div>

          <button
            onClick={copyBankDetails}
            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-bold flex items-center gap-1 border border-stone-300"
          >
            {copiedBank ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            {copiedBank ? 'Copied!' : 'Copy Details'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] bg-stone-50 p-3 rounded-xl border border-stone-200 text-stone-800">
          <div><strong className="text-stone-500 block">Bank Name:</strong> {banking.bankName}</div>
          <div><strong className="text-stone-500 block">Account Holder:</strong> {banking.accountHolder}</div>
          <div><strong className="text-stone-500 block">Account Number:</strong> <span className="font-mono font-bold text-xs">{banking.accountNumber}</span></div>
          <div><strong className="text-stone-500 block">Branch Code:</strong> {banking.branchCode}</div>
          <div className="col-span-2 border-t border-stone-200 pt-1 flex justify-between items-center">
            <span><strong className="text-stone-500">Plan Fee ({selectedRole}):</strong> <span className="font-black text-emerald-700 text-xs">{selectedRole === 'Tenant' ? banking.tenantMonthlyFee : banking.monthlyFee}</span></span>
            <span><strong className="text-stone-500">Reference:</strong> {banking.referenceFormat}</span>
          </div>
        </div>
      </div>

      {/* Proof of Payment (PoP) Upload Box */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h2 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-800" />
            Upload Proof of Payment ({selectedRole})
          </h2>
          <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
            {selectedRole === 'Tenant' ? banking.tenantMonthlyFee : banking.monthlyFee}
          </span>
        </div>

        {/* Current PoP Status Badge if submitted */}
        {userPoP && userPoP.planType === selectedRole && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
              userPoP.status === 'Approved'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 font-bold'
                : userPoP.status === 'Rejected'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 font-bold'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-950 font-bold'
            }`}
          >
            <div className="flex items-center gap-2">
              {userPoP.status === 'Approved' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              ) : userPoP.status === 'Rejected' ? (
                <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-700 flex-shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
              )}
              <div>
                <span className="uppercase text-[10px] tracking-wider block">PoP Verification: {userPoP.status}</span>
                {userPoP.rejectionReason && (
                  <span className="text-[9px] font-normal text-rose-900 block">Reason: {userPoP.rejectionReason}</span>
                )}
              </div>
            </div>

            <span className="text-[9px] font-mono text-stone-500 truncate max-w-[100px]">
              {userPoP.popFileName}
            </span>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmitPoP} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-stone-700 mb-1">
              Select Proof of Payment Document from Device *
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handlePoPUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-stone-300 hover:border-black bg-stone-50 hover:bg-stone-100 transition-colors flex items-center justify-center gap-2 text-stone-800 font-bold text-xs"
            >
              <Upload className="w-4 h-4 text-amber-800" />
              {popFile ? `Selected: ${popFile.name} (${popFile.size})` : 'Browse & Upload PoP File'}
            </button>
          </div>

          {popFile && (
            <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-amber-800 flex-shrink-0" />
                <span className="font-bold text-stone-900 truncate">{popFile.name}</span>
              </div>
              <span className="text-stone-500 font-medium">{popFile.size}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-stone-800 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            Submit Proof of Payment ({selectedRole})
          </button>
        </form>
      </div>

      {/* Feature Help Modal */}
      <FeatureHelpModal
        featureName="Activation"
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onRestartTour={() => window.dispatchEvent(new Event('timegig_open_tour'))}
      />
    </div>
  );
}
