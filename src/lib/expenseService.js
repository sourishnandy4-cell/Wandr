import { supabase, isMockMode } from './supabaseClient';
import {
  mockFetchRecentExpenses,
  mockFetchCategoryTotals,
  mockFetchTripMembers,
  mockAddExpense,
  mockSettleBalances,
  mockUpdateTripBudget,
} from './mockDatabase';

/** Fetch the last 10 expenses for a trip. */
export const fetchRecentExpenses = async (tripId) => {
  if (isMockMode) return mockFetchRecentExpenses(tripId);

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
      return {
        ...item,
        amount: Number(item.amount),
        paid_by: isCurrentUser ? user.name : `User-${item.paid_by.substring(0, 4)}`,
      };
    }),
    error: null,
  };
};

/** Fetch aggregated category totals for the budget chart. */
export const fetchCategoryTotals = async (tripId) => {
  if (isMockMode) return mockFetchCategoryTotals(tripId);

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
  if (isMockMode) {
    const res = await mockFetchTripMembers(tripId);
    if (!res.data) return res;
    return { data: res.data.map(name => ({ id: name, name })), error: null };
  }

  const { data, error } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId);

  if (error) {
    console.error('[fetchTripMembers]', error.message);
    return { data: null, error };
  }
  
  const userStr = localStorage.getItem('wandr_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const members = data.map(row => ({
    id: row.user_id,
    name: user && row.user_id === user.id ? user.name : `User-${row.user_id.substring(0, 4)}`
  }));
  
  return { data: members, error: null };
};

/** Add a new expense and auto-split it evenly across all trip members. */
export const addExpense = async (tripId, expense) => {
  // In mock mode paid_by is already a display name; in Supabase mode resolve to UUID
  const payerId = expense.paid_by;

  if (isMockMode) {
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

  const { data: newExpense, error: expErr } = await supabase
    .from('expenses')
    .insert([{
      trip_id:     tripId,
      description: expense.description,
      amount:      Number(expense.amount),
      category:    expense.category,
      paid_by:     resolvedPayerId,
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
    is_settled: id === payerId,
    settled_at: id === payerId ? new Date().toISOString() : null,
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
  if (isMockMode) return mockUpdateTripBudget(tripId, newBudget);

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
  if (isMockMode) return mockSettleBalances(tripId);

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
