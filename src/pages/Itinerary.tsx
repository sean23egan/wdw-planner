import { useState } from 'react';
import { Plus, X, GripVertical, Zap, Clock, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import { formatDate, isToday } from '../utils/dates';
import { generateId } from '../utils/ids';
import type { ItineraryItem, ItemType, ParkDay } from '../types';

const PARK_ABBR: Record<string, string> = {
  'Magic Kingdom': 'MK',
  'EPCOT': 'EP',
  'Hollywood Studios': 'HS',
  'Animal Kingdom': 'AK',
};

const PARK_COLORS: Record<string, string> = {
  'Magic Kingdom': 'bg-purple-100 text-purple-800',
  'EPCOT': 'bg-blue-100 text-blue-800',
  'Hollywood Studios': 'bg-red-100 text-red-800',
  'Animal Kingdom': 'bg-green-100 text-green-800',
};

const TYPE_COLORS: Record<ItemType, string> = {
  attraction: 'bg-blue-100 text-blue-700',
  show: 'bg-purple-100 text-purple-700',
  meal: 'bg-orange-100 text-orange-700',
  break: 'bg-gray-100 text-gray-600',
  event: 'bg-amber-100 text-amber-700',
};

const ITEM_TYPES: ItemType[] = ['attraction', 'show', 'meal', 'break', 'event'];

interface SortableItemProps {
  item: ItineraryItem;
  onRemove: (id: string) => void;
}

function SortableItem({ item, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2"
    >
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab touch-none">
        <GripVertical size={16} />
      </button>
      {item.time && (
        <span className="text-xs text-gray-500 w-12 shrink-0 flex items-center gap-1">
          <Clock size={10} />{item.time}
        </span>
      )}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TYPE_COLORS[item.type]}`}>
        {item.type}
      </span>
      <span className="flex-1 text-sm text-gray-800 font-medium truncate">{item.name}</span>
      {item.lightningLane && (
        <span className="text-amber-500 shrink-0" title="Lightning Lane">
          <Zap size={14} />
        </span>
      )}
      {item.notes && <span className="text-xs text-gray-400 hidden sm:block truncate max-w-24">{item.notes}</span>}
      <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-400 shrink-0 p-0.5">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function Itinerary() {
  const trip = useStore((s) => s.trip);
  const parkDays = useStore((s) => s.parkDays);
  const itineraryItems = useStore((s) => s.itineraryItems);
  const addItineraryItem = useStore((s) => s.addItineraryItem);
  const removeItineraryItem = useStore((s) => s.removeItineraryItem);
  const reorderItineraryItems = useStore((s) => s.reorderItineraryItems);

  const sortedDays = [...parkDays].sort((a, b) => a.date.localeCompare(b.date));
  const todayIdx = sortedDays.findIndex((d) => isToday(d.date));
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [showForm, setShowForm] = useState(false);

  // Add form state
  const [newType, setNewType] = useState<ItemType>('attraction');
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newLL, setNewLL] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!trip || sortedDays.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>No park days set up yet.</p>
        <a href="#/setup" className="text-blue-700 mt-2 inline-block">Set up your trip →</a>
      </div>
    );
  }

  const selectedDay: ParkDay = sortedDays[selectedDayIdx] ?? sortedDays[0];
  const dayItems = itineraryItems
    .filter((i) => i.parkDayId === selectedDay.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dayItems.findIndex((i) => i.id === active.id);
    const newIndex = dayItems.findIndex((i) => i.id === over.id);
    const newOrder = arrayMove(dayItems, oldIndex, newIndex).map((i) => i.id);
    reorderItineraryItems(selectedDay.id, newOrder);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addItineraryItem({
      id: generateId(),
      parkDayId: selectedDay.id,
      type: newType,
      name: newName.trim(),
      time: newTime || undefined,
      duration: newDuration ? parseInt(newDuration) : undefined,
      notes: newNotes || undefined,
      lightningLane: newLL,
      sortOrder: dayItems.length,
    });
    setNewName('');
    setNewTime('');
    setNewDuration('');
    setNewNotes('');
    setNewLL(false);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Itinerary</h1>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sortedDays.map((day, idx) => {
          const active = idx === selectedDayIdx;
          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayIdx(idx)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                active
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              <div>{formatDate(day.date)}</div>
              <div className={`text-xs ${active ? 'text-blue-200' : 'text-gray-400'}`}>
                {PARK_ABBR[day.park] ?? day.park}
                {isToday(day.date) && ' · Today'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day header */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">{selectedDay.park}</h2>
            <p className="text-sm text-gray-500">{formatDate(selectedDay.date)}</p>
            {selectedDay.isHopDay && selectedDay.hopToPark && (
              <p className="text-xs text-blue-600 mt-0.5">
                Hopping to {selectedDay.hopToPark}{selectedDay.hopTime ? ` at ${selectedDay.hopTime}` : ''}
              </p>
            )}
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${PARK_COLORS[selectedDay.park]}`}>
            {PARK_ABBR[selectedDay.park]}
          </span>
        </div>
      </div>

      {/* Itinerary list */}
      <div className="space-y-2">
        {dayItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
            <p>No items yet. Add something to do!</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {dayItems.map((item) => (
                <SortableItem key={item.id} item={item} onRemove={removeItineraryItem} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add item */}
      {showForm ? (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-blue-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Add Item</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ItemType)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Time</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Space Mountain"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Duration (min)</label>
              <input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                placeholder="45"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={newLL}
                  onChange={(e) => setNewLL(e.target.checked)}
                  className="rounded"
                />
                <Zap size={14} className="text-amber-500" />
                Lightning Lane
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              Add to Itinerary
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-100 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-blue-200 text-blue-700 rounded-xl py-3 font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Plus size={18} /> Add Item
        </button>
      )}
    </div>
  );
}
