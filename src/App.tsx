import React, { useState, useEffect } from 'react';
import { Compass, Navigation, Map, Zap, User } from 'lucide-react';
import { ProfileFeature } from './components/ProfileFeature';
import { TenantFeature } from './components/TenantFeature';
import { ActivationFeature } from './components/ActivationFeature';
import { SeekersFeature } from './components/SeekersFeature';
import GiGsMap from './components/GiGsMap';
import { getStoredProfiles } from './utils/profileStore';
import { BlurredMapBackground } from './components/BlurredMapBackground';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';

type TabType = 'Seekers' | 'GiGs' | 'Tenant' | 'Activation' | 'Profile';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('Profile');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isManualTourOpen, setIsManualTourOpen] = useState<boolean>(false);
  const [isUserSignedUp, setIsUserSignedUp] = useState<boolean>(() => {
    return localStorage.getItem('timegig_signed_up') === 'true';
  });
  const [themeAccent, setThemeAccent] = useState<string>(() => {
    return localStorage.getItem('timegig_theme_color') || 'amber';
  });

  useEffect(() => {
    getStoredProfiles();

    const handleFormStatus = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail && typeof customEv.detail.open === 'boolean') {
        setIsFormOpen(customEv.detail.open);
      }
    };

    const handleSignupStatus = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail && typeof customEv.detail.isSignedUp === 'boolean') {
        setIsUserSignedUp(customEv.detail.isSignedUp);
      }
    };

    const handleThemeChange = () => {
      setThemeAccent(localStorage.getItem('timegig_theme_color') || 'amber');
    };

    const handleOpenTour = () => {
      setIsManualTourOpen(true);
    };

    window.addEventListener('gigs_form_status', handleFormStatus);
    window.addEventListener('timegig_signup_status', handleSignupStatus);
    window.addEventListener('timegig_theme_changed', handleThemeChange);
    window.addEventListener('timegig_open_tour', handleOpenTour);

    // Keep splash screen visible alone for exactly 5 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => {
      window.removeEventListener('gigs_form_status', handleFormStatus);
      window.removeEventListener('timegig_signup_status', handleSignupStatus);
      window.removeEventListener('timegig_theme_changed', handleThemeChange);
      window.removeEventListener('timegig_open_tour', handleOpenTour);
      clearTimeout(splashTimer);
    };
  }, []);

  const navItems = [
    { name: 'Seekers' as TabType, icon: Compass },
    { name: 'GiGs' as TabType, icon: Navigation },
    { name: 'Tenant' as TabType, icon: Map },
    { name: 'Activation' as TabType, icon: Zap },
    { name: 'Profile' as TabType, icon: User },
  ];

  if (showSplash) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#FAF4E6] via-[#EADBCA] to-[#D5C2A5] overflow-hidden z-[10000] select-none font-sans">
        {/* Blurry wallpaper background features */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-amber-500/25 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-stone-500/20 blur-[130px]" />
        
        {/* Full screen backdrop blur */}
        <div className="absolute inset-0 bg-stone-900/10 backdrop-blur-3xl" />

        {/* Central focused App Name "TimeGiG" alone without logos */}
        <div className="relative text-center space-y-4 animate-fade-in px-4">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-stone-900 drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] uppercase font-sans">
            Time<span className="text-amber-600">GiG</span>
          </h1>
          <div className="w-16 h-[3px] bg-gradient-to-r from-stone-900 to-amber-600 mx-auto rounded-full animate-pulse" />
          <p className="text-[10px] text-stone-600 tracking-[0.25em] font-bold uppercase">
            On-Demand Labor Radar
          </p>
        </div>
      </div>
    );
  }

  // Registration & Approval Gate: App access is locked until user completes sign-up
  if (!isUserSignedUp) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-stone-950 text-stone-900 font-sans antialiased overflow-hidden z-50">
        <ProfileFeature />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/90 text-stone-900 flex flex-col relative font-sans antialiased overflow-x-hidden">
      {/* Blurred White & Dynamic Color Accent Ambient Wallpaper Layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-all duration-700">
        <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] transition-colors duration-700 ${
          themeAccent === 'amber' ? 'bg-amber-300/50' :
          themeAccent === 'emerald' ? 'bg-emerald-300/50' :
          themeAccent === 'indigo' ? 'bg-indigo-300/50' :
          themeAccent === 'purple' ? 'bg-purple-300/50' :
          themeAccent === 'rose' ? 'bg-rose-300/50' :
          'bg-teal-300/50'
        }`} />
        <div className={`absolute top-1/3 -right-32 w-96 h-96 rounded-full blur-[120px] transition-colors duration-700 ${
          themeAccent === 'amber' ? 'bg-yellow-200/40' :
          themeAccent === 'emerald' ? 'bg-teal-200/40' :
          themeAccent === 'indigo' ? 'bg-sky-200/40' :
          themeAccent === 'purple' ? 'bg-fuchsia-200/40' :
          themeAccent === 'rose' ? 'bg-pink-200/40' :
          'bg-cyan-200/40'
        }`} />
        <div className={`absolute -bottom-32 left-1/3 w-96 h-96 rounded-full blur-[110px] transition-colors duration-700 ${
          themeAccent === 'amber' ? 'bg-orange-200/30' :
          themeAccent === 'emerald' ? 'bg-lime-200/30' :
          themeAccent === 'indigo' ? 'bg-violet-200/30' :
          themeAccent === 'purple' ? 'bg-pink-200/30' :
          themeAccent === 'rose' ? 'bg-amber-200/30' :
          'bg-emerald-200/30'
        }`} />
        <div className="absolute inset-0 bg-white/70 backdrop-blur-3xl" />
      </div>

      {/* Main Content View (Persisted tab mounting to preserve active states & activities) */}
      <main className="relative z-10 flex-1 w-full flex flex-col items-center justify-start p-4 pb-20">
        
        {/* Profile Tab */}
        <div className={`w-full ${activeTab === 'Profile' ? 'block animate-fade-in' : 'hidden'}`}>
          <ProfileFeature />
        </div>

        {/* Tenant Tab */}
        <div className={`w-full ${activeTab === 'Tenant' ? 'block animate-fade-in' : 'hidden'}`}>
          <TenantFeature />
        </div>

        {/* Activation Tab */}
        <div className={`w-full ${activeTab === 'Activation' ? 'block animate-fade-in' : 'hidden'}`}>
          <ActivationFeature />
        </div>

        {/* GiGs Map Tab - Persisted to prevent resetting user search paths, zoom level, or satellite tiles */}
        <div className={`w-full h-full ${activeTab === 'GiGs' ? 'block' : 'hidden'}`}>
          <GiGsMap activeTab={activeTab} />
        </div>

        {/* Seekers Tab */}
        <div className={`w-full ${activeTab === 'Seekers' ? 'block animate-fade-in' : 'hidden'}`}>
          <SeekersFeature />
        </div>
      </main>

      {/* Realistic 3D Bottom Menu Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 bg-gradient-to-b from-[#FAF4E6]/95 via-[#EADBCA]/95 to-[#D5C2A5]/95 backdrop-blur-md border-t border-white/80 px-2 py-1.5 flex justify-around items-center shadow-[0_-6px_20px_rgba(0,0,0,0.12)] z-40 transition-all duration-300 ${
        isFormOpen || !isUserSignedUp ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}>
        {navItems.map((item) => {
          const isActive = activeTab === item.name;
          const IconComponent = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className="relative flex flex-col items-center gap-0.5 px-2 py-1 transition-all duration-200 group cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <IconComponent
                  className={`w-5 h-5 text-black transition-all duration-300 ${
                    isActive
                      ? 'stroke-[2.5] scale-110 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.35)]'
                      : 'stroke-[2] opacity-80 hover:opacity-100 hover:scale-105 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)]'
                  }`}
                />
              </div>

              <span
                className={`text-[9px] font-black uppercase tracking-wider text-black transition-all duration-300 ${
                  isActive ? 'scale-105 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]' : 'opacity-80'
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>
      {/* Guided Welcome Onboarding Modal */}
      <WelcomeOnboarding
        isOpenManual={isManualTourOpen}
        onCloseManual={() => setIsManualTourOpen(false)}
      />
    </div>
  );
}
