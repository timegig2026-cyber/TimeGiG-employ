import React from 'react';
import { MapPin, Navigation, Compass, Radio, ShieldCheck, Zap } from 'lucide-react';

export function BlurredMapBackground() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-stone-950">
      {/* CSS Keyframes for smooth random map movement */}
      <style>{`
        @keyframes randomMapMove1 {
          0% { transform: translate(0px, 0px) scale(1.05) rotate(0deg); }
          25% { transform: translate(-40px, -35px) scale(1.1) rotate(1.5deg); }
          50% { transform: translate(35px, -50px) scale(1.02) rotate(-1deg); }
          75% { transform: translate(-25px, 40px) scale(1.08) rotate(0.8deg); }
          100% { transform: translate(0px, 0px) scale(1.05) rotate(0deg); }
        }

        @keyframes randomMapMove2 {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(50px, 30px) scale(1.06) rotate(-2deg); }
          66% { transform: translate(-30px, -40px) scale(0.98) rotate(1deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
        }

        @keyframes radarRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .animate-map-move-1 {
          animation: randomMapMove1 24s ease-in-out infinite alternate;
        }

        .animate-map-move-2 {
          animation: randomMapMove2 30s ease-in-out infinite alternate;
        }

        .animate-radar-sweep {
          animation: radarRotate 12s linear infinite;
        }

        .animate-ping-ring {
          animation: pulseRing 3.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Primary Moving Map SVG & Road Network Layer */}
      <div className="absolute -inset-[30%] w-[160%] h-[160%] opacity-55 filter blur-[10px] animate-map-move-1">
        <svg className="w-full h-full stroke-amber-500/25 fill-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" strokeWidth="0.8" className="stroke-stone-700/40" />
            </pattern>
            <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Map Grid Pattern */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Major Highways and Arterial Roads */}
          <path d="M -100 200 C 300 150, 700 450, 1200 300" strokeWidth="6" className="stroke-amber-500/40" />
          <path d="M -50 800 C 400 650, 600 200, 1300 700" strokeWidth="8" className="stroke-stone-500/40" />
          <path d="M 300 -100 C 250 400, 850 600, 700 1200" strokeWidth="5" className="stroke-amber-600/35" />
          <path d="M 800 -50 C 750 300, 150 750, 200 1100" strokeWidth="4" className="stroke-emerald-500/30" />

          {/* Secondary Street Contours */}
          <path d="M 100 100 Q 350 250 600 100 T 1100 300" strokeWidth="2" strokeDasharray="6 6" className="stroke-stone-600/50" />
          <path d="M 50 500 Q 400 300 800 550 T 1200 800" strokeWidth="2" strokeDasharray="8 4" className="stroke-stone-600/50" />

          {/* Topographic Map Rings */}
          <circle cx="450" cy="350" r="180" strokeWidth="1.5" className="stroke-amber-500/20" />
          <circle cx="450" cy="350" r="120" strokeWidth="1" className="stroke-amber-500/25" />
          <circle cx="450" cy="350" r="60" strokeWidth="1" className="stroke-amber-500/30" />

          <circle cx="850" cy="700" r="220" strokeWidth="1.5" className="stroke-emerald-500/20" />
          <circle cx="850" cy="700" r="140" strokeWidth="1" className="stroke-emerald-500/25" />

          {/* Vector City Block Plots */}
          <rect x="220" y="220" width="90" height="60" rx="6" className="fill-stone-800/60 stroke-stone-700/60" />
          <rect x="330" y="220" width="70" height="90" rx="6" className="fill-stone-800/60 stroke-stone-700/60" />
          <rect x="220" y="300" width="180" height="70" rx="6" className="fill-stone-800/60 stroke-stone-700/60" />

          <rect x="650" y="450" width="120" height="80" rx="6" className="fill-stone-800/60 stroke-stone-700/60" />
          <rect x="790" y="450" width="90" height="110" rx="6" className="fill-stone-800/60 stroke-stone-700/60" />
        </svg>
      </div>

      {/* Secondary Counter-Moving Vector Pin & Radar Layer */}
      <div className="absolute -inset-[20%] w-[140%] h-[140%] opacity-70 filter blur-[6px] animate-map-move-2">
        {/* Animated Radar Scanning Sweep Circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-amber-500/30 relative">
          <div className="absolute inset-0 rounded-full animate-radar-sweep bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(245,158,11,0.25)_360deg)]" />
          <div className="absolute inset-8 rounded-full border border-emerald-500/20" />
          <div className="absolute inset-24 rounded-full border border-amber-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/40 animate-ping-ring" />
        </div>

        {/* Floating Blurred GPS Location Pins */}
        <div className="absolute top-[25%] left-[20%] flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-2xl border border-amber-500/40 text-amber-400 text-xs shadow-xl">
          <MapPin className="w-4 h-4 text-amber-500 animate-bounce" />
          <span className="font-mono text-[10px] font-bold">DISPATCH SECTOR A-1</span>
        </div>

        <div className="absolute top-[60%] left-[70%] flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-2xl border border-emerald-500/40 text-emerald-400 text-xs shadow-xl">
          <Navigation className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] font-bold">RADAR LIVE GPS</span>
        </div>

        <div className="absolute bottom-[20%] left-[30%] flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-2xl border border-stone-600 text-stone-300 text-xs shadow-xl">
          <Radio className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="font-mono text-[10px] font-bold">CAPE TOWN CENTRAL</span>
        </div>

        <div className="absolute top-[35%] right-[22%] flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-2xl border border-amber-500/40 text-amber-300 text-xs shadow-xl">
          <Compass className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-[10px] font-bold">GAUTENG RADAR</span>
        </div>
      </div>

      {/* Dark Translucent Glassmorphism Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-stone-900/50 to-stone-950/80 backdrop-blur-[8px]" />
    </div>
  );
}
