import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Map as MapIcon, Globe, Crosshair, Navigation, MapPin, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

type MapViewType = 'standard' | 'satellite';

interface BestGPSLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export function GigsMapFeature() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const bestLocationRef = useRef<BestGPSLocation | null>(null);

  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);
  const [bestLocation, setBestLocation] = useState<BestGPSLocation | null>(null);
  const [mapView, setMapView] = useState<MapViewType>('standard');
  const [statusText, setStatusText] = useState<string>('GPS Permission Required');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Tile layer URLs (Zero API Cost)
  const standardTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  // Process incoming GPS Reading
  const processGPSReading = (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;
    const currentBest = bestLocationRef.current;

    let shouldUpdate = false;
    if (!currentBest) {
      shouldUpdate = true;
    } else {
      const distance = Math.hypot(latitude - currentBest.lat, longitude - currentBest.lng) * 111000;
      if (accuracy < currentBest.accuracy || distance > currentBest.accuracy) {
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      const newBest: BestGPSLocation = {
        lat: latitude,
        lng: longitude,
        accuracy,
        timestamp: position.timestamp,
      };

      bestLocationRef.current = newBest;
      setBestLocation(newBest);
      setGpsError(null);
      setIsLocating(false);

      if (accuracy > 100) {
        setStatusText(`GPS signal weak (±${Math.round(accuracy)}m) — searching...`);
      } else if (accuracy > 50) {
        setStatusText(`Searching for more accurate GPS... (±${Math.round(accuracy)}m)`);
      } else {
        setStatusText(`GPS Position Locked (±${Math.round(accuracy)}m)`);
      }
    }
  };

  // Handle Geolocation Errors
  const handleGPSError = (error: GeolocationPositionError) => {
    setIsLocating(false);
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setGpsError('Location permission was denied. Please allow location access in your browser or device settings.');
        setStatusText('Permission Denied.');
        break;
      case error.POSITION_UNAVAILABLE:
        setGpsError('GPS signal unavailable. Please ensure location/GPS is turned on in your device settings.');
        setStatusText('GPS Signal Unavailable.');
        break;
      case error.TIMEOUT:
        setGpsError('GPS request timed out. Retrying high-accuracy location...');
        setStatusText('GPS Timeout — Retrying...');
        break;
      default:
        setGpsError('Unable to acquire device GPS location.');
        setStatusText('GPS Error.');
        break;
    }
  };

  // Request Location Permission & Start GPS Watch
  const requestLocationPermission = () => {
    setPermissionRequested(true);
    setGpsError(null);
    setIsLocating(true);
    setStatusText('Acquiring high-accuracy GPS position...');

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.');
      setStatusText('Geolocation Unsupported.');
      setIsLocating(false);
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
    };

    // Explicit call on button click triggers browser native permission prompt!
    navigator.geolocation.getCurrentPosition(
      (pos) => processGPSReading(pos),
      (err) => handleGPSError(err),
      options
    );

    // Watch position continuously for live device movements
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => processGPSReading(pos),
      (err) => handleGPSError(err),
      options
    );
  };

  // Auto-prompt on load if permissions API is available
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          requestLocationPermission();
        }
      }).catch(() => {});
    }

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

  // Render and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !bestLocation) return;

    const { lat, lng, accuracy } = bestLocation;
    const titleText = accuracy <= 15 ? 'Your Exact Device Location' : 'Device Location';
    const accuracyLabel = `GPS Accuracy: ±${Math.round(accuracy)}m`;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: accuracy <= 30 ? 17 : 15,
        zoomControl: false,
      });

      const initialTile = L.tileLayer(
        mapView === 'satellite' ? satelliteTileUrl : standardTileUrl,
        {
          maxZoom: 19,
          attribution: mapView === 'satellite' ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap',
        }
      ).addTo(map);

      tileLayerRef.current = initialTile;

      const customIcon = L.divIcon({
        className: 'gps-device-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-blue-500 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-6 w-6 bg-blue-600 border-2 border-white shadow-2xl items-center justify-center">
              <span class="w-2 h-2 rounded-full bg-white"></span>
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-size:11px; text-align:center; padding:2px;">
          <strong style="color:#0284c7; display:block; font-size:12px;">${titleText}</strong>
          <span style="color:#334155; font-weight:600;">${accuracyLabel}</span><br/>
          <span style="color:#64748b; font-size:10px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
        </div>
      `).openPopup();

      const accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: accuracy > 50 ? '#f59e0b' : '#3b82f6',
        fillColor: accuracy > 50 ? '#fbbf24' : '#60a5fa',
        fillOpacity: 0.18,
        weight: 1.5,
      }).addTo(map);

      markerRef.current = marker;
      accuracyCircleRef.current = accuracyCircle;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom(), {
        animate: true,
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setPopupContent(`
          <div style="font-size:11px; text-align:center; padding:2px;">
            <strong style="color:#0284c7; display:block; font-size:12px;">${titleText}</strong>
            <span style="color:#334155; font-weight:600;">${accuracyLabel}</span><br/>
            <span style="color:#64748b; font-size:10px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
          </div>
        `);
      }

      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([lat, lng]);
        accuracyCircleRef.current.setRadius(accuracy);
      }
    }
  }, [bestLocation]);

  const toggleMapView = (newView: MapViewType) => {
    setMapView(newView);
    if (mapInstanceRef.current) {
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }

      const newTile = L.tileLayer(
        newView === 'satellite' ? satelliteTileUrl : standardTileUrl,
        {
          maxZoom: 19,
          attribution: newView === 'satellite' ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap',
        }
      ).addTo(mapInstanceRef.current);

      tileLayerRef.current = newTile;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full pt-0 pb-14 bg-stone-900 z-10 flex flex-col">
      {/* Top Status & Map Style Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-[1000] pointer-events-none gap-2">
        <div className="bg-stone-900/95 text-white px-3 py-1.5 rounded-full text-[10px] font-bold border border-white/20 backdrop-blur-md shadow-lg flex items-center gap-2 pointer-events-auto truncate max-w-[220px] sm:max-w-md">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isLocating
                ? 'bg-amber-400 animate-ping'
                : bestLocation && bestLocation.accuracy <= 50
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-amber-500'
            }`}
          />
          <span className="truncate">{statusText}</span>
        </div>

        <div className="bg-stone-900/95 p-1 rounded-full border border-white/20 backdrop-blur-md shadow-lg flex items-center gap-1 pointer-events-auto flex-shrink-0">
          <button
            onClick={() => toggleMapView('standard')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
              mapView === 'standard'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <MapIcon className="w-3 h-3" />
            Standard
          </button>

          <button
            onClick={() => toggleMapView('satellite')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
              mapView === 'satellite'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Globe className="w-3 h-3" />
            Satellite
          </button>
        </div>
      </div>

      {/* Explicit Location Permission Request Modal */}
      {!permissionRequested && !bestLocation && (
        <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-3xl border border-white/20 p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-white">
            <div className="p-4 rounded-2xl bg-blue-600/20 text-blue-400 w-16 h-16 mx-auto flex items-center justify-center border border-blue-500/30">
              <Navigation className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black tracking-tight">Allow Device Location GPS Access</h2>
              <p className="text-xs text-stone-300 leading-relaxed">
                TimeGig requires permission to access your device's high-accuracy GPS location to position you accurately on the map.
              </p>
            </div>

            <button
              type="button"
              onClick={requestLocationPermission}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-95 transition-all"
            >
              <MapPin className="w-4 h-4 text-amber-300" />
              Allow GPS Location Access
            </button>
          </div>
        </div>
      )}

      {/* GPS Error Display */}
      {gpsError && !bestLocation && (
        <div className="absolute top-16 left-4 right-4 z-[1000] p-4 rounded-2xl bg-stone-900/95 border border-rose-500/40 text-white shadow-2xl backdrop-blur-md max-w-sm mx-auto space-y-3 text-center">
          <div className="p-3 rounded-full bg-rose-500/20 text-rose-400 w-12 h-12 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-xs font-black text-white">Device GPS Signal Required</h3>
            <p className="text-[10px] text-stone-300 mt-1 leading-relaxed">{gpsError}</p>
          </div>

          <button
            onClick={requestLocationPermission}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Grant Permission & Retry GPS
          </button>
        </div>
      )}

      {/* Recenter / Request Fresh GPS Position Button */}
      <button
        type="button"
        onClick={requestLocationPermission}
        className="absolute bottom-20 right-4 z-[1000] p-3 rounded-full bg-stone-900 hover:bg-black text-white border-2 border-white/40 shadow-xl transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
        title="Request fresh high-accuracy GPS position"
      >
        <Crosshair className={`w-5 h-5 ${isLocating ? 'animate-spin text-amber-400' : 'text-blue-400'}`} />
      </button>

      {/* Full-Screen Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />
    </div>
  );
}
