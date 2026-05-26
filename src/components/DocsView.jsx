import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, Plus, File } from 'lucide-react';

export const DocsView = ({ tripId }) => {
  const [documents, setDocuments] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', url: '', category: 'Other' });

  // Load documents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`trip_${tripId}_documents`);
    if (saved) setDocuments(JSON.parse(saved));
  }, [tripId]);

  const handleAddDocument = (e) => {
    e.preventDefault();
    const doc = {
      id: `doc-${Date.now()}`,
      ...newDoc,
      uploadedAt: new Date().toISOString(),
    };
    const updated = [...documents, doc];
    setDocuments(updated);
    localStorage.setItem(`trip_${tripId}_documents`, JSON.stringify(updated));
    setNewDoc({ name: '', url: '', category: 'Other' });
    setShowUploadForm(false);
  };

  const handleDeleteDocument = (id) => {
    const updated = documents.filter(doc => doc.id !== id);
    setDocuments(updated);
    localStorage.setItem(`trip_${tripId}_documents`, JSON.stringify(updated));
  };

  const categories = ['Flight', 'Hotel', 'Insurance', 'Visa', 'Other'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Trip Documents</h1>
          <p className="text-gray-600 mt-1">Store important files and links</p>
        </div>
        <button
          onClick={() => setShowUploadForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Add Document
        </button>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">Add Document</h2>
            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  required
                  value={newDoc.name}
                  onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                  placeholder="e.g., Flight Ticket"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link/URL *
                </label>
                <input
                  type="url"
                  required
                  value={newDoc.url}
                  onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 hover:shadow-lg transition-all duration-200"
                >
                  Add Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <FileText className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{doc.name}</h3>
                    <span className="text-xs text-gray-500">{doc.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Open
                </a>
              </div>

              <div className="mt-3 text-xs text-gray-400">
                Added {new Date(doc.uploadedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No documents added yet</p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Add Your First Document
          </button>
        </div>
      )}
    </div>
  );
};
