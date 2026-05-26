import React from 'react';
import { BudgetPieChart } from './BudgetPieChart';
import { RecentExpenses } from './RecentExpenses';
import { BalanceSheet } from './BalanceSheet';
import { AddExpenseForm } from './AddExpenseForm';
import { Plus } from 'lucide-react';

export const ExpensesView = ({ 
  expenses,
  expenseCategories,
  totalBudget,
  balances,
  showForm,
  setShowForm,
  onAddExpense
}) => {
  return (
    <div>
      {showForm && (
        <AddExpenseForm
          onSave={onAddExpense}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Expenses & Budget</h1>
          <p className="text-gray-600 mt-1">Track spending and split costs</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
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
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Add First Expense
              </button>
            </div>
          )}

          <BalanceSheet balances={balances} />
        </div>

        {/* Right Column */}
        <div>
          <RecentExpenses expenses={expenses} />
        </div>
      </div>
    </div>
  );
};
