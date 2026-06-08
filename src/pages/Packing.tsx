import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import { daysUntil } from '../utils/dates';
import { addDays, parseISO, format } from 'date-fns';

const TABS = ['Packing List', 'Pre-Trip Tasks'] as const;
type Tab = typeof TABS[number];

const PACKING_CATEGORIES = ['clothing', 'toiletries', 'park-essentials', 'documents', 'electronics', 'kids'];
const TASK_CATEGORIES = ['Planning', 'Tickets', 'Dining', 'Lodging', 'Groceries', 'Other'];

export default function Packing() {
  const [tab, setTab] = useState<Tab>('Packing List');
  const trip = useStore((s) => s.trip);
  const packingItems = useStore((s) => s.packingItems);
  const preTripTasks = useStore((s) => s.preTripTasks);
  const addPackingItem = useStore((s) => s.addPackingItem);
  const togglePackingItem = useStore((s) => s.togglePackingItem);
  const removePackingItem = useStore((s) => s.removePackingItem);
  const addPreTripTask = useStore((s) => s.addPreTripTask);
  const togglePreTripTask = useStore((s) => s.togglePreTripTask);

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(PACKING_CATEGORIES));
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('park-essentials');

  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDays, setNewTaskDays] = useState('');
  const [newTaskCat, setNewTaskCat] = useState('Planning');

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const allCats = Array.from(new Set([...PACKING_CATEGORIES, ...packingItems.map((i) => i.category)]));
  const totalItems = packingItems.length;
  const packedItems = packingItems.filter((i) => i.packed).length;
  const packingPct = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const getTaskDueDate = (task: typeof preTripTasks[0]) => {
    if (task.dueDate) return task.dueDate;
    if (task.daysBeforeTrip && trip) {
      return format(addDays(parseISO(trip.startDate), -task.daysBeforeTrip), 'yyyy-MM-dd');
    }
    return null;
  };

  const tasksWithDue = preTripTasks.map((t) => ({
    ...t,
    computedDue: getTaskDueDate(t),
  }));

  const doneTasks = tasksWithDue.filter((t) => t.done);
  const totalTasks = preTripTasks.length;
  const doneCount = doneTasks.length;
  const taskPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const tasksByCategory = TASK_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = tasksWithDue.filter((t) => t.category === cat);
    return acc;
  }, {} as Record<string, typeof tasksWithDue>);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Packing & Prep</h1>

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

      {tab === 'Packing List' && (
        <div className="space-y-4">
          {/* Add item */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700">Add Item</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newItemName.trim()) {
                    addPackingItem({ id: generateId(), name: newItemName.trim(), category: newItemCat, packed: false });
                    setNewItemName('');
                  }
                }}
                placeholder="Item name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newItemCat}
                onChange={(e) => setNewItemCat(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PACKING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={() => {
                  if (!newItemName.trim()) return;
                  addPackingItem({ id: generateId(), name: newItemName.trim(), category: newItemCat, packed: false });
                  setNewItemName('');
                }}
                className="bg-blue-700 text-white rounded-lg px-3 py-2 hover:bg-blue-800"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{packedItems} of {totalItems} packed</span>
              <span className="font-bold">{packingPct}%</span>
            </div>
            <div className="bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${packingPct === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                style={{ width: `${packingPct}%` }}
              />
            </div>
          </div>

          {/* Category sections */}
          {allCats.map((cat) => {
            const catItems = packingItems.filter((i) => i.category === cat);
            if (catItems.length === 0 && !PACKING_CATEGORIES.includes(cat)) return null;
            const catPacked = catItems.filter((i) => i.packed).length;
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <button
                  onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="font-semibold text-gray-700 capitalize">{cat.replace(/-/g, ' ')}</span>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{catPacked}/{catItems.length}</span>
                    {expandedCats.has(cat) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>
                {expandedCats.has(cat) && (
                  <div className="divide-y divide-gray-50">
                    {catItems.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400 italic">No items in this category.</p>
                    ) : (
                      catItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={item.packed}
                            onChange={() => togglePackingItem(item.id)}
                            className="rounded w-4 h-4 accent-blue-700"
                          />
                          <span className={`flex-1 text-sm ${item.packed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {item.name}
                          </span>
                          <button onClick={() => removePackingItem(item.id)} className="text-gray-200 hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}

      {tab === 'Pre-Trip Tasks' && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{doneCount} of {totalTasks} tasks done</span>
              <span className="font-bold">{taskPct}%</span>
            </div>
            <div className="bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${taskPct === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${taskPct}%` }}
              />
            </div>
          </div>

          {/* Tasks by category */}
          {TASK_CATEGORIES.map((cat) => {
            const catTasks = tasksByCategory[cat] ?? [];
            if (catTasks.length === 0) return null;
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="px-4 py-2 bg-gray-50 font-semibold text-gray-700 text-sm">{cat}</div>
                <div className="divide-y divide-gray-50">
                  {catTasks.map((task) => {
                    const due = task.computedDue ? daysUntil(task.computedDue) : null;
                    const isOverdue = due !== null && due < 0 && !task.done;
                    const isDueSoon = due !== null && due >= 0 && due <= 7 && !task.done;
                    return (
                      <div key={task.id} className={`flex items-center gap-3 px-4 py-3 ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-amber-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => togglePreTripTask(task.id)}
                          className="rounded w-4 h-4 accent-blue-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.name}
                          </span>
                          {task.name.toLowerCase().includes('lightning lane') && !task.done && (
                            <div className="text-xs mt-0.5 text-blue-600 font-medium">
                              ⏰ Book at 7pm ET — 7 days before your arrival
                            </div>
                          )}
                          {task.computedDue && (
                            <div className="text-xs mt-0.5 text-gray-500">
                              Due: {task.computedDue}
                              {task.daysBeforeTrip && ` (${task.daysBeforeTrip} days before trip)`}
                            </div>
                          )}
                        </div>
                        {due !== null && !task.done && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                            due < 0 ? 'bg-red-100 text-red-700' :
                            due <= 7 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? 'Today' : `${due}d`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add task */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700">Add Custom Task</h2>
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Task name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Days before trip</label>
                <input
                  type="number"
                  value={newTaskDays}
                  onChange={(e) => setNewTaskDays(e.target.value)}
                  placeholder="60"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                <select
                  value={newTaskCat}
                  onChange={(e) => setNewTaskCat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                if (!newTaskName.trim()) return;
                addPreTripTask({
                  id: generateId(),
                  name: newTaskName.trim(),
                  daysBeforeTrip: newTaskDays ? parseInt(newTaskDays) : undefined,
                  done: false,
                  category: newTaskCat,
                });
                setNewTaskName('');
                setNewTaskDays('');
              }}
              disabled={!newTaskName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white rounded-lg py-2 font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
