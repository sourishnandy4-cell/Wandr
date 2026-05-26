import React from 'react';
import { ItineraryTimeline } from './ItineraryTimeline';
import { AddItineraryForm } from './AddItineraryForm';
import { Plus } from 'lucide-react';

export const ItineraryView = ({ 
  itineraryItems, 
  showForm, 
  setShowForm, 
  onAddItinerary 
}) => {
  return (
    <div>
      {showForm && (
        <AddItineraryForm
          onSave={onAddItinerary}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Trip Itinerary</h1>
          <p className="text-gray-600 mt-1">Plan your activities and schedule</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Add Activity
        </button>
      </div>

      {itineraryItems.length > 0 ? (
        <ItineraryTimeline items={itineraryItems} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-4">No activities added yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Add Your First Activity
          </button>
        </div>
      )}
    </div>
  );
};
