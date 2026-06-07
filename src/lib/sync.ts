import { supabase, STATE_ROW_ID } from './supabase';
import { useStore } from '../store/useStore';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Push current Zustand state to Supabase (debounced 2s)
export function scheduleSave() {
  if (!supabase) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const state = useStore.getState();
    // Serialize only the data fields (skip actions)
    const data = {
      trip: state.trip,
      parkDays: state.parkDays,
      itineraryItems: state.itineraryItems,
      budgetCategories: state.budgetCategories,
      expenses: state.expenses,
      reservations: state.reservations,
      groceryOrder: state.groceryOrder,
      dvcMembership: state.dvcMembership,
      dvcStayOptions: state.dvcStayOptions,
      ticketOptions: state.ticketOptions,
      specialEvents: state.specialEvents,
      packingItems: state.packingItems,
      preTripTasks: state.preTripTasks,
    };
    await supabase!
      .from('app_state')
      .upsert({ id: STATE_ROW_ID, data, updated_at: new Date().toISOString() });
  }, 2000);
}

// Load from Supabase on startup and hydrate store if data found
export async function loadFromSupabase(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', STATE_ROW_ID)
    .single();
  if (error || !data?.data) return false;

  const saved = data.data as Record<string, unknown>;
  // Merge into store — only overwrite if the remote has actual trip data
  if (saved.trip !== undefined) {
    useStore.setState({
      trip: saved.trip as never,
      parkDays: (saved.parkDays as never) ?? [],
      itineraryItems: (saved.itineraryItems as never) ?? [],
      budgetCategories: (saved.budgetCategories as never) ?? [],
      expenses: (saved.expenses as never) ?? [],
      reservations: (saved.reservations as never) ?? [],
      groceryOrder: (saved.groceryOrder as never) ?? null,
      dvcMembership: (saved.dvcMembership as never) ?? null,
      dvcStayOptions: (saved.dvcStayOptions as never) ?? [],
      ticketOptions: (saved.ticketOptions as never) ?? [],
      specialEvents: (saved.specialEvents as never) ?? [],
      packingItems: (saved.packingItems as never) ?? [],
      preTripTasks: (saved.preTripTasks as never) ?? [],
    });
  }
  return true;
}
