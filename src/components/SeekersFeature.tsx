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
  X
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
}

// Haversine formula to calculate exact distance in miles
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

// Seed high-quality default Seekers in South Africa
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
    lng: 18.4210
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
    lng: 18.3960
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
    lng: 18.4110
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
    lng: 28.0430
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
    lng: 28.0380
  },
  {
    id: 's6',
    firstName: 'Pieter',
    surname: 'Botha',
    category: 'Plumbing',
    province: 'Gauteng',
    address: 'Pretoria East, Pretoria',
    email: 'pieter.botha@mweb.co.za',
    contactNumber: '+27 71 888 9999',
    rating: 4.9,
    faceImage: null,
    lat: -25.7479,
    lng: 28.2293
  },
  {
    id: 's7',
    firstName: 'Amara',
    surname: 'Okonkwo',
    category: 'Electrical',
    province: 'KwaZulu-Natal',
    address: 'Florida Road, Morningside, Durban',
    email: 'amara.spark@live.com',
    contactNumber: '+27 84 555 1234',
    rating: 4.8,
    faceImage: null,
    lat: -29.8290,
    lng: 31.0180
  }
];

export function SeekersFeature() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('All Provinces');
  const [milesLimit, setMilesLimit] = useState<number>(50); // slider default 50 miles
  const [showFilters, setShowFilters] = useState<boolean>(true);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [seekers, setSeekers] = useState<SeekerProfile[]>([]);
  const [selectedSeeker, setSelectedSeeker] = useState<SeekerProfile | null>(null);

  // Default coordinate center (Cape Town CBD)
  const defaultCenter = { lat: -33.9249, lng: 18.4241 };

  // Fetch real user location to calculate miles dynamically
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

  // Merge custom user submitted profiles with preseeded profiles
  useEffect(() => {
    const customProfiles = getStoredProfiles();
    const formattedCustom: SeekerProfile[] = customProfiles.map((p, i) => ({
      id: `custom_${p.id || i}`,
      firstName: p.firstName,
      surname: p.surname,
      category: 'General Contractor',
      province: p.province || 'Western Cape',
      address: p.address || 'User Address',
      email: p.email || 'no-email@timegig.com',
      contactNumber: p.contactNumber || '+27 00 000 0000',
      rating: 4.5,
      faceImage: p.faceImage,
      lat: defaultCenter.lat + (Math.random() - 0.5) * 0.1, // slightly randomized offset near center
      lng: defaultCenter.lng + (Math.random() - 0.5) * 0.1
    }));

    setSeekers([...formattedCustom, ...SEEDED_SEEKERS]);
  }, []);

  // Filter list based on Name, Skill, Province, and Miles distance limits
  const activeLat = userCoords?.lat ?? defaultCenter.lat;
  const activeLng = userCoords?.lng ?? defaultCenter.lng;

  const filteredSeekers = seekers.filter((seeker) => {
    // 1. Search Query Match
    const matchSearch =
      seeker.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    // 2. Province Match
    if (selectedProvince !== 'All Provinces' && seeker.province !== selectedProvince) {
      return false;
    }

    // 3. Distance Match in Miles
    const distMiles = getDistanceInMiles(activeLat, activeLng, seeker.lat, seeker.lng);
    if (distMiles > milesLimit) {
      return false;
    }

    return true;
  });

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
      {/* Dynamic Ambient Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-400">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-white text-base font-black uppercase tracking-wider">Nearby Seekers</h2>
            <p className="text-[10px] text-stone-400">Find & Hire verified contractors nearby</p>
          </div>
        </div>
      </div>

      {/* Requirement 6: Add a search bar to seekers as well */}
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

        {/* Sliders & Province Selectors */}
        {showFilters && (
          <div className="space-y-3.5 border-t border-stone-200/50 pt-3 animate-fade-in text-stone-800 font-sans">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Province Selector */}
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

              {/* Miles Slider Display */}
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

      {/* Directory Seekers List */}
      <div className="space-y-2.5">
        {filteredSeekers.length > 0 ? (
          filteredSeekers.map((seeker) => {
            const distance = getDistanceInMiles(activeLat, activeLng, seeker.lat, seeker.lng);
            return (
              <div
                key={seeker.id}
                onClick={() => setSelectedSeeker(seeker)}
                className="bg-white hover:bg-stone-50 border border-stone-200/80 rounded-2xl p-4 shadow-md transition-all duration-300 hover:scale-[1.01] hover:shadow-lg cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  {/* Seeker Profile Avatar */}
                  <div className="w-11 h-11 rounded-full border border-stone-200 shadow-sm shrink-0 overflow-hidden bg-stone-900 flex items-center justify-center">
                    {seeker.faceImage ? (
                      <img src={seeker.faceImage} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-stone-800 to-stone-950 text-amber-400 font-extrabold text-xs">
                        {seeker.firstName[0]}{seeker.surname[0]}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-stone-900 font-bold text-xs truncate">
                        {seeker.firstName} {seeker.surname}
                      </h4>
                      <span className="bg-amber-100 border border-amber-300 text-amber-800 font-black text-[7px] uppercase px-1.5 py-0.5 rounded-full tracking-wider shrink-0">
                        {seeker.category}
                      </span>
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

                {/* Nearby distance badge */}
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
            <p className="text-[10px] text-stone-400">Try adjusting your search filters or extending your miles limit radius!</p>
          </div>
        )}
      </div>

      {/* Detailed Seeker Hire Modal Overlay */}
      {selectedSeeker && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200 animate-slide-up text-stone-800">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-stone-900 text-xs font-black uppercase tracking-wider">Seeker Credentials</h3>
              </div>
              <button
                onClick={() => setSelectedSeeker(null)}
                className="p-1 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 shadow-xl overflow-hidden bg-stone-900 flex items-center justify-center">
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
                  <span className="text-xs text-amber-600 font-bold uppercase">{selectedSeeker.category}</span>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs text-amber-800 font-extrabold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 mr-0.5" />
                  {selectedSeeker.rating.toFixed(1)} / 5.0 Star Rating
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/50">
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-4 h-4 text-stone-500 shrink-0" />
                  <span className="text-stone-700">{selectedSeeker.address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-4 h-4 text-stone-500 shrink-0" />
                  <a href={`tel:${selectedSeeker.contactNumber}`} className="text-blue-600 hover:underline font-bold">
                    {selectedSeeker.contactNumber}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-4 h-4 text-stone-500 shrink-0" />
                  <a href={`mailto:${selectedSeeker.email}`} className="text-blue-600 hover:underline font-bold">
                    {selectedSeeker.email}
                  </a>
                </div>
              </div>

              {/* Hire Direct Call to Action */}
              <a
                href={`tel:${selectedSeeker.contactNumber}`}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-center text-xs font-black uppercase tracking-wider block shadow-md transition-all active:scale-95"
              >
                Hire & Connect Now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
