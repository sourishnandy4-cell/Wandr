import { supabase, isMockMode } from './supabaseClient';
import {
  mockFetchRecentExpenses,
  mockFetchCategoryTotals,
  mockFetchTripMembers,
  mockAddExpense,
  mockSettleBalances,
  mockUpdateTripBudget,
  mockDeleteExpense,
  mockClearExpenses,
  MOCK_TRIPS,
  MOCK_TRIP_MEMBERS,
  saveMockData,
} from './mockDatabase';

export const fetchRecentExpenses = async (tripId) => {
  if (isMockMode()) return mockFetchRecentExpenses(tripId);

  // Fetch trip members first to build a display names lookup map
  const { data: memberData } = await supabase
    .from('trip_members')
    .select(`
      user_id,
      users (
        name
      )
    `)
    .eq('trip_id', tripId);

  const displayNames = {};
  if (memberData) {
    memberData.forEach(row => {
      if (row.user_id && row.users?.name) {
        displayNames[row.user_id] = row.users.name;
      }
    });
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('id, description, amount, category, paid_by, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[fetchRecentExpenses]', error.message);
    return { data: null, error };
  }

  const userStr = localStorage.getItem('wandr_user');
  const user = userStr ? JSON.parse(userStr) : null;

  return {
    data: data.map(item => {
      const isCurrentUser = user && item.paid_by === user.id;
      const payerName = displayNames[item.paid_by] || (isCurrentUser ? user.name : `User-${item.paid_by.substring(0, 4)}`);
      return {
        ...item,
        amount: Number(item.amount),
        paid_by: payerName,
      };
    }),
    error: null,
  };
};

/** Fetch aggregated category totals for the budget chart. */
export const fetchCategoryTotals = async (tripId) => {
  if (isMockMode()) return mockFetchCategoryTotals(tripId);

  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('trip_id', tripId);

  if (error) {
    console.error('[fetchCategoryTotals]', error.message);
    return { data: null, error };
  }

  const totals = data.reduce((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + Number(row.amount);
    return acc;
  }, {});

  return {
    data: Object.entries(totals).map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toFixed(2)),
    })),
    error: null,
  };
};

/** Fetch all member names associated with a trip. */
export const fetchTripMembers = async (tripId) => {
  if (isMockMode()) {
    const res = await mockFetchTripMembers(tripId);
    if (!res.data) return res;
    return { data: res.data.map(name => ({ id: name, name })), error: null };
  }

  const { data, error } = await supabase
    .from('trip_members')
    .select(`
      user_id,
      users (
        name
      )
    `)
    .eq('trip_id', tripId);

  if (error) {
    console.error('[fetchTripMembers]', error.message);
    return { data: null, error };
  }
  
  const userStr = localStorage.getItem('wandr_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const members = data.map(row => ({
    id: row.user_id,
    name: row.users?.name || (user && row.user_id === user.id ? user.name : `User-${row.user_id.substring(0, 4)}`)
  }));

  // Merge in local mock members (e.g. guests or offline joined users) so they resolve in expenses
  const localEntry = MOCK_TRIP_MEMBERS.find(m => m.trip_id === tripId);
  if (localEntry && Array.isArray(localEntry.members)) {
    localEntry.members.forEach(localName => {
      if (!members.some(m => m.name.toLowerCase() === localName.toLowerCase())) {
        members.push({
          id: `local-${localName}`,
          name: localName
        });
      }
    });
  }
  
  return { data: members, error: null };
};

/** Add a new expense and auto-split it evenly across all trip members. */
export const addExpense = async (tripId, expense) => {
  // In mock mode paid_by is already a display name; in Supabase mode resolve to UUID
  const payerId = expense.paid_by;

  if (isMockMode()) {
    const { data: tripMembers } = await mockFetchTripMembers(tripId);
    const activeMembers = tripMembers?.length ? tripMembers : [payerId || 'Traveller'];
    const splitAmount   = Number((expense.amount / activeMembers.length).toFixed(2));
    const splits = activeMembers.map(name => ({
      user_id:     name,
      owed_amount: splitAmount,
      is_settled:  name === payerId,
    }));
    return mockAddExpense(tripId, { ...expense, paid_by: payerId }, splits);
  }

  // Supabase mode: resolve paid_by name → UUID from localStorage user
  const userStr = localStorage.getItem('wandr_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const resolvedPayerId = user?.id || payerId;

  // Safeguard: Ensure paid_by is a valid UUID, otherwise fallback to the current authenticated user's ID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedPayerId);
  const finalPayerId = isUUID ? resolvedPayerId : (user?.id || null);

  const { data: newExpense, error: expErr } = await supabase
    .from('expenses')
    .insert([{
      trip_id:     tripId,
      description: expense.description,
      amount:      Number(expense.amount),
      category:    expense.category,
      paid_by:     finalPayerId,
    }])
    .select()
    .single();

  if (expErr) {
    console.error('[addExpense]', expErr.message);
    return { data: null, error: expErr };
  }

  // Fetch all members to split evenly
  const { data: memberData } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId);
    
  const activeMembers = memberData ? memberData.map(m => m.user_id) : [payerId];
  const splitAmount   = Number((expense.amount / activeMembers.length).toFixed(2));

  const splitsToInsert = activeMembers.map(id => ({
    expense_id: newExpense.id,
    user_id:    id,
    owed_amount: splitAmount,
    is_settled: id === payerId || id === finalPayerId,
    settled_at: (id === payerId || id === finalPayerId) ? new Date().toISOString() : null,
  }));

  const { error: splitErr } = await supabase
    .from('expense_splits')
    .insert(splitsToInsert);

  if (splitErr) {
    console.error('[addExpense splits]', splitErr.message);
    return { data: null, error: splitErr };
  }

  return { data: newExpense, error: null };
};

/** Update the total budget for a trip. */
export const updateTripBudget = async (tripId, newBudget) => {
  if (isMockMode()) return mockUpdateTripBudget(tripId, newBudget);

  const { data, error } = await supabase
    .from('trips')
    .update({ total_budget: Number(newBudget) })
    .eq('id', tripId)
    .select()
    .single();

  if (error) {
    console.error('[updateTripBudget]', error.message);
    return { data: null, error };
  }
  return { data, error: null };
};

/** Mark all unsettled balances for a trip as settled. */
export const settleBalances = async (tripId) => {
  if (isMockMode()) return mockSettleBalances(tripId);

  const { data: expenses, error: fetchErr } = await supabase
    .from('expenses')
    .select('id')
    .eq('trip_id', tripId);

  if (fetchErr) {
    console.error('[settleBalances fetch]', fetchErr.message);
    return { data: null, error: fetchErr };
  }
  if (!expenses?.length) return { data: { success: true }, error: null };

  const expenseIds = expenses.map(e => e.id);
  const { data, error: updateErr } = await supabase
    .from('expense_splits')
    .update({ is_settled: true, settled_at: new Date().toISOString() })
    .in('expense_id', expenseIds)
    .eq('is_settled', false)
    .select();

  if (updateErr) {
    console.error('[settleBalances update]', updateErr.message);
    return { data: null, error: updateErr };
  }
  return { data, error: null };
};

export const deleteExpense = async (expenseId) => {
  if (isMockMode()) return mockDeleteExpense(expenseId);

  // Supabase takes care of cascade deleting splits via foreign key constraints
  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .select();

  if (error) {
    console.error('[deleteExpense]', error.message);
    return { data: null, error };
  }
  return { data, error: null };
};

export const clearExpenses = async (tripId) => {
  if (isMockMode()) return mockClearExpenses(tripId);

  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', tripId)
    .select();

  if (error) {
    console.error('[clearExpenses]', error.message);
    return { data: null, error };
  }
  return { data, error: null };
};

export const updateTripDestination = async (tripId, newDestination) => {
  if (isMockMode()) {
    const trip = MOCK_TRIPS.find(t => t.id === tripId);
    if (trip) {
      trip.destination = newDestination;
      saveMockData();
    }
    return { data: trip, error: null };
  }

  const { data, error } = await supabase
    .from('trips')
    .update({ destination: newDestination })
    .eq('id', tripId)
    .select()
    .single();

  if (error) {
    console.error('[updateTripDestination]', error.message);
    return { data: null, error };
  }
  return { data, error: null };
};

export const updateTripDates = async (tripId, startDate, endDate) => {
  if (isMockMode()) {
    const trip = MOCK_TRIPS.find(t => t.id === tripId);
    if (trip) {
      trip.start_date = startDate;
      trip.end_date = endDate;
      saveMockData();
    }
    return { data: trip, error: null };
  }

  const { data, error } = await supabase
    .from('trips')
    .update({ start_date: startDate, end_date: endDate })
    .eq('id', tripId)
    .select()
    .single();

  if (error) {
    console.error('[updateTripDates]', error.message);
    return { data: null, error };
  }
  return { data, error: null };
};
