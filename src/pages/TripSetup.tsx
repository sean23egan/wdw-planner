import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ChevronDown, Mail, UserPlus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { generateId } from '../utils/ids';
import { tripDateRange } from '../utils/dates';
import { sendTripInvite } from '../lib/sync';
import type { Park, PartyMember, ParkDay, DiningCounts, LLChoice } from '../types';

const PARKS: Park[] = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom'];

const RESORT_OPTIONS = [
  { group: 'Value Resorts', options: [
    "All-Star Movies Resort",
    "All-Star Music Resort",
    "All-Star Sports Resort",
    "Art of Animation Resort",
    "Pop Century Resort",
  ]},
  { group: 'Moderate Resorts', options: [
    "Caribbean Beach Resort",
    "Coronado Springs Resort",
    "Fort Wilderness Resort & Campground",
    "Port Orleans Resort — French Quarter",
    "Port Orleans Resort — Riverside",
  ]},
  { group: 'Deluxe Resorts', options: [
    "Animal Kingdom Lodge",
    "Animal Kingdom Lodge — Kidani Village",
    "Bay Lake Tower at Contemporary Resort",
    "Beach Club Resort",
    "Beach Club Villas",
    "BoardWalk Inn",
    "BoardWalk Villas",
    "Contemporary Resort",
    "Grand Floridian Resort & Spa",
    "Polynesian Village Resort",
    "Wilderness Lodge",
    "Yacht Club Resort",
  ]},
  { group: 'DVC Resorts', options: [
    "Boulder Ridge Villas at Wilderness Lodge",
    "Copper Creek Villas & Cabins at Wilderness Lodge",
    "Grand Floridian Villas",
    "Old Key West Resort",
    "Polynesian Villas & Bungalows",
    "Riviera Resort",
    "Saratoga Springs Resort & Spa",
    "Villas at Wilderness Lodge",
  ]},
  { group: 'Other On-Property', options: [
    "Shades of Green",
    "Swan Reserve",
    "Walt Disney World Swan",
    "Walt Disney World Dolphin",
  ]},
  { group: 'Off-Property', options: [
    "Off-Property Hotel",
  ]},
];

const DEFAULT_DINING: DiningCounts = {
  qsBreakfasts: 0,
  qsDinners: 0,
  qsDinnerAlcohol: true,
  tsDinners: 0,
  charBreakfasts: 0,
  charDinners: 0,
};

// Lightning Lane rates (per person per day, adults + kids only — toddlers don't need LL)
const LL_MULTI_RATE = 22;   // LL Multi Pass avg
const LL_SINGLE_RATE = 15;  // LL Individual Attraction Selection avg (1 purchase)

// Pricing with tax/tip baked in (matches Budget.tsx DINING_RATES)
const DINING_RATES = {
  qsBreakfastAdult: 22, qsBreakfastKid: 13,
  qsDinnerAdultAlcohol: 49, qsDinnerAdultNonAlcohol: 31, qsDinnerKid: 19,
  tableServiceDinnerAdult: 145, tableServiceDinnerKid: 23,
  characterBreakfastAdult: 73, characterBreakfastKid: 47,
  characterDinnerAdult: 111, characterDinnerKid: 66,
};

export default function TripSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const trip = useStore((s) => s.trip);
  const parkDays = useStore((s) => s.parkDays);
  const budgetCategories = useStore((s) => s.budgetCategories);
  const setTrip = useStore((s) => s.setTrip);
  const addParkDay = useStore((s) => s.addParkDay);
  const updateParkDay = useStore((s) => s.updateParkDay);
  const removeParkDay = useStore((s) => s.removeParkDay);
  const updateBudgetCategory = useStore((s) => s.updateBudgetCategory);

  const [name, setName] = useState(trip?.name ?? '');
  const [startDate, setStartDate] = useState(trip?.startDate ?? '');
  const [endDate, setEndDate] = useState(trip?.endDate ?? '');
  const [resort, setResort] = useState(trip?.resortName ?? '');
  const [budget, setBudget] = useState(trip?.overallBudget?.toString() ?? '');
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>(trip?.partyMembers ?? []);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [diningCounts, setDiningCounts] = useState<DiningCounts>(trip?.diningCounts ?? DEFAULT_DINING);
  const [saved, setSaved] = useState(false);
  const [localParkDays, setLocalParkDays] = useState<ParkDay[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      const dates = tripDateRange(startDate, endDate);
      const tripId = trip?.id ?? generateId();
      const merged = dates.map((date) => {
        const existing = parkDays.find((d) => d.date === date);
        return existing ?? {
          id: generateId(),
          tripId,
          date,
          park: 'Magic Kingdom' as Park,
          isHopDay: false,
        };
      });
      setLocalParkDays(merged);
    } else {
      setLocalParkDays([]);
    }
  }, [startDate, endDate]);

  const addPartyMember = () => {
    const id = generateId();
    setPartyMembers([...partyMembers, { id, name: '', role: 'adult' }]);
  };

  const updateMember = (id: string, field: 'name' | 'role', value: string) => {
    setPartyMembers(
      partyMembers.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  const removeMember = (id: string) => {
    setPartyMembers(partyMembers.filter((m) => m.id !== id));
    setMemberEmails((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleShareNow = async () => {
    if (!trip || !shareEmail.trim()) return;
    setShareStatus('sending');
    setShareError(null);
    const { error } = await sendTripInvite(trip.id, trip.name, shareEmail.trim());
    if (error) { setShareError(error); setShareStatus('error'); }
    else { setShareStatus('sent'); setShareEmail(''); setTimeout(() => setShareStatus('idle'), 3000); }
  };

  const setDC = (field: keyof DiningCounts, value: number | boolean) => {
    setDiningCounts((prev) => ({ ...prev, [field]: value }));
  };

  const computeDiningEstimate = (members: PartyMember[], dc: DiningCounts) => {
    const adults = members.filter((m) => m.role === 'adult').length;
    const kids = members.filter((m) => m.role === 'kid').length;
    return (
      dc.qsBreakfasts * (adults * DINING_RATES.qsBreakfastAdult + kids * DINING_RATES.qsBreakfastKid) +
      dc.qsDinners * (
        adults * (dc.qsDinnerAlcohol ? DINING_RATES.qsDinnerAdultAlcohol : DINING_RATES.qsDinnerAdultNonAlcohol) +
        kids * DINING_RATES.qsDinnerKid
      ) +
      dc.tsDinners * (adults * DINING_RATES.tableServiceDinnerAdult + kids * DINING_RATES.tableServiceDinnerKid) +
      dc.charBreakfasts * (adults * DINING_RATES.characterBreakfastAdult + kids * DINING_RATES.characterBreakfastKid) +
      dc.charDinners * (adults * DINING_RATES.characterDinnerAdult + kids * DINING_RATES.characterDinnerKid)
    );
  };

  // LL estimate: adults + kids count (toddlers skip LL), sum by park day choice
  const computeLLEstimate = (members: PartyMember[], days: ParkDay[]) => {
    const pax = members.filter((m) => m.role === 'adult' || m.role === 'kid').length;
    if (pax === 0) return 0;
    return days.reduce((sum, day) => {
      const choice = day.llChoice ?? 'none';
      if (choice === 'multi') return sum + pax * LL_MULTI_RATE;
      if (choice === 'single') return sum + pax * LL_SINGLE_RATE;
      if (choice === 'both') return sum + pax * (LL_MULTI_RATE + LL_SINGLE_RATE);
      return sum;
    }, 0);
  };

  const handleSave = async () => {
    if (!name || !startDate || !endDate) return;

    const tripId = trip?.id ?? generateId();
    setTrip({
      id: tripId,
      name,
      startDate,
      endDate,
      partyMembers,
      overallBudget: parseFloat(budget) || 0,
      resortName: resort,
      notes,
      giftCardBalance: trip?.giftCardBalance,
      diningCounts,
    });

    // Auto-update Dining budget category
    const diningEst = computeDiningEstimate(partyMembers, diningCounts);
    if (diningEst > 0) {
      const diningCat = budgetCategories.find(
        (c) => c.name.toLowerCase().includes('dining') || c.name.toLowerCase().includes('food')
      );
      if (diningCat) {
        updateBudgetCategory(diningCat.id, { plannedAmount: Math.round(diningEst) });
      }
    }

    // Auto-update Lightning Lane budget category
    const llEst = computeLLEstimate(partyMembers, localParkDays);
    if (llEst > 0) {
      const llCat = budgetCategories.find(
        (c) => c.name.toLowerCase().includes('lightning') || c.name.toLowerCase().includes(' ll')
      );
      if (llCat) {
        updateBudgetCategory(llCat.id, { plannedAmount: Math.round(llEst) });
      }
    }

    // Sync park days
    const existingIds = parkDays.map((d) => d.id);
    localParkDays.forEach((day) => {
      if (existingIds.includes(day.id)) {
        updateParkDay(day.id, { park: day.park, isHopDay: day.isHopDay, hopToPark: day.hopToPark, hopTime: day.hopTime, llChoice: day.llChoice });
      } else {
        addParkDay({ ...day, tripId });
      }
    });
    parkDays.forEach((d) => {
      if (!localParkDays.find((ld) => ld.id === d.id)) {
        removeParkDay(d.id);
      }
    });

    // Send invites for any party member who had an email filled in
    const emailsToInvite = Object.values(memberEmails).filter(Boolean);
    if (emailsToInvite.length > 0 && user) {
      await Promise.all(emailsToInvite.map((email) => sendTripInvite(tripId, name, email)));
      setMemberEmails({});
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigate('/');
    }, 1000);
  };

  const diningEstimate = computeDiningEstimate(partyMembers, diningCounts);
  const llEstimate = computeLLEstimate(partyMembers, localParkDays);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Trip Setup</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your Walt Disney World vacation details.</p>
      </div>

      {/* Trip info */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <h2 className="font-bold text-gray-700">Trip Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Family Magic 2025"'
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const newStart = e.target.value;
                setStartDate(newStart);
                // Pre-fill end date so its calendar opens on the same month
                if (!endDate || endDate < newStart) setEndDate(newStart);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resort / Hotel</label>
          <div className="relative">
            <select
              value={resort}
              onChange={(e) => setResort(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
            >
              <option value="">— Select a resort —</option>
              {RESORT_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overall Budget ($)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="5000"
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any special notes about this trip..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Party members */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">Party Members</h2>
          <button
            onClick={addPartyMember}
            className="flex items-center gap-1 text-blue-700 text-sm font-medium hover:text-blue-800"
          >
            <Plus size={16} /> Add
          </button>
        </div>
        {partyMembers.length === 0 ? (
          <p className="text-gray-400 text-sm">No party members added yet.</p>
        ) : (
          <div className="space-y-3">
            {partyMembers.map((member) => (
              <div key={member.id} className="space-y-1.5">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                    placeholder="Name"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="relative w-36 shrink-0">
                    <select
                      value={member.role}
                      onChange={(e) => updateMember(member.id, 'role', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-7"
                    >
                      <option value="adult">Adult (10+)</option>
                      <option value="kid">Kid (3–9)</option>
                      <option value="toddler">Toddler (0–2)</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <button onClick={() => removeMember(member.id)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <Mail size={13} className="text-gray-400 shrink-0" />
                  <input
                    type="email"
                    value={memberEmails[member.id] ?? ''}
                    onChange={(e) => setMemberEmails((prev) => ({ ...prev, [member.id]: e.target.value }))}
                    placeholder="Email to invite (optional)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {partyMembers.length > 0 && (
          <div className="mt-3 flex gap-3 text-xs text-gray-500">
            <span>{partyMembers.filter((m) => m.role === 'adult').length} adult{partyMembers.filter((m) => m.role === 'adult').length !== 1 ? 's' : ''}</span>
            <span>{partyMembers.filter((m) => m.role === 'kid').length} kid{partyMembers.filter((m) => m.role === 'kid').length !== 1 ? 's' : ''}</span>
            <span>{partyMembers.filter((m) => m.role === 'toddler').length} toddler{partyMembers.filter((m) => m.role === 'toddler').length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Share trip */}
      {trip && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <UserPlus size={16} /> Share Trip
          </h2>
          <p className="text-xs text-gray-400">
            Invite someone by email — they'll see this trip when they sign in. You can also add their email to a party member above and it'll be sent on Save.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleShareNow()}
              placeholder="friend@example.com"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleShareNow}
              disabled={!shareEmail.trim() || shareStatus === 'sending'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                shareStatus === 'sent' ? 'bg-green-600 text-white' : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              {shareStatus === 'sending' ? 'Sending…' : shareStatus === 'sent' ? 'Sent!' : 'Invite'}
            </button>
          </div>
          {shareStatus === 'error' && shareError && (
            <p className="text-red-500 text-xs">{shareError}</p>
          )}
        </div>
      )}

      {/* Dining counts */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <h2 className="font-bold text-gray-700">Dining Estimate</h2>
          <p className="text-xs text-gray-400 mt-0.5">Enter how many meals of each type to auto-calculate your Dining budget.</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">QS Breakfasts</label>
            <input
              type="number"
              min="0"
              value={diningCounts.qsBreakfasts}
              onChange={(e) => setDC('qsBreakfasts', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">Adult $22 · Kid $13</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">QS Dinners</label>
            <input
              type="number"
              min="0"
              value={diningCounts.qsDinners}
              onChange={(e) => setDC('qsDinners', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={diningCounts.qsDinnerAlcohol}
                onChange={(e) => setDC('qsDinnerAlcohol', e.target.checked)}
                className="rounded"
              />
              With alcohol (+$18/adult)
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Table Service Dinners</label>
            <input
              type="number"
              min="0"
              value={diningCounts.tsDinners}
              onChange={(e) => setDC('tsDinners', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">Adult $145 · Kid $23</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Character Breakfasts</label>
            <input
              type="number"
              min="0"
              value={diningCounts.charBreakfasts}
              onChange={(e) => setDC('charBreakfasts', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">Adult $73 · Kid $47</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Character Dinners</label>
            <input
              type="number"
              min="0"
              value={diningCounts.charDinners}
              onChange={(e) => setDC('charDinners', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">Adult $111 · Kid $66</p>
          </div>
        </div>

        {diningEstimate > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
            <span className="text-sm font-medium text-blue-800">Estimated Dining Total</span>
            <span className="text-lg font-bold text-blue-900">
              ${diningEstimate.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        {diningEstimate > 0 && (
          <p className="text-xs text-gray-400 -mt-2">This amount will be applied to your Dining budget category on save.</p>
        )}
      </div>

      {/* Park days */}
      {localParkDays.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-3">Park Days</h2>
          <div className="space-y-3">
            {localParkDays.map((day, idx) => (
              <div key={day.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 w-28 shrink-0">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <select
                    value={day.park}
                    onChange={(e) => {
                      const updated = [...localParkDays];
                      updated[idx] = { ...day, park: e.target.value as Park };
                      setLocalParkDays(updated);
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PARKS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-sm text-gray-600 shrink-0">
                    <input
                      type="checkbox"
                      checked={day.isHopDay}
                      onChange={(e) => {
                        const updated = [...localParkDays];
                        updated[idx] = { ...day, isHopDay: e.target.checked };
                        setLocalParkDays(updated);
                      }}
                      className="rounded"
                    />
                    Hop
                  </label>
                </div>
                {day.isHopDay && (
                  <div className="flex gap-2 items-center pl-28">
                    <span className="text-xs text-gray-500">Hop to:</span>
                    <select
                      value={day.hopToPark ?? ''}
                      onChange={(e) => {
                        const updated = [...localParkDays];
                        updated[idx] = { ...day, hopToPark: e.target.value as Park };
                        setLocalParkDays(updated);
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select park</option>
                      {PARKS.filter((p) => p !== day.park).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={day.hopTime ?? ''}
                      onChange={(e) => {
                        const updated = [...localParkDays];
                        updated[idx] = { ...day, hopTime: e.target.value };
                        setLocalParkDays(updated);
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {/* Lightning Lane choice */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-xs text-gray-500 w-28 shrink-0">Lightning Lane:</span>
                  <div className="flex gap-1">
                    {(['none', 'multi', 'single', 'both'] as LLChoice[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const updated = [...localParkDays];
                          updated[idx] = { ...day, llChoice: opt };
                          setLocalParkDays(updated);
                        }}
                        className={`text-xs px-2 py-1 rounded-lg font-medium border transition-colors ${
                          (day.llChoice ?? 'none') === opt
                            ? opt === 'none'
                              ? 'bg-gray-200 text-gray-700 border-gray-300'
                              : 'bg-blue-700 text-white border-blue-700'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400'
                        }`}
                      >
                        {opt === 'none' ? 'None' : opt === 'multi' ? 'LL Multi' : opt === 'single' ? 'LL Single' : 'Both'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {llEstimate > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-purple-50 border border-purple-100 px-4 py-3">
              <div>
                <span className="text-sm font-medium text-purple-800">Estimated Lightning Lane Total</span>
                <p className="text-xs text-purple-500 mt-0.5">LL Multi ~$22/person/day · LL Single ~$15/person/attraction</p>
              </div>
              <span className="text-lg font-bold text-purple-900">
                ${llEstimate.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!name || !startDate || !endDate}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-colors ${
          saved ? 'bg-green-600' : 'bg-blue-700 hover:bg-blue-800'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Save size={18} />
        {saved ? 'Saved!' : 'Save Trip'}
      </button>
    </div>
  );
}
