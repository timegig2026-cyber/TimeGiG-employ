import React from 'react';
import { HelpCircle, X, Volume2, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface FeatureHelpModalProps {
  featureName: 'GiGs' | 'Seekers' | 'Tenant' | 'Activation' | 'Profile';
  isOpen: boolean;
  onClose: () => void;
  onRestartTour?: () => void;
}

const FEATURE_GUIDES = {
  GiGs: {
    title: "GiGs Map Quick Guide",
    badge: "GIGS MAP HELP",
    description: "Find nearby freelance work on the satellite map or post a job request for immediate labor.",
    tips: [
      "🗺️ Map Controls: Toggle between Satellite View and Standard Street Map.",
      "📍 GPS Pinpoint: Click anywhere on the map or type an address to post a job at an exact location.",
      "🔒 Privacy Lock: Gig poster phone details stay protected until you accept & apply to a job.",
      "🚗 Route Guidance: Click 'Apply & Navigate' to view live turn-by-turn routing guidelines."
    ],
    audioText: "GiGs Map Quick Guide. Post jobs at exact map locations or apply to nearby work. Contact numbers unlock when an offer is accepted."
  },
  Seekers: {
    title: "Seekers & Radar Live Guide",
    badge: "SEEKERS HELP",
    description: "Discover verified local contractors or activate your own Radar Live status to get hired.",
    tips: [
      "🟢 Radar Live Switch: Turn your Radar Live status ON at the bottom center to become visible to clients.",
      "🔍 Filters: Search contractors by trade category (Plumbing, Electrical, Painting) and distance radius.",
      "🔒 Contact Privacy: Seeker phone number and email remain protected until you accept a match.",
      "🤝 Hiring: Send direct hire invitations with custom proposed budgets and category details."
    ],
    audioText: "Seekers Guide. Turn your Radar Live switch on to get hired immediately, or filter verified specialists nearby."
  },
  Tenant: {
    title: "Tenant Dashboard Guide",
    badge: "TENANT HELP",
    description: "Manage user profiles, review Proof of Payment (PoP) transfers, and share your custom Tenant link.",
    tips: [
      "🟢 Enable/Disable Profiles: Toggle any user or tenant profile between Active and Suspended with 1-click.",
      "📄 Proof of Payment: View uploaded payment receipts and approve tenant subscriptions.",
      "🔗 Tenant Share Link: Share your exact custom link on WhatsApp, Twitter, Facebook, or LinkedIn.",
      "👥 Managed Users: Users who join through your share link are assigned exclusively to your Tenant node."
    ],
    audioText: "Tenant Dashboard Guide. Manage user profiles, review proof of payment transfers, and share your custom tenant link to build your managed network."
  },
  Activation: {
    title: "Activation & Radar Dispatch Guide",
    badge: "ACTIVATION HELP",
    description: "Activate your account status, review verified credentials, and keep your labor radar connected.",
    tips: [
      "⚡ Immediate Activation: Ensure your profile face logo and trade category are configured.",
      "🛡️ ID Verification: Keep your National ID documents attached for instant approval.",
      "📡 Signal Radar: Automatically broadcasts your verified trade to nearby clients."
    ],
    audioText: "Activation Guide. Keep your credentials active to maintain high priority dispatch status on the TimeGiG radar."
  },
  Profile: {
    title: "Profile & Settings Guide",
    badge: "PROFILE HELP",
    description: "Customize your user profile, voice guidance preferences, theme color engine, and share links.",
    tips: [
      "📸 Profile Logo: Upload a face photo (updates tracked with 30-day interval protection).",
      "🔊 Lady Voice: Toggle audio voice guidance ON or OFF.",
      "🎨 Theme Engine: Randomize app theme color palettes (Amber, Emerald, Indigo, Purple, Rose, Teal).",
      "🔄 Restart Rating: Reset your user rating score to 0.0 for a clean fresh start.",
      "🔗 Personal Share Link: Copy or share your exact invite link on social networks."
    ],
    audioText: "Profile and Settings Guide. Update your face logo, toggle voice guidance, change app colors, or share your personal invite link."
  }
};

export function FeatureHelpModal({ featureName, isOpen, onClose, onRestartTour }: FeatureHelpModalProps) {
  if (!isOpen) return null;

  const guide = FEATURE_GUIDES[featureName] || FEATURE_GUIDES.Profile;

  const speakGuideVoice = (text: string) => {
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

  return (
    <div className="fixed inset-0 z-[10000] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200 animate-slide-up flex flex-col text-stone-800">
        
        {/* Modal Header */}
        <div className="p-4.5 bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500 text-stone-950 font-black shadow-xs">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 block">{guide.badge}</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">{guide.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-stone-600 font-medium leading-relaxed">
            {guide.description}
          </p>

          <div className="space-y-2 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
              Feature Walkthrough &amp; Tips
            </span>
            <div className="space-y-2">
              {guide.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-stone-800 font-bold leading-snug">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Explanation Button */}
          <button
            type="button"
            onClick={() => speakGuideVoice(guide.audioText)}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Play Lady Voice Explanation</span>
          </button>

          {/* Restart Tour Option */}
          {onRestartTour && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRestartTour();
              }}
              className="w-full py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-stone-600" />
              <span>Restart Full App Welcome Tour 🚀</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors cursor-pointer"
          >
            Got It, Close Guide
          </button>
        </div>

      </div>
    </div>
  );
}
