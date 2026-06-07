import { supabase, STATE_ROW_ID } from './supabase';
import { useStore } from '../store/useStore';
import type { TripSnapshot, TripSummary } from '../types';

const SUMMARIES_ROW_ID = '__summaries__';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Push active trip state + summaries to Supabase (debounced 2s)
export function scheduleSave() {
  if (!supabase) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const state = useStore.getState();
    const tripId = state.trip?.id ?? STATE_ROW_ID;
    const snapshot = state.getSnapshot();

    await Promise.all([
      supabase!.from('app_state').upsert({ id: tripId, data: snapshot, updated_at: new Date().toISOString() }),
      supabase!.from('app_state').upsert({
        id: SUMMARIES_ROW_ID,
        data: { summaries: state.tripSummaries },
        updated_at: new Date().toISOString(),
      }),
    ]);
  }, 2000);
}

// Save a specific trip snapshot immediately (used when switching away from a trip)
export async function saveTripSnapshot(tripId: string, snapshot: TripSnapshot) {
  localStorage.setItem(`wdw-planner-trip-${tripId}`, JSON.stringify(snapshot));
  if (!supabase) return;
  await supabase.from('app_state').upsert({ id: tripId, data: snapshot, updated_at: new Date().toISOString() });
}

// Save trip summaries list
export async function saveTripSummaries(summaries: TripSummary[]) {
  localStorage.setItem('wdw-planner-summaries', JSON.stringify(summaries));
  if (!supabase) return;
  await supabase.from('app_state').upsert({
    id: SUMMARIES_ROW_ID,
    data: { summaries },
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

// Load all trip summaries (Supabase first, localStorage fallback)
export async function loadTripSummaries(): Promise<TripSummary[]> {
  if (supabase) {
    const { data, error } = await supabase.from('app_state').select('data').eq('id', SUMMARIES_ROW_ID).single();
    if (!error && data?.data) {
      const summaries = (data.data as { summaries: TripSummary[] }).summaries ?? [];
      return summaries;
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

// Load the active trip from Supabase on startup
export async function loadFromSupabase(): Promise<boolean> {
  // First, load summaries into the store
  const summaries = await loadTripSummaries();
  if (summaries.length > 0) {
    useStore.getState().setTripSummaries(summaries);
  }

  // Try to load the active trip state from Supabase
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', STATE_ROW_ID)
    .single();
  if (error || !data?.data) return false;

  const saved = data.data as TripSnapshot;
  if (saved.trip !== undefined) {
    useStore.getState().loadSnapshot(saved);
    return true;
  }
  return false;
}
