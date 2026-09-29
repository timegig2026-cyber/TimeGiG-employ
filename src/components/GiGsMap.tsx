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
  DollarSign,
  AlertTriangle,
  XCircle,
  Compass,
  Trash2,
  Edit3,
  Save,
  Calendar
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
  address?: string;
  createdBy: string;
  status?: 'active' | 'completed' | 'cancelled';
  cancellationReason?: string;
  expiresAt?: string; 
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

  // Search Collapsing State
  const [isSearchCollapsed, setIsSearchCollapsed] = useState<boolean>(false);

  // Search States (Main Map View)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Requirement: Interactive prompt state when searching address
  const [pendingSearchLocation, setPendingSearchLocation] = useState<{ lat: number; lng: number; displayName: string } | null>(null);

  // Direct Location Search & Geocoding inside Gig Creation Form
  const [formSearchQuery, setFormSearchQuery] = useState<string>('');
  const [formSearchResults, setFormSearchResults] = useState<SearchResult[]>([]);
  const [isFormSearching, setIsFormSearching] = useState<boolean>(false);
  const [showFormDropdown, setShowFormDropdown] = useState<boolean>(false);

  // User Profile logo state
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
  const [newAddress, setNewAddress] = useState<string>(''); 
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [expiryDateTime, setExpiryDateTime] = useState<string>(''); 
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState<boolean>(false);

  // Gig Details, Completing, Editing & Cancelling
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [showApplySuccess, setShowApplySuccess] = useState<boolean>(false);

  // Edit Inline States
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editBudget, setEditBudget] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editExpiry, setEditExpiry] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Cancellation Flow States
  const [isCancellingMode, setIsCancellingMode] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCompletingMode, setIsCompletingMode] = useState<boolean>(false);

  // Default initial center (Cape Town center)
  const defaultCenter = { lat: -33.9249, lng: 18.4241 };

  // Retrieve persistent session-safe identifier for current user/device
  const getUserId = () => {
    if (auth.currentUser?.email) return auth.currentUser.email;
    let localId = localStorage.getItem('timegig_local_uid');
    if (!localId) {
      localId = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('timegig_local_uid', localId);
    }
    return localId;
  };

  const currentUserId = getUserId();

  // Reverse geocode user location on mount or when opening form
  useEffect(() => {
    if (isCreateModalOpen && coords && !newAddress) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.display_name) {
            setNewAddress(data.display_name);
            setFormSearchQuery(data.display_name);
          }
        })
        .catch((err) => {
          console.warn("Reverse geocode failed:", err);
          setNewAddress("Current GPS Location");
        });
    }
  }, [isCreateModalOpen, coords]);

  // Notify the app bar when creation form toggles to hide bottom navigation menu bar
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

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
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

    utterance.pitch = 1.08;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Speak automatically whenever route updates
  useEffect(() => {
    if (!routeInfo) return;
    const destName = routeInfo.destinationName ? `to ${routeInfo.destinationName}` : '';
    speakGuidance(
      `Guidance started. Your destination ${destName} is ${routeInfo.distance} away. The estimated drive time is ${routeInfo.duration}. Have a safe trip!`
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

  // Track exact position using Geolocation API
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

  // Sync Gigs in Real-time from Firestore
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const q = query(collection(db, 'gigs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedGigs: Gig[] = [];

      Object.values(liveGigMarkersRef.current).forEach((marker) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      liveGigMarkersRef.current = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Gig, 'id'>;
        const gig = { id: docSnap.id, ...data } as Gig;

        if (gig.status === 'cancelled' || gig.status === 'completed') {
          return;
        }

        // Expiry comparison
        if (gig.expiresAt) {
          const expiryTime = new Date(gig.expiresAt).getTime();
          const currentTime = new Date().getTime();
          if (currentTime >= expiryTime) {
            return;
          }
        }

        loadedGigs.push(gig);

        if (mapInstanceRef.current && gig.lat && gig.lng) {
          let categoryColor = '#f59e0b';
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

          marker.on('click', () => {
            setSelectedGig(gig);
            setIsEditingMode(false);
            setIsCancellingMode(false);
            setCancelReason('');
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
              Exact Spot Plotted!
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

  // Update user marker and profile logo
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

  // Apply to Gig & Guide User
  const handleApplyToGig = async (gig: Gig) => {
    if (!coords) {
      speakGuidance("Please wait for GPS coordinates to stabilize before applying.");
      return;
    }

    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setShowApplySuccess(true);
      speakGuidance(`Congratulations! Your application to ${gig.title} is successful. Beginning routing guidance.`);

      calculateRoute(coords.lat, coords.lng, gig.lat, gig.lng, gig.title);

      setTimeout(() => {
        setShowApplySuccess(false);
        setSelectedGig(null);
      }, 4000);
    }, 1200);
  };

  // Cancel Gig Flow
  const handleCancelGigSubmit = async () => {
    if (!selectedGig || !cancelReason.trim()) return;

    try {
      const gigDocRef = doc(db, 'gigs', selectedGig.id);
      await updateDoc(gigDocRef, {
        status: 'cancelled',
        cancellationReason: cancelReason
      });

      speakGuidance("This gig job has been successfully cancelled.");
      setSelectedGig(null);
      setIsCancellingMode(false);
      setCancelReason('');
    } catch (err) {
      console.error("Failed to cancel gig:", err);
    }
  };

  // Complete Gig Flow
  const handleCompleteGigSubmit = async () => {
    if (!selectedGig) return;

    try {
      const gigDocRef = doc(db, 'gigs', selectedGig.id);
      await updateDoc(gigDocRef, {
        status: 'completed'
      });

      speakGuidance("Great job! This gig has been marked as completed successfully.");
      setSelectedGig(null);
    } catch (err) {
      console.error("Failed to complete gig:", err);
    }
  };

  // Only gig creator can delete gig from the map
  const handleDeleteGigSubmit = async () => {
    if (!selectedGig) return;

    try {
      const gigDocRef = doc(db, 'gigs', selectedGig.id);
      await deleteDoc(gigDocRef);

      speakGuidance("This gig listing has been permanently deleted from the map.");
      setSelectedGig(null);
    } catch (err) {
      console.error("Failed to delete gig:", err);
    }
  };

  // Only gig creator can edit gig from the map
  const handleSaveGigEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGig || !editTitle.trim() || !editBudget.trim()) return;

    setIsSavingEdit(true);
    try {
      const gigDocRef = doc(db, 'gigs', selectedGig.id);
      const updatedFields: Partial<Gig> = {
        title: editTitle,
        budget: editBudget,
        description: editDesc,
        category: editCategory,
        address: editAddress
      };

      if (editExpiry) {
        updatedFields.expiresAt = new Date(editExpiry).toISOString();
      }

      await updateDoc(gigDocRef, updatedFields);

      speakGuidance("Your gig details are updated.");
      setSelectedGig({ ...selectedGig, ...updatedFields });
      setIsEditingMode(false);
    } catch (err) {
      console.error("Failed to edit gig:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Trigger inline editor with active gig values
  const handleStartEditing = () => {
    if (!selectedGig) return;
    setEditTitle(selectedGig.title);
    setEditBudget(selectedGig.budget);
    setEditDesc(selectedGig.description || '');
    setEditCategory(selectedGig.category);
    setEditAddress(selectedGig.address || '');
    setEditExpiry(selectedGig.expiresAt ? selectedGig.expiresAt.substring(0, 16) : '');
    setIsEditingMode(true);
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
      const docPayload: any = {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        budget: newBudget,
        address: newAddress.trim() || 'Current Location Coordinates', 
        lat: targetLat,
        lng: targetLng,
        createdBy: currentUserId,
        status: 'active',
        createdAt: new Date()
      };

      if (expiryDateTime) {
        docPayload.expiresAt = new Date(expiryDateTime).toISOString();
      }

      await addDoc(collection(db, 'gigs'), docPayload);

      setShowSuccessNotification(true);
      speakGuidance("Success! Your job has been published on the map.");

      setNewTitle('');
      setNewDesc('');
      setNewCategory('Plumbing');
      setNewBudget('');
      setNewAddress('');
      setFormSearchQuery('');
      setExpiryDateTime('');
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

  // Execute Address Search in Form
  const handleFormLocationSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formSearchQuery.trim()) return;

    setIsFormSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formSearchQuery)}&limit=5`
      );
      const data = await response.json();
      setFormSearchResults(data);
      setShowFormDropdown(true);
    } catch (err) {
      console.error("Form search error:", err);
    } finally {
      setIsFormSearching(false);
    }
  };

  // Set selected coordinate inside form dropdown
  const handleSelectFormLocation = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    setPinLocation({ lat, lng });
    setNewAddress(result.display_name);
    setFormSearchQuery(result.display_name);
    setShowFormDropdown(false);
    setFormSearchResults([]);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
    }
  };

  // Main address search
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
        // Requirement: When user search location let the app first ask if user want to create a gig at that searched location or skip
        setPendingSearchLocation({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name
        });
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Set selected coordinate, position markers and start guidance
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
      setNewAddress(displayName); 
      setFormSearchQuery(displayName);
    }

    if (coords) {
      calculateRoute(coords.lat, coords.lng, lat, lng, displayName.split(',')[0]);
    } else {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
    }
  };

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

  const toggleMapType = () => {
    setMapType((prev) => (prev === 'street' ? 'satellite' : 'street'));
  };

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
    <div className="fixed inset-0 w-full h-full pb-[64px] overflow-hidden bg-stone-900 z-10 select-none">
      <style>{`
        .custom-user-marker, .custom-search-marker, .custom-temp-marker, .custom-gig-marker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Address Search Bar / Collapsed Floating icon */}
      <div className="absolute top-4 left-4 right-4 z-[1001] max-w-md mx-auto transition-all duration-300">
        {isSearchCollapsed ? (
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
                onClick={() => {
                  // Requirement: Ask if user wants to create a gig at that searched location or skip
                  setPendingSearchLocation({
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    displayName: result.display_name
                  });
                }}
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

      {/* Requirement: Create Gig Confirmation Prompt Overlay on top of Search */}
      {pendingSearchLocation && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[3500] animate-fade-in">
          <div className="bg-stone-900 border border-white/10 rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col space-y-4 text-stone-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
                <HelpCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-white text-xs font-black uppercase tracking-wider font-sans">Location Found!</h3>
                <p className="text-[10px] text-stone-400 font-sans">Create a Gig or Skip?</p>
              </div>
            </div>

            <div className="space-y-1 bg-stone-950/40 p-3 rounded-2xl border border-white/5 font-sans">
              <span className="text-[8px] font-black uppercase text-stone-500 block">Searched Location Address</span>
              <p className="text-white text-xs font-bold leading-relaxed line-clamp-2">
                {pendingSearchLocation.displayName}
              </p>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
              Would you like to **create and post a live Gig job** at this exact searched location, or **skip** and just view it on the map?
            </p>

            <div className="flex flex-col gap-2 pt-1 shrink-0 font-sans">
              <button
                onClick={() => {
                  const { lat, lng, displayName } = pendingSearchLocation;
                  setPinLocation({ lat, lng });
                  setNewAddress(displayName);
                  setFormSearchQuery(displayName);
                  setIsCreateModalOpen(true);
                  setPendingSearchLocation(null);
                  setShowDropdown(false);
                  speakGuidance("Opening form to post a gig at your searched location.");
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase tracking-wider rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <MapPin className="w-4 h-4 shrink-0" />
                <span>📍 Yes, Create Gig Here</span>
              </button>
              
              <button
                onClick={() => {
                  const { lat, lng, displayName } = pendingSearchLocation;
                  navigateToLocation(lat, lng, displayName);
                  setPendingSearchLocation(null);
                  speakGuidance("Skipped. Centering map on address.");
                }}
                className="w-full py-3 bg-stone-800 hover:bg-stone-750 text-white font-black uppercase tracking-wider rounded-2xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <span>Skip & Just View Address</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Guidance / Route Info Card */}
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

      {/* Integrated Vertical Control Column */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[2000] flex flex-col gap-2">
        <button
          onClick={() => {
            if (coords) {
              mapInstanceRef.current?.setView([coords.lat, coords.lng], 16, { animate: true, duration: 1.5 });
              speakGuidance("Recentered on your exact GPS location.");
            } else {
              speakGuidance("Retrieving your GPS signal, please wait...");
              initiateLocationAccess();
            }
          }}
          className="w-10 h-10 bg-stone-900/90 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl flex items-center justify-center hover:bg-stone-800 text-amber-400 active:scale-90 transition-all cursor-pointer"
          title="Recenter Map to My GPS Location"
        >
          <Compass className="w-5 h-5 stroke-[2.2]" />
        </button>

        <div className="w-10 h-[1px] bg-white/15 my-0.5" />

        <button
          onClick={() => {
            setIsCreateModalOpen((prev) => !prev);
            setPinLocation(null);
            setSelectedGig(null);
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

      {/* Gig Creator form - Fills screen completely */}
      {isCreateModalOpen && (
        <div className="absolute inset-0 z-[2500] bg-stone-950 overflow-y-auto flex flex-col p-6 animate-slide-up select-none">
          <div className="max-w-md mx-auto w-full flex flex-col space-y-6 pt-6 pb-20">
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

            <form onSubmit={handleCreateGigSubmit} className="space-y-5 font-sans text-stone-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Job Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Urgent painting or carpentry work needed"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              {/* Search Location */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                  🔍 Search & Pin Custom Location
                </label>
                <div className="relative flex items-center bg-stone-900 border border-white/10 rounded-2xl p-1 shrink-0 focus-within:border-amber-500 transition-all">
                  <input
                    type="text"
                    value={formSearchQuery}
                    onChange={(e) => setFormSearchQuery(e.target.value)}
                    placeholder="Search address, street name, or suburb..."
                    className="w-full bg-transparent text-white placeholder-stone-500 text-xs border-none outline-none focus:ring-0 pl-3 pr-2 py-2"
                  />
                  <button
                    type="button"
                    onClick={handleFormLocationSearch}
                    disabled={isFormSearching}
                    className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[10px] px-3.5 py-2 rounded-xl uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    {isFormSearching ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>Search</span>
                    )}
                  </button>
                </div>

                {/* Dropdown */}
                {showFormDropdown && formSearchResults.length > 0 && (
                  <div className="bg-stone-900 border border-white/10 rounded-2xl p-1.5 mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {formSearchResults.map((result) => (
                      <button
                        key={result.place_id}
                        type="button"
                        onClick={() => handleSelectFormLocation(result)}
                        className="w-full text-left text-white hover:bg-white/10 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all"
                      >
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate text-xs">{result.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-stone-900 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-all"
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
                    placeholder="e.g. R600"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Final address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                  Final Gig Address Text (Change Manually)
                </label>
                <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5">
                  <MapPin className="w-4 h-4 text-amber-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Auto-fills address, or type custom label..."
                    className="w-full bg-transparent text-white placeholder-stone-500 text-sm border-none outline-none focus:ring-0 p-0"
                  />
                </div>
              </div>

              {/* Gig auto-expiry date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Gig Auto-Expiry Date & Time (Removes from Map)</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={expiryDateTime}
                  onChange={(e) => setExpiryDateTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Detailed Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe your job requirements, steps, tools provided, and specific preferences..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-500 transition-all resize-none"
                />
              </div>

              <div className="p-4 bg-stone-900 border border-white/10 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">📍 Map Pinpoint Coordinates</span>
                  <span className="text-amber-500 text-[10px] font-bold">Locked Spot</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed font-mono">
                  {pinLocation ? `Lat: ${pinLocation.lat.toFixed(5)}, Lng: ${pinLocation.lng.toFixed(5)}` : "Using GPS Location Spot"}
                </p>
              </div>

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

      {/* Gig Detailed Board */}
      {selectedGig && (
        <div className="absolute bottom-4 left-4 right-16 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-85 max-h-[42vh] overflow-y-auto bg-stone-900/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-3xl p-4 flex flex-col space-y-3 z-[2500] animate-slide-up text-stone-300 select-none">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7.5 h-7.5 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[8px] font-black uppercase tracking-wider text-stone-400 block">Live Job details</span>
                <span className="text-white font-extrabold text-xs block truncate max-w-[160px]">{selectedGig.title}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedGig(null);
                setIsEditingMode(false);
                setIsCancellingMode(false);
              }}
              className="p-1 bg-white/5 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Inline Edit View (Requirement: Only creator can edit from map) */}
          {isEditingMode ? (
            <form onSubmit={handleSaveGigEdit} className="space-y-3.5 text-xs font-sans text-stone-300">
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-stone-400">Edit Title</span>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-stone-400">Payout</span>
                  <input
                    type="text"
                    required
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-stone-400">Category</span>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Painting">Painting</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="HVAC">HVAC</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-stone-400">Edit Address Text</span>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-stone-400">Edit Expiry Date & Time</span>
                <input
                  type="datetime-local"
                  required
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-stone-400">Description</span>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingMode(false)}
                  className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Regular Card Display Block */
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-stone-300">
                <div className="bg-stone-950 p-2 rounded-xl flex items-center gap-2 border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="overflow-hidden">
                    <span className="text-[7px] font-bold text-stone-500 uppercase block">Category</span>
                    <span className="text-white text-[10px] font-black block truncate">{selectedGig.category}</span>
                  </div>
                </div>
                <div className="bg-stone-950 p-2 rounded-xl flex items-center gap-2 border border-white/5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="overflow-hidden">
                    <span className="text-[7px] font-bold text-stone-500 uppercase block">Payout</span>
                    <span className="text-emerald-400 text-[10px] font-black block truncate">{selectedGig.budget}</span>
                  </div>
                </div>
              </div>

              {selectedGig.expiresAt && (
                <div className="bg-rose-950/25 border border-rose-500/20 p-2 rounded-xl flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
                  <div className="overflow-hidden">
                    <span className="text-[7px] text-rose-400 font-black block uppercase">Auto-expiry Limit</span>
                    <span className="text-white text-[9.5px] font-semibold block truncate">
                      {new Date(selectedGig.expiresAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              )}

              {selectedGig.address && (
                <div className="bg-stone-950/40 p-2 rounded-xl border border-white/5 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="overflow-hidden">
                    <span className="text-[7px] text-stone-500 font-bold block">Job Address Location</span>
                    <span className="text-white text-[9.5px] font-semibold truncate block">{selectedGig.address}</span>
                  </div>
                </div>
              )}

              <div className="space-y-0.5 bg-stone-950/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[8px] font-black uppercase tracking-wider text-stone-500 block">Description / Job Details</span>
                <p className="text-stone-300 text-[11px] leading-relaxed max-h-20 overflow-y-auto pr-1">
                  {selectedGig.description || 'No detailed instructions provided.'}
                </p>
              </div>

              {/* Cancellation Dialog Area */}
              {isCancellingMode && (
                <div className="space-y-2 bg-rose-950/25 border border-rose-500/25 p-2.5 rounded-xl text-stone-300">
                  <span className="text-[8px] font-black uppercase text-rose-400 block">Reason for cancellation</span>
                  <textarea
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Provide reason for cancelling..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-[10px] outline-none resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelGigSubmit}
                      disabled={!cancelReason.trim()}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] uppercase rounded-lg cursor-pointer"
                    >
                      Confirm Cancel
                    </button>
                    <button
                      onClick={() => setIsCancellingMode(false)}
                      className="px-2.5 py-1.5 bg-stone-800 text-stone-300 text-[9px] rounded-lg cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* Complete Confirmation Area */}
              {isCompletingMode && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/25 rounded-xl space-y-2 text-stone-300">
                  <span className="text-[8px] text-emerald-400 font-black uppercase block">Mark Job Completed?</span>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleCompleteGigSubmit}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg cursor-pointer"
                    >
                      Yes, Done
                    </button>
                    <button
                      onClick={() => setIsCompletingMode(false)}
                      className="px-2.5 py-1.5 bg-stone-800 text-stone-300 text-[9px] rounded-lg cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* Actions Area */}
              {!isCancellingMode && !isCompletingMode && (
                <div className="space-y-2 shrink-0">
                  {selectedGig.createdBy === currentUserId ? (
                    /* Creator Flow (Requirement: Edit or Delete Gig only for Creator) */
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <span className="text-[8px] font-black uppercase text-amber-500">
                          ⭐ Gig Owner Control Panel
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={handleStartEditing}
                          className="py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold uppercase rounded-xl text-[9px] flex items-center justify-center gap-1 border border-white/10 active:scale-95 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setIsCompletingMode(true)}
                          className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl text-[9px] flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </button>
                        <button
                          onClick={handleDeleteGigSubmit}
                          className="py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase rounded-xl text-[9px] flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Applicant Flow */
                    <button
                      onClick={() => handleApplyToGig(selectedGig)}
                      disabled={isApplying}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black uppercase tracking-widest rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Applying...</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Apply & Navigate</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full-Screen Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
