import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Copy, Check, Share2, Link2, Info } from 'lucide-react';
import { isMockMode } from '../lib/supabaseClient';
import {
  MOCK_TRIPS, MOCK_TRIP_MEMBERS, MOCK_ITINERARY_ITEMS, MOCK_EXPENSES, saveMockData
} from '../lib/mockDatabase';

// tripData  — full trip object passed down from App (needed in Supabase mode where
//             MOCK_TRIPS is empty). Falls back gracefully to MOCK_TRIPS in mock mode.
export const AddFriendsModal = ({ tripId, tripName, onClose, currentFriends = [], tripData = null }) => {
  const [copied, setCopied] = useState(false);

  const buildShareLink = () => {
    try {
      let trip, members, itinerary, expenses;

      if (isMockMode()) {
        // Mock mode: pull full snapshot from in-memory arrays
        trip      = MOCK_TRIPS.find(t => t.id === tripId);
        members   = MOCK_TRIP_MEMBERS.find(m => m.trip_id === tripId);
        itinerary = MOCK_ITINERARY_ITEMS.filter(i => i.trip_id === tripId);
        expenses  = MOCK_EXPENSES.filter(e => e.trip_id === tripId);
      } else {
        // Supabase mode: use the tripData prop (trip meta from App.jsx).
        // Itinerary + expenses live server-side; the friend can load them
        // once they open the trip. At minimum the trip card + members are embedded.
        trip    = tripData || { id: tripId, name: tripName };
        members = {
          trip_id: tripId,
          members: currentFriends.map(f => (typeof f === 'string' ? f : f.name)),
        };
        itinerary = [];
        expenses  = [];
      }

      if (!trip) throw new Error('Trip data not available');

      const payload = { trip, members, itinerary, expenses };

      // URL-safe base64: replace +->- /->_ and strip = padding so that
      // URLSearchParams.get() never misinterprets + as a space on the receiver's end.
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      return `${window.location.origin}${window.location.pathname}?join=${encoded}`;
    } catch (e) {
      // Last-resort fallback — at least the trip ID is present
      return `${window.location.origin}${window.location.pathname}?invite=${tripId}`;
    }
  };

  const shareLink = buildShareLink();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-primary">Invite to Trip</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Trip name pill */}
        <div className="mb-5 flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl">
          <Users className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-primary truncate">{tripName}</span>
        </div>

        {/* How it works */}
        <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">How it works</span>
          </div>
          <ol className="text-xs text-blue-700 space-y-1.5 list-none pl-1">
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500 flex-shrink-0">1.</span>
              Copy the invite link below
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500 flex-shrink-0">2.</span>
              Send it to your friend via WhatsApp, SMS, or any chat app
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500 flex-shrink-0">3.</span>
              They open the link, sign in, and the trip loads automatically in their browser
            </li>
          </ol>
        </div>

        {/* Share link */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Your Invite Link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl min-w-0">
              <Link2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">{shareLink}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 flex-shrink-0 transition-all duration-200 ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-accent text-white hover:bg-accent/90'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 pl-1">
            This link contains a snapshot of your trip — no special account needed to join.
          </p>
        </div>

        {/* Current members preview */}
        {currentFriends.length > 0 && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Current Members ({currentFriends.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {currentFriends.map((name, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold">
                    {(typeof name === 'string' ? name : name.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {typeof name === 'string' ? name : name.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all duration-200 text-sm"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
};
