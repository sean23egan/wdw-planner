import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Upload, AlertTriangle, Plus, Trash2, Edit2, Check, X, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import { formatDate } from '../utils/dates';
import { deleteTripData, loadTripSnapshot, saveTripSnapshot, saveTripSummaries } from '../lib/sync';

export default function Settings() {
  const trip = useStore((s) => s.trip);
  const setTrip = useStore((s) => s.setTrip);
  const tripSummaries = useStore((s) => s.tripSummaries);
  const createNewTrip = useStore((s) => s.createNewTrip);
  const switchToTrip = useStore((s) => s.switchToTrip);
  const removeTripSummary = useStore((s) => s.removeTripSummary);
  const getSnapshot = useStore((s) => s.getSnapshot);
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAge, setNewMemberAge] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const state = {
      trip: useStore.getState().trip,
      parkDays: useStore.getState().parkDays,
      itineraryItems: useStore.getState().itineraryItems,
      budgetCategories: useStore.getState().budgetCategories,
      expenses: useStore.getState().expenses,
      reservations: useStore.getState().reservations,
      groceryOrder: useStore.getState().groceryOrder,
      dvcMembership: useStore.getState().dvcMembership,
      dvcStayOptions: useStore.getState().dvcStayOptions,
      ticketOptions: useStore.getState().ticketOptions,
      specialEvents: useStore.getState().specialEvents,
      packingItems: useStore.getState().packingItems,
      preTripTasks: useStore.getState().preTripTasks,
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wdw-planner-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const store = useStore.getState();
        if (data.trip) store.setTrip(data.trip);
        // Restore all the arrays
        if (data.parkDays) {
          data.parkDays.forEach((d: any) => {
            if (!store.parkDays.find((pd) => pd.id === d.id)) store.addParkDay(d);
          });
        }
        if (data.budgetCategories) {
          data.budgetCategories.forEach((c: any) => store.addBudgetCategory(c));
        }
        alert('Trip data imported successfully!');
      } catch {
        alert('Failed to import data. Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    localStorage.removeItem('wdw-planner-storage');
    localStorage.removeItem('wdw-planner-summaries');
    window.location.reload();
  };

  const handleNewTrip = () => {
    createNewTrip();
    navigate('/setup');
  };

  const handleSwitchTrip = async (targetId: string) => {
    if (targetId === trip?.id) return;
    setSwitching(targetId);
    if (trip) await saveTripSnapshot(trip.id, getSnapshot());
    const snapshot = await loadTripSnapshot(targetId);
    if (snapshot) switchToTrip(snapshot);
    setSwitching(null);
    navigate('/');
  };

  const handleDeleteTrip = async (id: string) => {
    removeTripSummary(id);
    await deleteTripData(id);
    const updated = tripSummaries.filter((s) => s.id !== id);
    await saveTripSummaries(updated);
    setDeletingId(null);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim() || !trip) return;
    setTrip({
      ...trip,
      partyMembers: [
        ...trip.partyMembers,
        {
          id: generateId(),
          name: newMemberName.trim(),
          age: newMemberAge ? parseInt(newMemberAge) : undefined,
        },
      ],
    });
    setNewMemberName('');
    setNewMemberAge('');
  };

  const handleRemoveMember = (id: string) => {
    if (!trip) return;
    setTrip({
      ...trip,
      partyMembers: trip.partyMembers.filter((m) => m.id !== id),
    });
  };

  const handleSaveMember = (id: string) => {
    if (!trip) return;
    setTrip({
      ...trip,
      partyMembers: trip.partyMembers.map((m) =>
        m.id === id ? { ...m, name: editName, age: editAge ? parseInt(editAge) : undefined } : m
      ),
    });
    setEditingMemberId(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      {/* Trip summary */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-700">Trip Info</h2>
          <Link to="/setup" className="text-blue-700 text-sm font-medium hover:text-blue-800">Edit →</Link>
        </div>
        {trip ? (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-800">{trip.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dates</span>
              <span className="font-medium text-gray-800">{trip.startDate} – {trip.endDate}</span>
            </div>
            {trip.resortName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Resort</span>
                <span className="font-medium text-gray-800">{trip.resortName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Budget</span>
              <span className="font-medium text-gray-800">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(trip.overallBudget)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No trip set up yet.</p>
        )}
      </div>

      {/* Party members */}
      {trip && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-700">Party Members</h2>
          {trip.partyMembers.length === 0 ? (
            <p className="text-gray-400 text-sm">No party members added.</p>
          ) : (
            <div className="space-y-2">
              {trip.partyMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  {editingMemberId === member.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        placeholder="Age"
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button onClick={() => handleSaveMember(member.id)} className="text-green-600 hover:text-green-700">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingMemberId(null)} className="text-gray-400">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-gray-800">
                        {member.name}
                        {member.age !== undefined && <span className="text-gray-400 ml-1">(age {member.age})</span>}
                      </span>
                      <button
                        onClick={() => { setEditingMemberId(member.id); setEditName(member.name); setEditAge(member.age?.toString() ?? ''); }}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleRemoveMember(member.id)} className="text-gray-300 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={newMemberAge}
              onChange={(e) => setNewMemberAge(e.target.value)}
              placeholder="Age"
              className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddMember}
              disabled={!newMemberName.trim()}
              className="bg-blue-700 text-white rounded-lg px-3 py-2 hover:bg-blue-800 disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Trip management */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={16} /> All Trips</h2>
          <button onClick={handleNewTrip} className="flex items-center gap-1 text-sm text-blue-700 font-medium hover:text-blue-800">
            <Plus size={14} /> New Trip
          </button>
        </div>

        {tripSummaries.length === 0 && (
          <p className="text-gray-400 text-sm">No trips saved yet.</p>
        )}

        {tripSummaries
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((s) => {
            const isActive = s.id === trip?.id;
            return (
              <div key={s.id} className={`rounded-lg border p-3 ${isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isActive && <span className="text-xs bg-blue-700 text-white px-1.5 py-0.5 rounded font-medium shrink-0">Active</span>}
                      <span className="font-medium text-gray-800 text-sm truncate">{s.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDate(s.startDate)} – {formatDate(s.endDate)}
                      {s.resortName ? ` · ${s.resortName}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => handleSwitchTrip(s.id)}
                        disabled={switching === s.id}
                        className="text-xs text-blue-700 font-medium hover:text-blue-800 disabled:opacity-50"
                      >
                        {switching === s.id ? 'Loading…' : 'Switch'}
                      </button>
                    )}
                    {deletingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteTrip(s.id)} className="text-xs text-red-600 font-medium">Delete</button>
                        <button onClick={() => setDeletingId(null)} className="text-gray-400"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(s.id)} className="text-gray-300 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Data management */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-gray-700">Data Management</h2>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-800"
          >
            <Download size={16} /> Export Trip Data (JSON)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-200"
          >
            <Upload size={16} /> Import Trip Data
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Reset */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-red-100">
        <h2 className="font-bold text-red-600 flex items-center gap-2">
          <AlertTriangle size={18} /> Danger Zone
        </h2>
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-100 border border-red-200"
          >
            Reset All Data
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600 font-medium">Are you sure? This will delete all your trip data.</p>
            <div className="flex gap-2">
              <button onClick={handleReset} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700">
                Yes, Reset Everything
              </button>
              <button onClick={() => setShowReset(false)} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
