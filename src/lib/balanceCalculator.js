// Balance Calculator
// Person C: Calculate who owes whom

import { supabase, USE_MOCK_MODE } from './supabaseClient';

/**
 * Calculate balances for a trip
 * @param {string} tripId - Trip UUID
 * @returns {Promise<Array>} Array of balance objects
 */
export async function getBalances(tripId) {
  if (USE_MOCK_MODE) {
    // For mock mode, return empty array (can be enhanced later)
    return [];
  }

  // Get all expenses with splits
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select(`
      *,
      paid_by_user:users!expenses_paid_by_fkey(id, name),
      expense_splits(user_id, amount, users(name))
    `)
    .eq('trip_id', tripId);

  if (expensesError) throw expensesError;

  // Calculate net balances
  const balanceMap = {};

  expenses.forEach(expense => {
    const paidBy = expense.paid_by_user;
    const totalAmount = parseFloat(expense.amount);

    // Initialize payer if not exists
    if (!balanceMap[paidBy.id]) {
      balanceMap[paidBy.id] = { name: paidBy.name, balance: 0 };
    }

    // Payer paid the full amount
    balanceMap[paidBy.id].balance += totalAmount;

    // Subtract each person's share
    expense.expense_splits.forEach(split => {
      const userId = split.user_id;
      const userName = split.users.name;
      const shareAmount = parseFloat(split.amount);

      if (!balanceMap[userId]) {
        balanceMap[userId] = { name: userName, balance: 0 };
      }

      balanceMap[userId].balance -= shareAmount;
    });
  });

  // Convert to who-owes-whom format
  const balances = [];
  const userIds = Object.keys(balanceMap);

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const user1Id = userIds[i];
      const user2Id = userIds[j];
      const user1 = balanceMap[user1Id];
      const user2 = balanceMap[user2Id];

      const diff = user1.balance - user2.balance;

      if (Math.abs(diff) > 0.01) { // Ignore tiny differences
        if (diff > 0) {
          // user2 owes user1
          balances.push({
            from: user2.name,
            to: user1.name,
            amount: Math.abs(diff) / 2,
          });
        } else {
          // user1 owes user2
          balances.push({
            from: user1.name,
            to: user2.name,
            amount: Math.abs(diff) / 2,
          });
        }
      }
    }
  }

  return balances;
}

/**
 * Simplified balance calculation for equal splits
 * @param {Array} expenses - Array of expenses
 * @param {Array} members - Array of trip members
 * @returns {Array} Array of balance objects
 */
export function calculateSimpleBalances(expenses, members) {
  if (!expenses.length || !members.length) return [];

  const memberCount = members.length;
  const balanceMap = {};

  // Initialize balances
  members.forEach(member => {
    balanceMap[member.name] = 0;
  });

  // Calculate balances
  expenses.forEach(expense => {
    const paidBy = expense.paid_by;
    const amount = parseFloat(expense.amount);
    const sharePerPerson = amount / memberCount;

    // Payer gets credit
    balanceMap[paidBy] += amount;

    // Everyone owes their share
    members.forEach(member => {
      balanceMap[member.name] -= sharePerPerson;
    });
  });

  // Convert to who-owes-whom
  const balances = [];
  const names = Object.keys(balanceMap);

  for (let i = 0; i < names.length; i++) {
    if (balanceMap[names[i]] < -0.01) {
      // This person owes money
      for (let j = 0; j < names.length; j++) {
        if (balanceMap[names[j]] > 0.01) {
          // This person is owed money
          const amount = Math.min(
            Math.abs(balanceMap[names[i]]),
            balanceMap[names[j]]
          );

          if (amount > 0.01) {
            balances.push({
              from: names[i],
              to: names[j],
              amount: Math.round(amount * 100) / 100,
            });

            balanceMap[names[i]] += amount;
            balanceMap[names[j]] -= amount;
          }
        }
      }
    }
  }

  return balances;
}
