import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Crown, User as UserIcon } from 'lucide-react';
import { AddFriendsModal } from './AddFriendsModal';
import { supabase, isMockMode } from '../lib/supabaseClient';
import { mockFetchTripMembers, MOCK_TRIP_MEMBERS } from '../lib/mockDatabase';

export const TripMembers = ({ tripId, tripName, currentUser }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      if (isMockMode) {
        const { data } = await mockFetchTripMembers(tripId);
        setMembers(data || []);
      } else {
        // Fetch from Supabase
        const { data: tripMembersData, error } = await supabase
          .from('trip_members')
          .select(`
            user_id,
            role,
            users (
              id,
              name,
              email
            )
          `)
          .eq('trip_id', tripId);

        if (error) throw error;

        // Transform data to match our display format
        const membersList = tripMembersData?.map(tm => ({
          id: tm.user_id,
          name: tm.users?.name || 'Unknown',
          email: tm.users?.email || '',
          role: tm.role || 'member'
        })) || [];

        setMembers(membersList);
      }
    } catch (err) {
      console.error('Failed to fetch trip members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchMembers();
    }
  }, [tripId]);

  const handleModalClose = () => {
    setShowAddModal(false);
    fetchMembers(); // Refresh members list
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-primary to-primary/90 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Trip Members</h2>
              <p className="text-white/80 text-sm mt-1">
                {members.length} {members.length === 1 ? 'person' : 'people'} in this trip
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            Add Members
          </button>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isMockMode ? (
          // Mock mode: Display member names as strings
          members.map((memberName, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                  {memberName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">
                    {memberName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 capitalize">Member</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Real mode: Display full user objects
          members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">
                    {member.name}
                  </h3>
                  {member.email && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500 truncate">{member.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {member.role === 'owner' ? (
                      <>
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-amber-600 font-semibold capitalize">
                          {member.role}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500 capitalize">
                          {member.role}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Members Yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Start adding members to your trip to collaborate on planning and expenses.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add First Member
          </button>
        </div>
      )}

      {/* Add Friends Modal */}
      {showAddModal && (
        <AddFriendsModal
          tripId={tripId}
          tripName={tripName}
          onClose={handleModalClose}
          currentFriends={isMockMode ? members : members.map(m => m.name)}
        />
      )}
    </div>
  );
};
