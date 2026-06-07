import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { ATTRACTIONS } from '../data/attractions';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import type { Park, IntensityLevel } from '../types';
import { isToday } from '../utils/dates';

const PARKS: (Park | 'All')[] = ['All', 'Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom'];
const PARK_ABBR: Record<string, string> = {
  'Magic Kingdom': 'MK',
  'EPCOT': 'EP',
  'Hollywood Studios': 'HS',
  'Animal Kingdom': 'AK',
};

const PARK_COLORS: Record<string, string> = {
  'Magic Kingdom': 'text-purple-700 bg-purple-50',
  'EPCOT': 'text-blue-700 bg-blue-50',
  'Hollywood Studios': 'text-red-700 bg-red-50',
  'Animal Kingdom': 'text-green-700 bg-green-50',
};

const WAIT_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  mild: 'bg-sky-100 text-sky-700',
  moderate: 'bg-orange-100 text-orange-700',
  thrilling: 'bg-red-100 text-red-700',
};

export default function AttractionBrowser() {
  const parkDays = useStore((s) => s.parkDays);
  const itineraryItems = useStore((s) => s.itineraryItems);
  const addItineraryItem = useStore((s) => s.addItineraryItem);

  const [parkFilter, setParkFilter] = useState<Park | 'All'>('All');
  const [search, setSearch] = useState('');
  const [intensityFilter, setIntensityFilter] = useState<IntensityLevel | 'all'>('all');
  const [llOnly, setLlOnly] = useState(false);
  const [heightFilter, setHeightFilter] = useState(false);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  // Get today's (or first available) park day for quick-add
  const sortedDays = [...parkDays].sort((a, b) => a.date.localeCompare(b.date));
  const todayDay = sortedDays.find((d) => isToday(d.date)) ?? sortedDays[0];

  const filtered = ATTRACTIONS.filter((a) => {
    if (parkFilter !== 'All' && a.park !== parkFilter) return false;
    if (llOnly && !a.lightningLaneEligible) return false;
    if (heightFilter && !a.heightRequirementInches) return false;
    if (intensityFilter !== 'all' && a.intensity !== intensityFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.land.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAddToItinerary = (_attractionId: string, attractionName: string) => {
    if (!todayDay) return;
    const existing = itineraryItems.filter((i) => i.parkDayId === todayDay.id);
    addItineraryItem({
      id: generateId(),
      parkDayId: todayDay.id,
      type: 'attraction',
      name: attractionName,
      lightningLane: false,
      sortOrder: existing.length,
    });
    setAddedMsg(attractionName);
    setTimeout(() => setAddedMsg(null), 2000);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Attraction Browser</h1>

      {addedMsg && (
        <div className="bg-green-100 text-green-800 rounded-lg px-4 py-2 text-sm font-medium">
          Added "{addedMsg}" to itinerary!
        </div>
      )}

      {/* Park tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PARKS.map((p) => (
          <button
            key={p}
            onClick={() => setParkFilter(p)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              parkFilter === p
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {p === 'All' ? 'All Parks' : PARK_ABBR[p]}
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search attractions..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={intensityFilter}
            onChange={(e) => setIntensityFilter(e.target.value as IntensityLevel | 'all')}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Intensity</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="thrilling">Thrilling</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-1.5 cursor-pointer">
            <input type="checkbox" checked={llOnly} onChange={(e) => setLlOnly(e.target.checked)} className="rounded" />
            LL Only
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-1.5 cursor-pointer">
            <input type="checkbox" checked={heightFilter} onChange={(e) => setHeightFilter(e.target.checked)} className="rounded" />
            Height Req
          </label>
        </div>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} attractions</p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((attraction) => (
          <div key={attraction.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">{attraction.name}</h3>
                <p className="text-xs text-gray-500">{attraction.land}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${PARK_COLORS[attraction.park]}`}>
                {PARK_ABBR[attraction.park]}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WAIT_COLORS[attraction.waitTimeTier]}`}>
                {attraction.waitTimeTier} wait
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INTENSITY_COLORS[attraction.intensity]}`}>
                {attraction.intensity}
              </span>
              {attraction.lightningLaneEligible && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">⚡ LL</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${attraction.isIndoor ? 'bg-sky-100 text-sky-700' : 'bg-lime-100 text-lime-700'}`}>
                {attraction.isIndoor ? 'Indoor' : 'Outdoor'}
              </span>
              {attraction.heightRequirementInches && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                  {attraction.heightRequirementInches}"
                </span>
              )}
            </div>
            {attraction.description && (
              <p className="text-xs text-gray-500 leading-relaxed">{attraction.description}</p>
            )}
            {todayDay && (
              <button
                onClick={() => handleAddToItinerary(attraction.id, attraction.name)}
                className="flex items-center justify-center gap-1 bg-blue-50 text-blue-700 rounded-lg py-1.5 text-xs font-medium hover:bg-blue-100 transition-colors mt-auto"
              >
                <Plus size={12} /> Add to Itinerary
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
