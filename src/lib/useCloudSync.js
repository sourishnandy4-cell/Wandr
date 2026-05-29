import { supabase, isNetworkError, getFriendlyErrorMessage } from './supabaseClient';
import {
  MOCK_TRIPS,
  MOCK_TRIP_MEMBERS,
  MOCK_ITINERARY_ITEMS,
  MOCK_EXPENSES,
  MOCK_SPLITS,
  saveMockData
} from './mockDatabase';

export function useCloudSync({
  currentUser,
  tripMeta,
  activeTripId,
  setActiveTripId,
  setLoading,
  handleRefresh,
  fetchExistingTrips
}) {

  const handleSyncTripToCloud = async () => {
    if (!currentUser) return;
    if (!tripMeta) return;

    const confirmSync = window.confirm(
      `Do you want to sync "${tripMeta.name}" to the cloud? This will save the trip, all itinerary items, and expenses in the live cloud database so it is immediately available on all your devices (including your phone).`
    );
    if (!confirmSync) return;

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("You are not properly authenticated with Supabase. Please sign out and sign in again.");
      }
      if (sessionData.session.user.id !== currentUser.id) {
        throw new Error("Your session is invalid or out of sync. Please sign out and sign in again.");
      }

      const { data: syncedTrip, error: tripErr } = await supabase
        .from('trips')
        .insert([{
          name: tripMeta.name,
          destination: tripMeta.destination,
          start_date: tripMeta.start_date,
          end_date: tripMeta.end_date,
          total_budget: Number(tripMeta.total_budget),
          created_by: currentUser.id
        }])
        .select()
        .single();

      if (tripErr) throw tripErr;

      try {
        await supabase.from('trip_members').insert([{
          trip_id: syncedTrip.id,
          user_id: currentUser.id,
          role: 'owner'
        }]);
      } catch (mErr) {
        console.warn('Membership association handled by database triggers or RLS constraints.', mErr);
      }

      const localItinerary = MOCK_ITINERARY_ITEMS.filter(item => item.trip_id === activeTripId);
      if (localItinerary.length > 0) {
        const itineraryToInsert = localItinerary.map(item => ({
          trip_id: syncedTrip.id,
          title: item.title,
          location: item.location || '',
          start_time: item.start_time,
          notes: item.notes || '',
          category_icon: item.category_icon || 'activity',
          created_by: currentUser.id
        }));

        const { error: itinErr } = await supabase
          .from('itinerary_items')
          .insert(itineraryToInsert);

        if (itinErr) {
          console.error("Failed to migrate some itinerary items:", itinErr.message);
        }
      }

      const localExpenses = MOCK_EXPENSES.filter(exp => exp.trip_id === activeTripId);
      if (localExpenses.length > 0) {
        for (const exp of localExpenses) {
          const { data: newExpense, error: expErr } = await supabase
            .from('expenses')
            .insert([{
              trip_id: syncedTrip.id,
              description: exp.description,
              amount: Number(exp.amount),
              category: exp.category,
              paid_by: currentUser.id
            }])
            .select()
            .single();

          if (expErr) {
            console.error("Failed to migrate expense:", exp.description, expErr.message);
            continue;
          }

          const { error: splitErr } = await supabase
            .from('expense_splits')
            .insert([{
              expense_id: newExpense.id,
              user_id: currentUser.id,
              owed_amount: Number(exp.amount),
              is_settled: true,
              settled_at: new Date().toISOString()
            }]);

          if (splitErr) {
            console.error("Failed to insert split for migrated expense:", splitErr.message);
          }
        }
      }

      const tripIdx = MOCK_TRIPS.findIndex(t => t.id === activeTripId);
      if (tripIdx !== -1) MOCK_TRIPS.splice(tripIdx, 1);
      
      const mIdx = MOCK_TRIP_MEMBERS.findIndex(m => m.trip_id === activeTripId);
      if (mIdx !== -1) MOCK_TRIP_MEMBERS.splice(mIdx, 1);

      let i = MOCK_ITINERARY_ITEMS.length;
      while (i--) {
        if (MOCK_ITINERARY_ITEMS[i].trip_id === activeTripId) {
          MOCK_ITINERARY_ITEMS.splice(i, 1);
        }
      }

      let eIdx = MOCK_EXPENSES.length;
      const removedExpenseIds = new Set();
      while (eIdx--) {
        if (MOCK_EXPENSES[eIdx].trip_id === activeTripId) {
          removedExpenseIds.add(MOCK_EXPENSES[eIdx].id);
          MOCK_EXPENSES.splice(eIdx, 1);
        }
      }

      let sIdx = MOCK_SPLITS.length;
      while (sIdx--) {
        if (removedExpenseIds.has(MOCK_SPLITS[sIdx].expense_id)) {
          MOCK_SPLITS.splice(sIdx, 1);
        }
      }

      saveMockData();

      localStorage.setItem('wandr_active_trip_id', syncedTrip.id);
      setActiveTripId(syncedTrip.id);
      
      alert('Trip synced successfully! It is now saved in the live cloud and will sync automatically to all your devices.');
      handleRefresh();
    } catch (err) {
      console.error('Failed to sync trip:', err);
      alert(getFriendlyErrorMessage(err, 'Failed to sync trip to cloud.'));
    } finally {
      setLoading(false);
    }
  };

  const autoMigrateLocalTrips = async () => {
    if (!currentUser) return;
    
    const localTripsToSync = MOCK_TRIPS.filter(t => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
      const isDemo = t.id === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      return !isUUID && !isDemo;
    });

    if (localTripsToSync.length === 0) return;

    console.info(`[Wandr] Auto-migrating ${localTripsToSync.length} local trips to Supabase cloud...`);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || sessionData.session.user.id !== currentUser.id) {
        return;
      }

      for (const trip of localTripsToSync) {
        const { data: syncedTrip, error: tripErr } = await supabase
          .from('trips')
          .insert([{
            name: trip.name,
            destination: trip.destination,
            start_date: trip.start_date,
            end_date: trip.end_date,
            total_budget: Number(trip.total_budget),
            created_by: currentUser.id
          }])
          .select()
          .single();

        if (tripErr) {
          console.error("Auto-migration: Failed to sync trip meta:", trip.name, tripErr.message);
          continue;
        }

        try {
          await supabase.from('trip_members').insert([{
            trip_id: syncedTrip.id,
            user_id: currentUser.id,
            role: 'owner'
          }]);
        } catch (mErr) {
          console.warn('Membership association handled by database triggers or RLS constraints.', mErr);
        }

        const localItinerary = MOCK_ITINERARY_ITEMS.filter(item => item.trip_id === trip.id);
        if (localItinerary.length > 0) {
          const itineraryToInsert = localItinerary.map(item => ({
            trip_id: syncedTrip.id,
            title: item.title,
            location: item.location || '',
            start_time: item.start_time,
            notes: item.notes || '',
            category_icon: item.category_icon || 'activity',
            created_by: currentUser.id
          }));

          const { error: itinErr } = await supabase
            .from('itinerary_items')
            .insert(itineraryToInsert);

          if (itinErr) {
            console.error("Auto-migration: Failed to migrate itinerary:", itinErr.message);
          }
        }

        const localExpenses = MOCK_EXPENSES.filter(exp => exp.trip_id === trip.id);
        if (localExpenses.length > 0) {
          for (const exp of localExpenses) {
            const { data: newExpense, error: expErr } = await supabase
              .from('expenses')
              .insert([{
                trip_id: syncedTrip.id,
                description: exp.description,
                amount: Number(exp.amount),
                category: exp.category,
                paid_by: currentUser.id
              }])
              .select()
              .single();

            if (expErr) {
              console.error("Auto-migration: Failed to migrate expense:", exp.description, expErr.message);
              continue;
            }

            const { error: splitErr } = await supabase
              .from('expense_splits')
              .insert([{
                expense_id: newExpense.id,
                user_id: currentUser.id,
                owed_amount: Number(exp.amount),
                is_settled: true,
                settled_at: new Date().toISOString()
              }]);

            if (splitErr) {
              console.error("Auto-migration: Failed to insert split:", splitErr.message);
            }
          }
        }

        const tripIdx = MOCK_TRIPS.findIndex(t => t.id === trip.id);
        if (tripIdx !== -1) MOCK_TRIPS.splice(tripIdx, 1);
        
        const mIdx = MOCK_TRIP_MEMBERS.findIndex(m => m.trip_id === trip.id);
        if (mIdx !== -1) MOCK_TRIP_MEMBERS.splice(mIdx, 1);

        let idx = MOCK_ITINERARY_ITEMS.length;
        while (idx--) {
          if (MOCK_ITINERARY_ITEMS[idx].trip_id === trip.id) {
            MOCK_ITINERARY_ITEMS.splice(idx, 1);
          }
        }

        let eIdx = MOCK_EXPENSES.length;
        const removedExpenseIds = new Set();
        while (eIdx--) {
          if (MOCK_EXPENSES[eIdx].trip_id === trip.id) {
            removedExpenseIds.add(MOCK_EXPENSES[eIdx].id);
            MOCK_EXPENSES.splice(eIdx, 1);
          }
        }

        let sIdx = MOCK_SPLITS.length;
        while (sIdx--) {
          if (removedExpenseIds.has(MOCK_SPLITS[sIdx].expense_id)) {
            MOCK_SPLITS.splice(sIdx, 1);
          }
        }

        if (activeTripId === trip.id) {
          localStorage.setItem('wandr_active_trip_id', syncedTrip.id);
          setActiveTripId(syncedTrip.id);
        }
      }

      saveMockData();
      console.info("[Wandr] Auto-migration complete. Reloading trips list...");
      await fetchExistingTrips();
    } catch (err) {
      console.error("[Wandr] Auto-migration error:", err);
    }
  };

  return { handleSyncTripToCloud, autoMigrateLocalTrips };
}
