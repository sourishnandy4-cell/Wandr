import React, { useState } from 'react';
import { X, User, Image, Sparkles, Save, Upload } from 'lucide-react';

export const ProfileModal = ({ user, onClose, onSave }) => {
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [avatarColor, setAvatarColor] = useState(
    user?.avatarColorClass || 'bg-gradient-to-tr from-[#654ea3] to-[#eaafc8]'
  );
  const [error, setError] = useState(null);

  const gradients = [
    { name: 'Twilight Purple', class: 'bg-gradient-to-tr from-[#654ea3] to-[#eaafc8]' },
    { name: 'Sunset Rose', class: 'bg-gradient-to-tr from-[#f857a6] to-[#ff5858]' },
    { name: 'Deep Sea', class: 'bg-gradient-to-tr from-[#3a7bd5] to-[#3a6073]' },
    { name: 'Emerald Mint', class: 'bg-gradient-to-tr from-[#11998e] to-[#38ef7d]' },
    { name: 'Ocean Breeze', class: 'bg-gradient-to-tr from-[#00c6ff] to-[#0072ff]' },
    { name: 'Coral Sunshine', class: 'bg-gradient-to-tr from-[#f12711] to-[#f5af19]' },
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Create canvas to downscale
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data url
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(dataUrl);
        setError(null);
      };
      img.onerror = () => {
        setError('Failed to process image file.');
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name.');
      return;
    }

    const trimmedName = name.trim();
    const splitNames = trimmedName.split(' ').filter(Boolean);
    const initials = splitNames.map(n => n[0]).join('').toUpperCase().substring(0, 3);
    const hasAvatar = avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim();

    const updatedUser = {
      ...user,
      name: trimmedName,
      initials: initials || '?',
      avatar: hasAvatar ? avatarUrl.trim() : null,
      avatarColorClass: hasAvatar ? null : avatarColor,
    };

    onSave(updatedUser);
  };

  const hasAvatar = avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim();

  return (
    <div 
      className="fixed inset-0 bg-primary/45 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn font-sans"
      style={{ zIndex: 10000 }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100/50 p-6 md:p-8 space-y-6 relative overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
        
        {/* Header decoration */}
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Sparkles className="w-20 h-20 text-accent" />
        </div>

        {/* Modal Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl font-extrabold text-primary tracking-tight">Customize Profile</h2>
          <p className="text-xs text-gray-500">Update your traveler profile, avatar photo, or initial backdrops.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Live Preview Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-gray-150 rounded-2xl space-y-3.5 shadow-inner">
            <div className="relative">
              {hasAvatar ? (
                <img
                  src={avatarUrl.trim()}
                  alt="Profile Preview"
                  onError={() => setError('Unable to load image. Rendering fallback colors.')}
                  onLoad={() => setError(null)}
                  className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-white ring-4 ring-accent/20"
                />
              ) : (
                <div className={`w-20 h-20 rounded-full ${avatarColor} flex items-center justify-center text-white text-3xl font-extrabold shadow-md border-2 border-white ring-4 ring-accent/20`}>
                  {name ? name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 3) : '?'}
                </div>
              )}
            </div>

            <div className="text-center">
              <span className="text-sm font-extrabold text-primary">{name || 'Your Name'}</span>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">{user?.role || 'Trip Member'}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-650 text-xs text-center font-semibold">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jatin"
                  className="w-full text-sm rounded-xl border-gray-200 pl-11 pr-4 py-2.5 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white text-gray-800 transition-all duration-200"
                />
              </div>
            </div>

            {/* Photo Selector with Upload or URL option */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Profile Photo</label>
              
              <div className="flex gap-2">
                {/* File Upload Button */}
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-primary font-bold text-xs rounded-xl cursor-pointer transition-all duration-200 border border-slate-200 select-none flex-shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                
                {/* URL Input */}
                <div className="relative flex-1">
                  <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={(avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('data:')) ? '' : (avatarUrl || '')}
                    onChange={e => {
                      setAvatarUrl(e.target.value);
                      setError(null);
                    }}
                    placeholder="Or paste image URL..."
                    className="w-full text-sm rounded-xl border-gray-200 pl-11 pr-4 py-2.5 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white text-gray-800 transition-all duration-200"
                  />
                </div>
              </div>
              
              <p className="text-[10px] text-gray-400">
                {(avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('data:')) 
                  ? '✓ Uploaded image active. Leave URL blank to clear or upload another image.' 
                  : 'Upload an image from your device (PC/Mac/Mobile) or paste a web URL.'}
              </p>
            </div>

            {/* Gradient Selector (Only if no custom URL or base64 photo is present) */}
            {!hasAvatar && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Initial Backdrop Gradient</label>
                <div className="grid grid-cols-6 gap-2.5">
                  {gradients.map((grad) => (
                    <button
                      key={grad.name}
                      type="button"
                      onClick={() => setAvatarColor(grad.class)}
                      title={grad.name}
                      className={`h-9 w-full rounded-xl ${grad.class} transition-all duration-200 transform hover:scale-105 shadow-sm relative ${
                        avatarColor === grad.class ? 'ring-2 ring-accent ring-offset-2 scale-105 shadow' : 'hover:opacity-90'
                      }`}
                    ></button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl py-3 text-sm transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
