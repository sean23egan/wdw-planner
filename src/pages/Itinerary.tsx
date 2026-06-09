import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap, Clock, Trash2, GripVertical, Utensils, Star, X, LayoutList, AlignJustify } from 'lucide-react';
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
import { parkDayDisplay, travelTagLabel } from '../utils/parkDay';
import type { ItineraryItem, ItemType, ParkDay } from '../types';

const TYPE_COLORS: Record<ItemType, string> = {
  attraction: 'bg-blue-100 text-blue-700',
  show: 'bg-purple-100 text-purple-700',
  meal: 'bg-orange-100 text-orange-700',
  break: 'bg-gray-100 text-gray-600',
  event: 'bg-amber-100 text-amber-700',
};

const OTHER_TYPES: ItemType[] = ['show', 'break', 'event'];

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
        <span className="text-xs text-gray-500 w-20 shrink-0 flex items-center gap-1 whitespace-nowrap">
          <Clock size={10} />{fmt12(item.time)}
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

// ── Timeline View Component ───────────────────────────────────────────────────
const HOUR_START = 7;   // 7 AM
const HOUR_END   = 23;  // 11 PM

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

const TIMELINE_TYPE_COLORS: Record<string, string> = {
  attraction: 'bg-blue-100 border-blue-300 text-blue-800',
  meal:       'bg-orange-100 border-orange-300 text-orange-800',
  show:       'bg-purple-100 border-purple-300 text-purple-800',
  event:      'bg-amber-100 border-amber-300 text-amber-800',
  break:      'bg-gray-100 border-gray-300 text-gray-700',
};

interface TimelineViewProps {
  items: ItineraryItem[];
  onRemove: (id: string) => void;
}

function TimelineView({ items, onRemove }: TimelineViewProps) {
  const timed   = items.filter((i) => i.time).sort((a, b) => (a.time! > b.time! ? 1 : -1));
  const untimed = items.filter((i) => !i.time);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Unscheduled items */}
      {untimed.length > 0 && (
        <div className="border-b border-gray-100 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Unscheduled</p>
          {untimed.map((item) => (
            <div key={item.id} className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm ${TIMELINE_TYPE_COLORS[item.type] ?? 'bg-gray-50 border-gray-200'}`}>
              <span className="flex-1 font-medium truncate">{item.name}</span>
              {item.lightningLane && <Zap size={12} className="text-amber-500 shrink-0" />}
              <button onClick={() => onRemove(item.id)} className="text-gray-400 hover:text-red-400 shrink-0"><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Hour rows */}
      <div className="divide-y divide-gray-50">
        {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => {
          const hour = HOUR_START + i;
          const slotItems = timed.filter((item) => {
            const h = parseInt(item.time!.split(':')[0]);
            return h === hour;
          });
          const label = hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
          return (
            <div key={hour} className={`flex gap-0 min-h-[2.5rem] ${slotItems.length > 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
              <div className="w-14 shrink-0 px-2 py-2 text-right">
                <span className="text-[10px] text-gray-400 font-medium">{label}</span>
              </div>
              <div className="flex-1 py-1.5 px-2 space-y-1 border-l border-gray-100">
                {slotItems.map((item) => (
                  <div key={item.id} className={`flex items-center gap-2 border rounded-lg px-2.5 py-1 text-xs ${TIMELINE_TYPE_COLORS[item.type] ?? 'bg-gray-50 border-gray-200'}`}>
                    <span className="text-[10px] font-mono shrink-0 opacity-60">{fmt12(item.time!)}</span>
                    <span className="flex-1 font-medium truncate">{item.name}</span>
                    {item.lightningLane && <Zap size={10} className="text-amber-500 shrink-0" />}
                    <button onClick={() => onRemove(item.id)} className="text-current opacity-40 hover:opacity-80 shrink-0"><X size={11} /></button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Itinerary() {
  const navigate = useNavigate();
  const trip = useStore((s) => s.trip);
  const parkDays = useStore((s) => s.parkDays);
  const itineraryItems = useStore((s) => s.itineraryItems);
  const addItineraryItem = useStore((s) => s.addItineraryItem);
  const removeItineraryItem = useStore((s) => s.removeItineraryItem);
  const reorderItineraryItems = useStore((s) => s.reorderItineraryItems);

  const sortedDays = [...parkDays].sort((a, b) => a.date.localeCompare(b.date));
  const todayIdx = sortedDays.findIndex((d) => isToday(d.date));
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [showOtherForm, setShowOtherForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // "Add other item" form state
  const [newType, setNewType] = useState<ItemType>('show');
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newNotes, setNewNotes] = useState('');

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

  const handleAddOther = () => {
    if (!newName.trim()) return;
    addItineraryItem({
      id: generateId(),
      parkDayId: selectedDay.id,
      type: newType,
      name: newName.trim(),
      time: newTime || undefined,
      notes: newNotes || undefined,
      lightningLane: false,
      sortOrder: dayItems.length,
    });
    setNewName('');
    setNewTime('');
    setNewNotes('');
    setShowOtherForm(false);
  };

  const attractions = dayItems.filter((i) => i.type === 'attraction');
  const meals = dayItems.filter((i) => i.type === 'meal');
  const others = dayItems.filter((i) => !['attraction', 'meal'].includes(i.type));

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
                {parkDayDisplay(day).abbr}
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
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              {parkDayDisplay(selectedDay).label}
              {travelTagLabel(selectedDay.travelTag) && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{travelTagLabel(selectedDay.travelTag)}</span>
              )}
            </h2>
            <p className="text-sm text-gray-500">{formatDate(selectedDay.date)}</p>
            {!selectedDay.noPark && selectedDay.isHopDay && selectedDay.hopToPark && (
              <p className="text-xs text-blue-600 mt-0.5">
                Hopping to {selectedDay.hopToPark}{selectedDay.hopTime ? ` at ${selectedDay.hopTime}` : ''}
              </p>
            )}
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${parkDayDisplay(selectedDay).colorClass}`}>
            {parkDayDisplay(selectedDay).abbr}
          </span>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${viewMode === 'list' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
        >
          <AlignJustify size={14} /> List
        </button>
        <button
          onClick={() => setViewMode('timeline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${viewMode === 'timeline' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
        >
          <LayoutList size={14} /> Timeline
        </button>
      </div>

      {/* Quick-add navigation buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/attractions')}
          className="flex items-center justify-center gap-2 bg-blue-700 text-white rounded-xl py-3 font-semibold hover:bg-blue-800 transition-colors"
        >
          <Star size={18} /> Browse Attractions
        </button>
        <button
          onClick={() => navigate('/dining')}
          className="flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
        >
          <Utensils size={18} /> Browse Dining
        </button>
      </div>

      {/* Day overview */}
      {dayItems.length === 0 ? (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-sm">No items planned for this day yet.</p>
          <p className="text-xs mt-1">Use the buttons above to browse attractions and dining.</p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* ── Timeline View ────────────────────────────────────────── */
        <TimelineView items={dayItems} onRemove={removeItineraryItem} />
      ) : (
        /* ── List View ────────────────────────────────────────────── */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={dayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {attractions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5 px-1">Attractions ({attractions.length})</p>
                  {attractions.map((item) => (
                    <SortableItem key={item.id} item={item} onRemove={removeItineraryItem} />
                  ))}
                </div>
              )}
              {meals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1.5 mt-3 px-1">Dining ({meals.length})</p>
                  {meals.map((item) => (
                    <SortableItem key={item.id} item={item} onRemove={removeItineraryItem} />
                  ))}
                </div>
              )}
              {others.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 mt-3 px-1">Other ({others.length})</p>
                  {others.map((item) => (
                    <SortableItem key={item.id} item={item} onRemove={removeItineraryItem} />
                  ))}
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add show / break / event */}
      {showOtherForm ? (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">Add Show / Break / Event</h3>
            <button onClick={() => setShowOtherForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
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
                {OTHER_TYPES.map((t) => (
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
              placeholder="e.g. Festival of Fantasy Parade"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Optional..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddOther}
              disabled={!newName.trim()}
              className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              Add to Itinerary
            </button>
            <button
              onClick={() => setShowOtherForm(false)}
              className="bg-gray-100 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowOtherForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-white border border-dashed border-gray-300 text-gray-500 rounded-xl py-2.5 text-sm font-medium hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <Plus size={16} /> Add Show / Break / Event
        </button>
      )}
    </div>
  );
}
