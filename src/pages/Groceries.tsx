import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';
import { GROCERY_STARTER } from '../data/groceryTemplates';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import { formatCurrency } from '../utils/budget';

const CATEGORIES = ['breakfast', 'snacks', 'drinks', 'kids', 'paper-goods'];

export default function Groceries() {
  const trip = useStore((s) => s.trip);
  const groceryOrder = useStore((s) => s.groceryOrder);
  const setGroceryOrder = useStore((s) => s.setGroceryOrder);
  const addGroceryItem = useStore((s) => s.addGroceryItem);
  const updateGroceryItem = useStore((s) => s.updateGroceryItem);
  const removeGroceryItem = useStore((s) => s.removeGroceryItem);
  const budgetCategories = useStore((s) => s.budgetCategories);
  const updateBudgetCategory = useStore((s) => s.updateBudgetCategory);

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES));
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState('snacks');
  const [newQty, setNewQty] = useState('1');
  const [newPrice, setNewPrice] = useState('');

  // Delivery info
  const [deliveryDate, setDeliveryDate] = useState(groceryOrder?.deliveryDate ?? '');
  const [deliveryWindow, setDeliveryWindow] = useState(groceryOrder?.deliveryWindow ?? '');
  const [deliveryNotes, setDeliveryNotes] = useState(groceryOrder?.deliveryNotes ?? '');

  const ensureOrder = () => {
    if (!groceryOrder) {
      const order = {
        id: generateId(),
        items: [],
        deliveryDate: deliveryDate || undefined,
        deliveryWindow: deliveryWindow || undefined,
        deliveryNotes: deliveryNotes || undefined,
      };
      setGroceryOrder(order);
      return order;
    }
    return groceryOrder;
  };

  const handleLoadTemplate = () => {
    const orderId = ensureOrder().id;
    GROCERY_STARTER.forEach((item) => {
      addGroceryItem({
        id: generateId(),
        orderId,
        ...item,
      });
    });
  };

  const handleAddCustom = () => {
    if (!newName.trim()) return;
    const orderId = ensureOrder().id;
    addGroceryItem({
      id: generateId(),
      orderId,
      name: newName.trim(),
      category: newCat,
      quantity: parseInt(newQty) || 1,
      estimatedUnitPrice: parseFloat(newPrice) || 0,
    });
    setNewName('');
    setNewQty('1');
    setNewPrice('');
  };

  const handleSaveDelivery = () => {
    const orderId = groceryOrder?.id ?? generateId();
    setGroceryOrder({
      id: orderId,
      deliveryDate: deliveryDate || undefined,
      deliveryWindow: deliveryWindow || undefined,
      deliveryNotes: deliveryNotes || undefined,
      items: groceryOrder?.items ?? [],
    });
  };

  const items = groceryOrder?.items ?? [];
  const total = items.reduce((sum, i) => sum + i.quantity * i.estimatedUnitPrice, 0);

  // Auto-sync the grocery total into the Groceries budget category (no manual step).
  const groceryCat = budgetCategories.find((c) => c.id === 'bc-groceries' || c.name.toLowerCase().includes('grocery'));
  const groceryCatId = groceryCat?.id;
  const groceryCatPlanned = groceryCat?.plannedAmount;
  useEffect(() => {
    if (groceryCatId && groceryCatPlanned !== total) {
      updateBudgetCategory(groceryCatId, { plannedAmount: total });
    }
  }, [total, groceryCatId, groceryCatPlanned, updateBudgetCategory]);

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const allCats = Array.from(new Set([...CATEGORIES, ...items.map((i) => i.category)]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Groceries</h1>

      {/* Delivery Info */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-gray-700">Walmart Delivery Info</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Delivery Date</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              max={trip?.startDate}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Delivery Window</label>
            <input
              type="text"
              value={deliveryWindow}
              onChange={(e) => setDeliveryWindow(e.target.value)}
              placeholder="e.g. 10am–2pm"
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
          <input
            type="text"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="e.g. Deliver to resort, ask front desk to hold"
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSaveDelivery}
          className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200"
        >
          Save Delivery Info
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleLoadTemplate}
          className="flex items-center gap-2 bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-600"
        >
          <ShoppingCart size={16} /> Load Starter Template
        </button>
        {items.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 font-medium">
            ✓ {formatCurrency(total)} synced to Groceries budget
          </span>
        )}
      </div>

      {/* Grocery list by category */}
      {items.length > 0 ? (
        <div className="space-y-3">
          {allCats.map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            if (catItems.length === 0) return null;
            const catTotal = catItems.reduce((sum, i) => sum + i.quantity * i.estimatedUnitPrice, 0);
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <button
                  onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="font-semibold text-gray-700 capitalize">{cat.replace('-', ' ')}</span>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{formatCurrency(catTotal)}</span>
                    {expandedCats.has(cat) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>
                {expandedCats.has(cat) && (
                  <div className="divide-y divide-gray-50">
                    {catItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2">
                        <span className="flex-1 text-sm text-gray-800">{item.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateGroceryItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                            className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-gray-600 hover:bg-gray-200 text-lg leading-none"
                          >−</button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateGroceryItem(item.id, { quantity: item.quantity + 1 })}
                            className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-gray-600 hover:bg-gray-200 text-lg leading-none"
                          >+</button>
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right">
                          ${item.estimatedUnitPrice.toFixed(2)} ea
                        </span>
                        <span className="text-sm font-medium text-gray-700 w-14 text-right">
                          {formatCurrency(item.quantity * item.estimatedUnitPrice)}
                        </span>
                        <button onClick={() => removeGroceryItem(item.id)} className="text-gray-300 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="bg-blue-700 text-white rounded-xl p-4 flex items-center justify-between">
            <span className="font-bold">Estimated Total</span>
            <span className="text-2xl font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
          <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
          <p>No items yet. Load the starter template or add items below.</p>
        </div>
      )}

      {/* Add custom item */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-gray-700">Add Custom Item</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Item name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="other">other</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Qty"
              min="1"
              className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="$ each"
              min="0"
              step="0.01"
              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleAddCustom}
          disabled={!newName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white rounded-lg py-2 font-medium hover:bg-blue-800 disabled:opacity-50"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>
    </div>
  );
}
