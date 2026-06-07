import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, CheckSquare, MapPin, ChevronRight, Plus, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { daysUntil, formatDate, isTripActive } from '../utils/dates';
import { totalActual, totalPlanned, formatCurrency } from '../utils/budget';
import { parseISO, addDays } from 'date-fns';
import { format } from 'date-fns';
import { loadTripSnapshot, saveTripSnapshot } from '../lib/sync';

const PARK_COLORS: Record<string, string> = {
  'Magic Kingdom': 'bg-purple-100 text-purple-800',
  'EPCOT': 'bg-blue-100 text-blue-800',
  'Hollywood Studios': 'bg-red-100 text-red-800',
  'Animal Kingdom': 'bg-green-100 text-green-800',
};

export default function Dashboard() {
  const trip = useStore((s) => s.trip);
  const parkDays = useStore((s) => s.parkDays);
  const budgetCategories = useStore((s) => s.budgetCategories);
  const preTripTasks = useStore((s) => s.preTripTasks);
  const tripSummaries = useStore((s) => s.tripSummaries);
  const createNewTrip = useStore((s) => s.createNewTrip);
  const switchToTrip = useStore((s) => s.switchToTrip);
  const getSnapshot = useStore((s) => s.getSnapshot);
  const navigate = useNavigate();
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitchTrip = async (targetId: string) => {
    if (targetId === trip?.id) return;
    setSwitching(targetId);
    // Save current trip before switching
    if (trip) {
      const snapshot = getSnapshot();
      await saveTripSnapshot(trip.id, snapshot);
    }
    // Load target trip
    const snapshot = await loadTripSnapshot(targetId);
    if (snapshot) switchToTrip(snapshot);
    setSwitching(null);
    navigate('/');
  };

  const handleNewTrip = () => {
    createNewTrip();
    navigate('/setup');
  };

  const otherTrips = tripSummaries.filter((s) => s.id !== trip?.id);

  if (!trip) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-6xl mb-4">🏰</span>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to WDW Planner</h1>
          <p className="text-gray-500 mb-6">Set up your trip to start planning your magical vacation.</p>
          <Link
            to="/setup"
            className="bg-blue-700 text-white rounded-lg px-6 py-3 font-medium hover:bg-blue-800 transition-colors"
          >
            Set Up Your Trip
          </Link>
        </div>
        {otherTrips.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={16} /> Past Trips</h2>
            {otherTrips.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSwitchTrip(s.id)}
                disabled={switching === s.id}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <div>
                  <div className="font-medium text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-500">{formatDate(s.startDate)} – {formatDate(s.endDate)}{s.resortName ? ` · ${s.resortName}` : ''}</div>
                </div>
                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const daysLeft = daysUntil(trip.startDate);
  const tripActive = isTripActive(trip.startDate, trip.endDate);
  const planned = totalPlanned(budgetCategories);
  const actual = totalActual(budgetCategories);
  const budgetPct = trip.overallBudget > 0 ? Math.min(100, (actual / trip.overallBudget) * 100) : 0;

  // Upcoming pre-trip tasks — compute due dates and sort
  const tasksWithDue = preTripTasks
    .filter((t) => !t.done)
    .map((t) => {
      const dueDate = t.daysBeforeTrip
        ? format(addDays(parseISO(trip.startDate), -t.daysBeforeTrip), 'yyyy-MM-dd')
        : t.dueDate;
      return { ...t, computedDue: dueDate };
    })
    .filter((t) => t.computedDue)
    .sort((a, b) => (a.computedDue! > b.computedDue! ? 1 : -1))
    .slice(0, 3);

  // Today's park day (if trip active)
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayParkDay = parkDays.find((d) => d.date === today);

  return (
    <div className="space-y-4">
      {/* Hero countdown */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-1">{trip.name}</h1>
        <p className="text-blue-200 mb-4">
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          {trip.resortName && ` · ${trip.resortName}`}
        </p>
        {tripActive ? (
          <div className="bg-white/20 rounded-xl px-4 py-3 inline-block">
            <span className="text-2xl font-bold">Trip is happening now! 🎉</span>
          </div>
        ) : daysLeft >= 0 ? (
          <div className="bg-amber-400 text-blue-900 rounded-xl px-4 py-3 inline-block">
            <span className="text-4xl font-bold">{daysLeft}</span>
            <span className="text-lg font-semibold ml-2">days until magic!</span>
          </div>
        ) : (
          <div className="bg-white/20 rounded-xl px-4 py-3 inline-block">
            <span className="text-lg font-medium">Trip has ended — great memories!</span>
          </div>
        )}
        <div className="mt-3 text-blue-200 text-sm">
          {trip.partyMembers.length} traveler{trip.partyMembers.length !== 1 ? 's' : ''} ·{' '}
          {parkDays.length} park day{parkDays.length !== 1 ? 's' : ''} planned
        </div>
      </div>

      {/* Today's itinerary (if active) */}
      {tripActive && todayParkDay && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Calendar size={18} className="text-blue-700" /> Today
            </h2>
            <Link to="/itinerary" className="text-blue-700 text-sm flex items-center gap-1">
              View <ChevronRight size={14} />
            </Link>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${PARK_COLORS[todayParkDay.park]}`}>
            {todayParkDay.park}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Budget snapshot */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <DollarSign size={18} className="text-green-600" /> Budget
            </h2>
            <Link to="/budget" className="text-blue-700 text-sm flex items-center gap-1">
              Details <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{formatCurrency(actual)} spent</span>
              <span>{formatCurrency(trip.overallBudget)} budget</span>
            </div>
            <div className="bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{budgetPct.toFixed(0)}% of budget used</div>
          </div>
          {planned > 0 && (
            <div className="text-sm text-gray-600">
              {formatCurrency(planned)} planned · {formatCurrency(Math.max(0, trip.overallBudget - actual))} remaining
            </div>
          )}
        </div>

        {/* Pre-trip tasks */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <CheckSquare size={18} className="text-amber-500" /> Upcoming Tasks
            </h2>
            <Link to="/packing" className="text-blue-700 text-sm flex items-center gap-1">
              All <ChevronRight size={14} />
            </Link>
          </div>
          {tasksWithDue.length === 0 ? (
            <p className="text-gray-400 text-sm">All caught up! ✓</p>
          ) : (
            <ul className="space-y-2">
              {tasksWithDue.map((task) => {
                const due = daysUntil(task.computedDue!);
                return (
                  <li key={task.id} className="flex items-start gap-2 text-sm">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 shrink-0 ${
                      due < 0 ? 'bg-red-100 text-red-700' :
                      due <= 7 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {due < 0 ? 'Overdue' : due === 0 ? 'Today' : `${due}d`}
                    </span>
                    <span className="text-gray-700">{task.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Park days */}
      {parkDays.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <MapPin size={18} className="text-blue-700" /> Park Days
            </h2>
            <Link to="/itinerary" className="text-blue-700 text-sm flex items-center gap-1">
              Itinerary <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {parkDays
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((day) => (
                <div key={day.id} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">{formatDate(day.date)}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PARK_COLORS[day.park]}`}>
                    {day.park === 'Hollywood Studios' ? 'HS' :
                     day.park === 'Magic Kingdom' ? 'MK' :
                     day.park === 'Animal Kingdom' ? 'AK' : 'EP'}
                  </span>
                  <span className="text-gray-700 truncate">{day.park}</span>
                  {day.isHopDay && day.hopToPark && (
                    <span className="text-gray-400">→ {day.hopToPark}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* My Trips */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-blue-700" /> My Trips
          </h2>
          <button
            onClick={handleNewTrip}
            className="flex items-center gap-1 text-sm text-blue-700 font-medium hover:text-blue-800"
          >
            <Plus size={14} /> New Trip
          </button>
        </div>

        {/* Current trip highlighted */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-700 text-white px-1.5 py-0.5 rounded font-medium">Active</span>
            <span className="font-medium text-gray-800 text-sm">{trip.name}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 ml-0">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            {trip.resortName ? ` · ${trip.resortName}` : ''}
          </div>
        </div>

        {/* Other trips */}
        {otherTrips.length > 0 ? (
          <div className="space-y-2">
            {otherTrips
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSwitchTrip(s.id)}
                  disabled={switching === s.id}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{s.name}</div>
                    <div className="text-xs text-gray-500">{formatDate(s.startDate)} – {formatDate(s.endDate)}{s.resortName ? ` · ${s.resortName}` : ''}</div>
                  </div>
                  {switching === s.id
                    ? <span className="text-xs text-blue-600 animate-pulse shrink-0">Loading…</span>
                    : <ChevronRight size={16} className="text-gray-400 shrink-0" />
                  }
                </button>
              ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No other trips yet. Use "New Trip" to start planning another.</p>
        )}
      </div>
    </div>
  );
}
