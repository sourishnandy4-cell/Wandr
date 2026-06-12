import { supabase, isMockMode } from './supabaseClient';
import { mockCalculateNetBalances } from './mockDatabase';

/**
 * Build a UUID → display-name map from the logged-in user's stored profile
 * plus any overrides baked in. Falls back to a short UUID prefix.
 */
const buildDisplayNameMap = () => {
  const map = {};
  try {
    const raw = localStorage.getItem('wandr_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id && u?.name) map[u.id] = u.name;
    }
  } catch (_) {}
  return map;
};

/**
 * Compute net peer-to-peer balances for a trip.
 * @param {string} tripId
 * @returns {Promise<{data: Array<{from: string, to: string, amount: number}>|null, error: any}>}
 */
export const calculateNetBalances = async (tripId) => {
  if (isMockMode()) {
    return mockCalculateNetBalances(tripId);
  }

  // Step 0: fetch members to build display name mapping
  const { data: memberData } = await supabase
    .from('trip_members')
    .select(`
      user_id,
      users (
        name
      )
    `)
    .eq('trip_id', tripId);

  const displayNames = buildDisplayNameMap();
  if (memberData) {
    memberData.forEach(row => {
      if (row.user_id && row.users?.name) {
        displayNames[row.user_id] = row.users.name;
      }
    });
  }

  // Step 1: fetch expenses with payer info
  const { data: expenses, error: expErr } = await supabase
    .from('expenses')
    .select('id, paid_by, amount')
    .eq('trip_id', tripId);

  if (expErr) {
    console.error('[calculateNetBalances - expenses]', expErr.message);
    return { data: null, error: expErr };
  }

  if (!expenses || expenses.length === 0) {
    return { data: [], error: null };
  }

  const expenseMap = Object.fromEntries(expenses.map(e => [e.id, e.paid_by]));

  // Step 2: fetch unsettled splits
  const expenseIds = expenses.map(e => e.id);
  const { data: splits, error: splitErr } = await supabase
    .from('expense_splits')
    .select('expense_id, user_id, owed_amount')
    .in('expense_id', expenseIds)
    .eq('is_settled', false);

  if (splitErr) {
    console.error('[calculateNetBalances - splits]', splitErr.message);
    return { data: null, error: splitErr };
  }

  // Step 3 & 4: net balance map — key: "fromId→toId"
  const netMap = {};

  for (const split of splits) {
    const payer = expenseMap[split.expense_id];
    if (!payer || payer === split.user_id) continue;

    const fwd = `${split.user_id}→${payer}`;
    const rev = `${payer}→${split.user_id}`;

    if (netMap[rev] !== undefined) {
      netMap[rev] -= Number(split.owed_amount);
      if (netMap[rev] < 0) {
        netMap[fwd] = -netMap[rev];
        delete netMap[rev];
      } else if (netMap[rev] === 0) {
        delete netMap[rev];
      }
    } else {
      netMap[fwd] = (netMap[fwd] || 0) + Number(split.owed_amount);
    }
  }

  // Step 5: format for UI — replace UUIDs with display names
  const balances = Object.entries(netMap).map(([key, amount]) => {
    const [fromId, toId] = key.split('→');
    const from = displayNames[fromId] || `User-${fromId.substring(0, 4)}`;
    const to = displayNames[toId] || `User-${toId.substring(0, 4)}`;
    return { from, to, amount: parseFloat(amount.toFixed(2)) };
  });

  return { data: balances, error: null };
};
export default calculateNetBalances;
