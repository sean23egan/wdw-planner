import { useState } from 'react';
import { Plus, X, Trash2, CalendarPlus } from 'lucide-react';
import { RESTAURANTS } from '../data/restaurants';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import type { ServiceType, PriceTier } from '../types';

const TABS = ['Restaurants', 'Reservations', 'Snack Guide'] as const;
type Tab = typeof TABS[number];

const SERVICE_COLORS: Record<ServiceType, string> = {
  'table-service': 'bg-blue-100 text-blue-700',
  'quick-service': 'bg-green-100 text-green-700',
  snack: 'bg-amber-100 text-amber-700',
};

const STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Dining() {
  const [tab, setTab] = useState<Tab>('Restaurants');
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all');
  const [priceFilter, setPriceFilter] = useState<PriceTier | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [addResModal, setAddResModal] = useState<string | null>(null); // restaurantId

  const reservations = useStore((s) => s.reservations);
  const addReservation = useStore((s) => s.addReservation);
  const removeReservation = useStore((s) => s.removeReservation);
  const parkDays = useStore((s) => s.parkDays);
  const addItineraryItem = useStore((s) => s.addItineraryItem);
  const itineraryItems = useStore((s) => s.itineraryItems);

  // Reservation form state
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resSize, setResSize] = useState('2');
  const [resConfNum, setResConfNum] = useState('');
  const [resNotes, setResNotes] = useState('');

  // Add-to-itinerary modal state
  const [addItinModal, setAddItinModal] = useState<string | null>(null);
  const [itinDayId, setItinDayId] = useState('');
  const [itinTime, setItinTime] = useState('');

  const locations = Array.from(new Set(RESTAURANTS.map((r) => r.location))).sort();

  const filteredRestaurants = RESTAURANTS.filter((r) => {
    if (tab === 'Snack Guide') return r.serviceType === 'snack';
    if (r.serviceType === 'snack' && tab === 'Restaurants') return false;
    if (serviceFilter !== 'all' && r.serviceType !== serviceFilter) return false;
    if (priceFilter !== 'all' && r.priceTier !== priceFilter) return false;
    if (locationFilter !== 'all' && r.location !== locationFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAddReservation = (restaurantId: string) => {
    if (!resDate || !resTime) return;
    addReservation({
      id: generateId(),
      restaurantId,
      date: resDate,
      time: resTime,
      partySize: parseInt(resSize) || 2,
      confirmationNumber: resConfNum || undefined,
      status: 'confirmed',
      notes: resNotes || undefined,
    });
    setAddResModal(null);
    resetResForm();
  };

  const resetResForm = () => {
    setResDate('');
    setResTime('');
    setResSize('2');
    setResConfNum('');
    setResNotes('');
  };

  const handleAddToItinerary = () => {
    if (!itinDayId || !addItinModal) return;
    const restaurant = RESTAURANTS.find((r) => r.id === addItinModal);
    if (!restaurant) return;
    const existing = itineraryItems.filter((i) => i.parkDayId === itinDayId).length;
    addItineraryItem({
      id: generateId(),
      parkDayId: itinDayId,
      type: 'meal',
      name: restaurant.name,
      time: itinTime || undefined,
      lightningLane: false,
      sortOrder: existing,
      notes: restaurant.location,
    });
    setAddItinModal(null);
    setItinDayId('');
    setItinTime('');
  };

  const sortedReservations = [...reservations].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Dining</h1>

      {/* Tabs */}
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

      {/* Restaurant / Snack tab */}
      {(tab === 'Restaurants' || tab === 'Snack Guide') && (
        <div className="space-y-3">
          {tab === 'Restaurants' && (
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants..."
                className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value as ServiceType | 'all')}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="table-service">Table Service</option>
                <option value="quick-service">Quick Service</option>
              </select>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as PriceTier | 'all')}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Any Price</option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
                <option value="$$$$">$$$$</option>
              </select>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Locations</option>
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredRestaurants.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{r.name}</h3>
                    <p className="text-xs text-gray-500">{r.location}</p>
                  </div>
                  <span className="font-bold text-gray-600 text-sm">{r.priceTier}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SERVICE_COLORS[r.serviceType]}`}>
                    {r.serviceType.replace('-', ' ')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.cuisine}</span>
                  {r.dietaryTags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">{tag}</span>
                  ))}
                </div>
                {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                <div className="flex gap-2 mt-auto">
                  {r.serviceType !== 'snack' && (
                    <button
                      onClick={() => setAddResModal(r.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-700 rounded-lg py-1.5 text-xs font-medium hover:bg-blue-100"
                    >
                      <Plus size={12} /> Reservation
                    </button>
                  )}
                  {parkDays.length > 0 && (
                    <button
                      onClick={() => { setAddItinModal(r.id); setItinDayId(parkDays[0].id); }}
                      className="flex-1 flex items-center justify-center gap-1 bg-orange-50 text-orange-700 rounded-lg py-1.5 text-xs font-medium hover:bg-orange-100"
                    >
                      <CalendarPlus size={12} /> Itinerary
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservations tab */}
      {tab === 'Reservations' && (
        <div className="space-y-3">
          <button
            onClick={() => setAddResModal('manual')}
            className="flex items-center gap-2 bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-800"
          >
            <Plus size={16} /> Add Reservation
          </button>

          {sortedReservations.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              No reservations yet.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedReservations.map((res) => {
                const restaurant = RESTAURANTS.find((r) => r.id === res.restaurantId);
                return (
                  <div key={res.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">{restaurant?.name ?? 'Restaurant'}</h3>
                        <p className="text-sm text-gray-500">
                          {res.date} at {res.time} · Party of {res.partySize}
                        </p>
                        {res.confirmationNumber && (
                          <p className="text-xs text-gray-400">Conf: {res.confirmationNumber}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[res.status]}`}>
                          {res.status}
                        </span>
                        <button onClick={() => removeReservation(res.id)} className="text-gray-300 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {res.notes && <p className="text-xs text-gray-500 mt-1">{res.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add to Itinerary Modal */}
      {addItinModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Add to Itinerary</h3>
              <button onClick={() => { setAddItinModal(null); setItinDayId(''); setItinTime(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {RESTAURANTS.find((r) => r.id === addItinModal)?.name}
            </p>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Park Day *</label>
              <select
                value={itinDayId}
                onChange={(e) => setItinDayId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {parkDays.map((d) => (
                  <option key={d.id} value={d.id}>{d.date} — {d.park}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Time (optional)</label>
              <input type="time" value={itinTime} onChange={(e) => setItinTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <button
              onClick={handleAddToItinerary}
              disabled={!itinDayId}
              className="w-full bg-orange-500 text-white rounded-lg py-2.5 font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              Add to Itinerary
            </button>
          </div>
        </div>
      )}

      {/* Add Reservation Modal */}
      {addResModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Add Reservation</h3>
              <button onClick={() => { setAddResModal(null); resetResForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            {addResModal === 'manual' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Restaurant Name</label>
                <input
                  type="text"
                  placeholder="Restaurant name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {addResModal !== 'manual' && (
              <p className="text-sm font-medium text-gray-700">
                {RESTAURANTS.find((r) => r.id === addResModal)?.name}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Date *</label>
                <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Time *</label>
                <input type="time" value={resTime} onChange={(e) => setResTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Party Size</label>
                <input type="number" value={resSize} min="1" max="20" onChange={(e) => setResSize(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Conf #</label>
                <input type="text" value={resConfNum} onChange={(e) => setResConfNum(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
              <input type="text" value={resNotes} onChange={(e) => setResNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button
              onClick={() => handleAddReservation(addResModal)}
              disabled={!resDate || !resTime}
              className="w-full bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              Save Reservation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
