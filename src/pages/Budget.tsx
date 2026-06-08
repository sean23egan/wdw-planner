import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, CreditCard, RotateCcw, PiggyBank } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { useStore, isDefaultBudgetCategory } from '../store/useStore';
import { generateId } from '../utils/ids';
import { parkDayDisplay, travelTagLabel } from '../utils/parkDay';
import { totalPlanned, formatCurrency } from '../utils/budget';
import { formatDate, tripDateRange } from '../utils/dates';

const TABS = ['Overview', 'Categories', 'By Day', 'Log Expenses'] as const;
type Tab = typeof TABS[number];

const CHART_COLORS = ['#1d4ed8','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0891b2','#65a30d','#ea580c','#b45309'];

export default function Budget() {
  const [tab, setTab] = useState<Tab>('Overview');
  const trip = useStore((s) => s.trip);
  const setTrip = useStore((s) => s.setTrip);
  const budgetCategories = useStore((s) => s.budgetCategories);
  const expenses = useStore((s) => s.expenses);
  const parkDays = useStore((s) => s.parkDays);
  const addBudgetCategory = useStore((s) => s.addBudgetCategory);
  const updateBudgetCategory = useStore((s) => s.updateBudgetCategory);
  const removeBudgetCategory = useStore((s) => s.removeBudgetCategory);
  const restoreMissingBudgetCategories = useStore((s) => s.restoreMissingBudgetCategories);
  const addExpense = useStore((s) => s.addExpense);
  const removeExpense = useStore((s) => s.removeExpense);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editPlanned, setEditPlanned] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Expense form
  const [expCatId, setExpCatId] = useState(budgetCategories[0]?.id ?? '');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Computed actuals from expenses
  const catActuals = Object.fromEntries(
    budgetCategories.map((c) => [
      c.id,
      expenses.filter((e) => e.categoryId === c.id).reduce((sum, e) => sum + e.amount, 0),
    ])
  );

  // A category is automatically "paid off" once its logged expenses cover its planned amount.
  const isCatPaidOff = (c: { id: string; plannedAmount: number }) =>
    c.plannedAmount > 0 && (catActuals[c.id] ?? 0) >= c.plannedAmount;

  const planned = totalPlanned(budgetCategories);
  const actual = Object.values(catActuals).reduce((a, b) => a + b, 0);
  const totalBudget = trip?.overallBudget ?? 0;
  const giftCards = trip?.giftCardBalance ?? 0;
  const savedCash = trip?.savedCash ?? 0;
  const totalSaved = savedCash + giftCards;
  const paidOffTotal = budgetCategories
    .filter((c) => isCatPaidOff(c))
    .reduce((sum, c) => sum + c.plannedAmount, 0);
  const stillOwed = Math.max(0, planned - paidOffTotal - giftCards);
  const pct = totalBudget > 0 ? Math.min(100, (actual / totalBudget) * 100) : 0;
  const budgetTarget = totalBudget || planned;
  const savedPct = budgetTarget > 0 ? Math.min(100, (totalSaved / budgetTarget) * 100) : 0;

  const chartData = budgetCategories
    .filter((c) => c.plannedAmount > 0 || catActuals[c.id] > 0)
    .map((c, i) => ({
      name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
      planned: c.plannedAmount,
      actual: catActuals[c.id] ?? 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  const pieData = budgetCategories
    .filter((c) => (catActuals[c.id] ?? 0) > 0)
    .map((c, i) => ({
      name: c.name,
      value: catActuals[c.id],
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  const handleAddExpense = () => {
    if (!expAmount || !expDesc || !expCatId) return;
    const amount = parseFloat(expAmount);
    addExpense({ id: generateId(), categoryId: expCatId, amount, date: expDate, description: expDesc });
    setExpAmount('');
    setExpDesc('');
  };

  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  // By Day — group expenses by date
  const tripDates = trip ? tripDateRange(trip.startDate, trip.endDate) : [];
  const expensesByDay = tripDates.map((date) => {
    const dayExp = expenses.filter((e) => e.date === date);
    const dayTotal = dayExp.reduce((sum, e) => sum + e.amount, 0);
    const parkDay = parkDays.find((d) => d.date === date);
    return { date, parkDay, expenses: dayExp, total: dayTotal };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Budget</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          {/* Main progress */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Spent: <strong>{formatCurrency(actual)}</strong></span>
              <span>Budget: <strong>{formatCurrency(totalBudget || planned)}</strong></span>
            </div>
            <div className="bg-gray-100 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{pct.toFixed(0)}% used</span>
              <span>{formatCurrency(Math.max(0, (totalBudget || planned) - actual))} remaining</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">Planned</div>
                <div className="font-bold text-blue-700 text-sm">{formatCurrency(planned)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">Actual</div>
                <div className="font-bold text-green-700 text-sm">{formatCurrency(actual)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">Difference</div>
                <div className={`font-bold text-sm ${planned - actual >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                  {formatCurrency(planned - actual)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700 flex items-center gap-2">
              <CreditCard size={16} /> Payment Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated total</span>
                <span className="font-semibold">{formatCurrency(planned)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Pre-paid / paid off</span>
                <span className="font-semibold">− {formatCurrency(paidOffTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gift cards applied</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={giftCards || ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      if (trip) setTrip({ ...trip, giftCardBalance: parseFloat(e.target.value) || 0 });
                    }}
                    className="w-24 border border-gray-300 rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Still owed</span>
                <span className={stillOwed > 0 ? 'text-amber-600' : 'text-green-700'}>{formatCurrency(stillOwed)}</span>
              </div>
            </div>
          </div>

          {/* Savings tracker */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700 flex items-center gap-2">
              <PiggyBank size={16} /> Saved So Far
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cash saved up</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={savedCash || ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      if (trip) setTrip({ ...trip, savedCash: parseFloat(e.target.value) || 0 });
                    }}
                    className="w-24 border border-gray-300 rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gift cards</span>
                <span className="font-semibold text-gray-700">{formatCurrency(giftCards)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total saved</span>
                <span className="text-green-700">{formatCurrency(totalSaved)}</span>
              </div>
            </div>

            <div className="bg-gray-100 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${savedPct >= 100 ? 'bg-green-500' : 'bg-emerald-400'}`}
                style={{ width: `${savedPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{savedPct.toFixed(0)}% of {formatCurrency(budgetTarget)} {totalBudget ? 'budget' : 'planned'}</span>
              <span>
                {totalSaved >= budgetTarget
                  ? '🎉 Fully funded!'
                  : `${formatCurrency(budgetTarget - totalSaved)} to go`}
              </span>
            </div>
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-bold text-gray-700 mb-3">Planned vs Actual</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="planned" name="Planned" fill="#93c5fd" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {pieData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-bold text-gray-700 mb-3">Spending by Category</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORIES ── */}
      {tab === 'Categories' && (
        <div className="space-y-3">
          {budgetCategories.map((cat) => {
            const catActual = catActuals[cat.id] ?? 0;
            const catPct = cat.plannedAmount > 0 ? Math.min(100, (catActual / cat.plannedAmount) * 100) : 0;
            const isOver = cat.plannedAmount > 0 && catActual > cat.plannedAmount;
            const isPaid = isCatPaidOff(cat);
            return (
              <div key={cat.id} className={`bg-white rounded-xl shadow-sm p-4 border ${isOver ? 'border-red-200' : isPaid ? 'border-green-200' : 'border-transparent'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {cat.icon && <span>{cat.icon}</span>}
                    <span className="font-semibold text-gray-800 truncate">{cat.name}</span>
                    {isOver ? (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium shrink-0">OVER</span>
                    ) : isPaid ? (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">PAID</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingCatId === cat.id ? (
                      <>
                        <span className="text-xs text-gray-500">$</span>
                        <input
                          type="number"
                          value={editPlanned}
                          onChange={(e) => setEditPlanned(e.target.value)}
                          className="w-24 border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                        />
                        <button
                          onClick={() => {
                            updateBudgetCategory(cat.id, { plannedAmount: parseFloat(editPlanned) || 0 });
                            setEditingCatId(null);
                          }}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingCatId(null)} className="text-gray-400">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-600">{formatCurrency(catActual)} / {formatCurrency(cat.plannedAmount)}</span>
                        <button
                          onClick={() => { setEditingCatId(cat.id); setEditPlanned(cat.plannedAmount.toString()); }}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                    {!isDefaultBudgetCategory(cat) && (
                      <button onClick={() => removeBudgetCategory(cat.id)} className="text-gray-300 hover:text-red-400" title="Delete category">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-100 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${isOver ? 'bg-red-500' : isPaid ? 'bg-green-500' : catPct > 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
                    style={{ width: `${Math.min(catPct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {cat.plannedAmount > 0 ? `${catPct.toFixed(0)}% of planned` : 'No budget set'}
                    {isOver && (
                      <span className="text-red-500 ml-2">Over by {formatCurrency(catActual - cat.plannedAmount)}</span>
                    )}
                  </div>
                  {isPaid && !isOver && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">✓ Paid off</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add category */}
          {showAddCat ? (
            <div className="bg-white rounded-xl shadow-sm p-4 flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  if (newCatName.trim()) {
                    addBudgetCategory({ id: generateId(), name: newCatName.trim(), plannedAmount: 0, actualAmount: 0, paidOff: false });
                    setNewCatName('');
                    setShowAddCat(false);
                  }
                }}
                className="bg-blue-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                Add
              </button>
              <button onClick={() => setShowAddCat(false)} className="text-gray-400 px-2">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddCat(true)}
                className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Category
              </button>
              <button
                onClick={() => restoreMissingBudgetCategories()}
                className="border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 hover:border-green-300 hover:text-green-600 flex items-center gap-1.5 whitespace-nowrap"
                title="Add back any default categories you removed"
              >
                <RotateCcw size={14} /> Restore Defaults
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── BY DAY ── */}
      {tab === 'By Day' && (
        <div className="space-y-3">
          {tripDates.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              Set up your trip dates to see the day-by-day view.
            </div>
          ) : (
            <>
              {/* Running total bar */}
              {actual > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 mb-1">
                    <span>Total spent</span>
                    <span>{formatCurrency(actual)}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatCurrency(actual / tripDates.length)} avg/day
                  </div>
                </div>
              )}

              {expensesByDay.map(({ date, parkDay, expenses: dayExps, total }) => (
                <div key={date} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{formatDate(date)}</div>
                      {parkDay && (
                        <div className="text-xs text-gray-500">
                          {parkDayDisplay(parkDay).label}
                          {travelTagLabel(parkDay.travelTag) && ` · ${travelTagLabel(parkDay.travelTag)}`}
                        </div>
                      )}
                    </div>
                    <div className={`font-bold ${total > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                      {formatCurrency(total)}
                    </div>
                  </div>

                  {dayExps.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">No expenses logged</div>
                  ) : (
                    <div className="space-y-1.5">
                      {dayExps.map((exp) => {
                        const cat = budgetCategories.find((c) => c.id === exp.categoryId);
                        return (
                          <div key={exp.id} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 text-xs">{cat?.icon ?? '•'}</span>
                            <span className="flex-1 text-gray-700 truncate">{exp.description}</span>
                            <span className="text-xs text-gray-500 shrink-0">{cat?.name}</span>
                            <span className="font-medium shrink-0">{formatCurrency(exp.amount)}</span>
                            <button onClick={() => removeExpense(exp.id)} className="text-gray-200 hover:text-red-400 shrink-0">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Expenses outside trip dates */}
              {(() => {
                const offTripExps = expenses.filter((e) => !tripDates.includes(e.date));
                if (offTripExps.length === 0) return null;
                return (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="font-semibold text-gray-600 text-sm mb-2">Pre/post-trip expenses</div>
                    <div className="space-y-1.5">
                      {offTripExps.map((exp) => {
                        return (
                          <div key={exp.id} className="flex items-center gap-2 text-sm">
                            <span className="text-xs text-gray-400">{exp.date}</span>
                            <span className="flex-1 text-gray-700 truncate">{exp.description}</span>
                            <span className="font-medium">{formatCurrency(exp.amount)}</span>
                            <button onClick={() => removeExpense(exp.id)} className="text-gray-200 hover:text-red-400">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── LOG EXPENSES ── */}
      {tab === 'Log Expenses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700">Quick Add Expense</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Category *</label>
                <select
                  value={expCatId}
                  onChange={(e) => setExpCatId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {budgetCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Amount ($) *</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description *</label>
              <input
                type="text"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="e.g. Mickey ears from Main Street"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleAddExpense}
              disabled={!expAmount || !expDesc || !expCatId}
              className="w-full bg-blue-700 text-white rounded-lg py-2 font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Expense
            </button>
          </div>

          {sortedExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              No expenses logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedExpenses.map((exp) => {
                const cat = budgetCategories.find((c) => c.id === exp.categoryId);
                return (
                  <div key={exp.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{exp.description}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {exp.date} · {cat?.icon} {cat?.name ?? 'Unknown'}
                      </div>
                    </div>
                    <span className="font-bold text-gray-800 shrink-0">{formatCurrency(exp.amount)}</span>
                    <button onClick={() => removeExpense(exp.id)} className="text-gray-300 hover:text-red-400 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
