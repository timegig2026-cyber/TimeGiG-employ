import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Map,
  Compass,
  Building2,
  UserCheck,
  Share2,
  Volume2,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Play
} from 'lucide-react';

interface WelcomeOnboardingProps {
  onComplete?: () => void;
  isOpenManual?: boolean;
  onCloseManual?: () => void;
}

interface TourStep {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  description: string;
  highlights: string[];
  audioText: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to TimeGiG!",
    subtitle: "Your On-Demand Labor Radar Network",
    icon: Sparkles,
    color: "from-amber-500 to-amber-600",
    badge: "STEP 1 OF 6",
    description: "Welcome to South Africa's premier real-time labor dispatch platform! TimeGiG connects local gig workers, freelancers, and clients with instant GPS radar tracking.",
    highlights: [
      "📍 Live GPS Radar map of nearby jobs and specialists",
      "🛡️ Verified National ID & face logo credentials",
      "💬 Direct phone & WhatsApp contacts unlocked upon offer acceptance"
    ],
    audioText: "Welcome to TimeGiG! Your on-demand labor radar network. We are excited to guide you through our core features."
  },
  {
    title: "GiGs Map & Job Posting",
    subtitle: "Find & Post Real-Time Gig Jobs Nearby",
    icon: Map,
    color: "from-blue-600 to-indigo-600",
    badge: "STEP 2 OF 6",
    description: "Explore nearby jobs on an interactive satellite map or post your own gig request in seconds with pinpoint GPS coordinates.",
    highlights: [
      "🗺️ Toggle between Satellite View and Standard Street Map",
      "➕ Post gig jobs with custom payouts and optional auto-expiry limits",
      "🚗 Real-time smooth route navigation guidance to work locations"
    ],
    audioText: "GiGs Map lets you explore nearby work on a satellite map, post gig jobs, and navigate directly with live turn-by-turn guidance."
  },
  {
    title: "Seekers & Radar Live",
    subtitle: "Search, Hire & Activate Your Work Radar",
    icon: Compass,
    color: "from-emerald-600 to-teal-600",
    badge: "STEP 3 OF 6",
    description: "Find verified local specialists by trade category or switch your own Radar Live status ON to get discovered and hired by clients.",
    highlights: [
      "🟢 Turn Radar Live ON/OFF to control your work availability",
      "⭐ Filter contractors by trade, star ratings, and distance radius",
      "🤝 Send instant work invitations & unlock contact phone numbers upon acceptance"
    ],
    audioText: "Seekers lets you find verified contractors nearby or turn your Radar Live switch on to get hired immediately."
  },
  {
    title: "Tenant Node Dashboard",
    subtitle: "Manage Users & Proof of Payment",
    icon: Building2,
    color: "from-purple-600 to-indigo-700",
    badge: "STEP 4 OF 6",
    description: "Tenants receive their own admin dashboard to review user verifications, upload Proof of Payment (PoP), and oversee managed network members.",
    highlights: [
      "🟢 Enable or Disable user and tenant profiles with 1-click control",
      "📄 Review Proof of Payment (PoP) bank transfers",
      "👥 Filter and manage users who registered through your Tenant link"
    ],
    audioText: "The Tenant Dashboard provides full administrative management over verified profiles, proof of payment transfers, and assigned users."
  },
  {
    title: "Profile, Voice & Settings",
    subtitle: "Custom Logos, Voice Guidance & Themes",
    icon: UserCheck,
    color: "from-amber-600 to-rose-600",
    badge: "STEP 5 OF 6",
    description: "Customize your profile with a face image logo, lock credentials for session security, toggle Lady Voice Guidance, or change app color themes.",
    highlights: [
      "📸 Upload custom profile logo with 30-day update tracking",
      "🔊 Toggle Lady Voice Guidance ON/OFF anytime",
      "🎲 Dynamic color theme generator & user rating restart controls"
    ],
    audioText: "In your Profile settings, you can manage your face logo, session security, lady voice guidance, and app theme colors."
  },
  {
    title: "Personal Referral Links",
    subtitle: "Share on Social Media & Grow Your Network",
    icon: Share2,
    color: "from-emerald-600 to-cyan-600",
    badge: "STEP 6 OF 6",
    description: "Every user and Tenant receives an exact unique share link to invite friends or clients across major social networks.",
    highlights: [
      "💬 1-Click direct sharing to WhatsApp, Twitter/X, Facebook, LinkedIn & Email",
      "📋 1-Click exact link copy button",
      "👥 Automatic tracking of users who register through your link"
    ],
    audioText: "Share your exact referral link on WhatsApp and social media to invite friends and build your managed network. You are now ready to use TimeGiG!"
  }
];

export function WelcomeOnboarding({ onComplete, isOpenManual, onCloseManual }: WelcomeOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  useEffect(() => {
    if (isOpenManual) {
      setIsTourActive(true);
      setCurrentStep(0);
      return;
    }

    const completed = localStorage.getItem('timegig_onboarding_completed') === 'true';
    if (!completed) {
      setIsTourActive(true);
      setCurrentStep(0);
    }
  }, [isOpenManual]);

  const speakStepVoice = (text: string) => {
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
  };

  useEffect(() => {
    if (isTourActive) {
      speakStepVoice(TOUR_STEPS[currentStep].audioText);
    }
  }, [currentStep, isTourActive]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('timegig_onboarding_completed', 'true');
    setIsTourActive(false);
    if (onComplete) onComplete();
    if (onCloseManual) onCloseManual();
  };

  if (!isTourActive) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-[10000] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 animate-slide-up flex flex-col text-stone-800">
        
        {/* Header Banner */}
        <div className={`p-6 bg-gradient-to-r ${step.color} text-white relative overflow-hidden flex items-center justify-between`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-1.5 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/20 text-white text-[9px] font-black uppercase tracking-widest border border-white/20">
              {step.badge}
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">{step.title}</h2>
            <p className="text-xs text-white/80 font-medium">{step.subtitle}</p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 relative z-10 shadow-lg">
            <StepIcon className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 flex-1">
          <p className="text-xs text-stone-600 leading-relaxed font-medium">
            {step.description}
          </p>

          <div className="bg-stone-50 border border-stone-200/80 p-3.5 rounded-2xl space-y-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
              Key Highlights
            </span>
            <div className="space-y-1.5">
              {step.highlights.map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-xs text-stone-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Replay Button */}
          <button
            type="button"
            onClick={() => speakStepVoice(step.audioText)}
            className="w-full py-2 bg-stone-100 hover:bg-amber-50 text-stone-800 border border-stone-200 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Play Lady Voice Explanation</span>
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-6 py-2 flex items-center justify-center gap-1.5 border-t border-stone-100">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep ? 'w-6 bg-stone-900' : 'w-1.5 bg-stone-200'
              }`}
            />
          ))}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleFinish}
            className="px-3 py-2 text-stone-500 hover:text-stone-900 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3.5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-2xl text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-black uppercase tracking-wider rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour 🚀' : 'Next Step'}</span>
              {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
