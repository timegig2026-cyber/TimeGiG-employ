import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Loader2,
  MapPin,
  Plus,
  Minus,
  X,
  Navigation,
  RotateCcw,
  Layers,
  Briefcase,
  Volume2,
  Sparkles,
  CheckCircle,
  HelpCircle,
  EyeOff,
  Eye,
  CheckSquare,
  Clock,
  DollarSign
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getStoredProfiles } from '../utils/profileStore';

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
  destinationName?: string;
}

interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  lat: number;
  lng: number;
  createdAt?: any;
}

export default function GiGsMap({ activeTab }: { activeTab?: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const liveGigMarkersRef = useRef<{ [id: string]: L.Marker }>({});

  const watchIdRef = useRef<number | null>(null);
  const [coords, setCoords] = useState<UserCoords | null>(null);

  // Map Layer States (Street vs Satellite)
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  // Search Collapsing State (Requirement 2: User can hide search bar)
  const [isSearchCollapsed, setIsSearchCollapsed] = useState<boolean>(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // User Profile logo state (Requirement 3: show profile logo on the map)
  const [profileLogo, setProfileLogo] = useState<string | null>(null);

  // Routing Guidance States
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

  // Gig States
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Plumbing');
  const [newBudget, setNewBudget] = useState<string>('');
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState<boolean>(false);

  // Gig Details & Applying (Requirement 3: Click gig to show full information and apply)
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [showApplySuccess, setShowApplySuccess] = useState<boolean>(false);

  // Default initial center (Cape Town center)
  const defaultCenter = { lat: -33.9249, lng: 18.4241 };

  // Dispatch custom event when the Creation form is toggled so App.tsx can hide the bottom menu bar
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('gigs_form_status', { detail: { open: isCreateModalOpen } })
    );
  }, [isCreateModalOpen]);

  // Load User Profile Logo from Store
  const loadUserProfileLogo = () => {
    const list = getStoredProfiles();
    if (list.length > 0 && list[0].faceImage) {
      setProfileLogo(list[0].faceImage);
    } else {
      setProfileLogo(null);
    }
  };

  useEffect(() => {
    loadUserProfileLogo();
    window.addEventListener('profile_store_updated', loadUserProfileLogo);
    return () => {
      window.removeEventListener('profile_store_updated', loadUserProfileLogo);
    };
  }, []);

  // Re-measure container dimensions smoothly when navigating back to map tab
  useEffect(() => {
    if (activeTab === 'GiGs' && mapInstanceRef.current) {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: true });
        }
      }, 150);
    }
  }, [activeTab]);

  // Lady voice guidance synthesis
  const speakGuidance = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel active synthesis first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Dynamic lady/assistant voice lookup
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        name.includes('female') ||
        name.includes('google us english') ||
        name.includes('samantha') ||
        name.includes('zira') ||
        name.includes('hazel') ||
        name.includes('moira') ||
        name.includes('tessa') ||
        name.includes('karen') ||
        name.includes('english')
      );
    });

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.pitch = 1.08; // Friendly feminine voice pitch
    utterance.rate = 0.95;  // Clear, friendly pace
    window.speechSynthesis.speak(utterance);
  };

  // Speak automatically whenever route metadata updates
  useEffect(() => {
    if (!routeInfo) return;
    const destName = routeInfo.destinationName ? `to ${routeInfo.destinationName}` : '';
    speakGuidance(
      `Guidance started. Your destination ${destName} is ${routeInfo.distance} away. The estimated drive time is ${routeInfo.duration}. Have a safe and pleasant trip!`
    );
  }, [routeInfo]);

  // Register Voice loading event
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  // Track exact position using HTML5 Geolocation API
  const handleGPSSuccess = (pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = pos.coords;
    setCoords({ lat: latitude, lng: longitude, accuracy });
  };

  const handleGPSError = (err: GeolocationPositionError) => {
    console.warn("GPS Location status:", err.message);
  };

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
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    }

    const newLayer = L.tileLayer(url, {
      maxZoom,
      subdomains: ['a', 'b', 'c']
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Sync Gigs in Real-time from Firestore & bind click triggers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const q = query(collection(db, 'gigs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedGigs: Gig[] = [];

      // Clear all old gig markers first
      Object.values(liveGigMarkersRef.current).forEach((marker) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      liveGigMarkersRef.current = {};

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Gig, 'id'>;
        const gig = { id: doc.id, ...data } as Gig;
        loadedGigs.push(gig);

        // Render Marker for Gig on map
        if (mapInstanceRef.current && gig.lat && gig.lng) {
          let categoryColor = '#f59e0b'; // Gold / Amber default
          if (gig.category === 'Electrical') categoryColor = '#ef4444';
          if (gig.category === 'Plumbing') categoryColor = '#3b82f6';
          if (gig.category === 'Painting') categoryColor = '#10b981';
          if (gig.category === 'Carpentry') categoryColor = '#8b5cf6';
          if (gig.category === 'HVAC') categoryColor = '#ec4899';

          const gigDivIcon = L.divIcon({
            className: 'custom-gig-marker',
            html: `
              <div class="relative flex flex-col items-center group">
                <div class="absolute -top-12 bg-stone-900 text-white border border-white/20 text-[9px] font-bold px-2 py-1 rounded-md shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                  ${gig.title} (${gig.budget})
                </div>
                <div class="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white scale-95 hover:scale-110 active:scale-90 transition-all duration-300" style="background-color: ${categoryColor}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
                </div>
                <div class="w-1.5 h-1.5 bg-white border border-stone-500 rounded-full -mt-0.5 shadow-lg"></div>
              </div>
            `,
            iconSize: [32, 45],
            iconAnchor: [16, 40]
          });

          const marker = L.marker([gig.lat, gig.lng], { icon: gigDivIcon }).addTo(mapInstanceRef.current);

          // Click handler to display FULL INFORMATION side panel (Requirement 3)
          marker.on('click', () => {
            setSelectedGig(gig);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([gig.lat, gig.lng], 15);
            }
          });

          liveGigMarkersRef.current[gig.id] = marker;
        }
      });

      setGigs(loadedGigs);
    });

    return () => unsubscribe();
  }, [mapInstanceRef.current, coords]);

  // Bind click-to-pin target event on map when Gig Creation mode is active
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isCreateModalOpen) {
        setPinLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    mapInstanceRef.current.on('click', handleMapClick);
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick);
      }
    };
  }, [mapInstanceRef.current, isCreateModalOpen]);

  // Handle drawing temporary placeholder pin on map
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tempMarkerRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }

    if (pinLocation) {
      const tempIcon = L.divIcon({
        className: 'custom-temp-marker',
        html: `
          <div class="relative flex flex-col items-center animate-bounce">
            <div class="bg-amber-500 text-stone-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg mb-1 whitespace-nowrap">
              Exact Gig Spot Plotted!
            </div>
            <div class="w-8 h-8 rounded-full bg-stone-900 border-2 border-amber-500 flex items-center justify-center text-amber-500 shadow-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        `,
        iconSize: [120, 50],
        iconAnchor: [60, 48]
      });

      tempMarkerRef.current = L.marker([pinLocation.lat, pinLocation.lng], { icon: tempIcon }).addTo(mapInstanceRef.current);
      mapInstanceRef.current.setView([pinLocation.lat, pinLocation.lng], 15);
    }
  }, [pinLocation, mapInstanceRef.current]);

  // Update map and user marker immediately
  useEffect(() => {
    if (!mapInstanceRef.current || !coords) return;

    const { lat, lng, accuracy } = coords;

    if (!routePolylineRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
    }

    const userDivIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div class="relative flex items-center justify-center w-12 h-12">
          <div class="absolute w-12 h-12 bg-blue-500/35 rounded-full animate-ping"></div>
          <div class="absolute w-10 h-10 bg-blue-600/20 rounded-full border border-blue-400"></div>
          
          <div class="relative w-8 h-8 rounded-full border-2 border-white shadow-2xl overflow-hidden bg-stone-950 flex items-center justify-center">
            ${
              profileLogo
                ? `<img src="${profileLogo}" class="w-full h-full object-cover" />`
                : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-tr from-amber-500 to-amber-600 text-stone-950 font-black text-xs uppercase">TG</div>`
            }
          </div>
          
          <div class="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 border border-white rounded-full shadow-lg"></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.setIcon(userDivIcon);
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
  }, [coords, profileLogo]);

  // Request OSRM driving directions
  const calculateRoute = async (startLat: number, startLng: number, endLat: number, endLng: number, targetName?: string) => {
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

        if (routePolylineRef.current) {
          mapInstanceRef.current.removeLayer(routePolylineRef.current);
        }

        const polyline = L.polyline(routeCoords, {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '2, 3'
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = polyline;

        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1) + ' km',
          duration: Math.round(route.duration / 60) + ' mins',
          destinationName: targetName
        });

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

  // Apply to Gig & Guide User (Requirement 3: Apply to gig & start direct route navigation)
  const handleApplyToGig = async (gig: Gig) => {
    if (!coords) {
      speakGuidance("Please wait for GPS coordinates to stabilize before applying.");
      return;
    }

    setIsApplying(true);
    // Simulate high-fidelity gig application process
    setTimeout(() => {
      setIsApplying(false);
      setShowApplySuccess(true);
      speakGuidance(`Congratulations! Your application to ${gig.title} is successful. Beginning routing guidance to the gig's exact location.`);

      // Initiate continuous route guidelines
      calculateRoute(coords.lat, coords.lng, gig.lat, gig.lng, gig.title);

      setTimeout(() => {
        setShowApplySuccess(false);
        setSelectedGig(null); // Minimize panel once navigation is underway
      }, 4000);
    }, 1200);
  };

  // Submit New Gig to Firestore
  const handleCreateGigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBudget.trim()) return;

    let targetLat = defaultCenter.lat;
    let targetLng = defaultCenter.lng;

    if (pinLocation) {
      targetLat = pinLocation.lat;
      targetLng = pinLocation.lng;
    } else if (coords) {
      targetLat = coords.lat;
      targetLng = coords.lng;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'gigs'), {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        budget: newBudget,
        lat: targetLat,
        lng: targetLng,
        createdAt: new Date()
      });

      setShowSuccessNotification(true);
      speakGuidance("Success! Your job has been published on the map.");

      setNewTitle('');
      setNewDesc('');
      setNewCategory('Plumbing');
      setNewBudget('');
      setPinLocation(null);
      setIsCreateModalOpen(false);

      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 4000);
    } catch (err) {
      console.error("Failed to create gig:", err);
    } finally {
      setIsSubmitting(false);
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

    if (isCreateModalOpen) {
      setPinLocation({ lat, lng });
    }

    if (coords) {
      calculateRoute(coords.lat, coords.lng, lat, lng, displayName.split(',')[0]);
    } else {
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
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
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

  const toggleMapType = () => {
    setMapType((prev) => (prev === 'street' ? 'satellite' : 'street'));
  };

  return (
    <div className="fixed inset-0 w-full h-full pb-[64px] overflow-hidden bg-stone-900 z-10">
      {/* Dynamic override styles for markers */}
      <style>{`
        .custom-user-marker, .custom-search-marker, .custom-temp-marker, .custom-gig-marker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Address Search Bar / Collapsed Floating icon (Requirement 2: User can hide search bar) */}
      <div className="absolute top-4 left-4 right-4 z-[1001] max-w-md mx-auto transition-all duration-300">
        {isSearchCollapsed ? (
          /* Tiny elegant search reveal button when hidden */
          <div className="flex justify-end pr-2">
            <button
              onClick={() => setIsSearchCollapsed(false)}
              className="w-10 h-10 bg-stone-900/95 border border-white/20 text-amber-400 rounded-xl flex items-center justify-center hover:bg-stone-800 active:scale-90 transition-all shadow-2xl cursor-pointer"
              title="Expand Search Bar"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* Full expanded search bar with Hide Toggle built-in */
          <form onSubmit={handleAddressSearch} className="relative flex items-center w-full bg-stone-900/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-1.5 animate-fade-in">
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
                  className="p-1 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-all shrink-0 mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Hide collapse icon trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsSearchCollapsed(true);
                  setShowDropdown(false);
                }}
                className="p-1.5 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-all shrink-0"
                title="Collapse Search Bar"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
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
        )}

        {/* Suggestion Dropdown Auto-Complete */}
        {!isSearchCollapsed && showDropdown && searchResults.length > 0 && (
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

      {/* Dynamic Success Notification */}
      {showSuccessNotification && (
        <div className="absolute top-20 left-4 right-4 max-w-sm mx-auto z-[2500] bg-emerald-500/95 backdrop-blur-md border border-emerald-400/30 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 text-white animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-100 shrink-0" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100">Notification</span>
            <p className="text-xs font-bold">Your job has been published on the map!</p>
          </div>
        </div>
      )}

      {/* Applied Success Notification Banner */}
      {showApplySuccess && (
        <div className="absolute top-20 left-4 right-4 max-w-md mx-auto z-[2500] bg-blue-500/95 backdrop-blur-md border border-blue-400/30 shadow-2xl rounded-3xl p-4 flex items-center gap-3.5 text-white animate-fade-in">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-100 block">Job Application Submitted</span>
            <p className="text-xs font-bold">Guidance started to the gig's exact location!</p>
          </div>
        </div>
      )}

      {/* Floating Guidance / Route Info Card at the bottom center */}
      {routeInfo && (
        <div className="absolute bottom-20 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-85 z-[1001] bg-stone-950/95 border border-amber-500/30 shadow-2xl rounded-2xl p-3.5 flex items-center justify-between text-white animate-fade-in pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                const destName = routeInfo.destinationName ? `to ${routeInfo.destinationName}` : '';
                speakGuidance(`Attention. Your route is ${routeInfo.distance} long. Estimated time is ${routeInfo.duration}. Please follow the highlighted lines.`);
              }}
              className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 hover:bg-blue-500/35 hover:scale-105 active:scale-95 transition-all"
              title="Repeat Voice Instructions"
            >
              <Volume2 className="w-4 h-4 animate-bounce" />
            </button>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Voice Guidance Active</span>
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

      {/* Integrated Vertical Control Column (Zoom + Satellite Switcher + Create a Gig) on the right vertical center */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[2000] flex flex-col gap-2">
        {/* Create a Gig Button (Placed ontop of Map icon) */}
        <button
          onClick={() => {
            setIsCreateModalOpen((prev) => !prev);
            setPinLocation(null);
            setSelectedGig(null); // minimize details if open
          }}
          className={`w-10 h-10 rounded-xl border shadow-2xl flex flex-col items-center justify-center active:scale-90 hover:scale-105 transition-all cursor-pointer font-sans ${
            isCreateModalOpen
              ? 'bg-rose-500 border-rose-500 text-white'
              : 'bg-amber-500 border-amber-500 text-stone-950'
          }`}
          title="Create a Gig"
        >
          {isCreateModalOpen ? (
            <X className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <Briefcase className="w-4.5 h-4.5 stroke-[2.5]" />
          )}
          <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">
            {isCreateModalOpen ? 'Close' : 'Post'}
          </span>
        </button>

        <div className="w-10 h-[1px] bg-white/15 my-0.5" />

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

      {/* Requirement 1: Let the Gig form fill the screen. Covers entire map frame completely */}
      {isCreateModalOpen && (
        <div className="absolute inset-0 z-[2500] bg-stone-950 overflow-y-auto flex flex-col p-6 animate-slide-up select-none">
          <div className="max-w-md mx-auto w-full flex flex-col space-y-6 pt-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white text-base font-black uppercase tracking-wider">Post a Live Gig Job</h3>
                  <p className="text-xs text-stone-400">Pins instantly on the global search map</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setPinLocation(null);
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleCreateGigSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Job Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Urgent painting or carpentry work needed"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-stone-900 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Painting">Painting</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="HVAC">HVAC</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Budget Estimate</label>
                  <input
                    type="text"
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="e.g. R600 / $150"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Detailed Description</label>
                <textarea
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe your job requirements, steps, tools provided, and specific preferences..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
                />
              </div>

              {/* Requirement 2: Exact Location or change location inside full-screen form */}
              <div className="p-4 bg-stone-900 border border-white/10 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">📍 Live Location Setting</span>
                  <span className="text-amber-500 text-[10px] font-bold">Lock Coordinates</span>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed">
                  The gig will pin-point at: 
                  {pinLocation ? (
                    <strong className="text-white block font-mono text-xs mt-1 bg-white/5 p-2 rounded-xl">
                      Latitude: {pinLocation.lat.toFixed(5)} , Longitude: {pinLocation.lng.toFixed(5)}
                    </strong>
                  ) : (
                    <strong className="text-amber-400 block font-mono text-xs mt-1 bg-white/5 p-2 rounded-xl">
                      Your Precise Current Geolocation (Default)
                    </strong>
                  )}
                </p>

                <div className="text-[11px] text-stone-400 leading-relaxed italic bg-stone-950/40 p-3 rounded-2xl border border-white/5">
                  💡 <span className="text-white font-bold">How to change location:</span> You can close this form temporarily, search for an address in the top search bar, or simply click any coordinate directly on the background map, and the gig pin will instantly reposition!
                </div>

                {pinLocation && (
                  <button
                    type="button"
                    onClick={() => setPinLocation(null)}
                    className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Reset to My GPS Location
                  </button>
                )}
              </div>

              {/* Publish button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase tracking-widest rounded-2xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-xl"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>Publish Gig Job & Open Map</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Requirement 3: Show full information panel when user clicks any gig marker on the map */}
      {selectedGig && (
        <div className="absolute bottom-4 left-4 right-16 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-96 z-[2500] bg-stone-900/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-3xl overflow-hidden animate-slide-up select-none p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Briefcase className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">Active Map Gig Job</span>
                <span className="text-white font-extrabold text-sm block truncate max-w-[180px]">{selectedGig.title}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedGig(null)}
              className="p-1 bg-white/5 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-950 p-2.5 rounded-2xl flex items-center gap-2 border border-white/5">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-[8px] font-bold text-stone-500 uppercase block">Category</span>
                <span className="text-white text-[11px] font-black">{selectedGig.category}</span>
              </div>
            </div>
            <div className="bg-stone-950 p-2.5 rounded-2xl flex items-center gap-2 border border-white/5">
              <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[8px] font-bold text-stone-500 uppercase block">Payout</span>
                <span className="text-emerald-400 text-[11px] font-black">{selectedGig.budget}</span>
              </div>
            </div>
          </div>

          {/* Detailed description */}
          <div className="space-y-1 bg-stone-950/40 p-3 rounded-2xl border border-white/5">
            <span className="text-[9px] font-black uppercase tracking-wider text-stone-400">Description / Job Details</span>
            <p className="text-stone-300 text-xs leading-relaxed max-h-24 overflow-y-auto pr-1">
              {selectedGig.description || 'No detailed instructions or requirements provided for this gig.'}
            </p>
          </div>

          {/* Apply action button (Requirement 3: Apply & start direct navigation) */}
          <button
            onClick={() => handleApplyToGig(selectedGig)}
            disabled={isApplying}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black uppercase tracking-widest rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying to Job...</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                <span>Apply to this Gig & Navigate</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Full-Screen Interactive Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
