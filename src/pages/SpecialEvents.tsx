import { useState } from 'react';
import { Plus, Trash2, CalendarPlus } from 'lucide-react';
import { SPECIAL_EVENTS_CATALOG, WDW_TOURS_CATALOG } from '../data/specialEvents';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import type { SpecialEvent } from '../types';
import { formatCurrency } from '../utils/budget';

const TABS = ['Event Finder', 'Tours', 'My Events'] as const;
type Tab = typeof TABS[number];

const TYPE_COLORS: Record<SpecialEvent['type'], string> = {
  'hard-ticket-party': 'bg-purple-100 text-purple-700',
  'after-hours': 'bg-blue-100 text-blue-700',
  festival: 'bg-green-100 text-green-700',
  tour: 'bg-amber-100 text-amber-700',
};

export default function SpecialEvents() {
  const [tab, setTab] = useState<Tab>('Event Finder');
  const trip = useStore((s) => s.trip);
  const specialEvents = useStore((s) => s.specialEvents);
  const addSpecialEvent = useStore((s) => s.addSpecialEvent);
  const removeSpecialEvent = useStore((s) => s.removeSpecialEvent);
  const parkDays = useStore((s) => s.parkDays);
  const addItineraryItem = useStore((s) => s.addItineraryItem);
  const itineraryItems = useStore((s) => s.itineraryItems);
  const budgetCategories = useStore((s) => s.budgetCategories);
  const updateBudgetCategory = useStore((s) => s.updateBudgetCategory);

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Check overlap with trip dates
  const eventOverlaps = (event: typeof SPECIAL_EVENTS_CATALOG[0]) => {
    if (!trip) return false;
    return event.dates.some((d) => d >= trip.startDate && d <= trip.endDate);
  };

  const handleAddToTrip = (event: typeof SPECIAL_EVENTS_CATALOG[0]) => {
    addSpecialEvent({
      id: generateId(),
      name: event.name,
      type: event.type,
      dates: event.dates,
      affectedPark: event.affectedPark,
      ticketCost: event.ticketCost,
      notes: event.notes,
      festivalBoothNotes: event.festivalBoothNotes,
    });
    setAddedIds((prev) => new Set([...prev, event.id]));

    // Update budget
    if (event.ticketCost) {
      const cat = budgetCategories.find((c) => c.id === 'bc-events' || c.name.toLowerCase().includes('event'));
      if (cat) {
        updateBudgetCategory(cat.id, { plannedAmount: cat.plannedAmount + event.ticketCost });
      }
    }
  };

  const handleAddToItinerary = (event: SpecialEvent) => {
    const matchingDay = parkDays.find((d) =>
      event.dates.includes(d.date) && d.park === event.affectedPark
    );
    if (!matchingDay) {
      // Add to first available day
      const firstDay = parkDays[0];
      if (!firstDay) return;
      const existing = itineraryItems.filter((i) => i.parkDayId === firstDay.id);
      addItineraryItem({
        id: generateId(),
        parkDayId: firstDay.id,
        type: 'event',
        name: event.name,
        lightningLane: false,
        sortOrder: existing.length,
        notes: event.notes,
      });
    } else {
      const existing = itineraryItems.filter((i) => i.parkDayId === matchingDay.id);
      addItineraryItem({
        id: generateId(),
        parkDayId: matchingDay.id,
        type: 'event',
        name: event.name,
        lightningLane: false,
        sortOrder: existing.length,
        notes: event.notes,
      });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Special Events</h1>

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
            {t === 'My Events' && specialEvents.length > 0 && (
              <span className="ml-1 bg-blue-700 text-white text-xs px-1.5 py-0.5 rounded-full">{specialEvents.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Event Finder' && (
        <div className="space-y-3">
          {SPECIAL_EVENTS_CATALOG.map((event) => {
            const overlaps = eventOverlaps(event);
            const alreadyAdded = addedIds.has(event.id) || specialEvents.some((e) => e.name === event.name);
            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl shadow-sm p-4 border-2 ${overlaps ? 'border-amber-300' : 'border-gray-100'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800">{event.name}</h3>
                      {overlaps && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Overlaps your trip!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.type]}`}>
                        {event.type.replace(/-/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">{event.affectedPark}</span>
                      {event.ticketCost && (
                        <span className="text-xs font-medium text-gray-700">{formatCurrency(event.ticketCost)}/ticket</span>
                      )}
                    </div>
                    {event.notes && <p className="text-xs text-gray-500 mt-1">{event.notes}</p>}
                    {event.festivalBoothNotes && (
                      <p className="text-xs text-blue-600 mt-1">🍴 {event.festivalBoothNotes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToTrip(event)}
                    disabled={alreadyAdded}
                    className={`shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      alreadyAdded
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-700 text-white hover:bg-blue-800'
                    }`}
                  >
                    <Plus size={12} />
                    {alreadyAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'Tours' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Tours run year-round (some seasonal). Book directly at DisneyWorld.com or call (407) 939-8687. Prices shown are per person unless noted.
          </p>
          {WDW_TOURS_CATALOG.map((tour) => {
            const alreadyAdded = addedIds.has(tour.id) || specialEvents.some((e) => e.name === tour.name);
            return (
              <div key={tour.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800">{tour.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[tour.type]}`}>tour</span>
                      <span className="text-xs text-gray-500">{tour.affectedPark}</span>
                      {tour.ticketCost && (
                        <span className="text-xs font-medium text-gray-700">{formatCurrency(tour.ticketCost)}</span>
                      )}
                    </div>
                    {tour.notes && <p className="text-xs text-gray-500 mt-1">{tour.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleAddToTrip(tour)}
                    disabled={alreadyAdded}
                    className={`shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      alreadyAdded
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}
                  >
                    <Plus size={12} />
                    {alreadyAdded ? 'Added' : 'Add to Trip'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'My Events' && (
        <div className="space-y-3">
          {specialEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              No events added yet. Browse the Event Finder tab.
            </div>
          ) : (
            specialEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{event.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.type]}`}>
                        {event.type.replace(/-/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">{event.affectedPark}</span>
                      {event.ticketCost && (
                        <span className="text-xs font-bold text-gray-700">{formatCurrency(event.ticketCost)}/ticket</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => removeSpecialEvent(event.id)} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>

                {event.notes && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">{event.notes}</p>
                )}
                {event.festivalBoothNotes && (
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-blue-700 font-medium">Marketplace Notes:</p>
                    <p className="text-xs text-blue-600 mt-0.5">{event.festivalBoothNotes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddToItinerary(event)}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100"
                  >
                    <CalendarPlus size={12} /> Add to Itinerary
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
