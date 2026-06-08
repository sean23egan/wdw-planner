import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Upload, AlertTriangle, Plus, Trash2, Edit2, Check, X, Clock, LogOut, UserPlus, Mail } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { generateId } from '../utils/ids';
import { formatDate } from '../utils/dates';
import { deleteTripData, loadTripSnapshot, saveTripSnapshot, saveTripSummaries, sendTripInvite, loadPendingInvites, acceptTripInvite, declineTripInvite } from '../lib/sync';
import { supabase } from '../lib/supabase';

// Module-level set: tracks invite IDs dismissed this session so they don't
// re-appear when Settings remounts even if Supabase RLS delays the status update.
const _dismissedInviteIds = new Set<string>();

export default function Settings() {
  const { user } = useAuth();
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
  const [editRole, setEditRole] = useState<'adult' | 'kid' | 'toddler'>('adult');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'adult' | 'kid' | 'toddler'>('adult');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Pending invites
  type PendingInvite = { id: string; trip_id: string; trip_name: string; inviter_email: string | null; status: string; created_at: string };
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingInvites().then((invites) =>
      setPendingInvites(invites.filter((i) => !_dismissedInviteIds.has(i.id)))
    );
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    // Clear all wdw-planner localStorage keys
    Object.keys(localStorage)
      .filter((k) => k.startsWith('wdw-planner'))
      .forEach((k) => localStorage.removeItem(k));
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Connected accounts / identity linking
  const identities = user?.identities ?? [];
  const hasGoogle = identities.some((i) => i.provider === 'google');
  const hasEmailLogin = identities.some((i) => i.provider === 'email');
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const handleConnectGoogle = async () => {
    if (!supabase) return;
    setLinkStatus(null);
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setLinkStatus(error.message);
  };

  const handleSetPassword = async () => {
    if (!supabase || newPassword.length < 6) return;
    setLinkStatus(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setLinkStatus(error.message);
    else { setLinkStatus('Password set — you can now sign in with email too.'); setNewPassword(''); }
  };

  const handleSendInvite = async () => {
    if (!trip || !inviteEmail.trim()) return;
    setInviteStatus('sending');
    setInviteError(null);
    const { error } = await sendTripInvite(trip.id, trip.name, inviteEmail.trim());
    if (error) {
      setInviteError(error);
      setInviteStatus('error');
    } else {
      setInviteStatus('sent');
      setInviteEmail('');
      setTimeout(() => setInviteStatus('idle'), 3000);
    }
  };

  const handleAcceptInvite = async (invite: PendingInvite) => {
    setAcceptingId(invite.id);
    _dismissedInviteIds.add(invite.id);
    await acceptTripInvite(invite.id, invite.trip_id);
    setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setAcceptingId(null);
  };

  const handleDeclineInvite = async (inviteId: string) => {
    _dismissedInviteIds.add(inviteId);
    await declineTripInvite(inviteId);
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

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
        { id: generateId(), name: newMemberName.trim(), role: newMemberRole },
      ],
    });
    setNewMemberName('');
    setNewMemberRole('adult');
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
        m.id === id ? { ...m, name: editName, role: editRole } : m
      ),
    });
    setEditingMemberId(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      {/* Account */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-gray-700">Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">{user?.user_metadata?.full_name ?? user?.email}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-red-500 font-medium hover:text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Connected accounts / linking */}
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-medium text-gray-500">Sign-in methods</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 flex items-center gap-2">
              <span className="text-base">🔵</span> Google
            </span>
            {hasGoogle ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Connected</span>
            ) : (
              <button onClick={handleConnectGoogle} className="text-xs text-blue-700 font-medium hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50">
                Connect
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 flex items-center gap-2">
              <span className="text-base">✉️</span> Email &amp; password
            </span>
            {hasEmailLogin ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Connected</span>
            ) : (
              <span className="text-xs text-gray-400">Set a password below</span>
            )}
          </div>
          {!hasEmailLogin && (
            <div className="flex gap-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a password (min 6)"
                minLength={6}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSetPassword}
                disabled={newPassword.length < 6}
                className="bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
              >
                Set
              </button>
            </div>
          )}
          {linkStatus && <p className="text-xs text-gray-500">{linkStatus}</p>}
        </div>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h2 className="font-bold text-amber-800 flex items-center gap-2">
            <Mail size={16} /> Trip Invites ({pendingInvites.length})
          </h2>
          {pendingInvites.map((invite) => (
            <div key={invite.id} className="bg-white rounded-lg border border-amber-100 p-3">
              <p className="text-sm font-medium text-gray-800">{invite.trip_name}</p>
              <p className="text-xs text-gray-400 mb-2">
                Invited by {invite.inviter_email ?? 'someone'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptInvite(invite)}
                  disabled={acceptingId === invite.id}
                  className="flex-1 bg-blue-700 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
                >
                  {acceptingId === invite.id ? 'Joining…' : 'Accept'}
                </button>
                <button
                  onClick={() => handleDeclineInvite(invite.id)}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-lg py-1.5 text-sm font-medium hover:bg-gray-200"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite to trip */}
      {trip && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <UserPlus size={16} /> Invite to "{trip.name}"
          </h2>
          <p className="text-xs text-gray-400">Enter someone's email — they'll see this trip when they sign in.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
              placeholder="friend@example.com"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendInvite}
              disabled={!inviteEmail.trim() || inviteStatus === 'sending'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                inviteStatus === 'sent'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              {inviteStatus === 'sending' ? 'Sending…' : inviteStatus === 'sent' ? 'Sent!' : 'Invite'}
            </button>
          </div>
          {inviteStatus === 'error' && inviteError && (
            <p className="text-red-500 text-xs">{inviteError}</p>
          )}
        </div>
      )}

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
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as 'adult' | 'kid' | 'toddler')}
                        className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="adult">Adult</option>
                        <option value="kid">Kid</option>
                        <option value="toddler">Toddler</option>
                      </select>
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
                        <span className="text-gray-400 ml-1 capitalize">({member.role ?? 'adult'})</span>
                      </span>
                      <button
                        onClick={() => { setEditingMemberId(member.id); setEditName(member.name); setEditRole(member.role ?? 'adult'); }}
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
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as 'adult' | 'kid' | 'toddler')}
              className="w-28 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="adult">Adult</option>
              <option value="kid">Kid</option>
              <option value="toddler">Toddler</option>
            </select>
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
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={16} /> My Trips</h2>
          <button onClick={handleNewTrip} className="flex items-center gap-1 text-sm text-blue-700 font-medium hover:text-blue-800">
            <Plus size={14} /> New Trip
          </button>
        </div>

        {tripSummaries.length === 0 && (
          <p className="text-gray-400 text-sm">No trips saved yet.</p>
        )}

        {(() => {
          const today = new Date().toISOString().split('T')[0];
          const current = tripSummaries.filter((s) => s.startDate <= today && s.endDate >= today);
          const upcoming = tripSummaries.filter((s) => s.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate));
          const past = tripSummaries.filter((s) => s.endDate < today).sort((a, b) => b.endDate.localeCompare(a.endDate));

          const TripCard = ({ s }: { s: typeof tripSummaries[0] }) => {
            const isActive = s.id === trip?.id;
            return (
              <div key={s.id} className={`rounded-lg border p-3 ${isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
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
          };

          return (
            <>
              {current.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">In Progress 🎉</p>
                  {current.map((s) => <TripCard key={s.id} s={s} />)}
                </div>
              )}
              {upcoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Upcoming</p>
                  {upcoming.map((s) => <TripCard key={s.id} s={s} />)}
                </div>
              )}
              {past.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Past Trips</p>
                  {past.map((s) => <TripCard key={s.id} s={s} />)}
                </div>
              )}
            </>
          );
        })()}
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
