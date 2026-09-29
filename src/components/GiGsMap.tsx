import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2, MapPin, Plus, Minus, X } from 'lucide-react';

interface UserCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function GiGsMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const [coords, setCoords] = useState<UserCoords | null>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Default initial center (Cape Town center)
  const defaultCenter = { lat: -33.9249, lng: 18.4241 };

  // Track exact position using HTML5 Geolocation API
  const handleGPSSuccess = (pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = pos.coords;
    setCoords({ lat: latitude, lng: longitude, accuracy });
  };

  const handleGPSError = (err: GeolocationPositionError) => {
    console.warn("GPS Location status:", err.message);
  };

  // Start continuous watching of coordinates automatically
  const initiateLocationAccess = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(handleGPSSuccess, handleGPSError, options);
    watchIdRef.current = navigator.geolocation.watchPosition(handleGPSSuccess, handleGPSError, options);
  };

  // Initialize Map Container safely
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // ZoomControl is false because we implement custom premium React zoom buttons in the bottom corner (Requirement 1 & 2)
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultCenter.lat, defaultCenter.lng], 13);

    // Free OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    mapInstanceRef.current = map;

    // Trigger high-accuracy device location automatically on load
    initiateLocationAccess();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map and marker immediately when coordinates are set
  useEffect(() => {
    if (!mapInstanceRef.current || !coords) return;

    const { lat, lng, accuracy } = coords;

    // Center map on user exact position
    mapInstanceRef.current.setView([lat, lng], 16);

    // User Pulse Icon HTML (with background/border overridden)
    const userDivIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10">
          <div class="absolute w-10 h-10 bg-blue-500/35 rounded-full animate-ping"></div>
          <div class="absolute w-8 h-8 bg-blue-600/25 rounded-full border-2 border-blue-400"></div>
          <div class="relative w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
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
      userMarkerRef.current.bindTooltip("You Are Here", { permanent: false, direction: 'top' });
    }

    // Accuracy Circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([lat, lng]).setRadius(accuracy);
    } else {
      accuracyCircleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1.5
      }).addTo(mapInstanceRef.current);
    }
  }, [coords]);

  // Execute Address Search using Nominatim open-source API (Zero API Cost)
  const handleAddressSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowDropdown(true);

      // If we got results, jump immediately to the top matched address
      if (data && data.length > 0) {
        navigateToLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Center Map & Render Marker on searched address
  const navigateToLocation = (lat: number, lng: number, displayName: string) => {
    if (!mapInstanceRef.current) return;

    // Move view with clean high-zoom fly animation
    mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });

    // Custom high-contrast Pin marker for searches
    const searchPinIcon = L.divIcon({
      className: 'custom-search-marker',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="bg-stone-900 border border-amber-500 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xl whitespace-nowrap mb-1 max-w-[150px] truncate">
            ${displayName.split(',')[0]}
          </div>
          <div class="w-8 h-8 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-stone-900 shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [120, 50],
      iconAnchor: [60, 48]
    });

    if (searchMarkerRef.current) {
      searchMarkerRef.current.setLatLng([lat, lng]);
    } else {
      searchMarkerRef.current = L.marker([lat, lng], { icon: searchPinIcon }).addTo(mapInstanceRef.current);
    }

    // Set popup contents and trigger
    searchMarkerRef.current.bindPopup(`
      <div style="font-size:11px; font-family:sans-serif; text-align:center; padding:2px;">
        <strong style="color:#d97706; display:block; font-size:12px; margin-bottom:2px;">Searched Location</strong>
        <span style="color:#334155; font-weight:600;">${displayName}</span>
      </div>
    `).openPopup();

    setShowDropdown(false);
  };

  // Custom Zoom Control actions
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full pb-[64px] overflow-hidden bg-stone-900 z-10">
      {/* Dynamic override styles for markers */}
      <style>{`
        .custom-user-marker, .custom-search-marker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Premium Address Search Bar overlay at the very top (Requirement 2) */}
      <div className="absolute top-4 left-4 right-4 z-[1001] max-w-md mx-auto">
        <form onSubmit={handleAddressSearch} className="relative flex items-center w-full bg-stone-900/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-1.5">
          <div className="flex items-center flex-1 pl-2.5">
            <Search className="w-4 h-4 text-stone-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, street, or province..."
              className="w-full bg-transparent text-white placeholder-stone-400 text-xs border-none outline-none focus:ring-0 pl-2 pr-2 font-sans py-1.5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="p-1 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all shrink-0 disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>Search</span>
            )}
          </button>
        </form>

        {/* Suggestion Dropdown Auto-Complete */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl max-h-56 overflow-y-auto overflow-x-hidden p-1.5 space-y-1">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => navigateToLocation(parseFloat(result.lat), parseFloat(result.lon), result.display_name)}
                className="w-full text-left px-3 py-2.5 hover:bg-white/10 text-white rounded-xl flex items-center gap-2.5 transition-all cursor-pointer text-xs group"
              >
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate pr-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Premium Zoom Controls positioned directly on top of the bottom menu bar */}
      <div className="absolute bottom-6 right-4 z-[1001] flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-stone-900/90 backdrop-blur-md text-white border border-white/20 rounded-xl shadow-2xl flex items-center justify-center hover:bg-stone-800 active:scale-90 transition-all cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-5 h-5 text-amber-400 stroke-[2.5]" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-stone-900/90 backdrop-blur-md text-white border border-white/20 rounded-xl shadow-2xl flex items-center justify-center hover:bg-stone-800 active:scale-90 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-5 h-5 text-amber-400 stroke-[2.5]" />
        </button>
      </div>

      {/* Full-Screen Interactive Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
