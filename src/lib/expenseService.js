import { supabase, isMockMode } from './supabaseClient';
import {
  mockFetchRecentExpenses,
  mockFetchCategoryTotals,
  mockFetchTripMembers,
  mockAddExpense,
  mockSettleBalances,
} from './mockDatabase';

const USER_DISPLAY_NAMES = {
  '11111111-1111-1111-1111-111111111111': 'Sarah',
  '22222222-2222-2222-2222-222222222222': 'Mike',
  '33333333-3333-3333-3333-333333333333': 'Chloe',
};

const USER_IDS = {
  Sarah: '11111111-1111-1111-1111-111111111111',
  Mike:  '22222222-2222-2222-2222-222222222222',
  Chloe: '33333333-3333-3333-3333-333333333333',
};

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

  return {
    data: data.map(item => ({
      ...item,
      amount: Number(item.amount),
      paid_by: USER_DISPLAY_NAMES[item.paid_by] || item.paid_by.substring(0, 8),
    })),
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
  if (isMockMode) return mockFetchTripMembers(tripId);

  const { data, error } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId);

  if (error) {
    console.error('[fetchTripMembers]', error.message);
    return { data: null, error };
  }
  // Map UUIDs to display names if known, else return raw
  const names = data.map(row =>
    USER_DISPLAY_NAMES[row.user_id] || row.user_id.substring(0, 8)
  );
  return { data: names, error: null };
};

/** Add a new expense and auto-split it evenly across all trip members. */
export const addExpense = async (tripId, expense) => {
  const payerName = expense.paid_by;
  const payerId   = USER_IDS[payerName] || payerName;

  if (isMockMode) {
    const { data: tripMembers } = await mockFetchTripMembers(tripId);
    const activeMembers = tripMembers?.length ? tripMembers : ['Sarah', 'Mike', 'Chloe'];
    const splitAmount   = Number((expense.amount / activeMembers.length).toFixed(2));
    const splits = activeMembers.map(name => ({
      user_id:     name,
      owed_amount: splitAmount,
      is_settled:  name === payerName,
    }));
    return mockAddExpense(tripId, { ...expense, paid_by: payerName }, splits);
  }

  const { data: newExpense, error: expErr } = await supabase
    .from('expenses')
    .insert([{
      trip_id:     tripId,
      description: expense.description,
      amount:      Number(expense.amount),
      category:    expense.category,
      paid_by:     payerId,
    }])
    .select()
    .single();

  if (expErr) {
    console.error('[addExpense]', expErr.message);
    return { data: null, error: expErr };
  }

  const splitAmount   = Number((expense.amount / 3).toFixed(2));
  const splitsToInsert = Object.entries(USER_IDS).map(([name, id]) => ({
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
