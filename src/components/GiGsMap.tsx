import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface UserCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

export default function GiGsMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const [coords, setCoords] = useState<UserCoords | null>(null);

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
      zoomControl: true,
      attributionControl: true
    }).setView([defaultCenter.lat, defaultCenter.lng], 13);

    // Free OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

  return (
    <div className="fixed inset-0 w-full h-full pb-[64px] overflow-hidden bg-stone-900 z-10">
      {/* Explicit style tags to completely reset default Leaflet divIcon backgrounds */}
      <style>{`
        .custom-user-marker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Clean, Full-Screen Interactive Leaflet Map Container with no overlays */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
