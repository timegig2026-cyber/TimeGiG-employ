import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin, Navigation, Zap, Phone, Filter, RefreshCw, CheckCircle2, Shield } from 'lucide-react';

interface GigPin {
  id: string;
  title: string;
  category: string;
  seekerName: string;
  budget: string;
  distance: string;
  lat: number;
  lng: number;
  description: string;
  phone: string;
}

export default function GiGsMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const gigMarkersGroupRef = useRef<L.LayerGroup | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'fallback' | 'denied'>('locating');
  const [selectedGig, setSelectedGig] = useState<GigPin | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [applySuccessMsg, setApplySuccessMsg] = useState<string | null>(null);
  const [gigs, setGigs] = useState<GigPin[]>([]);

  // Default fallback center (Cape Town center)
  const defaultCenter = { lat: -33.9249, lng: 18.4241 };

  // Generate mock Gigs relative to user position
  const generateNearbyGigs = (centerLat: number, centerLng: number) => {
    return [
      {
        id: 'gig-1',
        title: 'Emergency DB Board Electrical Repair',
        category: 'Electrical',
        seekerName: 'Sarah J. (Property Owner)',
        budget: 'R350 / fixed',
        distance: '0.4 km away',
        lat: centerLat + 0.0035,
        lng: centerLng + 0.0028,
        description: 'Tripping circuit breaker in main kitchen. Need certified electrician to inspect immediately.',
        phone: '+27 82 111 2233'
      },
      {
        id: 'gig-2',
        title: 'Commercial Restaurant Plumbing Repair',
        category: 'Plumbing',
        seekerName: 'Marcus V. (Bistro Manager)',
        budget: 'R45 / hr',
        distance: '0.9 km away',
        lat: centerLat - 0.0042,
        lng: centerLng - 0.0031,
        description: 'Main drainage line leaking near kitchen prep station. Urgent assistance required.',
        phone: '+27 83 444 5566'
      },
      {
        id: 'gig-3',
        title: 'Full Villa Wall Painting Job',
        category: 'Painting',
        seekerName: 'Elena R.',
        budget: 'R500 / project',
        distance: '1.4 km away',
        lat: centerLat + 0.0061,
        lng: centerLng - 0.0055,
        description: '3 bedrooms and hallway painting. Materials supplied on site.',
        phone: '+27 84 777 8899'
      },
      {
        id: 'gig-4',
        title: 'Custom Wooden Desk & Cabinetry',
        category: 'Carpentry',
        seekerName: 'David C.',
        budget: 'R800 / project',
        distance: '2.1 km away',
        lat: centerLat - 0.0058,
        lng: centerLng + 0.0064,
        description: 'Custom hardwood office desk assembly and fitting.',
        phone: '+27 81 222 3344'
      },
      {
        id: 'gig-5',
        title: 'Air Conditioning System Service',
        category: 'HVAC / Tech',
        seekerName: 'Tech Hub Office',
        budget: 'R200 / unit',
        distance: '1.2 km away',
        lat: centerLat + 0.0021,
        lng: centerLng - 0.0048,
        description: 'Scheduled maintenance for 4 wall-mounted split A/C units.',
        phone: '+27 85 999 0011'
      }
    ];
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultCenter.lat, defaultCenter.lng], 14);

    // Free OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    // Zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Layer group for gig markers
    gigMarkersGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Track user exact position using HTML5 Geolocation API
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      setupFallbackLocation(defaultCenter.lat, defaultCenter.lng);
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude, accuracy });
      setGpsStatus('active');

      if (mapInstanceRef.current) {
        // Center map on user exact position
        mapInstanceRef.current.setView([latitude, longitude], 15);

        // Render user location pin
        updateUserMarker(latitude, longitude, accuracy);

        // Generate nearby Gigs
        const nearbyGigs = generateNearbyGigs(latitude, longitude);
        setGigs(nearbyGigs);
        renderGigMarkers(nearbyGigs);
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn("GPS Geolocation notice:", err.message);
      setGpsStatus('fallback');
      setupFallbackLocation(defaultCenter.lat, defaultCenter.lng);
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Setup fallback location if GPS denied or unavailable
  const setupFallbackLocation = (lat: number, lng: number) => {
    setUserLocation({ lat, lng, accuracy: 50 });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14);
      updateUserMarker(lat, lng, 50);
      const nearbyGigs = generateNearbyGigs(lat, lng);
      setGigs(nearbyGigs);
      renderGigMarkers(nearbyGigs);
    }
  };

  // Render or Update User Location Pulsating Marker
  const updateUserMarker = (lat: number, lng: number, accuracy: number) => {
    if (!mapInstanceRef.current) return;

    // User Pulse Icon HTML
    const userDivIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10">
          <div class="absolute w-10 h-10 bg-amber-500/40 rounded-full animate-ping"></div>
          <div class="absolute w-8 h-8 bg-amber-600/30 rounded-full border-2 border-amber-400"></div>
          <div class="relative w-5 h-5 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userMarkerRef.current = L.marker([lat, lng], { icon: userDivIcon }).addTo(mapInstanceRef.current);
      userMarkerRef.current.bindTooltip("You Are Here (Exact GPS)", { permanent: false, direction: 'top' });
    }

    // Accuracy Circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([lat, lng]).setRadius(accuracy);
    } else {
      accuracyCircleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(mapInstanceRef.current);
    }
  };

  // Render Gig Markers
  const renderGigMarkers = (gigList: GigPin[]) => {
    if (!gigMarkersGroupRef.current) return;
    gigMarkersGroupRef.current.clearLayers();

    gigList.forEach((gig) => {
      if (selectedCategory !== 'All' && gig.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return;
      }

      const gigIcon = L.divIcon({
        className: 'custom-gig-marker',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer">
            <div class="bg-amber-900 text-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md border border-amber-400/50 flex items-center gap-1 whitespace-nowrap mb-1">
              <span>⚡</span>
              <span>${gig.budget}</span>
            </div>
            <div class="w-7 h-7 bg-amber-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
            </div>
          </div>
        `,
        iconSize: [80, 50],
        iconAnchor: [40, 48]
      });

      const marker = L.marker([gig.lat, gig.lng], { icon: gigIcon });
      marker.on('click', () => {
        setSelectedGig(gig);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([gig.lat, gig.lng]);
        }
      });

      gigMarkersGroupRef.current?.addLayer(marker);
    });
  };

  // Update Markers when filter changes
  useEffect(() => {
    if (gigs.length > 0) {
      renderGigMarkers(gigs);
    }
  }, [selectedCategory, gigs]);

  const handleRecenter = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 1 });
    }
  };

  const handleApplyGig = (gig: GigPin) => {
    setApplySuccessMsg(`Application sent for "${gig.title}". Seeker Contact: ${gig.phone}`);
    setTimeout(() => setApplySuccessMsg(null), 4000);
  };

  return (
    <div className="relative w-full h-[calc(100vh-120px)] overflow-hidden bg-stone-900">
      {/* Full Screen Interactive Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Header Banner & Filters Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 space-y-2 pointer-events-none">
        <div className="bg-stone-950/90 backdrop-blur-md text-white p-3 rounded-2xl border border-amber-500/30 shadow-xl pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-400">GIGs Live Map</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                  {gpsStatus === 'active' ? '✓ GPS Locked' : 'Demo Location'}
                </span>
              </div>
              <p className="text-[10px] text-stone-400">
                {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)} (±${Math.round(userLocation.accuracy)}m)` : 'Locating user position...'}
              </p>
            </div>
          </div>

          <button 
            onClick={handleRecenter}
            className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-extrabold"
            title="Recenter on My Exact Location"
          >
            <Crosshair className="w-4 h-4" />
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>

        {/* Category Filters Pill Bar */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 pointer-events-auto text-[10px]">
          {['All', 'Electrical', 'Plumbing', 'Painting', 'Carpentry', 'HVAC / Tech'].map((cat) => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap backdrop-blur-md transition-all shadow-md ${
                selectedCategory === cat 
                  ? 'bg-amber-500 text-stone-950 font-black border border-amber-300 shadow-amber-500/30' 
                  : 'bg-stone-900/80 text-stone-300 border border-stone-700 hover:bg-stone-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Application Success Banner */}
      {applySuccessMsg && (
        <div className="absolute top-24 left-4 right-4 z-20 bg-emerald-900/90 backdrop-blur-md border border-emerald-400 text-emerald-100 p-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span>{applySuccessMsg}</span>
        </div>
      )}

      {/* Bottom Popup Card for Selected Gig Pin */}
      {selectedGig && (
        <div className="absolute bottom-4 left-3 right-3 z-20 bg-stone-900/95 backdrop-blur-md text-white p-4 rounded-3xl border border-amber-500/40 shadow-2xl space-y-3 animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                {selectedGig.category}
              </span>
              <h3 className="text-sm font-extrabold text-white mt-1">{selectedGig.title}</h3>
              <p className="text-[10px] text-stone-400 flex items-center gap-1">
                <span>By {selectedGig.seekerName}</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{selectedGig.distance}</span>
              </p>
            </div>
            <button 
              onClick={() => setSelectedGig(null)}
              className="text-stone-400 hover:text-white font-bold p-1"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
            {selectedGig.description}
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-amber-400 font-black text-sm bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
              {selectedGig.budget}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleApplyGig(selectedGig)}
                className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-lg flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Apply for Gig</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
