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
import { UsernameSetup } from './components/UsernameSetup';
import { AddFriendsModal } from './components/AddFriendsModal';
import { ItineraryView } from './components/ItineraryView';
import { ExpensesView } from './components/ExpensesView';
import { DocsView } from './components/DocsView';
import { Plus, Users } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // User state
  const [username, setUsername] = useState(null);
  const [friends, setFriends] = useState([]);
  
  // State for user data
  const [tripMeta, setTripMeta] = useState(null);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // Modal states
  const [showTripForm, setShowTripForm] = useState(false);
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    // Load username
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) setUsername(savedUsername);

    // Load trip data
    const savedTrip = localStorage.getItem('tripMeta');
    const savedItinerary = localStorage.getItem('itineraryItems');
    const savedExpenses = localStorage.getItem('expenses');
    
    if (savedTrip) {
      const trip = JSON.parse(savedTrip);
      setTripMeta(trip);
      
      // Load friends for this trip
      const savedFriends = localStorage.getItem(`trip_${trip.id}_friends`);
      if (savedFriends) setFriends(JSON.parse(savedFriends));
    }
    
    if (savedItinerary) setItineraryItems(JSON.parse(savedItinerary));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  // Save username
  const handleSaveUsername = (name) => {
    setUsername(name);
    localStorage.setItem('username', name);
  };

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

  // Show username setup if no username
  if (!username) {
    return <UsernameSetup onSave={handleSaveUsername} />;
  }

  // Get user initials
  const userInitials = username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
      {showFriendsModal && (
        <AddFriendsModal
          tripId={tripMeta.id}
          tripName={tripMeta.name}
          currentFriends={friends}
          onClose={() => {
            // Reload friends when modal closes
            const savedFriends = localStorage.getItem(`trip_${tripMeta.id}_friends`);
            if (savedFriends) setFriends(JSON.parse(savedFriends));
            setShowFriendsModal(false);
          }}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        username={username}
        userInitials={userInitials}
      />

      {/* Main Content Area */}
      <div className="md:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <Header 
            tripName={tripMeta.name}
            dateRange={dateRange}
            user={{ name: username, initials: userInitials }}
          />

          {/* Render Different Views Based on Active Tab */}
          {activeTab === 'dashboard' && (
            <>
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
                  onClick={() => setShowFriendsModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-all duration-200"
                >
                  <Users className="w-5 h-5" />
                  Friends ({friends.length})
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
            </>
          )}

          {activeTab === 'itinerary' && (
            <ItineraryView
              itineraryItems={itineraryItems}
              showForm={showItineraryForm}
              setShowForm={setShowItineraryForm}
              onAddItinerary={handleAddItinerary}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              expenseCategories={expenseCategories}
              totalBudget={totalBudget}
              balances={balances}
              showForm={showExpenseForm}
              setShowForm={setShowExpenseForm}
              onAddExpense={handleAddExpense}
            />
          )}

          {activeTab === 'docs' && (
            <DocsView tripId={tripMeta.id} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
