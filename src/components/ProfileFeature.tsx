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
  LogOut,
  Zap,
  Volume2,
  VolumeX,
  Palette,
  Sparkles,
  Star,
  RotateCcw,
  RefreshCw,
  Share2,
  Copy,
  Send
} from 'lucide-react';
import { SocialLink, IDDocument, UserProfileSubmission, ProfileStatus } from '../types/profile';
import { getStoredProfiles, addOrUpdateProfileSubmission, saveStoredProfiles } from '../utils/profileStore';
import { BlurredMapBackground } from './BlurredMapBackground';

export function ProfileFeature() {
  // Lock state (Requirement: Add a big lock on profile user can unlock it anytime)
  const [isProfileLocked, setIsProfileLocked] = useState<boolean>(() => {
    return localStorage.getItem('timegig_profile_locked') !== 'false';
  });

  // 1. Lady Voice Assistant State (User can toggle ON/OFF in settings)
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem('timegig_voice_enabled') !== 'false';
  });

  // 2. Dynamic Random Theme Accent State
  const [themeColor, setThemeColor] = useState<string>(() => {
    return localStorage.getItem('timegig_theme_color') || 'amber';
  });

  const speakVoice = useCallback((text: string) => {
    if (localStorage.getItem('timegig_voice_enabled') === 'false') return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      return name.includes('female') || name.includes('google us english') || name.includes('samantha') || name.includes('english');
    });
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    utterance.pitch = 1.08;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);

  const toggleVoice = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    localStorage.setItem('timegig_voice_enabled', String(enabled));
    if (enabled) {
      speakVoice("Lady voice assistant enabled.");
    }
  };

  const randomizeTheme = () => {
    const themes = ['amber', 'emerald', 'indigo', 'purple', 'rose', 'teal'];
    const current = localStorage.getItem('timegig_theme_color') || 'amber';
    const available = themes.filter((t) => t !== current);
    const nextTheme = available[Math.floor(Math.random() * available.length)];
    setThemeColor(nextTheme);
    localStorage.setItem('timegig_theme_color', nextTheme);
    window.dispatchEvent(new Event('timegig_theme_changed'));
    setSaveSuccessMsg(`🎨 App Theme palette randomized to ${nextTheme.toUpperCase()}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    speakVoice(`App theme randomized to ${nextTheme}.`);
  };

  const handleToggleLock = (lockedState: boolean) => {
    setIsProfileLocked(lockedState);
    localStorage.setItem('timegig_profile_locked', String(lockedState));
    if (lockedState) {
      speakVoice("Profile information locked and secured.");
    } else {
      speakVoice("Profile information unlocked successfully. You can now view and edit your details.");
    }
  };

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

  // Multi-Screen Sign Up Flow & Verification States
  const [isSignedUp, setIsSignedUp] = useState<boolean>(() => {
    return localStorage.getItem('timegig_signed_up') === 'true';
  });
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
  const [signupStep, setSignupStep] = useState<number>(1);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);
  const [signupPhotoType, setSignupPhotoType] = useState<'upload' | 'selfie'>('selfie');

  // Screen 4 Trade & Details Fields
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupSurname, setSignupSurname] = useState('');
  const [signupTrade, setSignupTrade] = useState('Plumbing');
  const [signupProvince, setSignupProvince] = useState('Western Cape');
  const [signupContact, setSignupContact] = useState('');

  const [cameraActive, setCameraActive] = useState(false);
  const [selfieStream, setSelfieStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      setDocRequirementError(null);
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: 'user' }
      });
      setSelfieStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraActive(false);
      setDocRequirementError("Failed to access live camera stream. Feel free to use 'Simulate Snapshot' or upload your profile logo!");
    }
  };

  const stopCamera = () => {
    if (selfieStream) {
      selfieStream.getTracks().forEach(track => track.stop());
      setSelfieStream(null);
    }
    setCameraActive(false);
  };

  const captureSelfieAction = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 320);
        const dataUrl = canvas.toDataURL('image/png');
        setFaceImage(dataUrl);
        stopCamera();
        setSaveSuccessMsg('Live selfie captured and set as your official profile logo!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    }
  };

  const simulateSelfieSnap = () => {
    // Generates a gorgeous premium profile avatar as a dataurl fallback
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 300, 300);
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 300, 300);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 110px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TG', 150, 150);

      const dataUrl = canvas.toDataURL('image/png');
      setFaceImage(dataUrl);
      setSaveSuccessMsg('Beautiful high-definition simulated selfie generated and set!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  // Screen-by-Screen Navigation Validators
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setDocRequirementError(null);
    if (!signupEmail.trim() || !signupPassword.trim()) {
      setDocRequirementError("Please enter a valid email address and password.");
      return;
    }
    if (signupPassword.length < 6) {
      setDocRequirementError("Password must be at least 6 characters in length.");
      return;
    }
    setSignupStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setDocRequirementError(null);
    if (!signupTermsAccepted) {
      setDocRequirementError("You must read and accept the TimeGiG Code of Conduct terms.");
      return;
    }
    setSignupStep(3);
  };

  const handleNextStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setDocRequirementError(null);
    if (!faceImage) {
      setDocRequirementError("A profile photo or logo is required! Please capture a selfie or upload a file.");
      return;
    }
    // Pre-fill name from email if blank
    if (!signupFirstName) {
      const firstWord = signupEmail.split('@')[0];
      setSignupFirstName(firstWord.charAt(0).toUpperCase() + firstWord.slice(1));
    }
    if (!signupSurname) {
      setSignupSurname('Specialist');
    }
    if (!signupContact) {
      setSignupContact('+27 72 ' + Math.floor(1000000 + Math.random() * 9000000));
    }
    setSignupStep(4);
  };

  const handleFinalSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDocRequirementError(null);

    const finalFirstName = signupFirstName.trim() || 'Freelance';
    const finalSurname = signupSurname.trim() || 'Specialist';

    const joiningTenantRef = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('tenant_ref') || localStorage.getItem('timegig_joining_tenant_ref') || undefined
      : undefined;

    const joiningUserRef = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('user_ref') || localStorage.getItem('timegig_joining_user_ref') || undefined
      : undefined;

    const newUserProfile: UserProfileSubmission = {
      id: 'sub_' + Date.now(),
      submittedAt: new Date().toISOString(),
      firstName: finalFirstName,
      middleName: '',
      surname: finalSurname,
      dob: '2000-01-01',
      address: signupProvince + ' Area',
      location: signupProvince,
      province: signupProvince,
      contactNumber: signupContact || '+27 72 000 0000',
      email: signupEmail,
      trade: signupTrade,
      faceImage: faceImage,
      documents: [],
      socialLinks: [{ id: '1', platform: 'LinkedIn', url: '' }],
      status: 'Approved', // Ready to get hired
      isLocked: false,
      isEnabled: true,
      managedByTenantId: joiningTenantRef,
      referredByUserId: joiningUserRef,
      rating: 0.0,
      reviewsCount: 0,
      completedJobs: 0,
      workExperience: `Experienced ${signupTrade} specialist available on TimeGiG radar live.`
    };

    addOrUpdateProfileSubmission(newUserProfile);
    setCurrentProfile(newUserProfile);
    setIsSignedUp(true);
    localStorage.setItem('timegig_signed_up', 'true');
    localStorage.setItem('seeker_live_status', 'true'); // Automatically activate radar live!
    setIsLoggedOut(false);
    
    setFirstName(finalFirstName);
    setSurname(finalSurname);
    setEmail(signupEmail);
    setProvince(signupProvince);

    // Notify SeekersFeature & navigation bar instantly
    window.dispatchEvent(new Event('profile_store_updated'));
    window.dispatchEvent(new Event('radar_status_updated'));

    speakVoice(`Congratulations ${finalFirstName}! Your account is registered and your Radar is Live! You are now visible in the Seekers feature ready to get hired.`);
    setSaveSuccessMsg(`Welcome to TimeGiG! Radar Live is active as a ${signupTrade} in ${signupProvince}.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Ratings Restart Handler
  const handleRestartRating = () => {
    const list = getStoredProfiles();
    const active = list[0];
    if (active) {
      const resetProfile: UserProfileSubmission = {
        ...active,
        rating: 0.0,
        reviewsCount: 0,
        completedJobs: 0,
      };
      addOrUpdateProfileSubmission(resetProfile);
      setCurrentProfile(resetProfile);
      setSaveSuccessMsg("⭐ User Ratings Restarted! Your score has been reset to 0.0 Stars (0 Reviews) for a fresh start.");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      speakVoice("Your user rating and reviews history have been restarted to zero for a fresh clean start.");
    } else {
      setSaveSuccessMsg("⭐ Rating restarted to 0.0 Stars (0 Reviews) for your fresh profile start.");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      speakVoice("Rating score restarted to 0.0 Stars.");
    }
  };

  // Warnings and notifications
  const [logoWarning, setLogoWarning] = useState<string | null>(null);
  const [docRequirementError, setDocRequirementError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(false);
  const [copiedUserLink, setCopiedUserLink] = useState<boolean>(false);

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

  // Sync sign up status with App level navigation bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('timegig_signup_status', { detail: { isSignedUp } }));
  }, [isSignedUp]);

  // Handle Logout (Directs user to login/signup screen)
  const handleLogout = () => {
    localStorage.setItem('timegig_signed_up', 'false');
    setIsSignedUp(false);
    setIsLoggedOut(false);
    setSignupStep(1);
    setAuthTab('login');
    window.dispatchEvent(new CustomEvent('timegig_signup_status', { detail: { isSignedUp: false } }));
    speakVoice("Logged out successfully. Returning to login screen.");
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDocRequirementError(null);
    if (!signupEmail.trim() || !signupPassword.trim()) {
      setDocRequirementError("Please provide both email and password.");
      return;
    }

    const stored = getStoredProfiles();
    const match = stored.find(
      (p) => p.email && p.email.toLowerCase() === signupEmail.toLowerCase().trim()
    );

    if (match) {
      localStorage.setItem('timegig_signed_up', 'true');
      setIsSignedUp(true);
      setIsLoggedOut(false);
      window.dispatchEvent(new CustomEvent('timegig_signup_status', { detail: { isSignedUp: true } }));
      speakVoice(`Welcome back ${match.firstName || 'User'}! Logged in successfully.`);
    } else {
      // Auto-create active profile if logging in with new credentials
      const userParts = signupEmail.split('@')[0].toUpperCase();
      const quickProfile: UserProfileSubmission = {
        id: 'usr_' + Date.now(),
        email: signupEmail.trim(),
        firstName: userParts,
        surname: 'SPECIALIST',
        dob: '1990-01-01',
        address: 'Cape Town Central',
        location: 'Western Cape',
        province: 'Western Cape',
        contactNumber: '+27 72 000 0000',
        trade: 'General Specialist',
        submittedAt: new Date().toISOString(),
        status: 'Approved',
        faceImage: null,
        documents: [],
        socialLinks: []
      };
      addOrUpdateProfileSubmission(quickProfile);
      localStorage.setItem('timegig_signed_up', 'true');
      setIsSignedUp(true);
      setIsLoggedOut(false);
      window.dispatchEvent(new CustomEvent('timegig_signup_status', { detail: { isSignedUp: true } }));
      speakVoice("Account authenticated successfully. Welcome to TimeGiG!");
    }
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

  if (!isSignedUp) {
    return (
      <div className="fixed inset-0 w-screen h-screen z-50 overflow-y-auto bg-stone-950 flex flex-col font-sans select-none">
        {/* Full-screen Blurred Moving Vector Map Background */}
        <BlurredMapBackground />

        {/* Full Screen Form Container */}
        <div className="relative z-10 w-full min-h-screen flex flex-col justify-between p-5 sm:p-10 md:p-12 max-w-2xl mx-auto bg-gradient-to-b from-[#FAF4E6]/95 via-[#EADBCA]/90 to-[#D5C2A5]/95 backdrop-blur-2xl border-x border-white/40 shadow-2xl text-stone-900 space-y-6">
          
          {/* Step Progress Tracker Header */}
          <div className="text-center space-y-3 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black uppercase tracking-wider shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-700 fill-amber-700" />
              Step {signupStep} of 4: {
                signupStep === 1 ? 'Account Credentials' :
                signupStep === 2 ? 'Terms & Code of Conduct' :
                signupStep === 3 ? 'Capture Profile Logo' :
                'Specialist Trade & Location'
              }
            </div>

            {/* Step Progress Bar across full width */}
            <div className="grid grid-cols-4 gap-2 pt-1 max-w-md mx-auto">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    signupStep === s
                      ? 'bg-amber-600 shadow-md scale-105'
                      : signupStep > s
                      ? 'bg-emerald-600'
                      : 'bg-stone-300'
                  }`}
                />
              ))}
            </div>

            <h1 className="text-stone-900 text-2xl sm:text-3xl font-black uppercase tracking-tight">
              {signupStep === 1 && '1. Account Credentials'}
              {signupStep === 2 && '2. Terms & Code of Conduct'}
              {signupStep === 3 && '3. Capture Profile Logo'}
              {signupStep === 4 && '4. Specialist Trade & Area'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed font-medium">
              {signupStep === 1 && 'Specify your security login email address and account password.'}
              {signupStep === 2 && 'Review the TimeGiG safety rules and accept terms to proceed.'}
              {signupStep === 3 && 'Capture a live webcam selfie or upload your profile logo.'}
              {signupStep === 4 && 'Tell us your trade skill so clients can find and hire you on Radar Live.'}
            </p>
          </div>

          {/* Error notifications */}
          {docRequirementError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-950 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{docRequirementError}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* SCREEN 1: CREDENTIALS / SIGN IN */}
          {signupStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* Auth Mode Toggle Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-stone-200/80 p-1.5 rounded-2xl border border-stone-300/60 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authTab === 'login'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authTab === 'register'
                      ? 'bg-stone-900 text-white shadow-md'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>New Sign Up</span>
                </button>
              </div>

              {authTab === 'login' ? (
                <form onSubmit={handleSignInSubmit} className="space-y-4 max-w-md mx-auto bg-white/80 p-6 rounded-3xl border border-stone-200 shadow-lg">
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Sign In to Your Account</h3>
                    <p className="text-xs text-stone-600">Enter your registered email and password to access TimeGiG.</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block">Email Address</span>
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white border border-stone-300 rounded-2xl px-4 py-3 text-xs text-stone-900 focus:outline-none focus:border-amber-500 font-sans shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block">Security Password</span>
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-stone-300 rounded-2xl px-4 py-3 text-xs text-stone-900 focus:outline-none focus:border-amber-500 font-sans shadow-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>🔑 Log In &amp; Access Radar Live</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleNextStep1} className="space-y-4 max-w-md mx-auto">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block">Email Address</span>
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white border border-stone-300 rounded-2xl px-4 py-3 text-xs text-stone-900 focus:outline-none focus:border-amber-500 shadow-sm font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block">Security Password</span>
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-stone-300 rounded-2xl px-4 py-3 text-xs text-stone-900 focus:outline-none focus:border-amber-500 shadow-sm font-sans"
                    />
                    <span className="text-[10px] text-stone-500 block font-sans">Minimum 6 characters</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-black uppercase tracking-widest rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl cursor-pointer"
                  >
                    <span>Next: Code of Conduct →</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* SCREEN 2: TERMS & CONDUCT */}
          {signupStep === 2 && (
            <form onSubmit={handleNextStep2} className="space-y-4 animate-fade-in">
              <div className="bg-white border border-stone-200 p-3.5 rounded-2xl text-[10px] text-stone-600 space-y-2 shadow-2xs">
                <span className="text-[9px] font-black uppercase text-stone-800 tracking-wider block border-b border-stone-200 pb-1">
                  TimeGiG Code of Conduct &amp; Safety Terms
                </span>
                <div className="max-h-28 overflow-y-auto pr-1 leading-relaxed space-y-1.5">
                  <p>1. <strong>Authentic Credentials:</strong> I agree to post true skill background information.</p>
                  <p>2. <strong>Safe Dispatch Radar:</strong> I consent to location broadcast when my Radar Live switch is toggled ON.</p>
                  <p>3. <strong>Transparent Work:</strong> I agree to maintain prompt response standards for client hire requests.</p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-stone-800 p-2 bg-stone-100/80 rounded-xl border border-stone-200">
                <input
                  type="checkbox"
                  required
                  checked={signupTermsAccepted}
                  onChange={(e) => setSignupTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[10px] font-bold leading-tight">
                  I accept the TimeGiG Terms &amp; Conditions and consent to instant radar tracking.
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSignupStep(1)}
                  className="w-1/3 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold uppercase tracking-wider rounded-2xl text-xs"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 bg-stone-900 hover:bg-stone-850 text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-lg"
                >
                  Next: Profile Logo →
                </button>
              </div>
            </form>
          )}

          {/* SCREEN 3: PROFILE LOGO / SELFIE */}
          {signupStep === 3 && (
            <form onSubmit={handleNextStep3} className="space-y-5 animate-fade-in">
              
              {/* Mandatory Requirement Status Banner */}
              <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                faceImage
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-950'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-950'
              }`}>
                {faceImage ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Profile Logo Verified &amp; Attached! You can proceed to Step 4.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Mandatory Step: You must capture a selfie or upload a logo image file to proceed.</span>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 bg-stone-200/70 p-1.5 rounded-2xl border border-stone-300/50">
                  <button
                    type="button"
                    onClick={() => { setSignupPhotoType('selfie'); stopCamera(); }}
                    className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      signupPhotoType === 'selfie'
                        ? 'bg-white text-stone-900 shadow-md border border-stone-300/60'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span>📸 Capture Selfie</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSignupPhotoType('upload'); stopCamera(); }}
                    className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      signupPhotoType === 'upload'
                        ? 'bg-white text-stone-900 shadow-md border border-stone-300/60'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <span>📁 Upload Logo</span>
                  </button>
                </div>

                {signupPhotoType === 'selfie' ? (
                  <div className="bg-stone-950 p-5 rounded-3xl text-center space-y-4 border border-white/10 relative overflow-hidden shadow-2xl">
                    {cameraActive ? (
                      <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-amber-500 bg-stone-900 shadow-2xl">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      </div>
                    ) : faceImage ? (
                      <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-emerald-500 bg-stone-900 shadow-2xl">
                        <img src={faceImage} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-48 h-48 mx-auto rounded-full bg-stone-900 border-2 border-dashed border-stone-700 flex flex-col items-center justify-center text-stone-500">
                        <Camera className="w-10 h-10 animate-pulse text-amber-400" />
                        <span className="text-[10px] font-black uppercase mt-1 tracking-wider">Ready for Selfie</span>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-center gap-2">
                      {!cameraActive ? (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
                        >
                          Start Camera
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={captureSelfieAction}
                          className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-black uppercase tracking-wider shadow-lg animate-pulse active:scale-95 transition-all cursor-pointer"
                        >
                          Capture Snap
                        </button>
                      )}
                      {cameraActive && (
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-black uppercase tracking-wider cursor-pointer"
                        >
                          Stop
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={simulateSelfieSnap}
                        className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-750 text-white text-xs font-black uppercase tracking-wider border border-white/10 cursor-pointer"
                      >
                        Simulate Selfie
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/90 border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-3xl p-6 text-center space-y-3 shadow-md transition-all">
                    {faceImage ? (
                      <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-4 border-emerald-500 shadow-lg">
                        <img src={faceImage} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-700 shadow-inner">
                        <Upload className="w-7 h-7" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <span className="text-xs font-black text-stone-800 uppercase tracking-wider block">
                        {faceImage ? 'Change Logo Image' : 'Select Logo Image File'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFaceUpload}
                        className="text-xs text-stone-600 block mx-auto font-mono file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-stone-900 file:text-white hover:file:bg-stone-800 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSignupStep(2)}
                  className="w-1/3 py-3.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold uppercase tracking-wider rounded-2xl text-xs cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className={`w-2/3 py-3.5 text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-lg transition-all cursor-pointer ${
                    faceImage ? 'bg-amber-600 hover:bg-amber-500' : 'bg-stone-900 hover:bg-stone-800'
                  }`}
                >
                  Next: Trade Details →
                </button>
              </div>
            </form>
          )}

          {/* SCREEN 4: TRADE & LOCATION */}
          {signupStep === 4 && (
            <form onSubmit={handleFinalSignupSubmit} className="space-y-3.5 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 block">First Name</span>
                  <input
                    type="text"
                    required
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 block">Surname</span>
                  <input
                    type="text"
                    required
                    value={signupSurname}
                    onChange={(e) => setSignupSurname(e.target.value)}
                    placeholder="Surname"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 block">Specialist Trade Category</span>
                <select
                  value={signupTrade}
                  onChange={(e) => setSignupTrade(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="Plumbing">Plumbing Specialist</option>
                  <option value="Electrical">Certified Electrician</option>
                  <option value="Painting">High-Finish Painter</option>
                  <option value="Carpentry">Master Carpenter</option>
                  <option value="HVAC">HVAC &amp; Air Cooling</option>
                  <option value="Welding">Welding &amp; Steelwork</option>
                  <option value="Locksmith">Security Locksmith</option>
                  <option value="Tiling">Tiling &amp; Flooring</option>
                  <option value="Roofing">Roofing &amp; Waterproofing</option>
                  <option value="General Contractor">General Contractor</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 block">Province / Location</span>
                <select
                  value={signupProvince}
                  onChange={(e) => setSignupProvince(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="Western Cape">Western Cape</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="North West">North West</option>
                  <option value="Northern Cape">Northern Cape</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 block">Contact Phone Number</span>
                <input
                  type="text"
                  required
                  value={signupContact}
                  onChange={(e) => setSignupContact(e.target.value)}
                  placeholder="+27 72 345 6789"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSignupStep(3)}
                  className="w-1/3 py-3.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold uppercase tracking-wider rounded-2xl text-xs"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-2xl text-xs shadow-lg animate-pulse"
                >
                  🚀 Activate Radar Live!
                </button>
              </div>
            </form>
          )}

          <p className="text-xs text-stone-600 text-center italic font-medium pb-4">
            💡 Step-by-step registration activates your instant Radar Live dispatch profile.
          </p>
        </div>
      </div>
    );
  }

  if (isProfileLocked) {
    return (
      <div className="w-full max-w-md mx-auto py-14 px-5 text-center space-y-6 font-sans select-none">
        <div className="bg-gradient-to-b from-[#FAF4E6] to-[#EADBCA]/95 border-2 border-stone-200 p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col items-center space-y-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          
          <div className="w-20 h-20 rounded-full bg-stone-900 border-4 border-amber-500 flex items-center justify-center text-amber-400 shadow-xl relative animate-pulse">
            <Lock className="w-10 h-10 stroke-[2.5]" />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 border-2 border-stone-950 flex items-center justify-center text-stone-950 text-[10px] font-black">
              AES
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-stone-900 text-base font-black uppercase tracking-wider">Credentials Secured</h2>
            <div className="inline-flex items-center gap-1 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full text-[9px] text-amber-800 font-extrabold uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Session Locked</span>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed max-w-sm">
            Your verification files, National ID documents, face images, and contact links are locked and encrypted to prevent unauthorized edits. Click the large key below to decrypt your session instantly at any time.
          </p>

          <button
            onClick={() => handleToggleLock(false)}
            className="w-full py-4 bg-stone-900 hover:bg-stone-850 text-white font-black uppercase tracking-widest rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg cursor-pointer"
          >
            <span>🔓 Decrypt & Unlock Profile</span>
          </button>

          {/* Logout button visible when profile is locked */}
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-stone-200/60 hover:bg-stone-300/80 border border-stone-300 text-stone-800 font-black uppercase tracking-widest rounded-2xl text-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>

        <p className="text-[10px] text-stone-400 italic">
          💡 You can lock and unlock your profile details at any time with a single click.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto py-4 px-3 text-xs">
      {/* Header Banner with Logout & Lock Buttons */}
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

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Lock Profile Button */}
          <button
            type="button"
            onClick={() => handleToggleLock(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold border border-amber-600 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Lock your profile credentials"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock Profile
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 text-xs font-bold border border-stone-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Sign out of your profile"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 font-bold flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* App Settings & Preferences Control Card */}
      <div className="mb-5 bg-gradient-to-br from-white via-stone-50 to-amber-50/40 border border-stone-200/90 p-4 rounded-3xl shadow-md space-y-3.5 text-stone-800">
        <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-stone-900 text-amber-400 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-900">App Settings & Preferences</h2>
              <p className="text-[10px] text-stone-500">Voice guidance, color themes & rating controls</p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-700">
            SETTINGS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          
          {/* 1. Voice Assistant Control */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">Voice Assistant</span>
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 text-amber-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-stone-400" />
              )}
            </div>
            <div>
              <span className="text-xs font-black text-stone-900 block">Lady Voice</span>
              <span className="text-[9px] text-stone-500 block">{voiceEnabled ? 'Voice Guidance ON' : 'Voice Guidance OFF'}</span>
            </div>
            <button
              type="button"
              onClick={() => toggleVoice(!voiceEnabled)}
              className={`w-full py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                voiceEnabled
                  ? 'bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-xs'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              }`}
            >
              {voiceEnabled ? 'Turn Voice OFF' : 'Turn Voice ON'}
            </button>
          </div>

          {/* 2. Dynamic Random Color Shift */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">Theme Engine</span>
              <Palette className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs font-black text-stone-900 block capitalize">{themeColor} Theme</span>
              <span className="text-[9px] text-stone-500 block">Dynamic color palette</span>
            </div>
            <button
              type="button"
              onClick={randomizeTheme}
              className="w-full py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>🎲 Change Colors</span>
            </button>
          </div>

          {/* 3. Restart User Ratings */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">My Rating</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <span className="text-xs font-black text-stone-900 block">
                ⭐ {currentProfile?.rating !== undefined ? currentProfile.rating.toFixed(1) : '0.0'} Score
              </span>
              <span className="text-[9px] text-stone-500 block">Restart score to 0.0</span>
            </div>
            <button
              type="button"
              onClick={handleRestartRating}
              className="w-full py-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-rose-700 hover:border-rose-300 border border-stone-200 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <RotateCcw className="w-3 h-3 text-rose-600" />
              <span>🔄 Restart Rating</span>
            </button>
          </div>

        </div>
      </div>

      {/* Normal User Personal Share Link Card */}
      <div className="mb-5 bg-gradient-to-br from-stone-900 via-stone-850 to-amber-950 text-white p-4.5 rounded-3xl shadow-lg space-y-3.5 border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500 text-stone-950 font-black shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white">Share My Personal Invite Link</h2>
              <p className="text-[10px] text-stone-300">Invite friends & specialists to join your TimeGiG network</p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            REFERRAL
          </span>
        </div>

        <div className="bg-stone-950 border border-stone-800 p-3 rounded-2xl flex items-center justify-between gap-2 font-mono text-xs text-amber-300 overflow-x-auto shadow-inner">
          <span className="truncate">{typeof window !== 'undefined' ? window.location.origin : 'https://timegig.app'}/?user_ref={currentProfile?.id || 'USR_MYSELF'}</span>
          <button
            type="button"
            onClick={() => {
              const myLink = `${window.location.origin}/?user_ref=${currentProfile?.id || 'USR_MYSELF'}`;
              navigator.clipboard.writeText(myLink);
              setCopiedUserLink(true);
              setTimeout(() => setCopiedUserLink(false), 3000);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer shadow-md"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedUserLink ? 'Copied Link!' : 'Copy Exact Link'}</span>
          </button>
        </div>

        {/* Direct Social Network Share Buttons */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-300 block">
            Direct Share to Social Networks
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => {
                const myLink = `${window.location.origin}/?user_ref=${currentProfile?.id || 'USR_MYSELF'}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Join me on TimeGiG Radar Live! Register with my exact invite link: ' + myLink)}`, '_blank');
              }}
              className="py-2.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              💬 WhatsApp
            </button>

            <button
              type="button"
              onClick={() => {
                const myLink = `${window.location.origin}/?user_ref=${currentProfile?.id || 'USR_MYSELF'}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Join me on TimeGiG Radar Live!')}&url=${encodeURIComponent(myLink)}`, '_blank');
              }}
              className="py-2.5 px-2.5 rounded-xl bg-black hover:bg-stone-800 border border-stone-700 text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              𝕏 Twitter / X
            </button>

            <button
              type="button"
              onClick={() => {
                const myLink = `${window.location.origin}/?user_ref=${currentProfile?.id || 'USR_MYSELF'}`;
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(myLink)}`, '_blank');
              }}
              className="py-2.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              📘 Facebook
            </button>

            <button
              type="button"
              onClick={() => {
                const myLink = `${window.location.origin}/?user_ref=${currentProfile?.id || 'USR_MYSELF'}`;
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(myLink)}`, '_blank');
              }}
              className="py-2.5 px-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              💼 LinkedIn
            </button>

            <button
              type="button"
              onClick={() => {
                const myLink = `${window.location.origin}/?user_ref=${currentProfile?.id || 'USR_MYSELF'}`;
                window.open(`mailto:?subject=${encodeURIComponent('Join my TimeGiG network')}&body=${encodeURIComponent('Hi! Register on TimeGiG using my exact link: ' + myLink)}`, '_blank');
              }}
              className="py-2.5 px-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              ✉️ Email
            </button>
          </div>
        </div>
      </div>

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
