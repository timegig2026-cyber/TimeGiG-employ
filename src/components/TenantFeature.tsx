import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  Globe,
  Eye,
  Search,
  Check,
  X,
  AlertTriangle,
  Users,
  ExternalLink,
  Maximize2,
  Receipt,
  DollarSign,
  TrendingUp,
  UserCheck,
  Sparkles,
  Building2,
  Save,
  Edit3,
  Gift,
  Share2,
  Copy,
  Send,
  Power,
  UserX,
  Link,
  CheckCircle
} from 'lucide-react';
import { UserProfileSubmission, ProfileStatus } from '../types/profile';
import { UserPoPSubmission } from '../types/pop';
import { getStoredProfiles, updateProfileStatus, toggleProfileEnabled } from '../utils/profileStore';
import {
  getStoredPoPs,
  updatePoPStatus,
  getStoredBankingDetails,
  saveStoredBankingDetails,
  getFreeTrialSettings,
  saveFreeTrialSettings,
  BankingDetails,
  FreeTrialSettings
} from '../utils/popStore';

export function TenantFeature() {
  const [activeMenu, setActiveMenu] = useState<'Verification' | 'UserPoP' | 'TenantPoP' | 'Active Users' | 'Managed Users' | 'Share Link' | 'Overview' | 'Settings'>('Verification');
  const [profiles, setProfiles] = useState<UserProfileSubmission[]>([]);
  const [pops, setPops] = useState<UserPoPSubmission[]>([]);

  // Active Tenant ID & Link Copy Feedback
  const [activeTenantId] = useState<string>('TNT_WESTERN_CAPE');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Enable / Disable Profile Handler
  const handleToggleUserEnable = (id: string, currentEnabled?: boolean) => {
    const nextStatus = currentEnabled === false ? true : false;
    const updated = toggleProfileEnabled(id, nextStatus);
    setProfiles(updated);
    setSaveBankMsg(`User/Tenant Profile ${nextStatus ? '🟢 ENABLED (Active)' : '🔴 DISABLED (Suspended)'} with immediate effect!`);
    setTimeout(() => setSaveBankMsg(null), 3500);
  };

  // Banking & Free Trial Management State
  const [banking, setBanking] = useState<BankingDetails>(getStoredBankingDetails());
  const [trialSettings, setTrialSettings] = useState<FreeTrialSettings>(getFreeTrialSettings());

  const [isEditingUserFee, setIsEditingUserFee] = useState<boolean>(false);
  const [isEditingTenantFee, setIsEditingTenantFee] = useState<boolean>(false);
  const [saveBankMsg, setSaveBankMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'All' | ProfileStatus>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<UserProfileSubmission | null>(null);

  // Full-screen viewer state for logo and documents
  const [fullScreenAsset, setFullScreenAsset] = useState<{ url: string; title: string; type?: string } | null>(null);

  // Profile Rejection modal
  const [rejectingProfileId, setRejectingProfileId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // PoP Rejection modal
  const [rejectingPoPId, setRejectingPoPId] = useState<string | null>(null);
  const [popRejectionReason, setPopRejectionReason] = useState('');

  // Refresh stored profiles, PoPs, banking & trial settings
  const reloadData = () => {
    setProfiles(getStoredProfiles());
    setPops(getStoredPoPs());
    setBanking(getStoredBankingDetails());
    setTrialSettings(getFreeTrialSettings());
  };

  useEffect(() => {
    reloadData();

    window.addEventListener('profile_store_updated', reloadData);
    window.addEventListener('pop_store_updated', reloadData);
    window.addEventListener('banking_details_updated', reloadData);
    window.addEventListener('trial_settings_updated', reloadData);
    window.addEventListener('storage', reloadData);
    return () => {
      window.removeEventListener('profile_store_updated', reloadData);
      window.removeEventListener('pop_store_updated', reloadData);
      window.removeEventListener('banking_details_updated', reloadData);
      window.removeEventListener('trial_settings_updated', reloadData);
      window.removeEventListener('storage', reloadData);
    };
  }, []);

  const handleSaveBanking = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredBankingDetails(banking);
    setIsEditingUserFee(false);
    setIsEditingTenantFee(false);
    setSaveBankMsg('Subscription fee & bank details updated with immediate effect!');
    setTimeout(() => setSaveBankMsg(null), 4000);
  };

  const handleSaveTrialSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveFreeTrialSettings(trialSettings);
    setSaveBankMsg('Free trial settings updated with immediate effect!');
    setTimeout(() => setSaveBankMsg(null), 4000);
  };

  const handleApproveProfile = (id: string) => {
    const updated = updateProfileStatus(id, 'Approved');
    setProfiles(updated);
    if (selectedProfile?.id === id) {
      setSelectedProfile((prev) => (prev ? { ...prev, status: 'Approved', isLocked: true } : null));
    }
  };

  const handleConfirmRejectProfile = () => {
    if (!rejectingProfileId) return;
    const updated = updateProfileStatus(
      rejectingProfileId,
      'Rejected',
      rejectionReason || 'Information does not match ID documents.'
    );
    setProfiles(updated);
    if (selectedProfile?.id === rejectingProfileId) {
      setSelectedProfile((prev) => (prev ? { ...prev, status: 'Rejected', rejectionReason } : null));
    }
    setRejectingProfileId(null);
    setRejectionReason('');
  };

  const handleApprovePoP = (id: string) => {
    const updated = updatePoPStatus(id, 'Approved');
    setPops(updated);
  };

  const handleConfirmRejectPoP = () => {
    if (!rejectingPoPId) return;
    const updated = updatePoPStatus(
      rejectingPoPId,
      'Rejected',
      popRejectionReason || 'Proof of Payment file unreadable or invalid.'
    );
    setPops(updated);
    setRejectingPoPId(null);
    setPopRejectionReason('');
  };

  const userPops = pops.filter((p) => p.planType === 'Normal User' || !p.planType);
  const tenantPops = pops.filter((p) => p.planType === 'Tenant');

  const pendingCount = profiles.filter((p) => p.status === 'Pending').length;
  const pendingUserPoPCount = userPops.filter((p) => p.status === 'Pending').length;
  const pendingTenantPoPCount = tenantPops.filter((p) => p.status === 'Pending').length;

  const approvedProfiles = profiles.filter((p) => p.status === 'Approved');
  const approvedCount = approvedProfiles.length;
  const rejectedCount = profiles.filter((p) => p.status === 'Rejected').length;
  const totalUsersCount = profiles.length;

  const activeUsers = approvedProfiles;
  const activeUsersCount = activeUsers.length;

  const approvedTenantPops = tenantPops.filter((p) => p.status === 'Approved');
  const activeTenantNodesCount = Math.max(1, approvedTenantPops.length + 2);

  const parsedUserFee = parseFloat(banking.monthlyFee.replace(/[^0-9.]/g, '')) || 150;
  const parsedTenantFee = parseFloat(banking.tenantMonthlyFee.replace(/[^0-9.]/g, '')) || 500;

  const userSubscriptionRevenue = activeUsersCount * parsedUserFee;
  const userSubscriptionProfitBalance = userSubscriptionRevenue * 0.8;

  const tenantSubscriptionRevenue = activeTenantNodesCount * parsedTenantFee;
  const tenantSubscriptionProfitBalance = tenantSubscriptionRevenue * 0.9;

  const totalCombinedProfitBalance = userSubscriptionProfitBalance + tenantSubscriptionProfitBalance;

  const filteredProfiles = profiles.filter((p) => {
    const matchesFilter = statusFilter === 'All' || p.status === statusFilter;
    const fullName = `${p.firstName} ${p.middleName || ''} ${p.surname}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full max-w-4xl mx-auto pt-12 pb-8 text-xs">
      {/* Tenant Top Menu Bar */}
      <header className="fixed top-0 left-0 right-0 w-full bg-gradient-to-b from-[#FAF4E6] via-[#EADBCA] to-[#D5C2A5] border-b border-white/80 px-2 sm:px-4 py-1.5 flex items-center justify-around shadow-[0_3px_10px_rgba(0,0,0,0.1)] z-30 overflow-x-auto">
        {(['Verification', 'UserPoP', 'TenantPoP', 'Active Users', 'Managed Users', 'Share Link', 'Overview', 'Settings'] as const).map((menuItem) => {
          const isActive = activeMenu === menuItem;
          
          // Gadget Icon selector
          const renderGadgetIcon = () => {
            const iconProps = { className: `w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 shrink-0 ${isActive ? 'text-black stroke-[2.5]' : 'text-stone-700'}` };
            switch (menuItem) {
              case 'Verification': return <ShieldCheck {...iconProps} />;
              case 'UserPoP': return <Receipt {...iconProps} />;
              case 'TenantPoP': return <Building2 {...iconProps} />;
              case 'Active Users': return <Users {...iconProps} />;
              case 'Managed Users': return <UserCheck {...iconProps} />;
              case 'Share Link': return <Share2 {...iconProps} />;
              case 'Overview': return <TrendingUp {...iconProps} />;
              case 'Settings': return <Sparkles {...iconProps} />;
              default: return null;
            }
          };

          return (
            <button
              key={menuItem}
              onClick={() => setActiveMenu(menuItem)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 group cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'bg-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] border border-black/10' 
                  : 'hover:bg-black/5 border border-transparent'
              }`}
            >
              {/* Gadget Icon (Left decoration) */}
              {renderGadgetIcon()}

              <span
                className={`text-[9.5px] font-black uppercase tracking-wider text-black transition-all duration-300 ${
                  isActive
                    ? 'scale-105 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] underline underline-offset-4 decoration-2 decoration-black'
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                {menuItem}
              </span>

              {/* Gadget Pill / Counter / Alert (Right decoration) */}
              {menuItem === 'Verification' && (
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black shadow-xs transition-colors ${pendingCount > 0 ? 'bg-black text-white animate-pulse' : 'bg-stone-300 text-stone-700'}`}>
                  {pendingCount}
                </span>
              )}

              {menuItem === 'UserPoP' && (
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black shadow-xs transition-colors ${pendingUserPoPCount > 0 ? 'bg-amber-900 text-white animate-pulse' : 'bg-stone-300 text-stone-700'}`}>
                  {pendingUserPoPCount}
                </span>
              )}

              {menuItem === 'TenantPoP' && (
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black shadow-xs transition-colors ${pendingTenantPoPCount > 0 ? 'bg-emerald-900 text-white animate-pulse' : 'bg-stone-300 text-stone-700'}`}>
                  {pendingTenantPoPCount}
                </span>
              )}

              {menuItem === 'Active Users' && (
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black shadow-xs transition-colors ${activeUsersCount > 0 ? 'bg-emerald-700 text-white' : 'bg-stone-300 text-stone-700'}`}>
                  {activeUsersCount}
                </span>
              )}

              {menuItem === 'Overview' && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-900 text-white text-[8px] font-black shadow-xs">
                  +15%
                </span>
              )}

              {menuItem === 'Settings' && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-black shadow-xs animate-pulse">
                  v1.2
                </span>
              )}
            </button>
          );
        })}
      </header>

      {/* Verification Tab */}
      {activeMenu === 'Verification' && (
        <div className="px-2 space-y-4 mt-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-black text-stone-900 tracking-tight">
                Profile Verification Queue
              </h1>
              <p className="text-[10px] text-stone-500">
                Review submitted profiles, verify face photos and ID documents in full screen, then approve or reject.
              </p>
            </div>

            <button
              onClick={reloadData}
              className="px-2.5 py-1 rounded-lg bg-black text-white text-[10px] font-bold shadow-2xs hover:bg-stone-800"
            >
              Refresh Submissions
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-stone-900">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-amber-900">Pending</span>
                <Clock className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <p className="text-lg font-black mt-1 text-stone-900">{pendingCount}</p>
              <p className="text-[9px] text-stone-500">Est. 15-25 min</p>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-stone-900">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-emerald-900">Approved</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <p className="text-lg font-black mt-1 text-stone-900">{approvedCount}</p>
              <p className="text-[9px] text-stone-500">Verified profiles</p>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-stone-900">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-rose-900">Rejected</span>
                <XCircle className="w-3.5 h-3.5 text-rose-700" />
              </div>
              <p className="text-lg font-black mt-1 text-stone-900">{rejectedCount}</p>
              <p className="text-[9px] text-stone-500">Needs revision</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white/80 backdrop-blur-md p-2 rounded-xl border border-stone-200">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-black text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search profile..."
                className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-stone-300 bg-stone-50 text-[10px] font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-white/90 backdrop-blur-md border border-stone-200 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={() => p.faceImage && setFullScreenAsset({ url: p.faceImage, title: `${p.firstName} ${p.surname} - Profile Logo` })}>
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-300 bg-stone-100 flex items-center justify-center hover:opacity-90">
                        {p.faceImage ? (
                          <img src={p.faceImage} alt="Face Logo" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      {p.status === 'Approved' && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border border-white">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-extrabold text-stone-900 truncate">
                          {p.firstName} {p.middleName ? `${p.middleName} ` : ''}{p.surname}
                        </h3>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            p.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-900'
                              : p.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <p className="text-[10px] text-stone-500 truncate">
                        {p.email} • {p.contactNumber} • {p.documents.length} ID doc(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 flex-wrap">
                    {/* Enable / Disable Profile Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleUserEnable(p.id, p.isEnabled)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                        p.isEnabled === false
                          ? 'bg-rose-100 border border-rose-300 text-rose-800 hover:bg-emerald-100 hover:text-emerald-900'
                          : 'bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-rose-100 hover:text-rose-900'
                      }`}
                      title={p.isEnabled === false ? 'Click to Enable User Profile' : 'Click to Disable / Suspend User Profile'}
                    >
                      <Power className={`w-3 h-3 ${p.isEnabled === false ? 'text-rose-600' : 'text-emerald-600'}`} />
                      <span>{p.isEnabled === false ? '🔴 Disabled' : '🟢 Enabled'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedProfile(p)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      View Profile
                    </button>

                    {p.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApproveProfile(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                          Approve
                        </button>

                        <button
                          onClick={() => setRejectingProfileId(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center bg-white/60 rounded-xl border border-stone-200 text-stone-500 text-[10px]">
                No submitted profiles in queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* UserPoP Tab */}
      {activeMenu === 'UserPoP' && (
        <div className="px-2 space-y-4 mt-1">
          {saveBankMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 font-bold flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>{saveBankMsg}</span>
            </div>
          )}

          {/* User Monthly Subscription Fee Configuration Box */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                <Building2 className="w-4 h-4 text-amber-800" />
                Normal User Monthly Subscription Fee & Bank Details
              </div>

              <button
                type="button"
                onClick={() => setIsEditingUserFee(!isEditingUserFee)}
                className="px-2.5 py-1 rounded-lg bg-amber-900 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingUserFee ? 'Cancel Edit' : 'Edit Fee & Bank Details'}
              </button>
            </div>

            {isEditingUserFee ? (
              <form onSubmit={handleSaveBanking} className="space-y-3 text-[10px] pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-0.5">User Monthly Fee *</label>
                    <input
                      type="text"
                      required
                      value={banking.monthlyFee}
                      onChange={(e) => setBanking({ ...banking, monthlyFee: e.target.value })}
                      placeholder="e.g. R150.00"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-0.5">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={banking.bankName}
                      onChange={(e) => setBanking({ ...banking, bankName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-0.5">Account Holder *</label>
                    <input
                      type="text"
                      required
                      value={banking.accountHolder}
                      onChange={(e) => setBanking({ ...banking, accountHolder: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-0.5">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={banking.accountNumber}
                      onChange={(e) => setBanking({ ...banking, accountNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-black text-white font-black uppercase text-[10px] tracking-wider hover:bg-stone-800 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  Save User Fee & Bank Details (Immediate Effect)
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] bg-stone-50 p-3 rounded-xl border border-stone-200 text-stone-800">
                <div><strong className="text-stone-500 block">User Fee:</strong> <span className="font-extrabold text-emerald-700 text-xs">{banking.monthlyFee}</span></div>
                <div><strong className="text-stone-500 block">Bank Name:</strong> {banking.bankName}</div>
                <div><strong className="text-stone-500 block">Account Number:</strong> <span className="font-mono font-bold text-xs">{banking.accountNumber}</span></div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
            <div>
              <h1 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-800" />
                User Proof of Payment (UserPoP) Queue
              </h1>
              <p className="text-[10px] text-stone-500">
                Review monthly payment documents submitted by normal users to approve or reject activation.
              </p>
            </div>

            <button
              onClick={reloadData}
              className="px-2.5 py-1 rounded-lg bg-black text-white text-[10px] font-bold shadow-2xs hover:bg-stone-800"
            >
              Refresh PoPs
            </button>
          </div>

          <div className="space-y-2">
            {userPops.length > 0 ? (
              userPops.map((pop) => (
                <div
                  key={pop.id}
                  className="p-3.5 rounded-xl bg-white/90 backdrop-blur-md border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-stone-900">{pop.userName}</span>
                      <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-950 font-black text-[9px]">
                        Normal User ({pop.amountPaid})
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded-full font-black text-[9px] uppercase ${
                          pop.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-900'
                            : pop.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {pop.status}
                      </span>
                    </div>

                    <p className="text-[10px] text-stone-500">
                      Email: {pop.userEmail} • Submitted: {new Date(pop.submittedAt).toLocaleDateString()}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-stone-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-800" />
                        {pop.popFileName} ({pop.popFileSize})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                    <button
                      onClick={() =>
                        setFullScreenAsset({
                          url: pop.popFileUrl,
                          title: `Proof of Payment - ${pop.userName} (${pop.popFileName})`,
                          type: pop.popFileName.endsWith('.pdf') ? 'pdf' : 'image',
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <Maximize2 className="w-3 h-3 text-amber-400" />
                      View PoP
                    </button>

                    {pop.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApprovePoP(pop.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                          Approve
                        </button>

                        <button
                          onClick={() => setRejectingPoPId(pop.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white/60 rounded-xl border border-stone-200 text-stone-500 text-[10px]">
                No User Proof of Payment (UserPoP) submissions received yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TenantPoP Tab */}
      {activeMenu === 'TenantPoP' && (
        <div className="px-2 space-y-4 mt-1">
          {saveBankMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 font-bold flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>{saveBankMsg}</span>
            </div>
          )}

          {/* Tenant Subscription Fee Configuration Box */}
          <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/30 shadow-sm space-y-3 text-stone-900">
            <div className="flex items-center justify-between border-b border-amber-900/20 pb-2">
              <div className="flex items-center gap-1.5 font-black text-xs text-amber-950">
                <TrendingUp className="w-4 h-4 text-amber-800" />
                Tenant Franchise Monthly Subscription Fee Configuration
              </div>

              <button
                type="button"
                onClick={() => setIsEditingTenantFee(!isEditingTenantFee)}
                className="px-2.5 py-1 rounded-lg bg-amber-900 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingTenantFee ? 'Cancel Edit' : 'Change Tenant Fee'}
              </button>
            </div>

            {isEditingTenantFee ? (
              <form onSubmit={handleSaveBanking} className="space-y-3 text-[10px] pt-1">
                <div>
                  <label className="block font-bold text-amber-950 mb-0.5">
                    Tenant Franchise Monthly Subscription Fee *
                  </label>
                  <input
                    type="text"
                    required
                    value={banking.tenantMonthlyFee}
                    onChange={(e) => setBanking({ ...banking, tenantMonthlyFee: e.target.value })}
                    placeholder="e.g. R500.00"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white font-bold text-amber-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-black uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Save className="w-3.5 h-3.5 text-amber-300" />
                  Save Tenant Fee (Immediate Effect)
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between text-[10px] bg-white/80 p-3 rounded-xl border border-amber-300">
                <span>Active Tenant Franchise Monthly Fee:</span>
                <span className="font-extrabold text-amber-950 text-xs">{banking.tenantMonthlyFee} / month</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
            <div>
              <h1 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-800" />
                Tenant Proof of Payment (TenantPoP) Queue
              </h1>
              <p className="text-[10px] text-stone-500">
                Review franchise deposits and registration documents submitted by new tenant node applicants.
              </p>
            </div>

            <button
              onClick={reloadData}
              className="px-2.5 py-1 rounded-lg bg-emerald-900 text-white text-[10px] font-bold shadow-2xs hover:bg-emerald-950"
            >
              Refresh Tenant PoPs
            </button>
          </div>

          <div className="space-y-2">
            {tenantPops.length > 0 ? (
              tenantPops.map((pop) => (
                <div
                  key={pop.id}
                  className="p-3.5 rounded-xl bg-white/90 backdrop-blur-md border border-emerald-900/20 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-stone-900">{pop.userName}</span>
                      <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-950 font-black text-[9px]">
                        Tenant Franchise ({pop.amountPaid})
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded-full font-black text-[9px] uppercase ${
                          pop.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-900'
                            : pop.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {pop.status}
                      </span>
                    </div>

                    <p className="text-[10px] text-stone-500">
                      Email: {pop.userEmail} • Submitted: {new Date(pop.submittedAt).toLocaleDateString()}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-stone-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-800" />
                        {pop.popFileName} ({pop.popFileSize})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                    <button
                      onClick={() =>
                        setFullScreenAsset({
                          url: pop.popFileUrl,
                          title: `Tenant Franchise PoP - ${pop.userName} (${pop.popFileName})`,
                          type: pop.popFileName.endsWith('.pdf') ? 'pdf' : 'image',
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <Maximize2 className="w-3 h-3 text-amber-400" />
                      View PoP
                    </button>

                    {pop.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApprovePoP(pop.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                          Approve
                        </button>

                        <button
                          onClick={() => setRejectingPoPId(pop.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white/60 rounded-xl border border-stone-200 text-stone-500 text-[10px]">
                No Tenant Proof of Payment (TenantPoP) submissions received yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Users Feature Tab */}
      {activeMenu === 'Active Users' && (
        <div className="px-2 space-y-4 mt-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                Active Verified Users
              </h1>
              <p className="text-[10px] text-stone-500">
                All approved active accounts on the platform along with their profile logo and attached monthly revenue.
              </p>
            </div>

            <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-black shadow-2xs">
              {activeUsersCount} Active User(s)
            </span>
          </div>

          <div className="space-y-2">
            {activeUsers.length > 0 ? (
              activeUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full border-2 border-emerald-600 overflow-hidden bg-stone-100 flex items-center justify-center">
                        {user.faceImage ? (
                          <img src={user.faceImage} alt="Profile Logo" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-stone-400" />
                        )}
                      </div>
                      <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-white shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-stone-900 truncate">
                          {user.firstName} {user.middleName ? `${user.middleName} ` : ''}{user.surname}
                        </h3>
                        <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-950 font-black text-[9px] uppercase tracking-wider">
                          Active Account
                        </span>
                      </div>

                      <p className="text-[10px] text-stone-600 truncate">
                        {user.email} • {user.contactNumber} • {user.location}, {user.province}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-right">
                      <span className="text-[9px] font-bold text-amber-900 uppercase block">Monthly Revenue Attached</span>
                      <span className="text-xs font-black text-stone-900">{banking.monthlyFee} / month</span>
                    </div>

                    <button
                      onClick={() => setSelectedProfile(user)}
                      className="px-2.5 py-2 rounded-xl bg-black text-white text-[10px] font-bold hover:bg-stone-800"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white/60 rounded-2xl border border-stone-200 text-stone-500 text-[10px]">
                No active verified users found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Managed Users Tab */}
      {activeMenu === 'Managed Users' && (
        <div className="px-2 space-y-4 mt-1">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-100/90 via-stone-100 to-amber-50 border border-amber-300/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-700" />
                Users Joined via My Tenant Link
              </h1>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Users who registered using your unique Tenant referral link. Only your Tenant node manages these assigned users.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-600 text-white rounded-full text-xs font-black shrink-0 shadow-xs">
              {profiles.filter((p) => p.managedByTenantId === activeTenantId).length} Managed Users
            </span>
          </div>

          <div className="space-y-2">
            {profiles.filter((p) => p.managedByTenantId === activeTenantId).length === 0 ? (
              <div className="p-8 text-center bg-white/80 rounded-3xl border border-stone-200 text-stone-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-amber-500" />
                <p className="font-bold text-xs text-stone-800">No users have joined via your Tenant Share Link yet.</p>
                <p className="text-[11px] text-stone-500 max-w-md mx-auto">
                  Share your custom Tenant referral link on WhatsApp or social media. Anyone who signs up through your link will automatically be assigned to you for management!
                </p>
              </div>
            ) : (
              profiles
                .filter((p) => p.managedByTenantId === activeTenantId)
                .map((p) => (
                  <div key={p.id} className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-black text-amber-900 text-sm">
                        {p.firstName ? p.firstName[0] : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black text-stone-900">{p.firstName} {p.surname}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            p.isEnabled === false ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.isEnabled === false ? '🔴 Suspended' : '🟢 Active'}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500">{p.email} • {p.contactNumber} • {p.trade || 'Specialist'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleUserEnable(p.id, p.isEnabled)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                          p.isEnabled === false
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-emerald-100 hover:text-emerald-900'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-rose-100 hover:text-rose-900'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{p.isEnabled === false ? '🔴 Enable User' : '🟢 Disable User'}</span>
                      </button>

                      <button
                        onClick={() => setSelectedProfile(p)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-900 text-white text-[10px] font-bold hover:bg-stone-800 cursor-pointer"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Share Link Tab */}
      {activeMenu === 'Share Link' && (
        <div className="px-2 space-y-5 mt-1">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Share2 className="w-4 h-4 text-amber-400" />
                Official Tenant Network Share Link
              </div>
              <span className="text-[10px] font-mono text-stone-400">Tenant Node ID: {activeTenantId}</span>
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-white">Your Dedicated Tenant Share Link</h2>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Direct new users to register through your exact custom link. Anyone who signs up via this link is automatically tagged with your Tenant Node ID and managed exclusively by you.
              </p>
            </div>

            <div className="bg-stone-950 border border-stone-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 font-mono text-xs text-amber-300 overflow-x-auto select-all shadow-inner">
              <span className="truncate">{typeof window !== 'undefined' ? window.location.origin : 'https://timegig.app'}/?tenant_ref={activeTenantId}</span>
              <button
                type="button"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/?tenant_ref=${activeTenantId}`;
                  navigator.clipboard.writeText(shareUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 3000);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-sans text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-lg cursor-pointer"
              >
                {copiedLink ? <CheckCircle className="w-4 h-4 text-stone-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Exact Link'}</span>
              </button>
            </div>

            {/* Direct Social Media Sharing Buttons */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-stone-300 block">
                Direct Share to Social Media Platforms
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?tenant_ref=${activeTenantId}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Join our official TimeGiG Tenant Network! Register here: ' + shareUrl)}`, '_blank');
                  }}
                  className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  💬 WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?tenant_ref=${activeTenantId}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Join our official TimeGiG Tenant Network!')}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                  }}
                  className="py-3 px-3 rounded-2xl bg-black hover:bg-stone-800 border border-stone-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  𝕏 Twitter / X
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?tenant_ref=${activeTenantId}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                  }}
                  className="py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  📘 Facebook
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?tenant_ref=${activeTenantId}`;
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
                  }}
                  className="py-3 px-3 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  💼 LinkedIn
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?tenant_ref=${activeTenantId}`;
                    window.open(`mailto:?subject=${encodeURIComponent('Invitation to join TimeGiG Tenant Network')}&body=${encodeURIComponent('Join our Tenant Network on TimeGiG using this link: ' + shareUrl)}`, '_blank');
                  }}
                  className="py-3 px-3 rounded-2xl bg-stone-700 hover:bg-stone-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  ✉️ Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeMenu === 'Overview' && (
        <div className="px-2 py-4 max-w-lg mx-auto space-y-4">
          <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-stone-200 shadow-md space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 via-stone-900 to-black text-white text-center space-y-1.5 border border-emerald-500/30 shadow-lg">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Total Platform Revenue Profit Balance
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                R{totalCombinedProfitBalance.toFixed(2)}
              </div>
              <p className="text-[10px] text-stone-300">
                Combined total profit from Normal Users and Tenant Franchise Subscriptions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-2 border border-stone-700 shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-[10px] uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" />
                  User Subscription Profit
                </div>

                <div className="text-xl font-black text-amber-400">
                  R{userSubscriptionProfitBalance.toFixed(2)}
                </div>

                <div className="text-[10px] text-stone-400 space-y-0.5 border-t border-stone-800 pt-2">
                  <p>Active Users: <strong>{activeUsersCount}</strong></p>
                  <p>Monthly Rate: <strong>{banking.monthlyFee}</strong></p>
                  <p>Revenue Split: <strong>80% Tenant Share</strong></p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-950 text-white space-y-2 border border-amber-800/50 shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Tenant Subscription Profit
                </div>

                <div className="text-xl font-black text-emerald-400">
                  R{tenantSubscriptionProfitBalance.toFixed(2)}
                </div>

                <div className="text-[10px] text-amber-200/70 space-y-0.5 border-t border-amber-900/50 pt-2">
                  <p>Tenant Nodes: <strong>{activeTenantNodesCount}</strong></p>
                  <p>Monthly Rate: <strong>{banking.tenantMonthlyFee}</strong></p>
                  <p>Revenue Split: <strong>90% Node Share</strong></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-3 rounded-xl bg-stone-100 border border-stone-200">
                <span className="text-[9px] font-black uppercase text-stone-500 block">Total Registered Users</span>
                <span className="text-lg font-black text-stone-900">{totalUsersCount}</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[9px] font-black uppercase text-emerald-900 block">Active Subscriptions</span>
                <span className="text-lg font-black text-emerald-950">{activeUsersCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab - Tenant Free Trial Management */}
      {activeMenu === 'Settings' && (
        <div className="px-2 py-4 max-w-md mx-auto space-y-4">
          {saveBankMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 font-bold flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>{saveBankMsg}</span>
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4 text-stone-900">
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-950">
                <Gift className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h2 className="text-xs font-black text-stone-900">User Free Trial Configuration</h2>
                <p className="text-[10px] text-stone-500">
                  Decide if new users get a free trial period and specify trial duration in days.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTrialSettings} className="space-y-4 text-xs">
              {/* Enable / Disable Free Trial Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="font-extrabold text-stone-900 block">Enable Free Trial For Users</span>
                  <span className="text-[10px] text-stone-500">Allow users to try platform features without upfront payment</span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setTrialSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    trialSettings.enabled ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      trialSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Free Trial Days Input */}
              {trialSettings.enabled && (
                <div className="space-y-1">
                  <label className="block font-bold text-stone-800">Free Trial Duration (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={trialSettings.trialDays}
                    onChange={(e) =>
                      setTrialSettings({
                        ...trialSettings,
                        trialDays: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 font-black text-stone-900 text-sm"
                  />
                  <p className="text-[10px] text-stone-500">
                    Users will receive <strong>{trialSettings.trialDays} days</strong> of full platform access during their free trial.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-stone-800 flex items-center justify-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                Save Free Trial Settings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Detail Inspection Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto text-xs">
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
              <div
                className="relative flex-shrink-0 cursor-pointer group"
                onClick={() =>
                  selectedProfile.faceImage &&
                  setFullScreenAsset({
                    url: selectedProfile.faceImage,
                    title: `${selectedProfile.firstName} ${selectedProfile.surname} - Profile Face Logo`,
                  })
                }
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-800 bg-stone-100 flex items-center justify-center relative group-hover:opacity-90">
                  {selectedProfile.faceImage ? (
                    <img src={selectedProfile.faceImage} alt="Face Logo" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-stone-400" />
                  )}
                  {selectedProfile.faceImage && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                {selectedProfile.status === 'Approved' && (
                  <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border border-white">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-sm font-black text-stone-900">
                  {selectedProfile.firstName} {selectedProfile.middleName ? `${selectedProfile.middleName} ` : ''}
                  {selectedProfile.surname}
                </h2>
                <span
                  className={`inline-block px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                    selectedProfile.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-900'
                      : selectedProfile.status === 'Rejected'
                      ? 'bg-rose-100 text-rose-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  Status: {selectedProfile.status}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-[11px] text-stone-800">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <h3 className="font-extrabold text-stone-900 text-xs">Personal Information</h3>
                <div className="grid grid-cols-2 gap-1.5 text-stone-700">
                  <div><strong>DOB:</strong> {selectedProfile.dob}</div>
                  <div><strong>Email:</strong> {selectedProfile.email}</div>
                  <div><strong>Contact:</strong> {selectedProfile.contactNumber}</div>
                  <div><strong>Location:</strong> {selectedProfile.location}</div>
                  <div><strong>Province:</strong> {selectedProfile.province}</div>
                  <div className="col-span-2"><strong>Address:</strong> {selectedProfile.address}</div>
                </div>
              </div>

              {/* ID Documents */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-stone-900 text-xs">Uploaded ID Documents</h3>
                  <span className="text-[9px] font-bold text-stone-500">{selectedProfile.documents.length} File(s)</span>
                </div>

                {selectedProfile.documents.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedProfile.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2 rounded-lg bg-white border border-stone-200 flex items-center justify-between text-[10px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-amber-800 flex-shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-stone-900 truncate block">{doc.fileName}</span>
                            <span className="text-stone-500">({doc.type} • {doc.fileSize})</span>
                          </div>
                        </div>

                        {doc.fileUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setFullScreenAsset({
                                url: doc.fileUrl!,
                                title: `${selectedProfile.firstName} ${selectedProfile.surname} - ${doc.type} (${doc.fileName})`,
                                type: doc.fileName.endsWith('.pdf') ? 'pdf' : 'image',
                              })
                            }
                            className="px-2.5 py-1 rounded-md bg-stone-900 text-white text-[10px] font-bold hover:bg-stone-800 flex items-center gap-1 shadow-2xs flex-shrink-0"
                          >
                            <Maximize2 className="w-3 h-3 text-amber-400" />
                            Full Screen
                          </button>
                        ) : (
                          <span className="text-stone-400 italic">No Preview</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 text-[10px]">No documents uploaded.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-3">
              {selectedProfile.status === 'Pending' && (
                <>
                  <button
                    onClick={() => {
                      handleApproveProfile(selectedProfile.id);
                      setSelectedProfile(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Approve Profile
                  </button>

                  <button
                    onClick={() => {
                      setRejectingProfileId(selectedProfile.id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                  >
                    Reject Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Rejection Modal */}
      {rejectingProfileId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3 text-xs">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Reject Profile Verification
            </h3>
            <p className="text-[10px] text-stone-600">
              Specify reason for rejection:
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. ID document image is blurry..."
              className="w-full p-2 rounded-lg border border-stone-300 text-[10px] text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-600 h-20"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setRejectingProfileId(null)}
                className="px-3 py-1 rounded-lg bg-stone-100 text-stone-700 text-[10px] font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectProfile}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PoP Rejection Modal */}
      {rejectingPoPId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3 text-xs">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Reject Proof of Payment (PoP)
            </h3>
            <p className="text-[10px] text-stone-600">
              Specify reason for PoP rejection:
            </p>

            <textarea
              value={popRejectionReason}
              onChange={(e) => setPopRejectionReason(e.target.value)}
              placeholder="e.g. Invalid reference number or incorrect amount..."
              className="w-full p-2 rounded-lg border border-stone-300 text-[10px] text-stone-900 focus:outline-none focus:ring-1 focus:ring-rose-600 h-20"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setRejectingPoPId(null)}
                className="px-3 py-1 rounded-lg bg-stone-100 text-stone-700 text-[10px] font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectPoP}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL */}
      {fullScreenAsset && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-4 animate-fadeIn">
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-2 border-b border-white/20 z-10">
            <h2 className="text-xs sm:text-sm font-extrabold tracking-wide truncate">
              {fullScreenAsset.title}
            </h2>
            <button
              onClick={() => setFullScreenAsset(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <X className="w-5 h-5" />
              Close Full Screen
            </button>
          </div>

          <div className="flex-1 w-full max-w-4xl flex items-center justify-center p-2 overflow-hidden relative">
            {fullScreenAsset.type === 'pdf' ? (
              <iframe
                src={fullScreenAsset.url}
                title={fullScreenAsset.title}
                className="w-full h-full rounded-xl border border-white/20 bg-white"
              />
            ) : (
              <img
                src={fullScreenAsset.url}
                alt={fullScreenAsset.title}
                className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl border border-white/10"
              />
            )}
          </div>

          <p className="text-[10px] text-stone-400 pt-1">
            Tenant Verification View • Press Close to return
          </p>
        </div>
      )}
    </div>
  );
}
