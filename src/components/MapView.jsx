import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, Coffee, Utensils, AlertCircle, Loader2, RefreshCw, Map, DollarSign, X } from 'lucide-react';
import { fetchItinerary } from '../lib/itineraryService';
import { fetchRecentExpenses } from '../lib/expenseService';

// Dynamically load Leaflet from CDN
const loadLeaflet = () => new Promise((resolve, reject) => {
  if (window.L) { resolve(window.L); return; }
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(css);
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = () => resolve(window.L);
  script.onerror = () => reject(new Error('Failed to load Leaflet map library.'));
  document.head.appendChild(script);
});

// Geocode a location string using Nominatim (free OSM geocoding)
const geocodeLocation = async (locationStr, destination = '') => {
  const query = destination ? `${locationStr}, ${destination}` : locationStr;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'WandrTravelApp/1.0' } }
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) { /* silent */ }
  return null;
};

// Fetch nearby places via Overpass API
const fetchNearbyPlaces = async (lat, lng, type) => {
  const tagMap = { restaurant: 'amenity=restaurant', cafe: 'amenity=cafe', attraction: 'tourism=attraction' };
  const tag = tagMap[type] || 'amenity=restaurant';
  const query = `[out:json][timeout:25];node[${tag}](around:800,${lat},${lng});out 8;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' },
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const data = await res.json();
    return (data.elements || [])
      .filter(e => e.tags?.name)
      .slice(0, 8)
      .map(e => ({ name: e.tags.name, lat: e.lat, lng: e.lon, cuisine: e.tags.cuisine }));
  } catch (e) {
    console.warn('Overpass fetch failed:', e.message);
    return [];
  }
};

const CAT_COLORS = {
  transport: '#C4B5D0', food: '#E8A87C', activity: '#6DB8A8',
  music: '#F472B6', accommodation: '#60A5FA',
};

// Haversine distance in km
const haversine = (a, b) => {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
};

export const MapView = ({ tripId, tripDestination }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const nearbyLayerGroupRef = useRef(null);
  const expenseLayerGroupRef = useRef(null);
  const destinationCenterRef = useRef(null); // fallback when no geocoded stops
  const [loading, setLoading] = useState(true);
  const [geocodingStatus, setGeocodingStatus] = useState('');
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [geocodedItems, setGeocodedItems] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [activeNearby, setActiveNearby] = useState(null); // click-toggle state
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [expensePinsLoading, setExpensePinsLoading] = useState(false);
  const markerRefs = useRef({});
  const hoverTimerRef = useRef(null);

  const buildMap = async () => {
    setLoading(true);
    setError(null);
    setGeocodedItems([]);

    try {
      const { data, error: fetchErr } = await fetchItinerary(tripId);
      if (fetchErr) throw new Error(fetchErr.message);
      const allItems = data || [];
      setItems(allItems);

      const L = await loadLeaflet();

      // Destroy previous map instance
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

      const withLocation = allItems.filter(i => i.location?.trim());
      setGeocodingStatus(`Geocoding ${withLocation.length} locations…`);

      const geocoded = [];
      for (const item of withLocation) {
        const coords = await geocodeLocation(item.location, tripDestination);
        if (coords) geocoded.push({ ...item, coords });
        await new Promise(r => setTimeout(r, 300)); // Nominatim rate limit
      }
      setGeocodedItems(geocoded);
      setGeocodingStatus('');

      if (!mapRef.current) return;

      // Determine initial center
      let center = geocoded[0]?.coords;
      if (!center && tripDestination) {
        setGeocodingStatus(`Centering on ${tripDestination}…`);
        center = await geocodeLocation(tripDestination);
        setGeocodingStatus('');
      }
      if (!center) center = { lat: 41.3851, lng: 2.1734 }; // Barcelona fallback
      destinationCenterRef.current = center; // store for Discover Nearby fallback

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([center.lat, center.lng], 13);
      mapInstanceRef.current = map;
      nearbyLayerGroupRef.current = L.layerGroup().addTo(map);
      expenseLayerGroupRef.current = L.layerGroup().addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = [];
      markerRefs.current = {};

      geocoded.forEach((item, idx) => {
        const color = CAT_COLORS[item.category_icon] || '#2E3F5C';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${color};border:2.5px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:11px;color:white;font-weight:800;line-height:1">${idx+1}</span></div>`,
          iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -32],
        });

        const time = new Date(item.start_time).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true, timeZone:'UTC' });
        const date = new Date(item.start_time).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'UTC' });

        const marker = L.marker([item.coords.lat, item.coords.lng], { icon }).addTo(map).bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:160px;max-width:220px">
            <div style="font-size:9px;color:#888;font-weight:700;text-transform:uppercase;margin-bottom:3px">${date} · ${time}</div>
            <div style="font-size:13px;font-weight:800;color:#2E3F5C;line-height:1.3;margin-bottom:4px">${item.title}</div>
            <div style="font-size:11px;color:#666">${item.location}</div>
            ${item.notes ? `<div style="font-size:10px;color:#999;margin-top:5px;font-style:italic;border-top:1px solid #f0f0f0;padding-top:5px">${item.notes}</div>` : ''}
          </div>`, { maxWidth: 240 }
        );

        markerRefs.current[item.id] = marker;
        bounds.push([item.coords.lat, item.coords.lng]);
      });

      // Route polyline between consecutive stops
      if (geocoded.length > 1) {
        const latlngs = geocoded.map(i => [i.coords.lat, i.coords.lng]);
        L.polyline(latlngs, { color: '#2E3F5C', weight: 2.5, opacity: 0.45, dashArray: '7,9' }).addTo(map);
      }

      if (bounds.length > 0) map.fitBounds(bounds, { padding: [45, 45] });

    } catch (err) {
      setError(err.message || 'Failed to load map.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buildMap();
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [tripId]);

  // ── Get the best available map center (geocoded stop → map center → destination fallback) ──
  const getMapCenter = () => {
    if (mapInstanceRef.current) {
      const c = mapInstanceRef.current.getCenter();
      return { lat: c.lat, lng: c.lng };
    }
    if (geocodedItems.length > 0) return geocodedItems[0].coords;
    if (destinationCenterRef.current) return destinationCenterRef.current;
    return null;
  };

  // ── CLICK-TOGGLE: show/hide nearby markers ────────────────────────────────
  const handleNearbyClick = async (type) => {
    // If clicking the same type → toggle off
    if (activeNearby === type) {
      setActiveNearby(null);
      setNearbyPlaces([]);
      nearbyLayerGroupRef.current?.clearLayers();
      return;
    }

    const center = getMapCenter();
    if (!center) {
      alert('Map is still loading. Please wait a moment and try again.');
      return;
    }

    nearbyLayerGroupRef.current?.clearLayers();
    setActiveNearby(type);
    setNearbyPlaces([]);
    setNearbyLoading(true);

    const places = await fetchNearbyPlaces(center.lat, center.lng, type);
    setNearbyLoading(false);
    setNearbyPlaces(places);

    const L = window.L;
    if (L && nearbyLayerGroupRef.current) {
      const typeColors = { restaurant: '#E8A87C', cafe: '#A78BFA', attraction: '#34D399' };
      const color = typeColors[type] || '#888';

      if (places.length === 0) {
        // Show a message marker if nothing found
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#ef4444;color:white;padding:3px 9px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25)">None found nearby</div>`,
          iconAnchor: [0, 0],
        });
        L.marker([center.lat, center.lng], { icon }).addTo(nearbyLayerGroupRef.current);
      } else {
        places.forEach(place => {
          const label = place.name.length > 18 ? place.name.slice(0, 16) + '…' : place.name;
          const icon = L.divIcon({
            className: '',
            html: `<div style="background:${color};color:white;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2)">${label}</div>`,
            iconAnchor: [0, 0],
          });
          const popup = `<b style="font-size:12px">${place.name}</b><br>
            <small style="color:#888;text-transform:capitalize">${type}${place.cuisine ? ' · ' + place.cuisine : ''}</small>`;
          L.marker([place.lat, place.lng], { icon })
            .addTo(nearbyLayerGroupRef.current)
            .bindPopup(popup);
        });
        // Fly map to show nearby places
        if (places.length > 0 && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([places[0].lat, places[0].lng], 15, { duration: 0.8 });
        }
      }
    }
  };

  // ── CLICK-TOGGLE: show/hide expense pins ──────────────────────────────────
  const handleExpenseClick = async () => {
    if (showExpenses) {
      setShowExpenses(false);
      expenseLayerGroupRef.current?.clearLayers();
      return;
    }

    const center = getMapCenter();
    if (!center) return;

    setExpensePinsLoading(true);
    try {
      const { data } = await fetchRecentExpenses(tripId);
      const expList = data || [];
      setExpenses(expList);
      setShowExpenses(true);

      const L = window.L;
      if (L && expenseLayerGroupRef.current && mapInstanceRef.current) {
        expenseLayerGroupRef.current.clearLayers();
        expList.forEach((exp) => {
          // Anchor expense pin near closest itinerary stop, or use map center
          let base = center;
          if (geocodedItems.length > 0) {
            let minDist = Infinity;
            geocodedItems.forEach(g => {
              const d = haversine(g.coords, center);
              if (d < minDist) { minDist = d; base = g.coords; }
            });
          }
          const offsetLat = base.lat + (Math.random() - 0.5) * 0.003;
          const offsetLng = base.lng + (Math.random() - 0.5) * 0.003;
          const icon = L.divIcon({
            className: '',
            html: `<div style="background:#16a34a;color:white;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2)">₹${exp.amount}</div>`,
            iconAnchor: [0, 0],
          });
          L.marker([offsetLat, offsetLng], { icon })
            .addTo(expenseLayerGroupRef.current)
            .bindPopup(
              `<div style="font-family:system-ui,sans-serif;min-width:150px">
                <div style="font-size:12px;font-weight:800;color:#16a34a;margin-bottom:3px">₹${exp.amount}</div>
                <div style="font-size:12px;font-weight:700;color:#2E3F5C">${exp.description}</div>
                <div style="font-size:10px;color:#888;margin-top:2px">${exp.category || 'General'} · Paid by ${exp.paid_by}</div>
              </div>`
            );
        });
      }
    } catch (e) {
      console.error('Failed to load expense pins:', e);
    } finally {
      setExpensePinsLoading(false);
    }
  };

  const handleFlyTo = (item) => {
    setSelectedItemId(item.id);
    if (mapInstanceRef.current && item.coords) {
      mapInstanceRef.current.flyTo([item.coords.lat, item.coords.lng], 16, { animate: true, duration: 0.8 });
      markerRefs.current[item.id]?.openPopup();
    }
  };

  // Route stats
  const routeStats = (() => {
    if (geocodedItems.length < 2) return null;
    let km = 0;
    for (let i = 1; i < geocodedItems.length; i++) km += haversine(geocodedItems[i-1].coords, geocodedItems[i].coords);
    return { km: km.toFixed(1), mins: Math.round(km * 3.5) };
  })();

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl"><Map className="w-5 h-5 text-primary" /></div>
          <div>
            <h2 className="font-extrabold text-primary text-lg tracking-tight">Interactive Trip Map</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{tripDestination || 'Destination'} · {geocodedItems.length} pinned stops</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {routeStats && (
            <div className="hidden md:flex items-center gap-4 text-xs font-bold text-gray-500 bg-slate-50 px-3 py-2 rounded-xl">
              <span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5 text-primary" />{routeStats.km} km</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-accent" />~{routeStats.mins} min travel</span>
            </div>
          )}
          <button onClick={buildMap} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" title="Reload map">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map container */}
        <div className="lg:col-span-3 bg-slate-100 rounded-2xl overflow-hidden relative" style={{ height: '520px' }}>
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 gap-3 rounded-2xl">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-bold text-gray-400">{geocodingStatus || 'Loading map…'}</p>
            </div>
          )}
          {!loading && error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-center p-6 bg-white rounded-2xl">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-gray-500 max-w-xs">{error}</p>
              <button onClick={buildMap} className="bg-accent/10 text-accent font-bold text-sm px-4 py-2 rounded-xl hover:bg-accent/20">Retry</button>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" style={{ zIndex: 0 }} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {/* Nearby panel */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">Discover Nearby</h3>
            <p className="text-[10px] text-gray-400 mb-2">Click to toggle places on the map</p>
            {[
              { type: 'restaurant', label: 'Restaurants', icon: Utensils, cls: 'text-orange-500 bg-orange-50 hover:bg-orange-100 ring-orange-300' },
              { type: 'cafe', label: 'Cafés', icon: Coffee, cls: 'text-purple-500 bg-purple-50 hover:bg-purple-100 ring-purple-300' },
              { type: 'attraction', label: 'Attractions', icon: MapPin, cls: 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100 ring-emerald-300' },
            ].map(({ type, label, icon: Icon, cls }) => (
              <button
                key={type}
                onClick={() => handleNearbyClick(type)}
                disabled={nearbyLoading && activeNearby !== type}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${cls} ${activeNearby === type ? 'ring-2 ring-offset-1' : ''} disabled:opacity-40`}
              >
                <Icon className="w-3.5 h-3.5" />{label}
                {nearbyLoading && activeNearby === type && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
                {activeNearby === type && nearbyPlaces.length > 0 && !nearbyLoading && (
                  <span className="ml-auto">{nearbyPlaces.length} found · click to hide</span>
                )}
                {activeNearby === type && nearbyPlaces.length === 0 && !nearbyLoading && (
                  <span className="ml-auto text-red-400">None found</span>
                )}
              </button>
            ))}

            {/* Expense Pins toggle */}
            <div className="pt-2 border-t border-gray-100 mt-1">
              <button
                onClick={handleExpenseClick}
                disabled={expensePinsLoading}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-green-600 bg-green-50 hover:bg-green-100 ring-green-300 ${showExpenses ? 'ring-2 ring-offset-1' : ''} disabled:opacity-40`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                {showExpenses ? 'Hide Expenses' : 'Pin Expenses'}
                {expensePinsLoading && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
                {showExpenses && !expensePinsLoading && (
                  <span className="ml-auto flex items-center gap-1">{expenses.length} pinned <X className="w-3 h-3" /></span>
                )}
              </button>
            </div>
          </div>

          {/* Itinerary stop list */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex-1">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">Pinned Stops</h3>
            {geocodedItems.length === 0 && !loading && (
              <p className="text-xs text-gray-400 italic text-center py-6">
                {items.length === 0 ? 'Add activities with locations to see them here.' : 'Locations could not be geocoded.'}
              </p>
            )}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
              {geocodedItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleFlyTo(item)}
                  className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl transition-all hover:bg-slate-50 ${selectedItemId === item.id ? 'bg-slate-100 ring-1 ring-slate-200' : ''}`}
                >
                  <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-white text-[9px] font-extrabold"
                    style={{ background: CAT_COLORS[item.category_icon] || '#2E3F5C' }}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary truncate">{item.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{item.location}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
