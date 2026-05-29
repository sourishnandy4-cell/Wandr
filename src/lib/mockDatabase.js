// High-fidelity local database seeded with data from seed.sql
// Extended to support dynamic custom trips and local memory filtering with local storage persistence.

const loadTable = (key, defaultVal) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultVal;
  } catch (e) {
    console.warn(`Wandr: Clear legacy mock storage data block for key ${key}:`, e);
    localStorage.removeItem(key);
    return defaultVal;
  }
};

const saveTable = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

export const MOCK_TRIPS = loadTable('wandr_mock_trips', [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Barcelona Summer Trip',
    destination: 'Barcelona, Spain',
    start_date: '2024-07-15',
    end_date: '2024-07-22',
    total_budget: 3000.00,
  }
]);

export const MOCK_TRIP_META = MOCK_TRIPS[0];

export const MOCK_TRIP_MEMBERS = loadTable('wandr_mock_trip_members', [
  {
    trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    members: ['Sarah', 'Mike', 'Chloe'],
  }
]);

export const MOCK_ITINERARY_ITEMS = loadTable('wandr_mock_itinerary_items', [
  { id: '1', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-15T10:00:00Z', title: 'Arrival at Barcelona Airport', location: 'El Prat Airport', notes: '', category_icon: 'transport' },
  { id: '2', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-15T13:00:00Z', title: 'Lunch at La Boqueria Market', location: 'La Rambla, 91', notes: '', category_icon: 'food' },
  { id: '3', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-15T14:00:00Z', title: 'Check-in at Hotel', location: 'Hotel Arts Barcelona', notes: '', category_icon: 'accommodation' },
  { id: '4', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-15T16:00:00Z', title: 'Walk through Gothic Quarter', location: 'Barri Gòtic', notes: '', category_icon: 'activity' },
  { id: '5', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-16T09:00:00Z', title: 'Visit Sagrada Familia', location: 'Carrer de Mallorca, 401', notes: '', category_icon: 'activity' },
  { id: '6', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-16T12:00:00Z', title: 'Brunch at Federal Café', location: 'Carrer del Parlament, 39', notes: '', category_icon: 'food' },
  { id: '7', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-16T15:00:00Z', title: 'Park Güell Tour', location: 'Carrer d\'Olot, s/n', notes: '', category_icon: 'activity' },
  { id: '8', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-16T20:00:00Z', title: 'Flamenco Show', location: 'Tablao Flamenco Cordobes', notes: '', category_icon: 'music' },
  { id: '9', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-17T10:00:00Z', title: 'Beach Day at Barceloneta', location: 'Platja de la Barceloneta', notes: '', category_icon: 'activity' },
  { id: '10', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-17T19:00:00Z', title: 'Seafood Dinner', location: 'Can Solé Restaurant', notes: '', category_icon: 'food' },
  { id: '11', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-18T10:00:00Z', title: 'Casa Batlló Visit', location: 'Passeig de Gràcia, 43', notes: '', category_icon: 'activity' },
  { id: '12', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', start_time: '2024-07-18T13:00:00Z', title: 'Shopping on Passeig de Gràcia', location: 'Passeig de Gràcia', notes: '', category_icon: 'activity' }
]);

export const MOCK_EXPENSES = loadTable('wandr_mock_expenses', [
  { id: 'e1', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', description: 'Hotel Arts Barcelona - 7 nights', amount: 1200.00, category: 'Accommodation', paid_by: 'Sarah', created_at: '2024-07-15T14:30:00Z' },
  { id: 'e2', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', description: 'Sagrada Familia entrance tickets', amount: 90.00, category: 'Activities', paid_by: 'Mike', created_at: '2024-07-16T11:45:00Z' },
  { id: 'e3', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', description: 'Seafood dinner at Can Solé', amount: 180.00, category: 'Food & Drinks', paid_by: 'Chloe', created_at: '2024-07-17T21:15:00Z' },
  { id: 'e4', trip_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', description: 'Taxi from El Prat Airport', amount: 45.00, category: 'Transport', paid_by: 'Sarah', created_at: '2024-07-15T11:45:00Z' },
]);

export const MOCK_SPLITS = loadTable('wandr_mock_splits', [
  { id: 's1', expense_id: 'e1', user_id: 'Sarah', owed_amount: 400.00, is_settled: true },
  { id: 's2', expense_id: 'e1', user_id: 'Mike', owed_amount: 400.00, is_settled: false },
  { id: 's3', expense_id: 'e1', user_id: 'Chloe', owed_amount: 400.00, is_settled: false },
  { id: 's4', expense_id: 'e2', user_id: 'Sarah', owed_amount: 30.00, is_settled: true },
  { id: 's5', expense_id: 'e2', user_id: 'Mike', owed_amount: 30.00, is_settled: true },
  { id: 's6', expense_id: 'e2', user_id: 'Chloe', owed_amount: 30.00, is_settled: false },
  { id: 's7', expense_id: 'e3', user_id: 'Sarah', owed_amount: 60.00, is_settled: false },
  { id: 's8', expense_id: 'e3', user_id: 'Mike', owed_amount: 60.00, is_settled: false },
  { id: 's9', expense_id: 'e3', user_id: 'Chloe', owed_amount: 60.00, is_settled: true },
  { id: 's10', expense_id: 'e4', user_id: 'Sarah', owed_amount: 15.00, is_settled: true },
  { id: 's11', expense_id: 'e4', user_id: 'Mike', owed_amount: 15.00, is_settled: true },
  { id: 's12', expense_id: 'e4', user_id: 'Chloe', owed_amount: 15.00, is_settled: false },
]);

export const saveMockData = () => {
  saveTable('wandr_mock_trips', MOCK_TRIPS);
  saveTable('wandr_mock_trip_members', MOCK_TRIP_MEMBERS);
  saveTable('wandr_mock_itinerary_items', MOCK_ITINERARY_ITEMS);
  saveTable('wandr_mock_expenses', MOCK_EXPENSES);
  saveTable('wandr_mock_splits', MOCK_SPLITS);
};

export const mockFetchTripMeta = async (tripId) => {
  const trip = MOCK_TRIPS.find(t => t.id === tripId) || null;
  return { data: trip, error: null };
};

export const mockFetchItinerary = async (tripId) => {
  const filtered = MOCK_ITINERARY_ITEMS.filter(item => item.trip_id === tripId);
  return { data: filtered, error: null };
};

export const mockFetchRecentExpenses = async (tripId) => {
  const filtered = MOCK_EXPENSES.filter(item => item.trip_id === tripId);
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { data: sorted.slice(0, 10), error: null };
};

export const mockFetchCategoryTotals = async (tripId) => {
  const filtered = MOCK_EXPENSES.filter(item => item.trip_id === tripId);
  const totals = filtered.reduce((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + Number(row.amount);
    return acc;
  }, {});

  const formatted = Object.entries(totals).map(([category, amount]) => ({
    category,
    amount,
  }));

  return { data: formatted, error: null };
};

export const mockCalculateNetBalances = async (tripId) => {
  const filteredExpenses = MOCK_EXPENSES.filter(e => e.trip_id === tripId);
  if (filteredExpenses.length === 0) {
    return { data: [], error: null };
  }

  const expenseIds = new Set(filteredExpenses.map(e => e.id));
  const expenseMap = Object.fromEntries(filteredExpenses.map(e => [e.id, e.paid_by]));
  const unsettledSplits = MOCK_SPLITS.filter(s => expenseIds.has(s.expense_id) && !s.is_settled);

  const netMap = {};

  for (const split of unsettledSplits) {
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

  const balances = Object.entries(netMap).map(([key, amount]) => {
    const [from, to] = key.split('→');
    return { from, to, amount: parseFloat(amount.toFixed(2)) };
  });

  return { data: balances, error: null };
};

export const mockAddItineraryItem = async (tripId, item) => {
  const newItem = {
    id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    trip_id: tripId,
    start_time: item.start_time,
    title: item.title,
    location: item.location || '',
    notes: item.notes || '',
    category_icon: item.category_icon || 'activity'
  };
  MOCK_ITINERARY_ITEMS.push(newItem);
  saveMockData();
  return { data: newItem, error: null };
};

export const mockDeleteItineraryItem = async (itemId) => {
  const index = MOCK_ITINERARY_ITEMS.findIndex(item => item.id === itemId);
  if (index !== -1) {
    MOCK_ITINERARY_ITEMS.splice(index, 1);
    saveMockData();
    return { data: { success: true }, error: null };
  }
  return { data: null, error: { message: 'Item not found' } };
};

export const mockClearItinerary = async (tripId) => {
  let i = MOCK_ITINERARY_ITEMS.length;
  while (i--) {
    if (MOCK_ITINERARY_ITEMS[i].trip_id === tripId) {
      MOCK_ITINERARY_ITEMS.splice(i, 1);
    }
  }
  saveMockData();
  return { data: { success: true }, error: null };
};

export const mockAddExpense = async (tripId, expense, splits) => {
  const newExpenseId = 'exp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const newExpense = {
    id: newExpenseId,
    trip_id: tripId,
    description: expense.description,
    amount: Number(expense.amount),
    category: expense.category,
    paid_by: expense.paid_by,
    created_at: new Date().toISOString()
  };
  MOCK_EXPENSES.push(newExpense);

  splits.forEach((split) => {
    MOCK_SPLITS.push({
      id: 'spl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      expense_id: newExpenseId,
      user_id: split.user_id,
      owed_amount: Number(split.owed_amount),
      is_settled: split.is_settled || false
    });
  });

  saveMockData();
  return { data: newExpense, error: null };
};

export const mockDeleteExpense = async (expenseId) => {
  const index = MOCK_EXPENSES.findIndex(e => e.id === expenseId);
  if (index !== -1) {
    MOCK_EXPENSES.splice(index, 1);
    
    // Also delete splits
    let i = MOCK_SPLITS.length;
    while (i--) {
      if (MOCK_SPLITS[i].expense_id === expenseId) {
        MOCK_SPLITS.splice(i, 1);
      }
    }
    
    saveMockData();
    return { data: { success: true }, error: null };
  }
  return { data: null, error: { message: 'Expense not found' } };
};

export const mockClearExpenses = async (tripId) => {
  const expensesToRemove = new Set();
  let i = MOCK_EXPENSES.length;
  while (i--) {
    if (MOCK_EXPENSES[i].trip_id === tripId) {
      expensesToRemove.add(MOCK_EXPENSES[i].id);
      MOCK_EXPENSES.splice(i, 1);
    }
  }
  
  let j = MOCK_SPLITS.length;
  while (j--) {
    if (expensesToRemove.has(MOCK_SPLITS[j].expense_id)) {
      MOCK_SPLITS.splice(j, 1);
    }
  }
  
  saveMockData();
  return { data: { success: true }, error: null };
};

export const mockSettleBalances = async (tripId) => {
  const filteredExpenses = MOCK_EXPENSES.filter(e => e.trip_id === tripId);
  const expenseIds = new Set(filteredExpenses.map(e => e.id));
  
  MOCK_SPLITS.forEach(s => {
    if (expenseIds.has(s.expense_id)) {
      s.is_settled = true;
    }
  });
  saveMockData();
  return { data: { success: true }, error: null };
};

export const mockUpdateTripBudget = async (tripId, newBudget) => {
  const trip = MOCK_TRIPS.find(t => t.id === tripId);
  if (!trip) return { data: null, error: { message: 'Trip not found' } };
  trip.total_budget = Number(newBudget);
  saveMockData();
  return { data: trip, error: null };
};

export const mockFetchTripMembers = async (tripId) => {
  const entry = MOCK_TRIP_MEMBERS.find(m => m.trip_id === tripId);
  return { data: entry ? entry.members : [], error: null };
};

export const mockDeleteTrip = async (tripId) => {
  const index = MOCK_TRIPS.findIndex(t => t.id === tripId);
  if (index !== -1) {
    MOCK_TRIPS.splice(index, 1);
    
    // Clean up members
    const mIdx = MOCK_TRIP_MEMBERS.findIndex(m => m.trip_id === tripId);
    if (mIdx !== -1) MOCK_TRIP_MEMBERS.splice(mIdx, 1);
    
    // Clean up timeline and expenses
    const cleanItems = (arr) => {
      let i = arr.length;
      while (i--) {
        if (arr[i].trip_id === tripId) {
          arr.splice(i, 1);
        }
      }
    };
    
    cleanItems(MOCK_ITINERARY_ITEMS);
    cleanItems(MOCK_EXPENSES);
    
    // Clean splits
    const expenseIds = new Set(MOCK_EXPENSES.map(e => e.id));
    let sIdx = MOCK_SPLITS.length;
    while (sIdx--) {
      if (!expenseIds.has(MOCK_SPLITS[sIdx].expense_id)) {
        MOCK_SPLITS.splice(sIdx, 1);
      }
    }
    
    saveMockData();
  }
  return { error: null };
};
