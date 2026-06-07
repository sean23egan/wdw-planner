import { supabase } from './supabase';
import { useStore } from '../store/useStore';
import type { TripSnapshot, TripSummary } from '../types';

const SUMMARIES_PREFIX = '__summaries__:';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

async function getCurrentUserId(): Promise<string | null> {
  const s = await getSession();
  return s?.user?.id ?? null;
}

function summariesKey(userId: string) {
  return `${SUMMARIES_PREFIX}${userId}`;
}

// Push active trip state + summaries to Supabase (debounced 2s)
export function scheduleSave() {
  if (!supabase) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const state = useStore.getState();
    const tripId = state.trip?.id;
    if (!tripId) return;
    const snapshot = state.getSnapshot();

    await Promise.all([
      supabase!.from('app_state').upsert({
        id: tripId,
        data: snapshot,
        user_id: userId,
        updated_at: new Date().toISOString(),
      }),
      supabase!.from('app_state').upsert({
        id: summariesKey(userId),
        data: { summaries: state.tripSummaries, activeTripId: tripId },
        user_id: userId,
        updated_at: new Date().toISOString(),
      }),
    ]);
  }, 2000);
}

// Save a specific trip snapshot immediately
export async function saveTripSnapshot(tripId: string, snapshot: TripSnapshot) {
  localStorage.setItem(`wdw-planner-trip-${tripId}`, JSON.stringify(snapshot));
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from('app_state').upsert({
    id: tripId,
    data: snapshot,
    user_id: userId,
    updated_at: new Date().toISOString(),
  });
}

// Save trip summaries list
export async function saveTripSummaries(summaries: TripSummary[]) {
  localStorage.setItem('wdw-planner-summaries', JSON.stringify(summaries));
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  const activeTripId = useStore.getState().trip?.id;
  await supabase.from('app_state').upsert({
    id: summariesKey(userId),
    data: { summaries, activeTripId },
    user_id: userId,
    updated_at: new Date().toISOString(),
  });
}

// Load a trip snapshot by ID (Supabase first, localStorage fallback)
export async function loadTripSnapshot(tripId: string): Promise<TripSnapshot | null> {
  if (supabase) {
    const { data, error } = await supabase.from('app_state').select('data').eq('id', tripId).single();
    if (!error && data?.data) return data.data as TripSnapshot;
  }
  const local = localStorage.getItem(`wdw-planner-trip-${tripId}`);
  if (local) {
    try { return JSON.parse(local) as TripSnapshot; } catch { /* ignore */ }
  }
  return null;
}

// Load all trip summaries for the current user
export async function loadTripSummaries(): Promise<TripSummary[]> {
  if (supabase) {
    const userId = await getCurrentUserId();
    if (userId) {
      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', summariesKey(userId))
        .single();
      if (!error && data?.data) {
        return (data.data as { summaries: TripSummary[] }).summaries ?? [];
      }
    }
  }
  const local = localStorage.getItem('wdw-planner-summaries');
  if (local) {
    try { return JSON.parse(local) as TripSummary[]; } catch { /* ignore */ }
  }
  return [];
}

// Delete a trip's data from storage
export async function deleteTripData(tripId: string) {
  localStorage.removeItem(`wdw-planner-trip-${tripId}`);
  if (!supabase) return;
  await supabase.from('app_state').delete().eq('id', tripId);
}

/** Pick the best trip to load on startup: in-progress first, then soonest upcoming, then most recent past. */
function pickBestTripId(summaries: TripSummary[], storedActiveId?: string): string | undefined {
  if (summaries.length === 0) return storedActiveId;
  const today = new Date().toISOString().split('T')[0];

  // Currently in-progress
  const inProgress = summaries.filter((s) => s.startDate <= today && s.endDate >= today);
  if (inProgress.length > 0) return inProgress[0].id;

  // Soonest upcoming
  const upcoming = summaries
    .filter((s) => s.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (upcoming.length > 0) return upcoming[0].id;

  // Most recent past
  const past = summaries
    .filter((s) => s.endDate < today)
    .sort((a, b) => b.endDate.localeCompare(a.endDate));
  if (past.length > 0) return past[0].id;

  return storedActiveId;
}

// Load the active trip from Supabase on startup
export async function loadFromSupabase(): Promise<boolean> {
  if (!supabase) return false;
  const userId = await getCurrentUserId();
  if (!userId) return false;

  // Load summaries
  const summaries = await loadTripSummaries();
  if (summaries.length > 0) {
    useStore.getState().setTripSummaries(summaries);
  }

  // Get storedActiveTripId from summaries row
  const { data: summData } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', summariesKey(userId))
    .single();
  const storedActiveId = (summData?.data as { activeTripId?: string } | null)?.activeTripId;

  // Prefer soonest upcoming / in-progress trip over the stored active
  const bestId = pickBestTripId(summaries, storedActiveId);

  if (bestId) {
    const snapshot = await loadTripSnapshot(bestId);
    if (snapshot?.trip) {
      useStore.getState().loadSnapshot(snapshot);
      return true;
    }
  }

  // Fallback: load most recently updated trip for this user
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('user_id', userId)
    .not('id', 'like', `${SUMMARIES_PREFIX}%`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.data) return false;
  const saved = data.data as TripSnapshot;
  if (saved.trip !== undefined) {
    useStore.getState().loadSnapshot(saved);
    return true;
  }
  return false;
}

// ── Invite management ─────────────────────────────────────────────────────

export async function sendTripInvite(
  tripId: string,
  tripName: string,
  invitedEmail: string
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not connected to Supabase' };
  const session = await getSession();
  if (!session) return { error: 'Not signed in' };

  // Check if already invited
  const { data: existing } = await supabase
    .from('trip_invites')
    .select('id, status')
    .eq('trip_id', tripId)
    .eq('invited_email', invitedEmail.toLowerCase())
    .maybeSingle();
  if (existing && existing.status === 'pending') {
    return { error: 'Already invited' };
  }

  const { error } = await supabase.from('trip_invites').insert({
    trip_id: tripId,
    trip_name: tripName,
    invited_email: invitedEmail.toLowerCase().trim(),
    invited_by: session.user.id,
    inviter_email: session.user.email ?? null,
  });
  return { error: error?.message ?? null };
}

export async function loadPendingInvites() {
  if (!supabase) return [];
  const session = await getSession();
  if (!session?.user?.email) return [];
  const { data, error } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('invited_email', session.user.email.toLowerCase())
    .eq('status', 'pending');
  if (error || !data) return [];
  return data as Array<{
    id: string;
    trip_id: string;
    trip_name: string;
    inviter_email: string | null;
    status: string;
    created_at: string;
  }>;
}

export async function acceptTripInvite(inviteId: string, tripId: string) {
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;

  // Add user as trip member
  await supabase.from('trip_members').upsert({
    trip_id: tripId,
    user_id: userId,
    role: 'editor',
    invited_by: null,
  });

  // Mark invite accepted
  await supabase.from('trip_invites').update({ status: 'accepted' }).eq('id', inviteId);

  // Load the trip and add to this user's summaries
  const snapshot = await loadTripSnapshot(tripId);
  if (snapshot?.trip) {
    const state = useStore.getState();
    if (!state.tripSummaries.find((s) => s.id === tripId)) {
      const newSummary: TripSummary = {
        id: snapshot.trip.id,
        name: snapshot.trip.name,
        startDate: snapshot.trip.startDate,
        endDate: snapshot.trip.endDate,
        resortName: snapshot.trip.resortName,
        createdAt: new Date().toISOString(),
      };
      const updated = [...state.tripSummaries, newSummary];
      state.setTripSummaries(updated);
      await saveTripSummaries(updated);
    }
  }
}

export async function declineTripInvite(inviteId: string) {
  if (!supabase) return;
  await supabase.from('trip_invites').update({ status: 'declined' }).eq('id', inviteId);
}
