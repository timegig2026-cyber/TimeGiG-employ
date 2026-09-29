import React, { useState, useEffect } from 'react';
import { Compass, Navigation, Map, Zap, User } from 'lucide-react';
import { ProfileFeature } from './components/ProfileFeature';
import { TenantFeature } from './components/TenantFeature';
import { ActivationFeature } from './components/ActivationFeature';
import { SeekersFeature } from './components/SeekersFeature';
import GiGsMap from './components/GiGsMap';
import { getStoredProfiles } from './utils/profileStore';

type TabType = 'Seekers' | 'GiGs' | 'Tenant' | 'Activation' | 'Profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('Profile');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  useEffect(() => {
    getStoredProfiles();

    const handleFormStatus = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail && typeof customEv.detail.open === 'boolean') {
        setIsFormOpen(customEv.detail.open);
      }
    };

    window.addEventListener('gigs_form_status', handleFormStatus);
    return () => {
      window.removeEventListener('gigs_form_status', handleFormStatus);
    };
  }, []);

  const navItems = [
    { name: 'Seekers' as TabType, icon: Compass },
    { name: 'GiGs' as TabType, icon: Navigation },
    { name: 'Tenant' as TabType, icon: Map },
    { name: 'Activation' as TabType, icon: Zap },
    { name: 'Profile' as TabType, icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50/90 text-stone-900 flex flex-col relative font-sans antialiased overflow-x-hidden">
      {/* Blurred White Ambient Wallpaper Layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/80 blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-slate-200/40 blur-[120px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-slate-300/30 blur-[110px]" />
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
        isFormOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
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
    </div>
  );
}
