import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, DollarSign, CheckSquare, MapPin, ChevronRight, Plus, Clock,
  Utensils, CloudSun, Heart,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { daysUntil, formatDate, isTripActive } from '../utils/dates';
import { totalActual, totalPlanned, formatCurrency } from '../utils/budget';
import { parseISO, addDays, differenceInDays } from 'date-fns';
import { format } from 'date-fns';
import { loadTripSnapshot, saveTripSnapshot } from '../lib/sync';
import { parkDayDisplay, travelTagLabel } from '../utils/parkDay';
import { generateId } from '../utils/ids';

// ── Seasonal Orlando weather averages ────────────────────────────────────────
const SEASONAL_WEATHER: Record<number, { hi: number; lo: number; label: string; icon: string }> = {
  1:  { hi: 72, lo: 50, label: 'Cool & mostly sunny',        icon: '☀️' },
  2:  { hi: 74, lo: 52, label: 'Mild & sunny',               icon: '☀️' },
  3:  { hi: 79, lo: 57, label: 'Warm & sunny',               icon: '🌤️' },
  4:  { hi: 84, lo: 63, label: 'Warm, light breeze',         icon: '🌤️' },
  5:  { hi: 89, lo: 68, label: 'Hot, afternoon storms',      icon: '⛈️' },
  6:  { hi: 92, lo: 74, label: 'Hot & humid, daily storms',  icon: '⛈️' },
  7:  { hi: 92, lo: 75, label: 'Hottest month, heavy storms',icon: '🌧️' },
  8:  { hi: 92, lo: 75, label: 'Hot & humid, storms',        icon: '🌧️' },
  9:  { hi: 89, lo: 73, label: 'Hot, still stormy',          icon: '⛈️' },
  10: { hi: 84, lo: 65, label: 'Pleasant, less rain',        icon: '🌤️' },
  11: { hi: 79, lo: 58, label: 'Comfortable, light crowds',  icon: '☀️' },
  12: { hi: 73, lo: 52, label: 'Cool & festive',             icon: '❄️' },
};

// ── Crowd level model ─────────────────────────────────────────────────────────
function getCrowdLevel(dateStr: string): { level: 'low' | 'moderate' | 'high' | 'very-high'; label: string; color: string } {
  const d = parseISO(dateStr);
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  const dow = d.getDay(); // 0=Sun

  // Very high crowd periods
  const isChristmasNewYear = (month === 12 && day >= 26) || (month === 1 && day <= 3);
  const isThanksgiving = month === 11 && day >= 23 && day <= 30;
  const isSpringBreakPeak = month === 3 && day >= 15 || (month === 4 && day <= 15);
  const isFourthJuly = month === 7 && day >= 1 && day <= 7;
  if (isChristmasNewYear || isThanksgiving || isSpringBreakPeak || isFourthJuly) {
    return { level: 'very-high', label: 'Very Busy 🔴', color: 'text-red-600 bg-red-50' };
  }

  // High: peak summer + holiday weekends
  const isSummer = month >= 6 && month <= 8;
  const isMemorial = month === 5 && day >= 25 && day <= 31;
  const isLabor = month === 9 && day <= 7;
  const isEasterWeek = month === 4 && day >= 1 && day <= 14;
  if (isSummer || isMemorial || isLabor || isEasterWeek) {
    return { level: 'high', label: 'Busy 🟠', color: 'text-orange-600 bg-orange-50' };
  }

  // Low: Jan (post-holiday), first weeks of Sep & Nov
  const isJanLight = month === 1 && day >= 7;
  const isSepLight = month === 9 && day >= 10;
  const isNovLight = month === 11 && day <= 18;
  const isEarlyMay = month === 5 && day <= 20;
  if (isJanLight || isSepLight || isNovLight || isEarlyMay) {
    return { level: 'low', label: 'Light Crowds 🟢', color: 'text-green-700 bg-green-50' };
  }

  // Weekends generally busier
  if (dow === 0 || dow === 6) {
    return { level: 'moderate', label: 'Moderate 🟡', color: 'text-amber-600 bg-amber-50' };
  }
  return { level: 'moderate', label: 'Moderate 🟡', color: 'text-amber-600 bg-amber-50' };
}

// Best park recommendation by crowd model (simple heuristic by day of week)
const PARK_TIP_BY_DOW: Record<number, string> = {
  0: 'EPCOT or Animal Kingdom tend to have shorter waits on Sundays',
  1: 'Magic Kingdom is popular Mondays — try EPCOT or AK instead',
  2: 'Hollywood Studios waits ease up mid-week',
  3: 'Great day for EPCOT — festivals, World Showcase & shorter LL lines',
  4: 'Animal Kingdom at rope drop, then hop to HS for evening',
  5: 'Magic Kingdom evenings have the best parade & fireworks crowd energy',
  6: 'Saturdays are busiest at MK — consider EPCOT or off-peak parks',
};

export default function Dashboard() {
  const trip = useStore((s) => s.trip);
  const parkDays = useStore((s) => s.parkDays);
  const budgetCategories = useStore((s) => s.budgetCategories);
  const expenses = useStore((s) => s.expenses);
  const preTripTasks = useStore((s) => s.preTripTasks);
  const tripSummaries = useStore((s) => s.tripSummaries);
  const createNewTrip = useStore((s) => s.createNewTrip);
  const switchToTrip = useStore((s) => s.switchToTrip);
  const getSnapshot = useStore((s) => s.getSnapshot);
  const addExpense = useStore((s) => s.addExpense);
  const navigate = useNavigate();
  const [switching, setSwitching] = useState<string | null>(null);

  // Daily spending tracker state
  const [spendAmount, setSpendAmount] = useState('');
  const [spendCat, setSpendCat] = useState('');
  const [spendNote, setSpendNote] = useState('');
  const [spendAdded, setSpendAdded] = useState(false);

  const handleSwitchTrip = async (targetId: string) => {
    if (targetId === trip?.id) return;
    setSwitching(targetId);
    if (trip) {
      const snapshot = getSnapshot();
      await saveTripSnapshot(trip.id, snapshot);
    }
    const snapshot = await loadTripSnapshot(targetId);
    if (snapshot) switchToTrip(snapshot);
    setSwitching(null);
    navigate('/');
  };

  const handleNewTrip = () => {
    createNewTrip();
    navigate('/setup');
  };

  const handleLogSpend = () => {
    const amount = parseFloat(spendAmount);
    if (!amount || amount <= 0 || !spendCat) return;
    addExpense({
      id: generateId(),
      categoryId: spendCat,
      amount,
      date: format(new Date(), 'yyyy-MM-dd'),
      description: spendNote || 'In-park expense',
    });
    setSpendAmount('');
    setSpendNote('');
    setSpendAdded(true);
    setTimeout(() => setSpendAdded(false), 2000);
  };

  const otherTrips = tripSummaries.filter((s) => s.id !== trip?.id);

  if (!trip) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-6xl mb-4">🏰</span>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to WDW Planner</h1>
          <p className="text-gray-500 mb-6">Set up your trip to start planning your magical vacation.</p>
          <Link to="/setup" className="bg-blue-700 text-white rounded-lg px-6 py-3 font-medium hover:bg-blue-800 transition-colors">
            Set Up Your Trip
          </Link>
        </div>
        {otherTrips.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={16} /> Past Trips</h2>
            {otherTrips.map((s) => (
              <button key={s.id} onClick={() => handleSwitchTrip(s.id)} disabled={switching === s.id}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50">
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
  const today = format(new Date(), 'yyyy-MM-dd');

  // ADR countdown: dining reservations open 60 days before trip start
  const adrOpenDate = format(addDays(parseISO(trip.startDate), -60), 'yyyy-MM-dd');
  const daysToADR = differenceInDays(parseISO(adrOpenDate), parseISO(today));

  // Upcoming pre-trip tasks
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

  // Today's park day
  const todayParkDay = parkDays.find((d) => d.date === today);

  // Daily spending
  const todayExpenses = expenses.filter((e) => e.date === today);
  const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

  // Weather for trip month
  const tripMonth = parseISO(trip.startDate).getMonth() + 1;
  const weather = SEASONAL_WEATHER[tripMonth];

  // Crowd levels for park days
  const sortedParkDays = [...parkDays].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingDays = sortedParkDays.filter((d) => d.date >= today).slice(0, 4);

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

      {/* ADR Countdown — show when upcoming */}
      {daysLeft > 0 && daysToADR >= 0 && (
        <div className={`rounded-xl p-4 flex items-center justify-between border ${daysToADR <= 7 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <Utensils size={20} className={daysToADR <= 7 ? 'text-amber-600' : 'text-blue-700'} />
            <div>
              <p className="font-semibold text-gray-800 text-sm">ADR Booking Window</p>
              <p className="text-xs text-gray-500">Dining reservations open 60 days before check-in</p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-3">
            {daysToADR === 0 ? (
              <span className="text-amber-700 font-bold text-sm">Opens TODAY</span>
            ) : (
              <>
                <span className={`text-2xl font-bold ${daysToADR <= 7 ? 'text-amber-700' : 'text-blue-700'}`}>{daysToADR}</span>
                <p className="text-xs text-gray-500">days to go</p>
              </>
            )}
          </div>
        </div>
      )}
      {daysLeft > 0 && daysToADR < 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3 bg-green-50 border border-green-200">
          <Utensils size={20} className="text-green-700 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">ADR Booking is Open! 🎉</p>
            <p className="text-xs text-green-700">60-day window is active — book your dining reservations now.</p>
          </div>
          <Link to="/dining" className="ml-auto text-green-700 text-sm font-medium hover:text-green-800 shrink-0 flex items-center gap-1">
            Dining <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Daily Spending Tracker (active trip) */}
      {tripActive && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <DollarSign size={18} className="text-green-600" /> Today's Spending
            </h2>
            <span className="text-lg font-bold text-gray-800">{formatCurrency(todayTotal)}</span>
          </div>
          {spendAdded && <p className="text-xs text-green-700 font-medium">✓ Expense logged!</p>}
          <div className="flex gap-2 flex-wrap">
            <input
              type="number" min="0" step="0.01" placeholder="$0.00" value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={spendCat}
              onChange={(e) => setSpendCat(e.target.value)}
              className="flex-1 min-w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Category…</option>
              {budgetCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <input
              type="text" placeholder="Note (optional)" value={spendNote}
              onChange={(e) => setSpendNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogSpend()}
              className="flex-1 min-w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleLogSpend}
              disabled={!spendAmount || !spendCat}
              className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>
          {todayExpenses.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {todayExpenses.slice().reverse().map((e) => {
                const cat = budgetCategories.find((c) => c.id === e.categoryId);
                return (
                  <div key={e.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                    <span>{cat?.icon} {e.description}</span>
                    <span className="font-medium">{formatCurrency(e.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <Link to="/budget" className="text-blue-700 text-xs flex items-center gap-1">
            Full budget breakdown <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {/* Today's park day (if active) */}
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
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${parkDayDisplay(todayParkDay).colorClass}`}>
              {parkDayDisplay(todayParkDay).label}
            </span>
            {travelTagLabel(todayParkDay.travelTag) && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-sky-100 text-sky-700">{travelTagLabel(todayParkDay.travelTag)}</span>
            )}
          </div>
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
                      due < 0 ? 'bg-red-100 text-red-700' : due <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
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

      {/* Weather & Crowd Calendar */}
      {parkDays.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <CloudSun size={18} className="text-sky-600" /> Park Outlook
            </h2>
          </div>
          {/* Seasonal weather */}
          <div className="flex items-center gap-3 bg-sky-50 rounded-lg px-3 py-2.5 border border-sky-100">
            <span className="text-2xl">{weather.icon}</span>
            <div>
              <p className="text-sm font-medium text-sky-900">{weather.label}</p>
              <p className="text-xs text-sky-700">Typical for {format(parseISO(trip.startDate), 'MMMM')} — High {weather.hi}°F / Low {weather.lo}°F</p>
            </div>
          </div>
          {/* Crowd levels for upcoming days */}
          {upcomingDays.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estimated Crowd Levels</p>
              {upcomingDays.map((d) => {
                const crowd = getCrowdLevel(d.date);
                const display = parkDayDisplay(d);
                return (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-24 shrink-0 text-xs">{formatDate(d.date)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${display.colorClass}`}>{display.abbr}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${crowd.color}`}>{crowd.label}</span>
                  </div>
                );
              })}
              {upcomingDays.length > 0 && (
                <p className="text-xs text-gray-400 italic mt-1">
                  💡 {PARK_TIP_BY_DOW[parseISO(upcomingDays[0].date).getDay()]}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
              .slice().sort((a, b) => a.date.localeCompare(b.date))
              .map((day) => (
                <div key={day.id} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">{formatDate(day.date)}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${parkDayDisplay(day).colorClass}`}>
                    {parkDayDisplay(day).abbr}
                  </span>
                  <span className="text-gray-700 truncate">{parkDayDisplay(day).label}</span>
                  {!day.noPark && day.isHopDay && day.hopToPark && (
                    <span className="text-gray-400">→ {day.hopToPark}</span>
                  )}
                  {travelTagLabel(day.travelTag) && (
                    <span className="text-xs text-sky-600">{travelTagLabel(day.travelTag)}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Wish List teaser */}
      <Link to="/wishlist" className="block bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4 hover:border-pink-300 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart size={20} className="text-rose-500" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">Group Wish List</p>
              <p className="text-xs text-gray-500">Vote on must-do attractions & dining with your party</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      </Link>

      {/* My Trips */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-blue-700" /> My Trips
          </h2>
          <button onClick={handleNewTrip} className="flex items-center gap-1 text-sm text-blue-700 font-medium hover:text-blue-800">
            <Plus size={14} /> New Trip
          </button>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-700 text-white px-1.5 py-0.5 rounded font-medium">Active</span>
            <span className="font-medium text-gray-800 text-sm">{trip.name}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}{trip.resortName ? ` · ${trip.resortName}` : ''}
          </div>
        </div>
        {otherTrips.length > 0 ? (
          <div className="space-y-2">
            {otherTrips.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((s) => (
              <button key={s.id} onClick={() => handleSwitchTrip(s.id)} disabled={switching === s.id}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50">
                <div>
                  <div className="font-medium text-gray-800 text-sm">{s.name}</div>
                  <div className="text-xs text-gray-500">{formatDate(s.startDate)} – {formatDate(s.endDate)}{s.resortName ? ` · ${s.resortName}` : ''}</div>
                </div>
                {switching === s.id
                  ? <span className="text-xs text-blue-600 animate-pulse shrink-0">Loading…</span>
                  : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
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
