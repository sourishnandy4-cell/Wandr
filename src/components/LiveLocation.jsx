import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Navigation, Loader2, MapPin, Compass, AlertTriangle,
  Play, Square, Plus, Trash2, Car, Bike, ArrowRight,
  LocateFixed, Layers, ChevronLeft, Volume2, X,
  ArrowUpRight, CornerUpRight, CornerUpLeft, ArrowUp, Flag
} from 'lucide-react';
import { fetchItinerary } from '../lib/itineraryService';

/* ─────────────────────────────────────────────────────────────────────────
   SCRIPT / STYLE LOADERS
───────────────────────────────────────────────────────────────────────── */
const loadScript = (src, id) => new Promise((resolve, reject) => {
  if (document.getElementById(id)) { resolve(); return; }
  const el = document.createElement('script');
  el.src = src; el.id = id; el.async = true;
  el.onload = resolve; el.onerror = reject;
  document.head.appendChild(el);
});
const loadStyle = (href, id) => {
  if (document.getElementById(id)) return;
  const el = document.createElement('link');
  el.rel = 'stylesheet'; el.href = href; el.id = id;
  document.head.appendChild(el);
};
const loadLeafletStack = async () => {
  loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet-css');
  loadStyle('https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css', 'lrm-css');
  await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet-js');
  await loadScript('https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js', 'lrm-js');
};

/* ─────────────────────────────────────────────────────────────────────────
   GEOCODING (Nominatim)
───────────────────────────────────────────────────────────────────────── */
const geocode = async (query) => {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'WandrApp/2.0' } }
    );
    const d = await r.json();
    if (d?.[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon), label: d[0].display_name };
  } catch (_) {}
  return null;
};

const INDIA_PLACES = [
  'andhra pradesh','arunachal pradesh','assam','bihar','chhattisgarh','goa','gujarat','haryana',
  'himachal pradesh','jharkhand','karnataka','kerala','madhya pradesh','maharashtra','manipur',
  'meghalaya','mizoram','nagaland','odisha','punjab','rajasthan','sikkim','tamil nadu','telangana',
  'tripura','uttar pradesh','uttarakhand','west bengal','delhi','jammu','kashmir','ladakh',
  'lakshadweep','puducherry','pondicherry','mumbai','bengaluru','bangalore','chennai','kolkata',
  'hyderabad','pune','ahmedabad','jaipur','surat','lucknow','kanpur','nagpur','indore','patna',
  'bhopal','ludhiana','agra','varanasi','amritsar','shimla','manali','srinagar','darjeeling',
  'gangtok','kochi','coimbatore','madurai','jamshedpur','ranchi','bhubaneswar','dehradun',
  'haridwar','rishikesh','noida','gurugram','gurgaon','chandigarh','mysuru','mysore',
  'vijayawada','visakhapatnam','thiruvananthapuram','kozhikode','thrissur','prayagraj',
  'meerut','mathura','vrindavan','badrinath','kedarnath','pushkar','udaipur','jodhpur',
  'bikaner','mount abu','ranthambore','ajmer','jaisalmer','kota','aurangabad','nashik',
  'kolhapur','gwalior','ujjain','rewa','jabalpur','raipur','bhilai','bilaspur'
];
const indianize = (q) => {
  if (!q) return q;
  const low = q.toLowerCase().trim();
  if (low.includes('india') || low.includes(', in')) return q;
  return INDIA_PLACES.some(p => low === p || low.startsWith(p + ',') || low.endsWith(', ' + p) || low.includes(' ' + p)) ? `${q}, India` : q;
};

/* ─────────────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────────────── */
const haversine = (a, b) => {
  const R = 6371, r = d => d * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
};
const calcBearing = (from, to) => {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const fmtTime = (mins) => {
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins/60)}h ${mins%60}m`;
};

/* ─────────────────────────────────────────────────────────────────────────
   TRAVEL MODES
───────────────────────────────────────────────────────────────────────── */
const MODES = {
  car:  { label: 'Car',  icon: Car,    osrm: 'driving', speed: 55, lineColor: '#1a73e8' },
  bus:  { label: 'Bus',  icon: Car,    osrm: 'driving', speed: 30, lineColor: '#f97316' },
  bike: { label: 'Bike', icon: Bike,   osrm: 'cycling', speed: 18, lineColor: '#16a34a' },
  walk: { label: 'Walk', icon: MapPin, osrm: 'foot',    speed: 5,  lineColor: '#9333ea' },
};

/* ─────────────────────────────────────────────────────────────────────────
   NAV STEP ICON HELPER
───────────────────────────────────────────────────────────────────────── */
const NavIcon = ({ type, size = 28 }) => {
  const s = type?.toLowerCase?.() || '';
  if (s.includes('right'))       return <CornerUpRight size={size} />;
  if (s.includes('left'))        return <CornerUpLeft  size={size} />;
  if (s.includes('destination')) return <Flag         size={size} />;
  return <ArrowUp size={size} />;
};

/* ─────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────── */
export const LiveLocation = ({ tripId, tripDestination, currentUser }) => {
  const mapRef         = useRef(null);
  const mapInst        = useRef(null);
  const userMarker     = useRef(null);
  const headingMarker  = useRef(null); // arrow marker showing direction
  const routeControl   = useRef(null);
  const incidentGroup  = useRef(null);
  const watchId        = useRef(null);
  const navTimer       = useRef(null);
  const routePts       = useRef([]); // all decoded route coords
  const bearingRef     = useRef(0);

  /* State */
  const [loading,       setLoading]       = useState(true);
  const [mapReady,      setMapReady]      = useState(false);
  const [simMode,       setSimMode]       = useState(false);
  const [userCoords,    setUserCoords]    = useState(null);
  const [startStr,      setStartStr]      = useState('');
  const [destStr,       setDestStr]       = useState('');
  const [destCoords,    setDestCoords]    = useState(null);
  const [travelMode,    setTravelMode]    = useState('car');
  const [mapStyle,      setMapStyle]      = useState('streets');
  const [showTraffic,   setShowTraffic]   = useState(true);
  const [routeStats,    setRouteStats]    = useState(null);
  const [trafficIdx,    setTrafficIdx]    = useState(0);
  const [incidents,     setIncidents]     = useState([]);
  const [instructions,  setInstructions]  = useState([]);
  const [routeError,    setRouteError]    = useState('');
  const [dirLoading,    setDirLoading]    = useState(false);

  /* Nav state */
  const [navPhase,      setNavPhase]      = useState('idle'); // idle | directions | navigating
  const [navStep,       setNavStep]       = useState(0);
  const [navSpeed,      setNavSpeed]      = useState(0);
  const [navDist,       setNavDist]       = useState(0);
  const [navETA,        setNavETA]        = useState(0);
  const [autoDrive,     setAutoDrive]     = useState(false);
  const [bearing,       setBearing]       = useState(0);

  /* ─── INIT ─── */
  useEffect(() => {
    const init = async () => {
      try {
        await loadLeafletStack();
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStartStr('My Current Location'); setSimMode(false); setLoading(false); },
            () => fallbackLocation(),
            { enableHighAccuracy: true, timeout: 8000 }
          );
        } else fallbackLocation();
      } catch { setLoading(false); }
    };
    init();
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      clearTimer();
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    };
  }, []);

  const fallbackLocation = async () => {
    setSimMode(true);
    // Point towards Paris by default (independent of trip name, as requested)
    let c = { lat: 48.8566, lng: 2.3522 }, label = 'Paris, France';
    setUserCoords(c); setStartStr(label); setLoading(false);
  };

  /* ─── LIVE GPS WATCH ─── */
  useEffect(() => {
    if (simMode || !navigator.geolocation) {
      if (watchId.current) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(c);
        updateMarkerPos(c);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [simMode]);

  const updateMarkerPos = (c) => {
    if (userMarker.current) userMarker.current.setLatLng([c.lat, c.lng]);
  };

  /* ─── BUILD MAP ─── */
  useEffect(() => {
    if (!userCoords || !mapRef.current || mapInst.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true })
      .setView([userCoords.lat, userCoords.lng], 13);
    mapInst.current = map;
    incidentGroup.current = L.layerGroup().addTo(map);
    applyTile(L, mapStyle);

    userMarker.current = L.marker([userCoords.lat, userCoords.lng], {
      icon: makeMarkerIcon(L, travelMode, 0, false),
      draggable: simMode
    }).addTo(map);

    userMarker.current.on('dragend', e => {
      const latlng = e.target.getLatLng();
      setUserCoords({ lat: latlng.lat, lng: latlng.lng });
    });

    plotItinerary(L, map);
    setMapReady(true);
  }, [userCoords]);

  /* ─── TILE LAYER ─── */
  const applyTile = (L, style) => {
    if (!mapInst.current) return;
    mapInst.current.eachLayer(l => { if (l instanceof L.TileLayer) mapInst.current.removeLayer(l); });
    const cfgs = {
      streets:   { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap' },
      satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Esri' },
      dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '© CartoDB' },
    };
    const c = cfgs[style] || cfgs.streets;
    L.tileLayer(c.url, { attribution: c.attr, maxZoom: 19 }).addTo(mapInst.current);
  };
  useEffect(() => { if (window.L && mapInst.current) applyTile(window.L, mapStyle); }, [mapStyle]);

  /* ─── DRAGGABLE ─── */
  useEffect(() => {
    if (!userMarker.current) return;
    if (simMode && navPhase !== 'navigating') userMarker.current.dragging?.enable();
    else userMarker.current.dragging?.disable();
  }, [simMode, navPhase]);

  /* ─── TOP-DOWN VEHICLE ICONS (Google Maps / Waze style, front = TOP) ─── */
  const VEHICLE_SVGS = {

    /* ── CAR: clean sedan top-down ── */
    car: (color) => `
      <svg viewBox="0 0 48 80" xmlns="http://www.w3.org/2000/svg" width="30" height="50">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(0,0,0,0.15)"/>
            <stop offset="50%" stop-color="rgba(255,255,255,0.08)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0.2)"/>
          </linearGradient>
        </defs>
        <ellipse cx="24" cy="74" rx="13" ry="4" fill="rgba(0,0,0,0.2)"/>
        <rect x="2" y="14" width="8" height="13" rx="3.5" fill="#111"/>
        <rect x="38" y="14" width="8" height="13" rx="3.5" fill="#111"/>
        <rect x="3" y="16" width="6" height="9" rx="2" fill="#2a2a2a"/>
        <rect x="39" y="16" width="6" height="9" rx="2" fill="#2a2a2a"/>
        <rect x="2" y="53" width="8" height="13" rx="3.5" fill="#111"/>
        <rect x="38" y="53" width="8" height="13" rx="3.5" fill="#111"/>
        <rect x="3" y="55" width="6" height="9" rx="2" fill="#2a2a2a"/>
        <rect x="39" y="55" width="6" height="9" rx="2" fill="#2a2a2a"/>
        <rect x="7" y="9" width="34" height="62" rx="9" fill="${color}"/>
        <rect x="7" y="9" width="34" height="62" rx="9" fill="url(#cg)"/>
        <rect x="11" y="12" width="26" height="16" rx="5" fill="rgba(200,230,255,0.72)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
        <rect x="13" y="30" width="22" height="18" rx="4" fill="rgba(0,0,0,0.16)"/>
        <rect x="11" y="51" width="26" height="13" rx="4" fill="rgba(200,230,255,0.42)" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
        <rect x="9" y="10" width="7" height="4" rx="2" fill="#fffde7" opacity="0.95"/>
        <rect x="32" y="10" width="7" height="4" rx="2" fill="#fffde7" opacity="0.95"/>
        <rect x="9" y="66" width="7" height="3.5" rx="1.8" fill="#ef5350" opacity="0.9"/>
        <rect x="32" y="66" width="7" height="3.5" rx="1.8" fill="#ef5350" opacity="0.9"/>
      </svg>`,

    /* ── BUS: wide rectangular bus from above ── */
    bus: (color) => `
      <svg viewBox="0 0 56 96" xmlns="http://www.w3.org/2000/svg" width="34" height="58">
        <ellipse cx="28" cy="91" rx="18" ry="4" fill="rgba(0,0,0,0.2)"/>
        <rect x="1" y="16" width="9" height="14" rx="3" fill="#111"/>
        <rect x="46" y="16" width="9" height="14" rx="3" fill="#111"/>
        <rect x="1" y="66" width="9" height="14" rx="3" fill="#111"/>
        <rect x="46" y="66" width="9" height="14" rx="3" fill="#111"/>
        <rect x="8" y="6" width="40" height="84" rx="8" fill="${color}"/>
        <rect x="11" y="9" width="34" height="15" rx="5" fill="rgba(200,230,255,0.68)" stroke="rgba(255,255,255,0.35)" stroke-width="0.5"/>
        <rect x="10" y="28" width="10" height="8" rx="2" fill="rgba(200,230,255,0.55)"/>
        <rect x="10" y="40" width="10" height="8" rx="2" fill="rgba(200,230,255,0.55)"/>
        <rect x="10" y="52" width="10" height="8" rx="2" fill="rgba(200,230,255,0.55)"/>
        <rect x="10" y="64" width="10" height="8" rx="2" fill="rgba(200,230,255,0.55)"/>
        <rect x="36" y="28" width="10" height="8" rx="2" fill="rgba(200,230,255,0.55)"/>
        <rect x="36" y="40" width="10" height="8" rx="2" fill="rgba(200,230,255,0.55)"/>
        <rect x="36" y="52" width="10" height="8" rx="2" fill="rgba(200,230,255,0.55)"/>
        <rect x="36" y="64" width="10" height="8" rx="2" fill="rgba(200,230,255,0.55)"/>
        <rect x="20" y="26" width="16" height="44" rx="3" fill="rgba(255,255,255,0.1)"/>
        <rect x="10" y="7" width="8" height="4" rx="2" fill="#fffde7"/>
        <rect x="38" y="7" width="8" height="4" rx="2" fill="#fffde7"/>
        <rect x="10" y="85" width="8" height="4" rx="2" fill="#ef5350"/>
        <rect x="38" y="85" width="8" height="4" rx="2" fill="#ef5350"/>
      </svg>`,

    /* ── BIKE: motorbike from directly above ── */
    bike: (color) => `
      <svg viewBox="0 0 32 80" xmlns="http://www.w3.org/2000/svg" width="20" height="50">
        <ellipse cx="16" cy="76" rx="9" ry="3" fill="rgba(0,0,0,0.2)"/>
        <rect x="8" y="4" width="16" height="18" rx="8" fill="#111"/>
        <rect x="10" y="6" width="12" height="14" rx="6" fill="#2a2a2a"/>
        <ellipse cx="16" cy="13" rx="4" ry="5" fill="#3a3a3a"/>
        <rect x="8" y="58" width="16" height="18" rx="8" fill="#111"/>
        <rect x="10" y="60" width="12" height="14" rx="6" fill="#2a2a2a"/>
        <ellipse cx="16" cy="67" rx="4" ry="5" fill="#3a3a3a"/>
        <rect x="11" y="20" width="10" height="40" rx="5" fill="${color}"/>
        <ellipse cx="16" cy="33" rx="4" ry="5" fill="rgba(255,255,255,0.22)"/>
        <rect x="12" y="42" width="8" height="12" rx="3" fill="rgba(0,0,0,0.3)"/>
        <rect x="5" y="21" width="22" height="4" rx="2" fill="#1a1a1a"/>
        <rect x="5" y="21" width="4" height="4" rx="2" fill="#444"/>
        <rect x="23" y="21" width="4" height="4" rx="2" fill="#444"/>
        <ellipse cx="16" cy="22" rx="4" ry="3" fill="#fffde7" opacity="0.9"/>
      </svg>`,

    /* ── WALK: top-down walking person with arms, legs, and a backpack ── */
    walk: (color) => `
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
        <!-- Ambient drop shadow -->
        <ellipse cx="24" cy="42" rx="12" ry="4" fill="rgba(0,0,0,0.18)" />
        
        <!-- Left Arm (swinging backward) -->
        <rect x="10" y="22" width="5" height="14" rx="2.5" fill="${color}" stroke="white" stroke-width="1.5" transform="rotate(15 12.5 22)" />
        
        <!-- Right Leg (stepping backward) -->
        <rect x="26" y="25" width="6" height="15" rx="3" fill="${color}" stroke="white" stroke-width="1.5" />
        
        <!-- Left Leg (stepping forward) -->
        <rect x="16" y="8" width="6" height="15" rx="3" fill="${color}" stroke="white" stroke-width="1.5" />
        
        <!-- Right Arm (swinging forward) -->
        <rect x="33" y="12" width="5" height="14" rx="2.5" fill="${color}" stroke="white" stroke-width="1.5" transform="rotate(-15 35.5 12)" />
        
        <!-- Torso -->
        <rect x="15" y="17" width="18" height="14" rx="6" fill="${color}" stroke="white" stroke-width="1.5" />
        
        <!-- Backpack (traveler detail) -->
        <rect x="18" y="21" width="12" height="8" rx="2" fill="rgba(255,255,255,0.3)" />
        
        <!-- Head -->
        <circle cx="24" cy="22" r="6" fill="${color}" stroke="white" stroke-width="1.5" />
      </svg>`,
  };


  /**
   * makeMarkerIcon — returns a Leaflet divIcon.
   * @param {object} L         – Leaflet instance
   * @param {string} mode      – 'car' | 'bus' | 'bike' | 'walk'
   * @param {number} brng      – bearing in degrees (0 = north / up)
   * @param {boolean} navMode  – true = vehicle icon, false = blue dot
   */
  const makeMarkerIcon = (L, mode = 'car', brng = 0, navMode = false) => {
    const modeColor = MODES[mode]?.lineColor || '#1a73e8';
    if (!navMode) {
      // Default pulsing blue dot (non-nav)
      return L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(26,115,232,0.18);animation:navPing 2s ease-in-out infinite;"></div>
            <div style="position:relative;width:16px;height:16px;background:#1a73e8;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(26,115,232,0.5);"></div>
          </div>
          <style>@keyframes navPing{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.9);opacity:0}}</style>`,
        iconSize: [40, 40], iconAnchor: [20, 20]
      });
    }
    const svgFn = VEHICLE_SVGS[mode] || VEHICLE_SVGS.car;
    const svgHtml = svgFn(modeColor);
    return L.divIcon({
      className: '',
      html: `
        <div style="
          display:flex;align-items:center;justify-content:center;
          transform:rotate(${brng}deg);
          transform-origin:center center;
          filter:drop-shadow(0 3px 8px rgba(0,0,0,0.35));
          transition:transform 0.4s ease;
        ">
          ${svgHtml}
        </div>`,
      iconSize: [50, 60], iconAnchor: [25, 30]
    });
  };

  /* ─── ITINERARY PINS ─── */
  const plotItinerary = async (L, map) => {
    try {
      const { data } = await fetchItinerary(tripId);
      if (!data) return;
      for (const item of data.filter(x => x.location?.trim())) {
        const g = await geocode(item.location + (tripDestination ? `, ${tripDestination}` : ''));
        if (!g) continue;
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;border-radius:50%;background:rgba(26,115,232,0.25);border:2px solid #1a73e8;" title="${item.title}"></div>`,
          iconSize: [16, 16], iconAnchor: [8, 8]
        });
        L.marker([g.lat, g.lng], { icon }).addTo(map)
          .bindPopup(`<b style="color:#1a73e8">${item.title}</b><br><small>${item.location}</small><br><button onclick="window.__setDest('${item.location}')" style="margin-top:5px;background:#1a73e8;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:9px;cursor:pointer">Route Here</button>`);
        await new Promise(r => setTimeout(r, 120));
      }
    } catch (_) {}
  };
  useEffect(() => {
    window.__setDest = loc => { setDestStr(loc); setTimeout(() => handleGetDirections(loc), 50); };
    return () => delete window.__setDest;
  }, [userCoords]);

  /* ─────────────────────────────────────────────────────────────────────
     STEP 1: GET DIRECTIONS  (calculates + draws road route)
  ───────────────────────────────────────────────────────────────────── */
  const handleGetDirections = useCallback(async (overrideQuery) => {
    const query = overrideQuery || destStr;
    if (!query?.trim() || !userCoords) return;

    setDirLoading(true);
    setRouteError('');
    setRouteStats(null);
    setInstructions([]);

    const geocoded = await geocode(indianize(query));
    if (!geocoded) { setRouteError('Destination not found. Try a more specific name.'); setDirLoading(false); return; }

    const endC = { lat: geocoded.lat, lng: geocoded.lng };
    setDestCoords(endC);

    const L = window.L;
    if (!L || !mapInst.current) { setDirLoading(false); return; }

    // Remove old route
    if (routeControl.current) { try { mapInst.current.removeControl(routeControl.current); } catch (_) {} routeControl.current = null; }
    routePts.current = [];

    const mode = MODES[travelMode];

    const ctrl = L.Routing.control({
      waypoints: [L.latLng(userCoords.lat, userCoords.lng), L.latLng(endC.lat, endC.lng)],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: mode.osrm,
        suppressDemoServerWarning: true,
      }),
      lineOptions: {
        styles: [
          { color: '#000', opacity: 0.12, weight: 10 },
          { color: mode.lineColor, opacity: 1, weight: 6 },
          { color: '#fff', opacity: 0.35, weight: 2.5 },
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 10,
      },
      show: false, addWaypoints: false, routeWhileDragging: false, fitSelectedRoutes: true,
      createMarker: (i, wp) => {
        if (i === 0) return null;
        const dIcon = L.divIcon({
          className: '',
          html: `<div style="width:30px;height:30px;border-radius:50%;background:#1a73e8;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(26,115,232,0.5);font-size:14px;">🏁</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15]
        });
        return L.marker(wp.latLng, { icon: dIcon });
      },
    }).addTo(mapInst.current);

    routeControl.current = ctrl;

    ctrl.on('routesfound', e => {
      const route = e.routes[0];
      const dist  = (route.summary.totalDistance / 1000).toFixed(1);
      const dur   = Math.ceil(route.summary.totalTime / 60);
      const tIdx  = Math.min(Math.floor(Math.random() * 40) + (incidents.length * 12), 100);
      const delay = travelMode !== 'walk' ? Math.ceil(parseFloat(dist) * (tIdx / 100) * 1.5) : 0;
      setTrafficIdx(tIdx);
      setRouteStats({ distance: dist, duration: dur + delay, rawDuration: dur, delay });

      routePts.current = route.coordinates.map(c => ({ lat: c.lat, lng: c.lng }));

      const steps = (route.instructions || []).map(s => ({
        text: s.text, distance: s.distance > 0 ? `${(s.distance/1000).toFixed(1)} km` : '', type: s.type,
      }));
      setInstructions(steps);
      setNavDist(parseFloat(dist));
      setNavETA(dur + delay);
      setNavPhase('directions'); // show directions panel
      setDirLoading(false);
    });

    ctrl.on('routingerror', () => {
      setRouteError('Could not find a road route. Try different locations.');
      setDirLoading(false);
    });
  }, [userCoords, destStr, travelMode, incidents.length]);

  /* ─────────────────────────────────────────────────────────────────────
     STEP 2: START NAVIGATION  (switches to driver-perspective view)
  ───────────────────────────────────────────────────────────────────── */
  const handleStartNavigation = () => {
    if (!routePts.current.length) return;
    setSimMode(true);
    setNavPhase('navigating');
    setNavStep(0);
    setNavSpeed(MODES[travelMode].speed);
    setNavDist(parseFloat(routeStats?.distance || 0));
    setNavETA(routeStats?.duration || 0);

    // Immediately swap blue dot → vehicle icon facing north
    if (userMarker.current && window.L) {
      userMarker.current.setIcon(makeMarkerIcon(window.L, travelMode, 0, true));
      userMarker.current.dragging?.disable();
    }

    // Zoom into user position (driver perspective)
    if (mapInst.current && userCoords) {
      mapInst.current.flyTo([userCoords.lat, userCoords.lng], 17, { animate: true, duration: 1.2 });
    }

    // Disable zoom controls to keep nav view clean
    mapInst.current?.zoomControl?.remove?.();
  };

  const handleExitNavigation = () => {
    clearTimer();
    setNavPhase('directions');
    setAutoDrive(false);
    setNavStep(0);
    setNavSpeed(0);
    setBearing(0);
    // Restore zoom control and fit route
    const L = window.L;
    if (L && mapInst.current) {
      if (!mapInst.current.zoomControl._map) L.control.zoom().addTo(mapInst.current);
      if (routePts.current.length > 1) {
        const bounds = routePts.current.map(c => [c.lat, c.lng]);
        mapInst.current.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 0.8 });
      }
    }
    // Update marker to heading icon
    if (userMarker.current) userMarker.current.setIcon(makeMarkerIcon(window.L, travelMode, 0, false));
  };

  /* ─── RECALCULATE on mode change ─── */
  useEffect(() => {
    if (userCoords && destCoords && navPhase !== 'idle') handleGetDirections(destStr);
  }, [travelMode]);

  /* ─── SEARCH START LOCATION ─── */
  const handleSearchStart = async () => {
    if (!startStr.trim()) return;
    setDirLoading(true);
    const g = await geocode(indianize(startStr));
    if (!g) { alert('Start location not found.'); setDirLoading(false); return; }
    const c = { lat: g.lat, lng: g.lng };
    setSimMode(true); setUserCoords(c);
    if (userMarker.current) userMarker.current.setLatLng([c.lat, c.lng]);
    if (mapInst.current) mapInst.current.flyTo([c.lat, c.lng], 14, { animate: true, duration: 0.8 });
    if (destCoords) await handleGetDirections(destStr);
    setDirLoading(false);
  };

  /* ─────────────────────────────────────────────────────────────────────
     AUTO-DRIVE SIMULATION LOOP
  ───────────────────────────────────────────────────────────────────── */
  const clearTimer = () => { if (navTimer.current) clearInterval(navTimer.current); navTimer.current = null; };

  useEffect(() => {
    clearTimer();
    if (navPhase !== 'navigating' || !autoDrive || !routePts.current.length) return;

    navTimer.current = setInterval(() => {
      setNavStep(prev => {
        const next = prev + 2; // step 2 pts for smoother speed
        if (next >= routePts.current.length) {
          clearTimer();
          setNavPhase('directions');
          setAutoDrive(false);
          setNavDist(0); setNavETA(0); setNavSpeed(0);
          return prev;
        }

        const c     = routePts.current[next];
        const prevC = routePts.current[Math.max(0, next - 2)];

        // Bearing for heading arrow
        const brng = calcBearing(prevC, c);
        setBearing(brng);
        bearingRef.current = brng;

        // Move marker
        setUserCoords(c);
        if (userMarker.current) {
          userMarker.current.setLatLng([c.lat, c.lng]);
          // Update icon with current bearing
          userMarker.current.setIcon(makeMarkerIcon(window.L, travelMode, brng, true));
        }

        // Follow with camera (offset slightly ahead in direction of travel)
        if (mapInst.current) {
          mapInst.current.setView([c.lat, c.lng], 17, { animate: true, duration: 0.6, easeLinearity: 0.5 });
        }

        // Update stats
        const fraction = 1 - next / routePts.current.length;
        setNavDist(parseFloat((parseFloat(routeStats?.distance || 0) * fraction).toFixed(1)));
        setNavETA(Math.ceil((routeStats?.duration || 0) * fraction));

        const stepIdx = Math.min(Math.floor((next / routePts.current.length) * instructions.length), instructions.length - 1);
        setNavStep(stepIdx);

        const isHeavy = Math.random() > 0.72;
        setNavSpeed(isHeavy ? Math.max(5, Math.floor(MODES[travelMode].speed * 0.32)) : MODES[travelMode].speed - Math.floor(Math.random() * 8));

        return next;
      });
    }, 600);

    return clearTimer;
  }, [navPhase, autoDrive, routePts.current.length]);

  /* ─── INCIDENTS ─── */
  const INCIDENT_CFG = [
    { type: 'accident',     label: 'Accident',    emoji: '💥', color: '#ef4444' },
    { type: 'jam',          label: 'Traffic Jam', emoji: '🚗', color: '#f97316' },
    { type: 'construction', label: 'Road Work',   emoji: '🚧', color: '#eab308' },
    { type: 'speedtrap',    label: 'Speed Trap',  emoji: '📸', color: '#3b82f6' },
  ];
  const addIncident = (lat, lng, type) => {
    const L = window.L;
    if (!L || !incidentGroup.current) return;
    const cfg = INCIDENT_CFG.find(c => c.type === type);
    const id  = 'inc-' + Date.now();
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:${cfg.color};color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:900;box-shadow:0 2px 8px rgba(0,0,0,0.25);white-space:nowrap;">${cfg.emoji}</div>`,
      iconAnchor: [14, 14]
    });
    L.marker([lat, lng], { icon }).addTo(incidentGroup.current)
      .bindPopup(`<b style="color:${cfg.color}">${cfg.emoji} ${cfg.label}</b><br><small>Just now</small>`);
    setIncidents(prev => [{ id, lat, lng, type, label: cfg.label, emoji: cfg.emoji }, ...prev]);
  };

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  const isNavigating = navPhase === 'navigating';
  const currentInstruction = instructions[navStep] || instructions[0];

  // After navPhase changes, tell Leaflet the container resized so it reloads tiles
  useEffect(() => {
    const t = setTimeout(() => {
      if (mapInst.current) {
        mapInst.current.invalidateSize({ animate: false });
        if (isNavigating && userCoords) {
          mapInst.current.setView([userCoords.lat, userCoords.lng], 17, { animate: false });
        }
      }
    }, 80); // small delay so the DOM has updated
    return () => clearTimeout(t);
  }, [navPhase]);

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* ── TOP BAR: always visible ── */}
      {!isNavigating && (
        <div className="nav-top-bar" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 20, padding: '14px 18px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 9, background: 'var(--accent-glow)', borderRadius: 13 }}>
              <Navigation size={18} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', margin: 0, letterSpacing: -0.3 }}>Live Navigation</h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: 500 }}>
                {simMode ? '🛠️ Simulator Mode' : '📡 GPS Active'}
              </p>
            </div>
          </div>
          <div className="nav-top-bar-right" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 14, padding: 3, gap: 2 }}>
              {Object.entries(MODES).map(([key, m]) => {
                const Icon = m.icon;
                const active = travelMode === key;
                return (
                  <button key={key} onClick={() => setTravelMode(key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                    <Icon size={13} /> <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setSimMode(v => !v)} style={{ padding: '5px 12px', borderRadius: 10, border: '1px solid var(--border-default)', background: simMode ? 'var(--accent-glow)' : 'var(--bg-secondary)', color: simMode ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {simMode ? 'Use Real GPS' : 'Simulate'}
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="nav-main-content" style={{
        display: isNavigating ? 'block' : 'grid',
        gridTemplateColumns: '1fr 310px',
        gap: 14,
        position: 'relative',
      }}>

        {/* ════════════════════════════════════════════════════════════════
            PERSISTENT MAP WRAPPER — mapRef NEVER unmounts
            In nav mode: full screen. In normal mode: left column.
        ════════════════════════════════════════════════════════════════ */}
        <div className={`nav-map-wrapper ${isNavigating ? 'navigating' : ''}`} style={{
          position: 'relative',
          borderRadius: isNavigating ? 24 : 22,
          overflow: 'hidden',
          height: isNavigating ? 'calc(100vh - 80px)' : 540,
          minHeight: isNavigating ? 580 : 'unset',
          boxShadow: isNavigating ? '0 8px 40px rgba(0,0,0,0.25)' : '0 4px 24px rgba(0,0,0,0.1)',
          background: '#1a1a2e',
          transition: 'border-radius 0.3s, height 0.3s',
        }}>
          {/* Loading overlay */}
          {(loading || dirLoading) && !isNavigating && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.9)', gap: 10, borderRadius: 'inherit' }}>
              <Loader2 size={30} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{loading ? 'Loading map…' : 'Calculating road route…'}</span>
            </div>
          )}

          {/* Route error */}
          {routeError && !isNavigating && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <AlertTriangle size={13} /> {routeError}
            </div>
          )}

          {/* Map style selector (normal mode only) */}
          {!isNavigating && (
            <div style={{ position: 'absolute', top: 12, left: 54, zIndex: 400, display: 'flex', gap: 3, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', padding: '4px 6px', borderRadius: 11, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              {['streets', 'satellite', 'dark'].map(s => (
                <button key={s} onClick={() => setMapStyle(s)} style={{ padding: '4px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: mapStyle === s ? 'var(--accent)' : 'transparent', color: mapStyle === s ? '#fff' : '#555', transition: 'all 0.2s' }}>{s}</button>
              ))}
            </div>
          )}

          {/* Re-center (normal mode) */}
          {!isNavigating && (
            <button onClick={() => { if (mapInst.current && userCoords) mapInst.current.flyTo([userCoords.lat, userCoords.lng], 14, { animate: true, duration: 0.6 }); }} style={{ ...fabBtn, position: 'absolute', bottom: 16, right: 16, zIndex: 400 }}>
              <LocateFixed size={17} color="var(--accent)" />
            </button>
          )}

          {/* ══ THE MAP — always mounted ══ */}
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* ════════════ NAVIGATION HUD OVERLAYS (nav mode only) ════════════ */}
          {isNavigating && (
            <>
              {/* TOP: Turn instruction card */}
              <div className="nav-turn-card" style={{
                position: 'absolute', top: 16, left: 16, right: 16, zIndex: 600,
                background: '#1a73e8', borderRadius: 18, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 6px 28px rgba(26,115,232,0.5)',
                animation: 'slideDown 0.4s ease',
              }}>
                <div className="nav-turn-icon-wrap" style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
                  <NavIcon type={currentInstruction?.type} size={26} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {currentInstruction?.distance && (
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 }}>
                      In {currentInstruction.distance}
                    </span>
                  )}
                  <p className="nav-turn-text" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentInstruction?.text || 'Follow the highlighted route'}
                  </p>
                </div>
                {instructions[navStep + 1] && (
                  <div className="nav-turn-then" style={{ flexShrink: 0, textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 14, minWidth: 90 }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1 }}>Then</span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                      {instructions[navStep + 1]?.text}
                    </span>
                  </div>
                )}
              </div>

              {/* RIGHT: FAB buttons */}
              <div className="nav-fab-group" style={{ position: 'absolute', right: 16, top: 110, zIndex: 600, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => { if (mapInst.current && userCoords) mapInst.current.setView([userCoords.lat, userCoords.lng], 17, { animate: true }); }} style={fabBtn}>
                  <LocateFixed size={18} color="#1a73e8" />
                </button>
                <button onClick={() => setMapStyle(s => s === 'streets' ? 'satellite' : s === 'satellite' ? 'dark' : 'streets')} style={fabBtn}>
                  <Layers size={16} color="#555" />
                </button>
              </div>

              {/* BOTTOM: Speed / ETA / Stop HUD */}
              <div className="nav-bottom-hud" style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 600,
                background: 'linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.75) 55%, transparent 100%)',
                padding: '40px 24px 28px',
              }}>
                <div className="nav-bottom-hud-stats" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 580, margin: '0 auto' }}>
                  {/* Speed */}
                  <div style={{ textAlign: 'center', minWidth: 64 }}>
                    <span className="nav-bottom-hud-title" style={{ display: 'block', fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{navSpeed}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.2 }}>km/h</span>
                  </div>

                  {/* Centre stats */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 28, marginBottom: 12, justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{navDist}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>km left</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{fmtTime(navETA)}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>ETA</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Auto-Drive</span>
                      <button onClick={() => setAutoDrive(v => !v)} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: autoDrive ? '#1a73e8' : 'rgba(255,255,255,0.25)', position: 'relative', transition: 'background 0.25s' }}>
                        <div style={{ position: 'absolute', top: 3, width: 16, height: 16, left: autoDrive ? 21 : 3, background: '#fff', borderRadius: '50%', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                      </button>
                    </div>
                  </div>

                  {/* Stop */}
                  <button onClick={handleExitNavigation} style={{ width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(220,38,38,0.55)', flexShrink: 0 }}>
                    <X size={24} color="#fff" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── SIDE PANEL (normal mode only) ── */}
        {!isNavigating && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Route Planner */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 16, border: '1px solid var(--border-default)', boxShadow: 'var(--glass-shadow)' }}>
              <h3 style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 12px' }}>Route Planner</h3>

              <label style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>From</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input value={startStr} onChange={e => setStartStr(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchStart()} placeholder="Starting point…" style={inputStyle} />
                <button onClick={handleSearchStart} style={{ ...iconBtn, background: 'var(--accent-glow)', color: 'var(--accent)' }}><ArrowRight size={14} /></button>
              </div>

              <label style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>To</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input value={destStr} onChange={e => setDestStr(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGetDirections()} placeholder="Enter destination…" style={inputStyle} />
                <button onClick={() => handleGetDirections()} style={{ ...iconBtn, background: 'var(--accent)', color: '#fff' }}><ArrowRight size={14} /></button>
              </div>

              <button onClick={() => handleGetDirections()} disabled={!destStr.trim() || dirLoading} style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: 'none', cursor: destStr.trim() && !dirLoading ? 'pointer' : 'not-allowed', background: !destStr.trim() || dirLoading ? 'var(--border-default)' : '#1a73e8', color: !destStr.trim() || dirLoading ? 'var(--text-muted)' : '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: !destStr.trim() || dirLoading ? 'none' : '0 4px 16px rgba(26,115,232,0.35)', transition: 'all 0.2s' }}>
                {dirLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowUpRight size={14} />}
                {dirLoading ? 'Finding route…' : 'Get Directions'}
              </button>
            </div>

            {/* Route Stats + Start Nav */}
            {routeStats && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 16, border: '1px solid var(--border-default)', boxShadow: 'var(--glass-shadow)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, background: 'var(--bg-secondary)', borderRadius: 14, padding: '12px 10px' }}>
                  {[['Distance', `${routeStats.distance} km`], ['Time', fmtTime(routeStats.duration)], ['Delay', `+${routeStats.delay}m`]].map(([l, v]) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{l}</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--accent)' }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Traffic</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: trafficIdx < 30 ? '#16a34a' : trafficIdx < 65 ? '#ea580c' : '#dc2626' }}>{trafficIdx}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border-default)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${trafficIdx}%`, background: trafficIdx < 30 ? '#22c55e' : trafficIdx < 65 ? '#f97316' : '#ef4444', borderRadius: 4, transition: 'width 0.6s' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><Layers size={13} /> Traffic Layer</span>
                  <button onClick={() => setShowTraffic(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: showTraffic ? 'var(--accent)' : 'var(--border-default)', position: 'relative', transition: 'background 0.25s' }}>
                    <div style={{ position: 'absolute', top: 2, width: 16, height: 16, left: showTraffic ? 18 : 2, background: '#fff', borderRadius: '50%', transition: 'left 0.25s' }} />
                  </button>
                </div>

                <button onClick={handleStartNavigation} style={{ width: '100%', padding: '13px 0', borderRadius: 13, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)', color: '#fff', fontSize: 14, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 6px 22px rgba(26,115,232,0.42)', letterSpacing: 0.3 }}>
                  <Play size={16} fill="#fff" /> Start Navigation
                </button>
              </div>
            )}

            {/* Turn-by-Turn Directions */}
            {instructions.length > 0 && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 14, border: '1px solid var(--border-default)', boxShadow: 'var(--glass-shadow)', maxHeight: 230, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 10px' }}>Directions</h3>
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {instructions.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 8, background: i === navStep ? 'var(--accent-glow)' : 'transparent' }}>
                      <div style={{ minWidth: 20, height: 20, borderRadius: '50%', background: i === 0 ? 'var(--accent)' : 'var(--bg-secondary)', color: i === 0 ? '#fff' : 'var(--text-muted)', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.35 }}>{step.text}</p>
                        {step.distance && <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>{step.distance}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incident reporter */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 14, border: '1px solid var(--border-default)', boxShadow: 'var(--glass-shadow)' }}>
              <h3 style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 8px' }}>Report Incident</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {INCIDENT_CFG.map(({ type, label, emoji }) => (
                  <button key={type} onClick={() => { if (userCoords) addIncident(userCoords.lat + (Math.random()-.5)*.003, userCoords.lng + (Math.random()-.5)*.003, type); }}
                    style={{ padding: '7px 6px', borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Plus size={10} /> {emoji} {label}
                  </button>
                ))}
              </div>
              {incidents.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border-default)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 90, overflowY: 'auto' }}>
                  {incidents.map(inc => (
                    <div key={inc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', borderRadius: 8, padding: '4px 8px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{inc.emoji} {inc.label}</span>
                      <button onClick={() => setIncidents(prev => prev.filter(i => i.id !== inc.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }}><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown { from { opacity:0;transform:translateY(-12px); } to { opacity:1;transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .leaflet-routing-container { display:none !important; }
        .leaflet-routing-error { display:none !important; }
        .leaflet-control-zoom { margin-top:70px !important; }

        /* ─── RESPONSIVE MOBILE STYLES ─── */
        @media (max-width: 768px) {
          .nav-top-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px 14px !important;
            gap: 12px !important;
            border-radius: 16px !important;
          }
          .nav-top-bar-right {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .nav-top-bar-right > div {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            padding: 2px !important;
          }
          .nav-top-bar-right > div button {
            justify-content: center !important;
            padding: 6px 4px !important;
            font-size: 10px !important;
          }
          .nav-top-bar-right > div button span {
            display: none !important;
          }
          @media (min-width: 400px) {
            .nav-top-bar-right > div button span {
              display: inline !important;
            }
          }
          .nav-top-bar-right > button {
            width: 100% !important;
            padding: 7px 0 !important;
            text-align: center !important;
          }
          
          .nav-main-content {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .nav-map-wrapper {
            height: 350px !important;
            border-radius: 16px !important;
          }
          .nav-map-wrapper.navigating {
            height: calc(100vh - 120px) !important;
            min-height: 480px !important;
            border-radius: 0px !important;
          }
          
          /* Navigation Mode Overlays */
          .nav-turn-card {
            top: 10px !important;
            left: 10px !important;
            right: 10px !important;
            padding: 10px 14px !important;
            border-radius: 14px !important;
            gap: 10px !important;
            box-shadow: 0 4px 16px rgba(26,115,232,0.3) !important;
          }
          .nav-turn-icon-wrap {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
          }
          .nav-turn-text {
            font-size: 13px !important;
          }
          .nav-turn-then {
            display: none !important;
          }
          
          .nav-fab-group {
            top: 76px !important;
            right: 10px !important;
          }
          
          .nav-bottom-hud {
            padding: 24px 16px 20px !important;
          }
          .nav-bottom-hud-stats {
            gap: 12px !important;
          }
          .nav-bottom-hud-title {
            font-size: 32px !important;
          }
        }
      `}</style>
    </div>
  );
};

/* ── Shared inline style objects ── */
const fabBtn = {
  width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const inputStyle = {
  flex: 1, padding: '8px 11px', fontSize: 12, borderRadius: 10,
  border: '1.5px solid var(--border-default)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
};
const iconBtn = {
  padding: '0 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36,
};
