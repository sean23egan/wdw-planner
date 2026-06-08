import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ChevronDown, Mail, UserPlus, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { generateId } from '../utils/ids';
import { tripDateRange } from '../utils/dates';
import { sendTripInvite } from '../lib/sync';
import type { Park, PartyMember, ParkDay, DiningCounts, LLChoice, TransportMode, GolfTier } from '../types';

const PARKS: Park[] = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom'];

// Airport ↔ resort transport, one-way. 'mears' is per person; others are flat per trip.
const TRANSPORT_OPTIONS: { value: TransportMode; label: string; desc: string; perPerson: boolean; rate: number }[] = [
  { value: 'none', label: 'None / Own car', desc: 'Driving or rental — no estimate', perPerson: false, rate: 0 },
  { value: 'rideshare', label: 'Rideshare (Uber/Lyft)', desc: '~$60 each way, whole party', perPerson: false, rate: 60 },
  { value: 'mears', label: 'Mears Connect (shuttle)', desc: '~$17/person each way', perPerson: true, rate: 17 },
  { value: 'private', label: 'Private car / town car', desc: '~$200 each way, whole party', perPerson: false, rate: 200 },
];

function transportLegCost(mode: TransportMode | undefined, paxIncludingToddlers: number): number {
  const opt = TRANSPORT_OPTIONS.find((o) => o.value === (mode ?? 'none'));
  if (!opt) return 0;
  return opt.perPerson ? opt.rate * paxIncludingToddlers : opt.rate;
}

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

// Lightning Lane worst-case (peak) rates per person/day, by park.
// Multi = LL Multi Pass for the day; Single = one Individual Lightning Lane attraction.
const LL_RATES: Record<Park, { multi: number; single: number }> = {
  'Magic Kingdom':     { multi: 39, single: 32 },
  'Hollywood Studios': { multi: 39, single: 30 },
  'EPCOT':             { multi: 30, single: 25 },
  'Animal Kingdom':    { multi: 30, single: 30 },
};

// Budget questionnaire rates
const GROCERY_PER_PERSON_DAY = 13;      // groceries: $/day/person
const GOLF_TIERS: Record<GolfTier, { label: string; rate: number }> = {
  twilight: { label: 'Twilight $75', rate: 75 },
  standard: { label: 'Standard $135', rate: 135 },
  peak:     { label: 'Peak $175', rate: 175 },
};
const MEMORY_MAKER = { passholder: 99, standard: 199 };

// WDW special ticketed events with approximate per-ticket prices (worst-case / typical)
const SPECIAL_EVENTS_LIST = [
  { id: 'mnsshp',         name: "Mickey's Not-So-Scary Halloween Party", emoji: '🎃', season: 'Sep–Oct',      price: 155, note: 'Avg ~$109–$189; varies by date' },
  { id: 'mvmcp',          name: "Mickey's Very Merry Christmas Party",    emoji: '🎄', season: 'Nov–Dec',      price: 155, note: 'Avg ~$109–$189; varies by date' },
  { id: 'dah-mk',         name: 'Disney After Hours – Magic Kingdom',     emoji: '🏰', season: 'Select nights', price: 155, note: '~$145–$165 per person' },
  { id: 'dah-hs',         name: 'Disney After Hours – Hollywood Studios', emoji: '🎬', season: 'Select nights', price: 145, note: '~$145 per person' },
  { id: 'dah-ak',         name: 'Disney After Hours – Animal Kingdom',    emoji: '🦁', season: 'Select nights', price: 145, note: '~$145 per person' },
  { id: 'candlelight',    name: 'Candlelight Processional Dining Pkg',    emoji: '🕯️', season: 'Nov–Dec',      price: 110, note: 'Varies by restaurant; ~$60–$200' },
  { id: 'fireworks-vip',  name: 'Private Fireworks Viewing (group)',      emoji: '🎆', season: 'Year-round',   price: 399, note: 'Flat group rate ~$399; enter 1 ticket' },
  { id: 'vip-tour',       name: 'VIP Private Tour (7 hr min)',            emoji: '🎩', season: 'Year-round',   price: 2450, note: '~$175–$450/hr × 7 hr; enter 1 ticket' },
  { id: 'dessert-party',  name: 'Dessert Party / Fireworks Package',      emoji: '🧁', season: 'Year-round',   price: 115, note: '~$99–$135 per person' },
  { id: 'sunrise',        name: 'Early Morning Magic / Sunrise',          emoji: '🌅', season: 'Select dates', price: 99,  note: '~$89–$109 per person' },
];

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
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>(trip?.partyMembers ?? []);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [diningCounts, setDiningCounts] = useState<DiningCounts>(trip?.diningCounts ?? DEFAULT_DINING);
  const [arrivalTransport, setArrivalTransport] = useState<TransportMode>(trip?.arrivalTransport ?? 'none');
  const [departureTransport, setDepartureTransport] = useState<TransportMode>(trip?.departureTransport ?? 'none');
  // Budget questionnaire state
  const [wantsGroceries, setWantsGroceries] = useState(trip?.wantsGroceries ?? false);
  const [wantsMemoryMaker, setWantsMemoryMaker] = useState(trip?.wantsMemoryMaker ?? false);
  const [anyPassholder, setAnyPassholder] = useState(trip?.anyPassholder ?? false);
  const [wantsSpecialEvents, setWantsSpecialEvents] = useState(
    (trip?.selectedSpecialEvents?.length ?? 0) > 0 || (trip?.otherEventsBudget ?? 0) > 0
  );
  const [selectedSpecialEvents, setSelectedSpecialEvents] = useState<{ id: string; tickets: number }[]>(
    trip?.selectedSpecialEvents ?? []
  );
  const [otherEventsBudget, setOtherEventsBudget] = useState((trip?.otherEventsBudget ?? 0).toString());
  const [wantsGolf, setWantsGolf] = useState((trip?.golfRounds?.length ?? 0) > 0);
  const [golfers, setGolfers] = useState((trip?.golfers ?? 1).toString());
  const [golfRounds, setGolfRounds] = useState<GolfTier[]>(trip?.golfRounds ?? []);
  const [snackBudget, setSnackBudget] = useState((trip?.snackBudget ?? 0).toString());
  const [souvenirBudget, setSouvenirBudget] = useState((trip?.souvenirBudget ?? 0).toString());
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

  // LL estimate: adults + kids (toddlers skip LL), priced per park, skipping no-park days
  const computeLLEstimate = (members: PartyMember[], days: ParkDay[]) => {
    const pax = members.filter((m) => m.role === 'adult' || m.role === 'kid').length;
    if (pax === 0) return 0;
    return days.reduce((sum, day) => {
      if (day.noPark) return sum;
      const choice = day.llChoice ?? 'none';
      const rate = LL_RATES[day.park] ?? LL_RATES['Magic Kingdom'];
      if (choice === 'multi') return sum + pax * rate.multi;
      if (choice === 'single') return sum + pax * rate.single;
      if (choice === 'both') return sum + pax * (rate.multi + rate.single);
      return sum;
    }, 0);
  };

  // Budget questionnaire estimates
  const tripDays = startDate && endDate && startDate <= endDate ? tripDateRange(startDate, endDate).length : 0;
  const groceryEstimate = wantsGroceries ? GROCERY_PER_PERSON_DAY * tripDays * Math.max(1, partyMembers.length) : 0;
  const memoryMakerEstimate = wantsMemoryMaker ? (anyPassholder ? MEMORY_MAKER.passholder : MEMORY_MAKER.standard) : 0;
  const golfEstimate = wantsGolf
    ? Math.max(1, parseInt(golfers) || 0) * golfRounds.reduce((s, t) => s + GOLF_TIERS[t].rate, 0)
    : 0;
  const specialEventsEstimate = wantsSpecialEvents
    ? selectedSpecialEvents.reduce((sum, sel) => {
        const ev = SPECIAL_EVENTS_LIST.find((e) => e.id === sel.id);
        return sum + (ev ? sel.tickets * ev.price : 0);
      }, 0) + Math.max(0, parseFloat(otherEventsBudget) || 0)
    : 0;
  const snackEstimate = Math.max(0, parseFloat(snackBudget) || 0);
  const souvenirEstimate = Math.max(0, parseFloat(souvenirBudget) || 0);

  const handleSave = async () => {
    if (!name || !startDate || !endDate) return;

    const tripId = trip?.id ?? generateId();
    const round = (n: number) => Math.round(n);
    const diningEst = computeDiningEstimate(partyMembers, diningCounts);
    const llEst = computeLLEstimate(partyMembers, localParkDays);

    // Each questionnaire-driven category: canonical id, display, amount, and whether to
    // overwrite even when the amount is 0 (toggle categories own their value outright).
    const catUpdates: { id: string; name: string; icon: string; amount: number; writeZero: boolean; match: (c: { id: string; name: string }) => boolean }[] = [
      { id: 'bc-transport', name: 'Transportation', icon: '✈️', amount: round(transportEstimate), writeZero: false, match: (c) => c.id === 'bc-transport' || c.name.toLowerCase().includes('transport') },
      { id: 'bc-dining', name: 'Dining', icon: '🍽️', amount: round(diningEst), writeZero: false, match: (c) => c.id === 'bc-dining' || c.name.toLowerCase().includes('dining') || c.name.toLowerCase().includes('food') },
      { id: 'bc-ll', name: 'Lightning Lane', icon: '⚡', amount: round(llEst), writeZero: false, match: (c) => c.id === 'bc-ll' || c.name.toLowerCase().includes('lightning') },
      { id: 'bc-groceries', name: 'Groceries', icon: '🛒', amount: round(groceryEstimate), writeZero: true, match: (c) => c.id === 'bc-groceries' || c.name.toLowerCase().includes('grocery') },
      { id: 'bc-memory-maker', name: 'Memory Maker', icon: '📸', amount: round(memoryMakerEstimate), writeZero: true, match: (c) => c.id === 'bc-memory-maker' || c.name.toLowerCase().includes('memory') },
      { id: 'bc-events', name: 'Special Events', icon: '🎉', amount: round(specialEventsEstimate), writeZero: true, match: (c) => c.id === 'bc-events' || c.name.toLowerCase().includes('event') },
      { id: 'bc-golf', name: 'Golfing', icon: '⛳', amount: round(golfEstimate), writeZero: true, match: (c) => c.id === 'bc-golf' || c.name.toLowerCase().includes('golf') },
      { id: 'bc-misc', name: 'Misc / Snacks', icon: '🍦', amount: round(snackEstimate), writeZero: true, match: (c) => c.id === 'bc-misc' || c.name.toLowerCase().includes('snack') || c.name.toLowerCase().includes('misc') },
      { id: 'bc-gifts', name: 'Gifts/Souvenirs', icon: '🛍️', amount: round(souvenirEstimate), writeZero: true, match: (c) => c.id === 'bc-gifts' || c.name.toLowerCase().includes('souvenir') || c.name.toLowerCase().includes('gift') },
    ];

    const store = useStore.getState();
    const finalById: Record<string, number> = {};
    budgetCategories.forEach((c) => { finalById[c.id] = c.plannedAmount; });

    catUpdates.forEach((u) => {
      const existing = budgetCategories.find(u.match);
      const shouldWrite = u.amount > 0 || u.writeZero;
      if (existing) {
        if (shouldWrite) {
          updateBudgetCategory(existing.id, { plannedAmount: u.amount });
          finalById[existing.id] = u.amount;
        }
      } else if (u.amount > 0) {
        store.addBudgetCategory({ id: u.id, name: u.name, plannedAmount: u.amount, actualAmount: 0, paidOff: false, icon: u.icon });
        finalById[u.id] = u.amount;
      }
    });

    // Overall budget = live sum of every category's planned amount
    const overallBudget = Object.values(finalById).reduce((a, b) => a + b, 0);

    setTrip({
      id: tripId,
      name,
      startDate,
      endDate,
      partyMembers,
      overallBudget,
      resortName: resort,
      notes,
      giftCardBalance: trip?.giftCardBalance,
      savedCash: trip?.savedCash,
      diningCounts,
      arrivalTransport,
      departureTransport,
      wantsGroceries,
      wantsMemoryMaker,
      anyPassholder,
      specialEventsBudget: specialEventsEstimate,
      selectedSpecialEvents,
      otherEventsBudget: Math.max(0, parseFloat(otherEventsBudget) || 0),
      golfers: Math.max(1, parseInt(golfers) || 0),
      golfRounds,
      snackBudget: snackEstimate,
      souvenirBudget: souvenirEstimate,
    });

    // Sync park days
    const existingIds = parkDays.map((d) => d.id);
    localParkDays.forEach((day) => {
      if (existingIds.includes(day.id)) {
        updateParkDay(day.id, { park: day.park, isHopDay: day.isHopDay, hopToPark: day.hopToPark, hopTime: day.hopTime, llChoice: day.llChoice, noPark: day.noPark, travelTag: day.travelTag });
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
  const transportPax = Math.max(1, partyMembers.length);
  const transportEstimate =
    transportLegCost(arrivalTransport, transportPax) + transportLegCost(departureTransport, transportPax);

  // Live overall-budget preview: questionnaire estimates + any non-questionnaire
  // categories already set elsewhere (Tickets, Lodging, custom).
  const QUESTIONNAIRE_IDS = new Set(['bc-transport', 'bc-dining', 'bc-ll', 'bc-groceries', 'bc-memory-maker', 'bc-events', 'bc-golf', 'bc-misc', 'bc-gifts']);
  const otherCategoriesTotal = budgetCategories
    .filter((c) => !QUESTIONNAIRE_IDS.has(c.id))
    .reduce((s, c) => s + c.plannedAmount, 0);
  const overallBudgetPreview = Math.round(
    otherCategoriesTotal + transportEstimate + diningEstimate + llEstimate +
    groceryEstimate + memoryMakerEstimate + specialEventsEstimate + golfEstimate +
    snackEstimate + souvenirEstimate
  );

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

      {/* Airport transportation */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <h2 className="font-bold text-gray-700">Airport Transportation</h2>
          <p className="text-xs text-gray-400 mt-0.5">How will you get between MCO airport and your resort? Pick each leg separately.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { label: 'Arrival (airport → resort)', value: arrivalTransport, set: setArrivalTransport },
            { label: 'Departure (resort → airport)', value: departureTransport, set: setDepartureTransport },
          ] as const).map((leg) => (
            <div key={leg.label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{leg.label}</label>
              <select
                value={leg.value}
                onChange={(e) => leg.set(e.target.value as TransportMode)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRANSPORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-0.5">
                {TRANSPORT_OPTIONS.find((o) => o.value === leg.value)?.desc}
                {(() => {
                  const cost = transportLegCost(leg.value, transportPax);
                  return cost > 0 ? ` · ~$${cost.toLocaleString('en-US')}` : '';
                })()}
              </p>
            </div>
          ))}
        </div>

        {transportEstimate > 0 && (
          <>
            <div className="flex items-center justify-between rounded-lg bg-sky-50 border border-sky-100 px-4 py-3">
              <span className="text-sm font-medium text-sky-800">Estimated Round-Trip Transport</span>
              <span className="text-lg font-bold text-sky-900">
                ${transportEstimate.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-xs text-gray-400 -mt-2">This amount will be applied to your Transportation budget category on save.</p>
          </>
        )}
      </div>

      {/* Park days */}
      {localParkDays.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-3">Park Days</h2>
          <div className="space-y-3">
            {localParkDays.map((day, idx) => (
              <div key={day.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-600 w-28 shrink-0">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <select
                    value={day.noPark ? '__none__' : day.park}
                    onChange={(e) => {
                      const v = e.target.value;
                      const updated = [...localParkDays];
                      updated[idx] = v === '__none__'
                        ? { ...day, noPark: true, isHopDay: false }
                        : { ...day, noPark: false, park: v as Park };
                      setLocalParkDays(updated);
                    }}
                    className="flex-1 min-w-32 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PARKS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="__none__">No Park / Rest Day</option>
                  </select>
                  <select
                    value={day.travelTag ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const updated = [...localParkDays];
                      updated[idx] = { ...day, travelTag: v === '' ? undefined : (v as 'arrival' | 'departure') };
                      setLocalParkDays(updated);
                    }}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Tag this as a travel day"
                  >
                    <option value="">— Tag —</option>
                    <option value="arrival">✈️ Arrival</option>
                    <option value="departure">✈️ Departure</option>
                  </select>
                  {!day.noPark && (
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
                  )}
                </div>
                {!day.noPark && day.isHopDay && (
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
                {day.noPark ? (
                  <p className="text-xs text-gray-400 pl-28">Rest / non-park day — no tickets or Lightning Lane needed.</p>
                ) : (
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
                )}
              </div>
            ))}
          </div>
          {llEstimate > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-purple-50 border border-purple-100 px-4 py-3">
              <div>
                <span className="text-sm font-medium text-purple-800">Estimated Lightning Lane Total</span>
                <p className="text-xs text-purple-500 mt-0.5">Worst-case, priced per park (MK/HS up to ~$39 Multi · EPCOT/AK ~$30)</p>
              </div>
              <span className="text-lg font-bold text-purple-900">
                ${llEstimate.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Budget questions */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <h2 className="font-bold text-gray-700">Budget Questions</h2>
          <p className="text-xs text-gray-400 mt-0.5">Answer these and we'll fill each budget category for you. Your overall budget is the sum below.</p>
        </div>

        {/* Groceries */}
        <div className="border-b border-gray-100 pb-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">🛒 Buying groceries / delivery?</span>
            <input type="checkbox" checked={wantsGroceries} onChange={(e) => setWantsGroceries(e.target.checked)} className="rounded w-4 h-4 accent-blue-700" />
          </label>
          {wantsGroceries && (
            <p className="text-xs text-gray-500 mt-1">${GROCERY_PER_PERSON_DAY}/person/day × {tripDays} day{tripDays === 1 ? '' : 's'} × {Math.max(1, partyMembers.length)} = <strong>${groceryEstimate.toLocaleString('en-US')}</strong></p>
          )}
        </div>

        {/* Memory Maker */}
        <div className="border-b border-gray-100 pb-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">📸 Memory Maker (PhotoPass)?</span>
            <input type="checkbox" checked={wantsMemoryMaker} onChange={(e) => setWantsMemoryMaker(e.target.checked)} className="rounded w-4 h-4 accent-blue-700" />
          </label>
          {wantsMemoryMaker && (
            <div className="mt-2 space-y-1">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={anyPassholder} onChange={(e) => setAnyPassholder(e.target.checked)} className="rounded accent-blue-700" />
                Anyone in the group an annual passholder?
              </label>
              <p className="text-xs text-gray-500">{anyPassholder ? 'Passholder rate' : 'Standard rate'}: <strong>${memoryMakerEstimate}</strong> (one purchase, whole party)</p>
            </div>
          )}
        </div>

        {/* Special events */}
        <div className="border-b border-gray-100 pb-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">🎉 Special events / tours / parties?</span>
            <input
              type="checkbox"
              checked={wantsSpecialEvents}
              onChange={(e) => setWantsSpecialEvents(e.target.checked)}
              className="rounded w-4 h-4 accent-blue-700"
            />
          </label>
          {wantsSpecialEvents && (
            <div className="mt-3 space-y-2">
              {SPECIAL_EVENTS_LIST.map((event) => {
                const sel = selectedSpecialEvents.find((s) => s.id === event.id);
                const isSelected = !!sel;
                const defaultTickets = Math.max(1, partyMembers.filter((m) => m.role !== 'toddler').length);
                return (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-2.5 transition-colors ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSpecialEvents([...selectedSpecialEvents, { id: event.id, tickets: defaultTickets }]);
                          } else {
                            setSelectedSpecialEvents(selectedSpecialEvents.filter((s) => s.id !== event.id));
                          }
                        }}
                        className="rounded accent-blue-700 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-700">{event.emoji} {event.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">{event.season}</span>
                        </div>
                        {!isSelected && (
                          <p className="text-xs text-gray-400 mt-0.5">~${event.price.toLocaleString('en-US')}/ticket · {event.note}</p>
                        )}
                      </div>
                    </label>
                    {isSelected && (
                      <div className="mt-2 pl-6 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500 shrink-0">Tickets:</span>
                          <input
                            type="number"
                            min="1"
                            value={sel.tickets}
                            onChange={(e) => {
                              const n = Math.max(1, parseInt(e.target.value) || 1);
                              setSelectedSpecialEvents(
                                selectedSpecialEvents.map((s) =>
                                  s.id === event.id ? { ...s, tickets: n } : s
                                )
                              );
                            }}
                            className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-500">
                            × ~${event.price.toLocaleString('en-US')} ={' '}
                            <strong className="text-gray-800">${(sel.tickets * event.price).toLocaleString('en-US')}</strong>
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{event.note}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Other / not listed */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm text-gray-500 shrink-0">Other / not listed $</span>
                <input
                  type="number"
                  min="0"
                  value={otherEventsBudget}
                  onChange={(e) => setOtherEventsBudget(e.target.value)}
                  placeholder="0"
                  className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {specialEventsEstimate > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 mt-1">
                  <span className="text-sm font-medium text-amber-800">Special Events Total</span>
                  <span className="text-base font-bold text-amber-900">${specialEventsEstimate.toLocaleString('en-US')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Golfing */}
        <div className="border-b border-gray-100 pb-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">⛳ Golfing?</span>
            <input type="checkbox" checked={wantsGolf} onChange={(e) => { setWantsGolf(e.target.checked); if (e.target.checked && golfRounds.length === 0) setGolfRounds(['standard']); }} className="rounded w-4 h-4 accent-blue-700" />
          </label>
          {wantsGolf && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500"># Golfers</span>
                <input
                  type="number" min="1" value={golfers}
                  onChange={(e) => setGolfers(e.target.value)}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                {golfRounds.map((tier, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16">Round {ri + 1}</span>
                    <select
                      value={tier}
                      onChange={(e) => {
                        const next = [...golfRounds]; next[ri] = e.target.value as GolfTier; setGolfRounds(next);
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(Object.keys(GOLF_TIERS) as GolfTier[]).map((t) => (
                        <option key={t} value={t}>{GOLF_TIERS[t].label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setGolfRounds(golfRounds.filter((_, i) => i !== ri))} className="text-gray-300 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setGolfRounds([...golfRounds, 'standard'])} className="flex items-center gap-1 text-xs text-blue-700 font-medium hover:text-blue-800">
                  <Plus size={12} /> Add round
                </button>
              </div>
              <p className="text-xs text-gray-500">{Math.max(1, parseInt(golfers) || 0)} golfer(s) × {golfRounds.length} round(s) = <strong>${golfEstimate.toLocaleString('en-US')}</strong></p>
            </div>
          )}
        </div>

        {/* Snacks + souvenirs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🍦 Snack budget $</label>
            <input
              type="number" min="0" value={snackBudget}
              onChange={(e) => setSnackBudget(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🛍️ Souvenir budget $</label>
            <input
              type="number" min="0" value={souvenirBudget}
              onChange={(e) => setSouvenirBudget(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Overall budget preview */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
        <div>
          <p className="text-blue-200 text-sm">Estimated trip budget</p>
          <p className="text-xs text-blue-300 mt-0.5">Sum of all budget categories</p>
        </div>
        <span className="text-3xl font-bold">${overallBudgetPreview.toLocaleString('en-US')}</span>
      </div>

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
