// Expense Service
// Person C: API Services for Expenses and Budget

import { supabase, USE_MOCK_MODE } from './supabaseClient';

/**
 * Get all expenses for a trip
 * @param {string} tripId - Trip UUID
 * @returns {Promise<Array>} Array of expenses
 */
export async function getExpenses(tripId) {
  if (USE_MOCK_MODE) {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      paid_by_user:users!expenses_paid_by_fkey(name)
    `)
    .eq('trip_id', tripId)
    .order('paid_at', { ascending: false });

  if (error) throw error;

  // Transform to match frontend format
  return data.map(expense => ({
    ...expense,
    paid_by: expense.paid_by_user?.name || 'Unknown',
  }));
}

/**
 * Get expense categories with totals
 * @param {string} tripId - Trip UUID
 * @returns {Promise<Array>} Array of categories with amounts
 */
export async function getExpenseCategories(tripId) {
  if (USE_MOCK_MODE) {
    const saved = localStorage.getItem('expenses');
    const expenses = saved ? JSON.parse(saved) : [];
    
    const categories = expenses.reduce((acc, expense) => {
      const existing = acc.find(cat => cat.category === expense.category);
      if (existing) {
        existing.amount += expense.amount;
      } else {
        acc.push({ 
          id: `cat-${acc.length}`, 
          category: expense.category, 
          amount: expense.amount 
        });
      }
      return acc;
    }, []);

    return categories;
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('trip_id', tripId);

  if (error) throw error;

  // Group by category
  const categoryMap = {};
  data.forEach(expense => {
    if (!categoryMap[expense.category]) {
      categoryMap[expense.category] = 0;
    }
    categoryMap[expense.category] += parseFloat(expense.amount);
  });

  return Object.entries(categoryMap).map(([category, amount], index) => ({
    id: `cat-${index}`,
    category,
    amount,
  }));
}

/**
 * Add a new expense
 * @param {string} tripId - Trip UUID
 * @param {Object} expenseData - Expense details
 * @returns {Promise<Object>} Created expense
 */
export async function addExpense(tripId, expenseData) {
  if (USE_MOCK_MODE) {
    const saved = localStorage.getItem('expenses');
    const expenses = saved ? JSON.parse(saved) : [];
    const newExpense = {
      id: `e-${Date.now()}`,
      trip_id: tripId,
      ...expenseData,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    expenses.push(newExpense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    return newExpense;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('expenses')
    .insert([{ 
      trip_id: tripId, 
      ...expenseData, 
      paid_by: user.id 
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an expense
 * @param {string} expenseId - Expense UUID
 * @returns {Promise<void>}
 */
export async function deleteExpense(expenseId) {
  if (USE_MOCK_MODE) {
    const saved = localStorage.getItem('expenses');
    const expenses = saved ? JSON.parse(saved) : [];
    const filtered = expenses.filter(expense => expense.id !== expenseId);
    localStorage.setItem('expenses', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;
}

/**
 * Get recent expenses (last 10)
 * @param {string} tripId - Trip UUID
 * @returns {Promise<Array>} Array of recent expenses
 */
export async function getRecentExpenses(tripId) {
  const expenses = await getExpenses(tripId);
  return expenses.slice(0, 10);
}
