import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2, MapPin, Plus, Minus, X, Navigation, RotateCcw, Layers } from 'lucide-react';

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

interface RouteInfo {
  distance: string;
  duration: string;
}

export default function GiGsMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const [coords, setCoords] = useState<UserCoords | null>(null);

  // Map Layer States (Street vs Satellite)
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Routing Guidance States
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

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

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultCenter.lat, defaultCenter.lng], 13);

    // Initial Street Tile Layer
    const initialLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    tileLayerRef.current = initialLayer;
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

  // Watch mapType and update layers dynamically
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove old active layer
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZoom = 19;

    if (mapType === 'satellite') {
      // Free Esri World Imagery (High-precision open satellite tiles)
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    }

    const newLayer = L.tileLayer(url, {
      maxZoom,
      subdomains: ['a', 'b', 'c']
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Update map and marker immediately when coordinates are set
  useEffect(() => {
    if (!mapInstanceRef.current || !coords) return;

    const { lat, lng, accuracy } = coords;

    // If there is no search route active, center map on user exact position
    if (!routePolylineRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
    }

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
        fillOpacity: 0.1,
        weight: 1.5
      }).addTo(mapInstanceRef.current);
    }
  }, [coords]);

  // Request OSRM driving directions from current user position to target searched position
  const calculateRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    if (!mapInstanceRef.current) return;
    setIsCalculatingRoute(true);

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeCoords: [number, number][] = route.geometry.coordinates.map(
          (point: [number, number]) => [point[1], point[0]] as [number, number]
        );

        // Clear existing route line
        if (routePolylineRef.current) {
          mapInstanceRef.current.removeLayer(routePolylineRef.current);
        }

        // Render beautiful, glowing guidance line
        const polyline = L.polyline(routeCoords, {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '2, 3'
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = polyline;

        // Save metadata info
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1) + ' km',
          duration: Math.round(route.duration / 60) + ' mins'
        });

        // Fit map bounds to view user current position and the searched destination seamlessly
        mapInstanceRef.current.fitBounds(polyline.getBounds(), {
          padding: [60, 60]
        });
      }
    } catch (err) {
      console.error("OSRM Route calculation failed:", err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

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

    // Custom high-contrast Pin marker for searches
    const searchPinIcon = L.divIcon({
      className: 'custom-search-marker',
      html: `
        <div class="relative flex flex-col items-center animate-bounce">
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

    searchMarkerRef.current.bindPopup(`
      <div style="font-size:11px; font-family:sans-serif; text-align:center; padding:2px;">
        <strong style="color:#d97706; display:block; font-size:12px; margin-bottom:2px;">Searched Location</strong>
        <span style="color:#334155; font-weight:600;">${displayName}</span>
      </div>
    `).openPopup();

    setShowDropdown(false);

    // If user's current GPS location is active, draw guidance route lines directly!
    if (coords) {
      calculateRoute(coords.lat, coords.lng, lat, lng);
    } else {
      // Just fly to target if user position is not loaded yet
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
    }
  };

  // Clear Guidance Routing details
  const handleClearRoute = () => {
    if (mapInstanceRef.current) {
      if (routePolylineRef.current) {
        mapInstanceRef.current.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (searchMarkerRef.current) {
        mapInstanceRef.current.removeLayer(searchMarkerRef.current);
        searchMarkerRef.current = null;
      }
      setRouteInfo(null);
      if (coords) {
        mapInstanceRef.current.setView([coords.lat, coords.lng], 16);
      }
    }
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

  // Switch Map Layer Type
  const toggleMapType = () => {
    setMapType((prev) => (prev === 'street' ? 'satellite' : 'street'));
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

      {/* Address Search Bar overlay at the very top */}
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

      {/* Floating Guidance / Route Info Card at the bottom center */}
      {routeInfo && (
        <div className="absolute bottom-20 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-80 z-[1001] bg-stone-950/95 border border-amber-500/30 shadow-2xl rounded-2xl p-3.5 flex items-center justify-between text-white animate-fade-in pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Direct Guidance Route</span>
              <div className="flex items-center gap-1.5 text-xs font-black">
                <span className="text-white">{routeInfo.distance}</span>
                <span className="text-stone-500">•</span>
                <span className="text-amber-400">{routeInfo.duration}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClearRoute}
            className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl flex items-center gap-1 text-[10px] transition-colors active:scale-95 cursor-pointer font-bold shrink-0"
            title="Clear Route & Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* Integrated Vertical Control Column (Zoom + Satellite Switcher) on the right vertical center */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[2000] flex flex-col gap-2">
        {/* Satellite Map Switcher (Small elegant toggle icon) */}
        <button
          onClick={toggleMapType}
          className={`w-10 h-10 rounded-xl border shadow-2xl flex flex-col items-center justify-center active:scale-90 transition-all cursor-pointer bg-stone-900/90 backdrop-blur-md ${
            mapType === 'satellite'
              ? 'border-amber-500 text-amber-400'
              : 'border-white/20 text-stone-300 hover:text-white'
          }`}
          title="Toggle Satellite View"
        >
          <Layers className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[7px] font-extrabold uppercase mt-0.5 tracking-tighter">
            {mapType === 'satellite' ? 'Sat' : 'Map'}
          </span>
        </button>

        <div className="w-10 h-[1px] bg-white/10 my-0.5" />

        {/* Zoom Controls */}
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
