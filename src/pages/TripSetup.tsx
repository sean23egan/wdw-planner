import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import { tripDateRange } from '../utils/dates';
import type { Park, PartyMember, ParkDay } from '../types';

const PARKS: Park[] = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom'];

export default function TripSetup() {
  const navigate = useNavigate();
  const trip = useStore((s) => s.trip);
  const parkDays = useStore((s) => s.parkDays);
  const setTrip = useStore((s) => s.setTrip);
  const addParkDay = useStore((s) => s.addParkDay);
  const updateParkDay = useStore((s) => s.updateParkDay);
  const removeParkDay = useStore((s) => s.removeParkDay);

  const [name, setName] = useState(trip?.name ?? '');
  const [startDate, setStartDate] = useState(trip?.startDate ?? '');
  const [endDate, setEndDate] = useState(trip?.endDate ?? '');
  const [resort, setResort] = useState(trip?.resortName ?? '');
  const [budget, setBudget] = useState(trip?.overallBudget?.toString() ?? '');
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>(trip?.partyMembers ?? []);
  const [saved, setSaved] = useState(false);

  // When date range changes, auto-generate park day slots
  const [localParkDays, setLocalParkDays] = useState<ParkDay[]>([]);

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
    setPartyMembers([...partyMembers, { id: generateId(), name: '' }]);
  };

  const updateMember = (id: string, field: 'name' | 'age', value: string) => {
    setPartyMembers(
      partyMembers.map((m) =>
        m.id === id ? { ...m, [field]: field === 'age' ? (value ? parseInt(value) : undefined) : value } : m
      )
    );
  };

  const removeMember = (id: string) => {
    setPartyMembers(partyMembers.filter((m) => m.id !== id));
  };

  const handleSave = () => {
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
    });

    // Sync park days
    const existingIds = parkDays.map((d) => d.id);
    localParkDays.forEach((day) => {
      if (existingIds.includes(day.id)) {
        updateParkDay(day.id, { park: day.park, isHopDay: day.isHopDay, hopToPark: day.hopToPark, hopTime: day.hopTime });
      } else {
        addParkDay({ ...day, tripId });
      }
    });
    // Remove park days not in new range
    parkDays.forEach((d) => {
      if (!localParkDays.find((ld) => ld.id === d.id)) {
        removeParkDay(d.id);
      }
    });

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigate('/');
    }, 1000);
  };

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
              onChange={(e) => setStartDate(e.target.value)}
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
          <input
            type="text"
            value={resort}
            onChange={(e) => setResort(e.target.value)}
            placeholder="e.g. Disney's Beach Club Resort"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          <div className="space-y-2">
            {partyMembers.map((member) => (
              <div key={member.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                  placeholder="Name"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={member.age ?? ''}
                  onChange={(e) => updateMember(member.id, 'age', e.target.value)}
                  placeholder="Age"
                  min="0"
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={() => removeMember(member.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
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
              </div>
            ))}
          </div>
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
