import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ItineraryTimeline } from './components/ItineraryTimeline';
import { BudgetPieChart } from './components/BudgetPieChart';
import { RecentExpenses } from './components/RecentExpenses';
import { BalanceSheet } from './components/BalanceSheet';
import { TripSetupForm } from './components/TripSetupForm';
import { AddItineraryForm } from './components/AddItineraryForm';
import { AddExpenseForm } from './components/AddExpenseForm';
import { Plus } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State for user data
  const [tripMeta, setTripMeta] = useState(null);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // Modal states
  const [showTripForm, setShowTripForm] = useState(false);
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTrip = localStorage.getItem('tripMeta');
    const savedItinerary = localStorage.getItem('itineraryItems');
    const savedExpenses = localStorage.getItem('expenses');
    
    if (savedTrip) setTripMeta(JSON.parse(savedTrip));
    if (savedItinerary) setItineraryItems(JSON.parse(savedItinerary));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  // Save trip data
  const handleSaveTrip = (trip) => {
    setTripMeta(trip);
    localStorage.setItem('tripMeta', JSON.stringify(trip));
    setShowTripForm(false);
  };

  // Add itinerary item
  const handleAddItinerary = (item) => {
    const updated = [...itineraryItems, item];
    setItineraryItems(updated);
    localStorage.setItem('itineraryItems', JSON.stringify(updated));
  };

  // Add expense
  const handleAddExpense = (expense) => {
    const updated = [...expenses, expense];
    setExpenses(updated);
    localStorage.setItem('expenses', JSON.stringify(updated));
  };

  // Calculate expense categories
  const expenseCategories = expenses.reduce((acc, expense) => {
    const existing = acc.find(cat => cat.category === expense.category);
    if (existing) {
      existing.amount += expense.amount;
    } else {
      acc.push({ id: `cat-${acc.length}`, category: expense.category, amount: expense.amount });
    }
    return acc;
  }, []);

  const totalBudget = expenseCategories.reduce((sum, cat) => sum + cat.amount, 0);

  // Show setup form if no trip exists
  useEffect(() => {
    if (!tripMeta) {
      setShowTripForm(true);
    }
  }, [tripMeta]);

  const [activeTab, setActiveTab] = useState('dashboard');

  // Format date range for header
  const dateRange = tripMeta ? `${new Date(tripMeta.start_date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })} – ${new Date(tripMeta.end_date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })}` : '';

  // Mock balances for now (Person C will implement calculation)
  const balances = [];

  if (!tripMeta) {
    return (
      <>
        {showTripForm && (
          <TripSetupForm
            onSave={handleSaveTrip}
            onCancel={() => {}}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Modals */}
      {showTripForm && (
        <TripSetupForm
          onSave={handleSaveTrip}
          onCancel={() => setShowTripForm(false)}
        />
      )}
      {showItineraryForm && (
        <AddItineraryForm
          onSave={handleAddItinerary}
          onCancel={() => setShowItineraryForm(false)}
        />
      )}
      {showExpenseForm && (
        <AddExpenseForm
          onSave={handleAddExpense}
          onCancel={() => setShowExpenseForm(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="md:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <Header 
            tripName={tripMeta.name}
            dateRange={dateRange}
            user={{ name: 'Sarah J.', initials: 'SJ' }}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowItineraryForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Add Activity
            </button>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
            <button
              onClick={() => setShowTripForm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              Edit Trip
            </button>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Itinerary (spans 2 columns on large screens) */}
            <div className="lg:col-span-2">
              {itineraryItems.length > 0 ? (
                <ItineraryTimeline items={itineraryItems} />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <p className="text-gray-500 mb-4">No activities added yet</p>
                  <button
                    onClick={() => setShowItineraryForm(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-all duration-200"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Activity
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Budget & Expenses */}
            <div className="space-y-6">
              {expenseCategories.length > 0 ? (
                <BudgetPieChart 
                  totalBudget={totalBudget}
                  categories={expenseCategories}
                />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                  <p className="text-gray-500 mb-4">No expenses yet</p>
                  <button
                    onClick={() => setShowExpenseForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-all duration-200"
                  >
                    <Plus className="w-5 h-5" />
                    Add Expense
                  </button>
                </div>
              )}
              
              <RecentExpenses expenses={expenses} />
              
              <BalanceSheet balances={balances} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
