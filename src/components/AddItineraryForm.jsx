import React, { useState } from 'react';
import { X } from 'lucide-react';

export const AddItineraryForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    start_time: '',
    notes: '',
    category_icon: 'activity',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: `i-${Date.now()}`,
      ...formData,
    });
    // Reset form
    setFormData({
      title: '',
      location: '',
      start_time: '',
      notes: '',
      category_icon: 'activity',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">Add Activity</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Sagrada Familia Tour"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Carrer de Mallorca"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category_icon}
              onChange={(e) => setFormData({ ...formData, category_icon: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value="activity">Activity</option>
              <option value="food">Food & Dining</option>
              <option value="transport">Transport</option>
              <option value="music">Entertainment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 hover:shadow-lg transition-all duration-200"
            >
              Add Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
