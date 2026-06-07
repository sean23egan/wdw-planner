import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import type { DVCStayOption } from '../types';
import { formatCurrency } from '../utils/budget';
import { addDays } from '../utils/dates';

const TABS = ['DVC Points', 'Stay Options'] as const;
type Tab = typeof TABS[number];

const ROOM_TYPES: DVCStayOption['roomType'][] = ['Studio', '1BR', '2BR', 'Grand Villa'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Lodging() {
  const [tab, setTab] = useState<Tab>('DVC Points');
  const trip = useStore((s) => s.trip);
  const dvcMembership = useStore((s) => s.dvcMembership);
  const dvcStayOptions = useStore((s) => s.dvcStayOptions);
  const setDVCMembership = useStore((s) => s.setDVCMembership);
  const addDVCStayOption = useStore((s) => s.addDVCStayOption);
  const removeDVCStayOption = useStore((s) => s.removeDVCStayOption);

  const [homeResort, setHomeResort] = useState(dvcMembership?.homeResort ?? '');
  const [currentPts, setCurrentPts] = useState(dvcMembership?.currentPoints?.toString() ?? '');
  const [bankedPts, setBankedPts] = useState(dvcMembership?.bankedPoints?.toString() ?? '');
  const [borrowedPts, setBorrowedPts] = useState(dvcMembership?.borrowedPoints?.toString() ?? '');
  const [useYear, setUseYear] = useState(dvcMembership?.useYearMonth?.toString() ?? '1');

  const [stayResort, setStayResort] = useState('');
  const [stayRoomType, setStayRoomType] = useState<DVCStayOption['roomType']>('Studio');
  const [stayStart, setStayStart] = useState(trip?.startDate ?? '');
  const [stayEnd, setStayEnd] = useState(trip?.endDate ?? '');
  const [stayPoints, setStayPoints] = useState('');
  const [stayCash, setStayCash] = useState('');
  const [stayNotes, setStayNotes] = useState('');

  const handleSaveMembership = () => {
    setDVCMembership({
      homeResort,
      currentPoints: parseInt(currentPts) || 0,
      bankedPoints: parseInt(bankedPts) || 0,
      borrowedPoints: parseInt(borrowedPts) || 0,
      useYearMonth: parseInt(useYear) || 1,
    });
  };

  const handleAddStay = () => {
    if (!stayResort || !stayStart || !stayEnd || !stayPoints) return;
    addDVCStayOption({
      id: generateId(),
      resort: stayResort,
      roomType: stayRoomType,
      startDate: stayStart,
      endDate: stayEnd,
      pointsRequired: parseInt(stayPoints) || 0,
      equivalentCashRate: stayCash ? parseFloat(stayCash) : undefined,
      notes: stayNotes || undefined,
    });
    setStayResort('');
    setStayPoints('');
    setStayCash('');
    setStayNotes('');
  };

  const totalPoints = dvcMembership
    ? dvcMembership.currentPoints + dvcMembership.bankedPoints + dvcMembership.borrowedPoints
    : 0;

  // Booking windows (if trip start date exists)
  const window11 = trip ? addDays(trip.startDate, -335) : null; // ~11 months
  const window7 = trip ? addDays(trip.startDate, -210) : null;  // ~7 months

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Lodging / DVC</h1>

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

      {tab === 'DVC Points' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700">DVC Membership</h2>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Home Resort</label>
              <input
                type="text"
                value={homeResort}
                onChange={(e) => setHomeResort(e.target.value)}
                placeholder="e.g. Beach Club Villas"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Current Points</label>
                <input
                  type="number"
                  value={currentPts}
                  onChange={(e) => setCurrentPts(e.target.value)}
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Banked</label>
                <input
                  type="number"
                  value={bankedPts}
                  onChange={(e) => setBankedPts(e.target.value)}
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Borrowed</label>
                <input
                  type="number"
                  value={borrowedPts}
                  onChange={(e) => setBorrowedPts(e.target.value)}
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Use Year</label>
              <select
                value={useYear}
                onChange={(e) => setUseYear(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <button
              onClick={handleSaveMembership}
              className="w-full bg-blue-700 text-white rounded-lg py-2 font-medium hover:bg-blue-800"
            >
              Save Membership
            </button>
          </div>

          {dvcMembership && (
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h2 className="font-bold text-gray-700">Points Balance</h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Current</div>
                  <div className="text-2xl font-bold text-blue-700">{dvcMembership.currentPoints}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Banked</div>
                  <div className="text-2xl font-bold text-amber-600">{dvcMembership.bankedPoints}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Borrowed</div>
                  <div className="text-2xl font-bold text-purple-600">{dvcMembership.borrowedPoints}</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500">Total Available</div>
                <div className="text-3xl font-bold text-gray-800">{totalPoints} pts</div>
              </div>

              {trip && window11 && window7 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700 text-sm">Booking Windows</h3>
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-600">11-month window (home resort)</span>
                    <span className="font-medium text-blue-700">{window11}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-600">7-month window (any resort)</span>
                    <span className="font-medium text-gray-700">{window7}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'Stay Options' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-gray-700">Add Stay Option</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Resort Name *</label>
                <input
                  type="text"
                  value={stayResort}
                  onChange={(e) => setStayResort(e.target.value)}
                  placeholder="e.g. Beach Club Villas"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Room Type</label>
                <select
                  value={stayRoomType}
                  onChange={(e) => setStayRoomType(e.target.value as DVCStayOption['roomType'])}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Points Required *</label>
                <input
                  type="number"
                  value={stayPoints}
                  onChange={(e) => setStayPoints(e.target.value)}
                  min="0"
                  placeholder="150"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={stayStart}
                  onChange={(e) => setStayStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">End Date</label>
                <input
                  type="date"
                  value={stayEnd}
                  onChange={(e) => setStayEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cash Equivalent / Night</label>
                <input
                  type="number"
                  value={stayCash}
                  onChange={(e) => setStayCash(e.target.value)}
                  placeholder="$450"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <input
                  type="text"
                  value={stayNotes}
                  onChange={(e) => setStayNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleAddStay}
              disabled={!stayResort || !stayPoints}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white rounded-lg py-2 font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              <Plus size={16} /> Add Stay Option
            </button>
          </div>

          {dvcStayOptions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              No stay options added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {dvcStayOptions.map((opt) => {
                const ptDiff = totalPoints - opt.pointsRequired;
                return (
                  <div key={opt.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">{opt.resort}</h3>
                        <p className="text-sm text-gray-500">{opt.roomType} · {opt.startDate} – {opt.endDate}</p>
                      </div>
                      <button onClick={() => removeDVCStayOption(opt.id)} className="text-gray-300 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-2 flex gap-3 text-sm">
                      <span className="font-bold text-blue-700">{opt.pointsRequired} pts required</span>
                      {opt.equivalentCashRate && (
                        <span className="text-gray-500">{formatCurrency(opt.equivalentCashRate)}/night cash</span>
                      )}
                    </div>
                    <div className={`text-xs mt-1 ${ptDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ptDiff >= 0 ? `${ptDiff} pts remaining after` : `${Math.abs(ptDiff)} pts short`}
                    </div>
                    {opt.notes && <p className="text-xs text-gray-400 mt-1">{opt.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
