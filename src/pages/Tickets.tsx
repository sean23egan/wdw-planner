import { useState } from 'react';
import { Plus, Trash2, Check, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import type { TicketOption, TicketType } from '../types';
import { formatCurrency } from '../utils/budget';
import { daysUntil } from '../utils/dates';

const TABS = ['Add Options', 'Compare', 'Reminders'] as const;
type Tab = typeof TABS[number];

export default function Tickets() {
  const [tab, setTab] = useState<Tab>('Add Options');
  const ticketOptions = useStore((s) => s.ticketOptions);
  const addTicketOption = useStore((s) => s.addTicketOption);
  const removeTicketOption = useStore((s) => s.removeTicketOption);
  const selectTicketOption = useStore((s) => s.selectTicketOption);
  const budgetCategories = useStore((s) => s.budgetCategories);
  const updateBudgetCategory = useStore((s) => s.updateBudgetCategory);

  const [ticketType, setTicketType] = useState<TicketType>('multi-day');
  const [tierName, setTierName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [pricePerTicket, setPricePerTicket] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [blockoutDates, setBlockoutDates] = useState('');
  const [buyByDate, setBuyByDate] = useState('');
  const [notes, setNotes] = useState('');
  const [numDays, setNumDays] = useState('5');
  const [parkHopper, setParkHopper] = useState(false);

  const handleAdd = () => {
    if (!pricePerTicket) return;
    addTicketOption({
      id: generateId(),
      type: ticketType,
      tierOrPlanName: tierName || undefined,
      quantity: parseInt(quantity) || 1,
      pricePerTicket: parseFloat(pricePerTicket),
      expirationDate: expirationDate || undefined,
      blockoutDates: blockoutDates ? blockoutDates.split('\n').filter(Boolean) : undefined,
      buyByDate: buyByDate || undefined,
      notes: notes || undefined,
      isSelected: false,
    });
    setTierName('');
    setPricePerTicket('');
    setExpirationDate('');
    setBlockoutDates('');
    setBuyByDate('');
    setNotes('');
  };

  const handleSelect = (id: string) => {
    selectTicketOption(id);
    const opt = ticketOptions.find((t) => t.id === id);
    if (opt) {
      const totalCost = opt.pricePerTicket * opt.quantity;
      const cat = budgetCategories.find((c) => c.id === 'bc-tickets' || c.name.toLowerCase().includes('ticket'));
      if (cat) {
        updateBudgetCategory(cat.id, { plannedAmount: totalCost });
      }
    }
  };

  const getPerDayCost = (opt: TicketOption) => {
    if (opt.type === 'multi-day' && parseInt(numDays) > 0) {
      return formatCurrency(opt.pricePerTicket / parseInt(numDays));
    }
    return null;
  };

  const reminders = ticketOptions
    .filter((t) => t.buyByDate || t.expirationDate)
    .map((t) => ({
      ...t,
      dateLabel: t.buyByDate ? `Buy by ${t.buyByDate}` : `Expires ${t.expirationDate}`,
      targetDate: t.buyByDate || t.expirationDate!,
    }))
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Tickets & Passes</h1>

      <div className="flex border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Add Options' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700">Add Ticket Option</h2>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ticket Type</label>
              <div className="flex gap-2">
                {(['multi-day', 'annual-pass', 'mwr'] as TicketType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTicketType(t)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      ticketType === t
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {t === 'multi-day' ? 'Multi-Day' : t === 'annual-pass' ? 'Annual Pass' : 'MWR'}
                  </button>
                ))}
              </div>
            </div>

            {ticketType === 'multi-day' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Number of Days</label>
                  <input
                    type="number"
                    value={numDays}
                    onChange={(e) => setNumDays(e.target.value)}
                    min="1"
                    max="10"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={parkHopper} onChange={(e) => setParkHopper(e.target.checked)} className="rounded" />
                    Park Hopper
                  </label>
                </div>
              </div>
            )}

            {ticketType === 'annual-pass' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Pass Tier</label>
                <input
                  type="text"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  placeholder="e.g. Incredi-Pass, Sorcerer Pass"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {ticketType === 'mwr' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Ticket Description</label>
                <input
                  type="text"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  placeholder="e.g. 4-Day Military Salute"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Qty</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Price Per Ticket *</label>
                <input
                  type="number"
                  value={pricePerTicket}
                  onChange={(e) => setPricePerTicket(e.target.value)}
                  placeholder="109.00"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Buy By Date</label>
                <input
                  type="date"
                  value={buyByDate}
                  onChange={(e) => setBuyByDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Expiration Date</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {ticketType === 'annual-pass' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Blockout Dates (one per line)</label>
                <textarea
                  value={blockoutDates}
                  onChange={(e) => setBlockoutDates(e.target.value)}
                  rows={3}
                  placeholder="e.g. 2025-12-25&#10;2026-01-01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            {ticketType === 'mwr' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Pickup Instructions / Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Pick up at ITT office, bring military ID..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            <button
              onClick={handleAdd}
              disabled={!pricePerTicket}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white rounded-lg py-2 font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              <Plus size={16} /> Add Option
            </button>
          </div>

          {ticketOptions.map((opt) => (
            <div key={opt.id} className={`bg-white rounded-xl shadow-sm p-4 border-2 ${opt.isSelected ? 'border-blue-600' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{opt.type}</span>
                    {opt.tierOrPlanName && <span className="font-semibold text-gray-800">{opt.tierOrPlanName}</span>}
                    {opt.isSelected && <span className="text-xs text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded">Selected</span>}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {opt.quantity}x · {formatCurrency(opt.pricePerTicket)} each · <strong>{formatCurrency(opt.quantity * opt.pricePerTicket)} total</strong>
                  </div>
                  {opt.buyByDate && <p className="text-xs text-amber-600 mt-0.5">Buy by: {opt.buyByDate}</p>}
                  {opt.notes && <p className="text-xs text-gray-500 mt-0.5">{opt.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {!opt.isSelected && (
                    <button
                      onClick={() => handleSelect(opt.id)}
                      className="text-xs bg-blue-700 text-white px-3 py-1 rounded-lg hover:bg-blue-800"
                    >
                      Select
                    </button>
                  )}
                  <button onClick={() => removeTicketOption(opt.id)} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Compare' && (
        <div className="space-y-3">
          {ticketOptions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              Add ticket options to compare them.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Option</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">Total</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600 hidden sm:table-cell">Per/Day</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ticketOptions.map((opt) => (
                    <tr key={opt.id} className={opt.isSelected ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{opt.tierOrPlanName || opt.type}</div>
                        <div className="text-xs text-gray-500">{opt.type} · {opt.quantity}x</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">
                        {formatCurrency(opt.quantity * opt.pricePerTicket)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                        {getPerDayCost(opt) ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {opt.isSelected ? (
                          <Check size={16} className="text-blue-700 ml-auto" />
                        ) : (
                          <button
                            onClick={() => handleSelect(opt.id)}
                            className="text-xs bg-blue-700 text-white px-2 py-1 rounded hover:bg-blue-800"
                          >
                            Select
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Reminders' && (
        <div className="space-y-3">
          {reminders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              No upcoming dates. Add buy-by or expiration dates to ticket options.
            </div>
          ) : (
            reminders.map((r) => {
              const days = daysUntil(r.targetDate);
              return (
                <div key={r.id} className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 border ${days < 0 ? 'border-red-200' : days <= 7 ? 'border-amber-200' : 'border-gray-100'}`}>
                  <AlertTriangle size={18} className={days < 0 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-gray-400'} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{r.tierOrPlanName || r.type}</div>
                    <div className="text-sm text-gray-500">{r.dateLabel}</div>
                  </div>
                  <span className={`text-sm font-bold ${days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-gray-600'}`}>
                    {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
