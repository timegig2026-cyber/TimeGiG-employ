import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  User,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  FileText,
  Globe,
  ShieldCheck,
  Lock,
  Check,
  AlertCircle,
  Save,
  LogOut
} from 'lucide-react';
import { SocialLink, IDDocument, UserProfileSubmission, ProfileStatus } from '../types/profile';
import { getStoredProfiles, addOrUpdateProfileSubmission, saveStoredProfiles } from '../utils/profileStore';

export function ProfileFeature() {
  // Current submission profile
  const [currentProfile, setCurrentProfile] = useState<UserProfileSubmission | null>(null);

  // Form states
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [lastLogoChangedAt, setLastLogoChangedAt] = useState<string | undefined>(undefined);
  const faceInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<IDDocument[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('National ID');

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [province, setProvince] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
    { id: '1', platform: 'LinkedIn', url: '' },
  ]);

  const [status, setStatus] = useState<ProfileStatus>('Not Submitted');
  const [rejectionReason, setRejectionReason] = useState<string | undefined>(undefined);

  // Warnings and notifications
  const [logoWarning, setLogoWarning] = useState<string | null>(null);
  const [docRequirementError, setDocRequirementError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(false);

  // Load user profile from store persistently
  const loadActiveProfile = useCallback(() => {
    const list = getStoredProfiles();
    if (list.length > 0) {
      const active = list[0];
      setCurrentProfile(active);
      setFaceImage(active.faceImage);
      setLastLogoChangedAt(active.lastLogoChangedAt);
      setDocuments(active.documents || []);
      setFirstName(active.firstName || '');
      setMiddleName(active.middleName || '');
      setSurname(active.surname || '');
      setDob(active.dob || '');
      setAddress(active.address || '');
      setLocation(active.location || '');
      setProvince(active.province || '');
      setContactNumber(active.contactNumber || '');
      setEmail(active.email || '');
      setSocialLinks(
        active.socialLinks && active.socialLinks.length > 0
          ? active.socialLinks
          : [{ id: '1', platform: 'LinkedIn', url: '' }]
      );
      setStatus(active.status);
      setRejectionReason(active.rejectionReason);
    }
  }, []);

  useEffect(() => {
    loadActiveProfile();

    window.addEventListener('profile_store_updated', loadActiveProfile);
    window.addEventListener('storage', loadActiveProfile);
    return () => {
      window.removeEventListener('profile_store_updated', loadActiveProfile);
      window.removeEventListener('storage', loadActiveProfile);
    };
  }, [loadActiveProfile]);

  // Handle Logout
  const handleLogout = () => {
    setIsLoggedOut(true);
    setSaveSuccessMsg('Logged out successfully.');
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  const handleLoginAgain = () => {
    setIsLoggedOut(false);
    loadActiveProfile();
  };

  // Check if logo change is allowed (once a month)
  const canChangeLogo = (): { allowed: boolean; daysRemaining: number; nextDate: string } => {
    if (!lastLogoChangedAt) {
      return { allowed: true, daysRemaining: 0, nextDate: '' };
    }
    const lastDate = new Date(lastLogoChangedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 30) {
      return { allowed: true, daysRemaining: 0, nextDate: '' };
    } else {
      const remaining = 30 - diffDays;
      const nextDateObj = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      return {
        allowed: false,
        daysRemaining: remaining,
        nextDate: nextDateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      };
    }
  };

  // Handle Face Image upload
  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoWarning(null);
    setDocRequirementError(null);
    const check = canChangeLogo();

    if (!check.allowed) {
      setLogoWarning(
        `Profile logo can only be changed once a month. You can change your logo again in ${check.daysRemaining} days (on ${check.nextDate}).`
      );
      if (faceInputRef.current) faceInputRef.current.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceImage(reader.result as string);
        setLastLogoChangedAt(new Date().toISOString());
        setSaveSuccessMsg('Profile logo updated! (Monthly timer reset)');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle ID Document upload
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocRequirementError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newDoc: IDDocument = {
            id: Date.now().toString() + index,
            type: selectedDocType,
            fileName: file.name,
            fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileUrl: reader.result as string,
          };
          setDocuments((prev) => [...prev, newDoc]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const addSocialLink = () => {
    setSocialLinks((prev) => [
      ...prev,
      { id: Date.now().toString(), platform: 'Twitter / X', url: '' },
    ]);
  };

  const updateSocialLink = (id: string, field: 'platform' | 'url', value: string) => {
    setSocialLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, [field]: value } : link))
    );
  };

  const removeSocialLink = (id: string) => {
    setSocialLinks((prev) => prev.filter((link) => link.id !== id));
  };

  // Save / Submit profile
  const handleSaveOrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDocRequirementError(null);

    if (!faceImage) {
      setDocRequirementError('A profile face photo is required to submit for verification.');
      return;
    }

    if (documents.length === 0) {
      setDocRequirementError(
        'It is required to upload at least one ID document (National ID, Passport, Driver\'s License, or Proof of Residence).'
      );
      return;
    }

    const profileId = currentProfile?.id || 'sub-' + Date.now();
    const newStatus: ProfileStatus = status === 'Approved' ? 'Approved' : 'Pending';

    const updatedProfile: UserProfileSubmission = {
      id: profileId,
      submittedAt: currentProfile?.submittedAt || new Date().toISOString(),
      faceImage,
      lastLogoChangedAt,
      firstName,
      middleName,
      surname,
      dob,
      address,
      location,
      province,
      contactNumber,
      email,
      documents,
      socialLinks: socialLinks.filter((s) => s.url.trim().length > 0),
      status: newStatus,
      isLocked: newStatus === 'Approved',
      rejectionReason,
    };

    addOrUpdateProfileSubmission(updatedProfile);
    setCurrentProfile(updatedProfile);
    setStatus(newStatus);

    setSaveSuccessMsg('Profile details and ID documents submitted successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  if (isLoggedOut) {
    return (
      <div className="w-full max-w-sm mx-auto py-12 px-4 text-center space-y-4">
        <div className="p-4 rounded-full bg-stone-100 text-stone-700 w-16 h-16 mx-auto flex items-center justify-center border border-stone-300">
          <LogOut className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-stone-900">Logged Out</h2>
        <p className="text-xs text-stone-600">
          You have been logged out of your profile session.
        </p>
        <button
          onClick={handleLoginAgain}
          className="w-full py-2.5 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-stone-800"
        >
          Sign Back In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto py-4 px-3 text-xs">
      {/* Header Banner with Logout Button */}
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 border border-amber-900/15 text-amber-950 text-[10px] font-black uppercase tracking-wider mb-1 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
            Verification Profile
          </div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">
            User Profile
          </h1>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 text-xs font-bold border border-stone-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          title="Sign out of your profile"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 font-bold flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Required Document Warning Alert */}
      {docRequirementError && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-950 font-semibold flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-rose-900">Required Document Missing:</span> {docRequirementError}
          </div>
        </div>
      )}

      {/* Monthly Logo Warning Alert */}
      {logoWarning && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-950 font-semibold flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-900">Logo Update Limit:</span> {logoWarning}
          </div>
        </div>
      )}

      {/* Verification Status Card */}
      {status === 'Approved' && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-xs flex items-center justify-between gap-3 text-stone-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  Verified Profile Approved
                </span>
                <Lock className="w-3.5 h-3.5 text-stone-600" />
              </div>
              <p className="text-[11px] text-stone-700 mt-0.5">
                Your profile is verified. You can edit your details anytime and save updates.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'Pending' && (
        <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-xs flex items-center justify-between gap-3 text-stone-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
              <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                Under Tenant Review (15–25 Minutes)
              </span>
              <p className="text-[11px] text-stone-700 mt-0.5">
                Your profile submission is being reviewed by the Tenant.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'Rejected' && (
        <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 shadow-xs flex items-start gap-3 text-stone-900">
          <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-rose-950">
              Verification Needs Revision
            </span>
            <p className="text-[11px] text-rose-900 mt-0.5 font-medium">
              Reason: {rejectionReason || 'Please review uploaded ID documents and details before resubmitting.'}
            </p>
          </div>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveOrSubmit} className="space-y-4">
        {/* Section 1: Face Logo with Green Verification Mark Overlay */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <h2 className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5 mb-3">
            <Camera className="w-4 h-4 text-amber-800" />
            1. Profile Face Logo *
            <span className="text-[10px] text-rose-600 font-bold">(Required)</span>
          </h2>

          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full border-2 border-amber-900/20 shadow-sm overflow-hidden bg-stone-100 flex items-center justify-center relative">
                {faceImage ? (
                  <img src={faceImage} alt="Profile Face Logo" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-stone-400" />
                )}
              </div>

              {status === 'Approved' && (
                <div
                  className="absolute -top-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                  title="Tenant Verified Profile"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setLogoWarning(null);
                  const check = canChangeLogo();
                  if (!check.allowed) {
                    setLogoWarning(
                      `Profile logo can only be changed once a month. You can change your logo again in ${check.daysRemaining} days (on ${check.nextDate}).`
                    );
                    return;
                  }
                  faceInputRef.current?.click();
                }}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white shadow-xs transition-transform hover:scale-110"
                title="Change face logo (Max once a month)"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 space-y-1">
              <p className="text-xs font-bold text-stone-900">Face Photo Upload</p>
              <p className="text-[10px] text-stone-500 leading-tight">
                Profile logo can only be changed <strong>once a month</strong>.
              </p>

              <input
                ref={faceInputRef}
                type="file"
                accept="image/*"
                onChange={handleFaceUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => {
                  setLogoWarning(null);
                  const check = canChangeLogo();
                  if (!check.allowed) {
                    setLogoWarning(
                      `Profile logo can only be changed once a month. You can change your logo again in ${check.daysRemaining} days (on ${check.nextDate}).`
                    );
                    return;
                  }
                  faceInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 text-[10px] font-bold border border-stone-300"
              >
                <Upload className="w-3 h-3" />
                Select Photo from Device
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: ID Documents */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-800" />
              2. Upload ID Documents *
            </h2>
            <span className="text-[10px] text-rose-600 font-extrabold">Required</span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-xs font-bold"
              >
                <option value="National ID">National ID Document</option>
                <option value="Passport">Passport</option>
                <option value="Driver's License">Driver's License</option>
                <option value="Proof of Residence">Proof of Residence</option>
              </select>

              <input
                ref={docInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleDocUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-bold hover:bg-amber-950"
              >
                <Upload className="w-3.5 h-3.5" />
                Select ID File(s)
              </button>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-stone-100 border border-stone-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
                      <span className="font-bold text-stone-900 truncate">{doc.fileName}</span>
                      <span className="text-[10px] text-stone-500">({doc.type})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDoc(doc.id)}
                      className="p-1 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-rose-600/80 font-medium italic text-center py-2 bg-rose-50/50 rounded-xl border border-rose-100">
                You must upload at least one ID document (e.g. National ID or Passport).
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Personal Information */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <h2 className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5 mb-3">
            <User className="w-4 h-4 text-amber-800" />
            3. Personal Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">
                Middle Name <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle name"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">Surname *</label>
              <input
                type="text"
                required
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Surname"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">Date of Birth *</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">Address *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Physical address"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">Location / City *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City / Location"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">Province *</label>
              <input
                type="text"
                required
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Province"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">Contact Number *</label>
              <input
                type="tel"
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Phone number"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-0.5">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Social Media Links */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-amber-800" />
              4. Social Media Links
            </h2>
            <button
              type="button"
              onClick={addSocialLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 text-[10px] font-bold hover:bg-amber-200"
            >
              <Plus className="w-3 h-3" />
              Add Link
            </button>
          </div>

          <div className="space-y-2">
            {socialLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-1.5">
                <select
                  value={link.platform}
                  onChange={(e) => updateSocialLink(link.id, 'platform', e.target.value)}
                  className="w-1/3 px-2 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 text-xs font-bold"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter / X">Twitter / X</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Portfolio / Website">Website</option>
                </select>

                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateSocialLink(link.id, 'url', e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-900"
                />

                {socialLinks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSocialLink(link.id)}
                    className="p-1 text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-1">
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-stone-800 active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            {status === 'Approved' ? (
              <>
                <Save className="w-4 h-4 text-emerald-400" />
                Save Profile Changes
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Submit For Verification Review
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
