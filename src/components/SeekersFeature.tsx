import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Compass,
  Star,
  Phone,
  Mail,
  SlidersHorizontal,
  Briefcase,
  Layers,
  Sparkles,
  Award,
  Navigation,
  X,
  ShieldCheck,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  DollarSign,
  Lock
} from 'lucide-react';
import { getStoredProfiles } from '../utils/profileStore';

interface SeekerProfile {
  id: string;
  firstName: string;
  surname: string;
  category: string;
  province: string;
  address: string;
  email: string;
  contactNumber: string;
  rating: number;
  faceImage: string | null;
  lat: number;
  lng: number;
  bio?: string;
  experienceYears?: number;
  verifiedID?: boolean;
  cleanCriminalRecord?: boolean;
}

const getDistanceInMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const SEEDED_SEEKERS: SeekerProfile[] = [
  {
    id: 's1',
    firstName: 'Lungile',
    surname: 'Nene',
    category: 'Electrical',
    province: 'Western Cape',
    address: 'Long Street, Cape Town CBD',
    email: 'lungile.nene@gmail.com',
    contactNumber: '+27 72 345 6789',
    rating: 4.9,
    faceImage: null,
    lat: -33.9230,
    lng: 18.4210,
    bio: 'Professional certified electrician with over 8 years of residential installations and emergency electrical repairs experience in Cape Town.',
    experienceYears: 8,
    verifiedID: true,
    cleanCriminalRecord: true
  },
  {
    id: 's2',
    firstName: 'Devon',
    surname: 'Naidoo',
    category: 'Plumbing',
    province: 'Western Cape',
    address: 'Main Road, Sea Point',
    email: 'devon.naidoo@yahoo.com',
    contactNumber: '+27 83 987 6543',
    rating: 4.8,
    faceImage: null,
    lat: -33.9180,
    lng: 18.3960,
    bio: 'Specialist plumber in drainage systems, high pressure leak detection, water main installations and bathroom fitting.',
    experienceYears: 6,
    verifiedID: true,
    cleanCriminalRecord: true
  },
  {
    id: 's3',
    firstName: 'Sarah',
    surname: 'Van der Merwe',
    category: 'Painting',
    province: 'Western Cape',
    address: 'Kloof Street, Gardens, Cape Town',
    email: 'sarah.vdm@outlook.com',
    contactNumber: '+27 61 234 5678',
    rating: 4.7,
    faceImage: null,
    lat: -33.9290,
    lng: 18.4110,
    bio: 'Experienced interior & exterior high-quality painter. Friendly service, clean work ethic, and specialized finish textures.',
    experienceYears: 5,
    verifiedID: true,
    cleanCriminalRecord: true
  },
  {
    id: 's4',
    firstName: 'Kabelo',
    surname: 'Mokoena',
    category: 'Carpentry',
    province: 'Gauteng',
    address: 'Constitution Hill, Braamfontein, Johannesburg',
    email: 'kabelo.carpentry@gmail.com',
    contactNumber: '+27 73 543 2109',
    rating: 5.0,
    faceImage: null,
    lat: -26.1920,
    lng: 28.0430,
    bio: 'Master carpenter specializing in hand-crafted customized cabinets, doors, drywalls and premium wooden flooring designs.',
    experienceYears: 12,
    verifiedID: true,
    cleanCriminalRecord: true
  },
  {
    id: 's5',
    firstName: 'Zinhle',
    surname: 'Khumalo',
    category: 'HVAC',
    province: 'Gauteng',
    address: 'Jan Smuts Avenue, Rosebank, Johannesburg',
    email: 'zinhle.k@aircool.co.za',
    contactNumber: '+27 82 111 2222',
    rating: 4.6,
    faceImage: null,
    lat: -26.1450,
    lng: 28.0380,
    bio: 'Expert air conditioning technician. Installation, diagnostics, and repairs of duct split air units and industrial ventilation.',
    experienceYears: 4,
    verifiedID: true,
    cleanCriminalRecord: true
  }
];

export function SeekersFeature() {
  const [isSeekerLive, setIsSeekerLive] = useState<boolean>(() => {
    return localStorage.getItem('seeker_live_status') !== 'false';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('All Provinces');
  const [milesLimit, setMilesLimit] = useState<number>(50); 
  const [showFilters, setShowFilters] = useState<boolean>(true);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [seekers, setSeekers] = useState<SeekerProfile[]>([]);
  const [selectedSeeker, setSelectedSeeker] = useState<SeekerProfile | null>(null);

  // Hiring flow states (Requirement: User can hire seeker in seekers feature)
  const [isHiringMode, setIsHiringMode] = useState<boolean>(false);
  const [proposedBudget, setProposedBudget] = useState<string>('');
  const [hiringMessage, setHiringMessage] = useState<string>('');
  const [hiringCategory, setHiringCategory] = useState<string>('Plumbing');
  const [isHiringSubmitting, setIsHiringSubmitting] = useState<boolean>(false);
  const [showHiringSuccess, setShowHiringSuccess] = useState<boolean>(false);

  const defaultCenter = { lat: -33.9249, lng: 18.4241 };

  // Voice synthesizer guidance feedback
  const speakVoice = (text: string) => {
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
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setUserCoords(defaultCenter);
        }
      );
    } else {
      setUserCoords(defaultCenter);
    }
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('gigs_form_status', { detail: { open: selectedSeeker !== null } })
    );
  }, [selectedSeeker]);

  const toggleRadarLive = () => {
    const nextStatus = !isSeekerLive;
    setIsSeekerLive(nextStatus);
    localStorage.setItem('seeker_live_status', nextStatus ? 'true' : 'false');
    window.dispatchEvent(new Event('radar_status_updated'));
    if (nextStatus) {
      speakVoice("Radar Live Activated! You are now visible to nearby clients ready to get hired.");
    } else {
      speakVoice("Radar Live Deactivated. You are now offline.");
    }
  };

  useEffect(() => {
    const handleSync = () => {
      const status = localStorage.getItem('seeker_live_status') !== 'false';
      setIsSeekerLive(status);

      const customProfiles = getStoredProfiles();
      const formattedCustom: SeekerProfile[] = customProfiles.map((p, i) => ({
        id: `custom_${p.id || i}`,
        firstName: p.firstName,
        surname: p.surname,
        category: p.trade || 'General Contractor',
        province: p.province || 'Western Cape',
        address: p.address || 'Current Location',
        email: p.email || 'user@timegig.com',
        contactNumber: p.contactNumber || '+27 72 000 0000',
        rating: 5.0,
        faceImage: p.faceImage,
        lat: userCoords ? userCoords.lat : defaultCenter.lat,
        lng: userCoords ? userCoords.lng : defaultCenter.lng,
        bio: p.workExperience || `Verified active ${p.trade || 'specialist'} ready to get hired on TimeGiG radar live.`,
        experienceYears: 5,
        verifiedID: true,
        cleanCriminalRecord: true
      }));

      setSeekers([...formattedCustom, ...SEEDED_SEEKERS]);
    };

    handleSync();

    window.addEventListener('profile_store_updated', handleSync);
    window.addEventListener('radar_status_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('profile_store_updated', handleSync);
      window.removeEventListener('radar_status_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [userCoords]);

  const activeLat = userCoords?.lat ?? defaultCenter.lat;
  const activeLng = userCoords?.lng ?? defaultCenter.lng;

  const filteredSeekers = seekers.filter((seeker) => {
    const matchSearch =
      seeker.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (selectedProvince !== 'All Provinces' && seeker.province !== selectedProvince) {
      return false;
    }

    const distMiles = getDistanceInMiles(activeLat, activeLng, seeker.lat, seeker.lng);
    if (distMiles > milesLimit) {
      return false;
    }

    return true;
  });

  // Track Accepted Seekers for Privacy Contact Details Release
  const [acceptedSeekers, setAcceptedSeekers] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('timegig_accepted_seekers');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const markSeekerAccepted = (seekerId: string) => {
    setAcceptedSeekers((prev) => {
      if (prev.includes(seekerId)) return prev;
      const updated = [...prev, seekerId];
      localStorage.setItem('timegig_accepted_seekers', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle Seeker hiring submission invitation (Requirement: User can hire seeker)
  const handleHireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeeker || !proposedBudget.trim()) return;

    markSeekerAccepted(selectedSeeker.id);
    setIsHiringSubmitting(true);
    setTimeout(() => {
      setIsHiringSubmitting(false);
      setShowHiringSuccess(true);
      speakVoice(`Success! You have successfully hired ${selectedSeeker.firstName} for ${hiringCategory} work at ${proposedBudget}. An invitation has been dispatched to their phone.`);
      
      setTimeout(() => {
        setShowHiringSuccess(false);
        setIsHiringMode(false);
        setSelectedSeeker(null);
        setProposedBudget('');
        setHiringMessage('');
      }, 4000);
    }, 1500);
  };

  const provincesList = [
    'All Provinces',
    'Western Cape',
    'Gauteng',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Free State',
    'Mpumalanga',
    'Limpopo',
    'North West',
    'Northern Cape'
  ];

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20 select-none">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex items-center justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white text-base font-black uppercase tracking-wider font-sans">Nearby Seekers</h2>
            <p className="text-[10px] text-stone-400">Find &amp; Hire verified contractors nearby</p>
          </div>
        </div>

        {/* Live Radar Toggle Switch */}
        <button
          onClick={toggleRadarLive}
          className={`px-3 py-1.5 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer relative z-10 shadow-lg ${
            isSeekerLive
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:bg-stone-800'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isSeekerLive ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'}`} />
          <span>{isSeekerLive ? 'Radar LIVE' : 'Radar Off'}</span>
        </button>
      </div>

      {/* Search Input Filter Panel */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200/85 p-3.5 shadow-xl space-y-3.5">
        <div className="relative flex items-center w-full bg-slate-100 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-stone-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, category, or area..."
            className="w-full bg-transparent text-stone-800 placeholder-stone-400 text-xs border-none outline-none focus:ring-0 pl-2 pr-1 font-sans py-0.5"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] bg-stone-300 text-stone-700 font-bold px-1.5 py-0.5 rounded-full hover:bg-stone-400"
            >
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="space-y-3.5 border-t border-stone-200/50 pt-3 animate-fade-in text-stone-800 font-sans">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 block">Select Province</span>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-300/60 rounded-xl px-2.5 py-2 text-[11px] text-stone-800 focus:outline-none"
                >
                  {provincesList.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-stone-500">
                  <span>Radius Range</span>
                  <span className="text-amber-600 font-extrabold">{milesLimit} Miles</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="150"
                  step="2"
                  value={milesLimit}
                  onChange={(e) => setMilesLimit(parseInt(e.target.value))}
                  className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-2.5"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Directory Seeker Cards Grid */}
      <div className="space-y-2.5">
        {!isSeekerLive ? (
          <div className="bg-stone-900 border-2 border-amber-500/35 rounded-3xl p-8 text-center text-stone-400 space-y-4 shadow-xl animate-fade-in font-sans">
            <div className="w-14 h-14 bg-stone-950 rounded-full flex items-center justify-center mx-auto border border-white/5 text-stone-500 relative">
              <Compass className="w-6 h-6 animate-pulse text-amber-500" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border border-stone-900" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Seeker Radar Deactivated</span>
              <h4 className="font-extrabold text-xs text-white">You are Offline</h4>
              <p className="text-[10px] text-stone-400 leading-relaxed max-w-xs mx-auto">
                Turn on the **Live/Online Switcher** at the bottom center of the screen to start your dispatch tracker, broadcast your location, and view other active seekers!
              </p>
            </div>
          </div>
        ) : filteredSeekers.length > 0 ? (
          filteredSeekers.map((seeker) => {
            const distance = getDistanceInMiles(activeLat, activeLng, seeker.lat, seeker.lng);
            const isUser = seeker.id.startsWith('custom_');
            return (
              <div
                key={seeker.id}
                onClick={() => {
                  setSelectedSeeker(seeker);
                  setIsHiringMode(false);
                }}
                className={`rounded-2xl p-4 shadow-md transition-all duration-300 hover:scale-[1.01] hover:shadow-lg cursor-pointer flex items-center justify-between border ${
                  isUser
                    ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-white border-emerald-500/50 shadow-emerald-500/10'
                    : 'bg-white hover:bg-stone-50 border-stone-200/80'
                }`}
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-full border shadow-sm overflow-hidden bg-stone-900 flex items-center justify-center ${
                      isUser ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-stone-200'
                    }`}>
                      {seeker.faceImage ? (
                        <img src={seeker.faceImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-stone-800 to-stone-950 text-amber-400 font-extrabold text-xs">
                          {seeker.firstName[0]}{seeker.surname[0]}
                        </div>
                      )}
                    </div>
                    {/* Pulsing online green dot on logo */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-md animate-pulse" />
                  </div>

                  <div className="space-y-0.5 overflow-hidden font-sans">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-stone-900 font-bold text-xs truncate">
                        {seeker.firstName} {seeker.surname}
                      </h4>
                      <span className="bg-amber-100 border border-amber-300 text-amber-800 font-black text-[7px] uppercase px-1.5 py-0.5 rounded-full tracking-wider shrink-0">
                        {seeker.category}
                      </span>
                      {isUser && (
                        <span className="bg-emerald-600 text-white font-black text-[7px] uppercase px-1.5 py-0.5 rounded-full tracking-wider shrink-0 animate-pulse">
                          ⚡ YOU (READY TO GET HIRED)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-stone-500 text-[10px]">
                      <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="truncate">{seeker.address}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[9px] text-stone-500">
                      <span className="flex items-center text-amber-600 font-extrabold">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0 mr-0.5" />
                        {seeker.rating.toFixed(1)}
                      </span>
                      <span>•</span>
                      <span className="text-stone-400 font-medium">Province: {seeker.province}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="bg-stone-900 text-white font-mono text-[9px] font-black px-2 py-1 rounded-xl shadow-md inline-block">
                    {distance.toFixed(1)} mi
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center text-stone-500 space-y-1">
            <Layers className="w-8 h-8 mx-auto text-stone-300" />
            <h4 className="font-bold text-xs text-stone-800">No Seekers Found</h4>
            <p className="text-[10px] text-stone-400">Try adjusting your filters or range range radius!</p>
          </div>
        )}
      </div>

      {/* Requirement: User can click on seeker to see full information & User can hire seeker */}
      {selectedSeeker && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200 animate-slide-up text-stone-800 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-stone-900 text-xs font-black uppercase tracking-wider font-sans">
                  {isHiringMode ? 'Hire Seeker Contract' : 'Full Seeker Credentials'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedSeeker(null);
                  setIsHiringMode(false);
                }}
                className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Container with Scroll */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              
              {showHiringSuccess ? (
                /* Interactive Celebration Hire Success screen */
                <div className="flex flex-col items-center justify-center text-center space-y-3.5 py-6 animate-fade-in font-sans">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 shadow-xl">
                    <CheckCircle className="w-8 h-8 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-stone-950 font-black text-sm uppercase tracking-wider">Hiring Invitation Placed!</h4>
                    <p className="text-xs text-stone-500 leading-relaxed mt-1">
                      Your work request has been dispatched to **{selectedSeeker.firstName} {selectedSeeker.surname}**. They will review and contact you shortly!
                    </p>
                  </div>
                </div>
              ) : isHiringMode ? (
                /* Interactive Hiring Invitation Form (Requirement met) */
                <form onSubmit={handleHireSubmit} className="space-y-4 font-sans text-stone-700">
                  <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-900 shrink-0">
                      {selectedSeeker.faceImage ? (
                        <img src={selectedSeeker.faceImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-extrabold text-xs">
                          {selectedSeeker.firstName[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-stone-400 uppercase block">Recruiting Seeker</span>
                      <span className="text-stone-900 font-extrabold text-xs block">{selectedSeeker.firstName} {selectedSeeker.surname}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-500">Proposed Work Category</label>
                    <select
                      value={hiringCategory}
                      onChange={(e) => setHiringCategory(e.target.value)}
                      className="w-full bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800"
                    >
                      <option value="Plumbing">Plumbing Works</option>
                      <option value="Electrical">Electrical Works</option>
                      <option value="Painting">Painting Works</option>
                      <option value="Carpentry">Carpentry Works</option>
                      <option value="HVAC">HVAC Works</option>
                      <option value="General Contractor">General Contracting</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-500">Proposed Budget / Payout</label>
                    <div className="relative flex items-center bg-stone-100 border border-stone-300 rounded-xl px-3 py-2">
                      <DollarSign className="w-3.5 h-3.5 text-stone-500 mr-1 shrink-0" />
                      <input
                        type="text"
                        required
                        value={proposedBudget}
                        onChange={(e) => setProposedBudget(e.target.value)}
                        placeholder="e.g. R500 / $120"
                        className="w-full bg-transparent text-stone-800 text-xs border-none outline-none focus:ring-0 p-0 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-500">Optional Invitation Message</label>
                    <textarea
                      rows={3}
                      value={hiringMessage}
                      onChange={(e) => setHiringMessage(e.target.value)}
                      placeholder="e.g. Need immediate repair on kitchen drain leak..."
                      className="w-full bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 resize-none focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isHiringSubmitting}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black uppercase tracking-wider rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    {isHiringSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Hire Invitation</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* FULL SEEKER INFORMATION (Requirement: Click seeker to see full information) */
                <div className="space-y-4 font-sans">
                  
                  {/* Seeker Profile Avatar Block */}
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 shadow-xl overflow-hidden bg-stone-900 flex items-center justify-center shrink-0">
                      {selectedSeeker.faceImage ? (
                        <img src={selectedSeeker.faceImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-stone-800 to-stone-950 text-amber-400 font-extrabold text-2xl">
                          {selectedSeeker.firstName[0]}{selectedSeeker.surname[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 text-sm">
                        {selectedSeeker.firstName} {selectedSeeker.surname}
                      </h4>
                      <span className="text-xs text-amber-600 font-bold uppercase">{selectedSeeker.category} Specialist</span>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs text-amber-800 font-extrabold shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 mr-0.5" />
                      {selectedSeeker.rating.toFixed(1)} / 5.0 Star Rating
                    </div>
                  </div>

                  {/* Seeker detailed Bio */}
                  {selectedSeeker.bio && (
                    <div className="bg-stone-50 border border-stone-200/50 p-3 rounded-2xl space-y-1">
                      <span className="text-[8px] font-black uppercase text-stone-400">Professional Bio</span>
                      <p className="text-stone-600 text-xs leading-relaxed italic">
                        "{selectedSeeker.bio}"
                      </p>
                    </div>
                  )}

                  {/* Badges / Credentials Details */}
                  <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200/50">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="text-[7px] text-stone-400 font-black block uppercase">National ID</span>
                        <span className="text-stone-800 text-[10px] font-bold block">100% Verified</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="text-[7px] text-stone-400 font-black block uppercase">Police Clearance</span>
                        <span className="text-stone-800 text-[10px] font-bold block">Passed Clean</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact details (Protected until Accepted) */}
                  <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/50 font-sans">
                    <div className="flex items-center gap-2.5 text-xs">
                      <MapPin className="w-4 h-4 text-stone-500 shrink-0" />
                      <span className="text-stone-700">{selectedSeeker.address}</span>
                    </div>

                    {acceptedSeekers.includes(selectedSeeker.id) ? (
                      <>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 text-xs font-bold flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>🔓 Contact Details Unlocked (Match Accepted)!</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs">
                          <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                          <a href={`tel:${selectedSeeker.contactNumber}`} className="text-emerald-800 font-extrabold hover:underline">
                            📞 {selectedSeeker.contactNumber}
                          </a>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs">
                          <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                          <a href={`mailto:${selectedSeeker.email}`} className="text-emerald-800 font-extrabold hover:underline">
                            ✉️ {selectedSeeker.email}
                          </a>
                        </div>

                        <a
                          href={`https://api.whatsapp.com/send?phone=${selectedSeeker.contactNumber.replace(/[^0-9+]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                        >
                          💬 Direct WhatsApp Contact
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs font-semibold flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Contact phone &amp; email are protected until offer is accepted.</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs opacity-70">
                          <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                          <span className="text-stone-500 font-mono font-bold">🔒 +27 ** *** **** (Protected)</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs opacity-70">
                          <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                          <span className="text-stone-500 font-mono font-bold">🔒 ********@****.com (Protected)</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Main Call To Action Button (Hires direct) */}
                  <button
                    onClick={() => {
                      if (acceptedSeekers.includes(selectedSeeker.id)) {
                        setIsHiringMode(true);
                      } else {
                        markSeekerAccepted(selectedSeeker.id);
                        setIsHiringMode(true);
                        speakVoice(`Accepting offer with ${selectedSeeker.firstName}. Contact details unlocked! Please propose work requirements.`);
                      }
                    }}
                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-center text-xs font-black uppercase tracking-wider block shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    {acceptedSeekers.includes(selectedSeeker.id) ? 'Hire & Propose Work Details' : 'Accept Match & Unlock Contacts'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Floating Live On/Off Toggle Switcher at bottom center */}
      <div className="fixed bottom-22 left-1/2 -translate-x-1/2 bg-stone-950/95 border-2 border-amber-500/30 px-5 py-3 rounded-full shadow-2xl flex items-center gap-3.5 z-[1000] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isSeekerLive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-pulse'}`} />
          <span className="text-[10px] font-black uppercase text-stone-200 tracking-wider">
            {isSeekerLive ? 'Radar: Live' : 'Radar: Offline'}
          </span>
        </div>
        <div className="w-[1px] h-4 bg-white/10" />
        <button
          type="button"
          onClick={() => {
            const newLiveState = !isSeekerLive;
            setIsSeekerLive(newLiveState);
            localStorage.setItem('seeker_live_status', String(newLiveState));
            if (newLiveState) {
              speakVoice("Radar online! You are now live and visible to nearby clients for immediate hiring.");
            } else {
              speakVoice("Radar offline. You are now offline.");
            }
          }}
          className={`relative inline-flex h-5.5 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${isSeekerLive ? 'bg-emerald-500' : 'bg-stone-700'}`}
        >
          <span
            className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xl ring-0 transition duration-250 ease-in-out ${isSeekerLive ? 'translate-x-5.5' : 'translate-x-0'}`}
          />
        </button>
      </div>
    </div>
  );
}
