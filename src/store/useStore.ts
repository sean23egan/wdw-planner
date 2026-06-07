import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Trip, ParkDay, ItineraryItem, BudgetCategory, Expense,
  Reservation, GroceryOrder, GroceryItem, DVCMembership, DVCStayOption,
  TicketOption, SpecialEvent, PackingItem, PreTripTask, TripSummary, TripSnapshot,
} from '../types';
import { generateId } from '../utils/ids';

interface AppState {
  // Multi-trip registry
  tripSummaries: TripSummary[];

  // Active trip data (full snapshot for the currently loaded trip)
  trip: Trip | null;
  parkDays: ParkDay[];
  itineraryItems: ItineraryItem[];
  budgetCategories: BudgetCategory[];
  expenses: Expense[];
  reservations: Reservation[];
  groceryOrder: GroceryOrder | null;
  dvcMembership: DVCMembership | null;
  dvcStayOptions: DVCStayOption[];
  ticketOptions: TicketOption[];
  specialEvents: SpecialEvent[];
  packingItems: PackingItem[];
  preTripTasks: PreTripTask[];

  setTrip: (trip: Trip) => void;
  addParkDay: (day: ParkDay) => void;
  updateParkDay: (id: string, updates: Partial<ParkDay>) => void;
  removeParkDay: (id: string) => void;

  addItineraryItem: (item: ItineraryItem) => void;
  updateItineraryItem: (id: string, updates: Partial<ItineraryItem>) => void;
  removeItineraryItem: (id: string) => void;
  reorderItineraryItems: (parkDayId: string, newOrder: string[]) => void;

  addBudgetCategory: (cat: BudgetCategory) => void;
  updateBudgetCategory: (id: string, updates: Partial<BudgetCategory>) => void;
  removeBudgetCategory: (id: string) => void;
  addExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;

  addReservation: (res: Reservation) => void;
  updateReservation: (id: string, updates: Partial<Reservation>) => void;
  removeReservation: (id: string) => void;

  setGroceryOrder: (order: GroceryOrder) => void;
  addGroceryItem: (item: GroceryItem) => void;
  updateGroceryItem: (id: string, updates: Partial<GroceryItem>) => void;
  removeGroceryItem: (id: string) => void;

  setDVCMembership: (membership: DVCMembership) => void;
  addDVCStayOption: (option: DVCStayOption) => void;
  removeDVCStayOption: (id: string) => void;

  addTicketOption: (ticket: TicketOption) => void;
  updateTicketOption: (id: string, updates: Partial<TicketOption>) => void;
  removeTicketOption: (id: string) => void;
  selectTicketOption: (id: string) => void;

  addSpecialEvent: (event: SpecialEvent) => void;
  removeSpecialEvent: (id: string) => void;

  addPackingItem: (item: PackingItem) => void;
  togglePackingItem: (id: string) => void;
  removePackingItem: (id: string) => void;
  addPreTripTask: (task: PreTripTask) => void;
  togglePreTripTask: (id: string) => void;

  initializeDefaultData: () => void;

  // Multi-trip management
  getSnapshot: () => TripSnapshot;
  loadSnapshot: (snapshot: TripSnapshot) => void;
  upsertTripSummary: (summary: TripSummary) => void;
  removeTripSummary: (id: string) => void;
  createNewTrip: () => void;
  switchToTrip: (snapshot: TripSnapshot) => void;
  setTripSummaries: (summaries: TripSummary[]) => void;
}

const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: 'bc-tickets', name: 'Tickets/Passes', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '🎫' },
  { id: 'bc-lodging', name: 'Lodging', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '🏨' },
  { id: 'bc-dining', name: 'Dining', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '🍽️' },
  { id: 'bc-groceries', name: 'Groceries', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '🛒' },
  { id: 'bc-transport', name: 'Transportation', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '✈️' },
  { id: 'bc-gifts', name: 'Gifts/Souvenirs', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '🛍️' },
  { id: 'bc-ll', name: 'Lightning Lane', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '⚡' },
  { id: 'bc-memory-maker', name: 'Memory Maker', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '📸' },
  { id: 'bc-events', name: 'Special Events', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '🎉' },
  { id: 'bc-misc', name: 'Misc / Snacks', plannedAmount: 0, actualAmount: 0, paidOff: false, icon: '🍦' },
];

const DEFAULT_PRE_TRIP_TASKS: PreTripTask[] = [
  { id: 'pt-mde-app', name: 'Set up My Disney Experience app', daysBeforeTrip: 90, done: false, category: 'Planning' },
  { id: 'pt-mwr-check', name: 'Check MWR/ITT office for tickets', daysBeforeTrip: 90, done: false, category: 'Tickets' },
  { id: 'pt-link-tickets', name: 'Link tickets in My Disney Experience', done: false, category: 'Tickets' },
  { id: 'pt-park-pass', name: 'Set up park pass reservations', done: false, category: 'Planning' },
  { id: 'pt-adr', name: 'Book Advance Dining Reservations (ADR)', daysBeforeTrip: 60, done: false, category: 'Dining' },
  { id: 'pt-ills', name: 'Purchase Lightning Lane Individual Selections (if applicable)', daysBeforeTrip: 60, done: false, category: 'Planning' },
  { id: 'pt-resort-checkin', name: 'Mobile check-in for resort', daysBeforeTrip: 10, done: false, category: 'Lodging' },
  { id: 'pt-grocery-order', name: 'Order Walmart grocery delivery', daysBeforeTrip: 7, done: false, category: 'Groceries' },
  { id: 'pt-offline-maps', name: 'Download offline park maps', daysBeforeTrip: 7, done: false, category: 'Planning' },
  { id: 'pt-genie-plus', name: 'Book Genie+ / Lightning Lane (day of, 7am)', done: false, category: 'Planning' },
];

const DEFAULT_PACKING_ITEMS: PackingItem[] = [
  { id: 'pk-ponchos', name: 'Rain ponchos', category: 'park-essentials', packed: false },
  { id: 'pk-shoes', name: 'Comfortable walking shoes', category: 'clothing', packed: false },
  { id: 'pk-bag', name: 'Park bag / backpack', category: 'park-essentials', packed: false },
  { id: 'pk-sunscreen', name: 'Sunscreen', category: 'toiletries', packed: false },
  { id: 'pk-charger', name: 'Portable phone charger (power bank)', category: 'electronics', packed: false },
  { id: 'pk-water-bottles', name: 'Reusable water bottles', category: 'park-essentials', packed: false },
  { id: 'pk-autograph-book', name: 'Autograph book', category: 'park-essentials', packed: false },
  { id: 'pk-magic-bands', name: 'MagicBands', category: 'documents', packed: false },
  { id: 'pk-tickets', name: 'Park tickets / passes', category: 'documents', packed: false },
  { id: 'pk-hotel-conf', name: 'Hotel confirmation printout', category: 'documents', packed: false },
  { id: 'pk-photo-id', name: 'Photo IDs for all adults', category: 'documents', packed: false },
  { id: 'pk-first-aid', name: 'First aid kit (bandages, pain reliever)', category: 'toiletries', packed: false },
  { id: 'pk-hand-sanitizer', name: 'Hand sanitizer', category: 'toiletries', packed: false },
  { id: 'pk-sunglasses', name: 'Sunglasses', category: 'clothing', packed: false },
  { id: 'pk-hat', name: 'Hat / cap', category: 'clothing', packed: false },
  { id: 'pk-cables', name: 'Extra phone cables', category: 'electronics', packed: false },
  { id: 'pk-kids-snacks', name: "Kids' snacks for travel", category: 'kids', packed: false },
  { id: 'pk-change-clothes', name: 'Change of clothes in park bag', category: 'clothing', packed: false },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tripSummaries: [],
      trip: null,
      parkDays: [],
      itineraryItems: [],
      budgetCategories: [],
      expenses: [],
      reservations: [],
      groceryOrder: null,
      dvcMembership: null,
      dvcStayOptions: [],
      ticketOptions: [],
      specialEvents: [],
      packingItems: [],
      preTripTasks: [],

      setTrip: (trip) => {
        set({ trip });
        // Keep the summaries registry in sync
        const summary: TripSummary = {
          id: trip.id,
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          resortName: trip.resortName,
          createdAt: get().tripSummaries.find((s) => s.id === trip.id)?.createdAt ?? new Date().toISOString(),
        };
        get().upsertTripSummary(summary);
      },

      addParkDay: (day) => set((s) => ({ parkDays: [...s.parkDays, day] })),
      updateParkDay: (id, updates) =>
        set((s) => ({ parkDays: s.parkDays.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),
      removeParkDay: (id) =>
        set((s) => ({ parkDays: s.parkDays.filter((d) => d.id !== id) })),

      addItineraryItem: (item) =>
        set((s) => ({ itineraryItems: [...s.itineraryItems, item] })),
      updateItineraryItem: (id, updates) =>
        set((s) => ({
          itineraryItems: s.itineraryItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      removeItineraryItem: (id) =>
        set((s) => ({ itineraryItems: s.itineraryItems.filter((i) => i.id !== id) })),
      reorderItineraryItems: (parkDayId, newOrder) =>
        set((s) => ({
          itineraryItems: s.itineraryItems.map((item) => {
            if (item.parkDayId !== parkDayId) return item;
            const idx = newOrder.indexOf(item.id);
            return idx >= 0 ? { ...item, sortOrder: idx } : item;
          }),
        })),

      addBudgetCategory: (cat) =>
        set((s) => ({ budgetCategories: [...s.budgetCategories, cat] })),
      updateBudgetCategory: (id, updates) =>
        set((s) => ({
          budgetCategories: s.budgetCategories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      removeBudgetCategory: (id) =>
        set((s) => ({ budgetCategories: s.budgetCategories.filter((c) => c.id !== id) })),
      addExpense: (expense) =>
        set((s) => ({ expenses: [...s.expenses, expense] })),
      removeExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      addReservation: (res) =>
        set((s) => ({ reservations: [...s.reservations, res] })),
      updateReservation: (id, updates) =>
        set((s) => ({
          reservations: s.reservations.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      removeReservation: (id) =>
        set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) })),

      setGroceryOrder: (order) => set({ groceryOrder: order }),
      addGroceryItem: (item) =>
        set((s) => {
          if (!s.groceryOrder) return s;
          return { groceryOrder: { ...s.groceryOrder, items: [...s.groceryOrder.items, item] } };
        }),
      updateGroceryItem: (id, updates) =>
        set((s) => {
          if (!s.groceryOrder) return s;
          return {
            groceryOrder: {
              ...s.groceryOrder,
              items: s.groceryOrder.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
            },
          };
        }),
      removeGroceryItem: (id) =>
        set((s) => {
          if (!s.groceryOrder) return s;
          return {
            groceryOrder: {
              ...s.groceryOrder,
              items: s.groceryOrder.items.filter((i) => i.id !== id),
            },
          };
        }),

      setDVCMembership: (membership) => set({ dvcMembership: membership }),
      addDVCStayOption: (option) =>
        set((s) => ({ dvcStayOptions: [...s.dvcStayOptions, option] })),
      removeDVCStayOption: (id) =>
        set((s) => ({ dvcStayOptions: s.dvcStayOptions.filter((o) => o.id !== id) })),

      addTicketOption: (ticket) =>
        set((s) => ({ ticketOptions: [...s.ticketOptions, ticket] })),
      updateTicketOption: (id, updates) =>
        set((s) => ({
          ticketOptions: s.ticketOptions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTicketOption: (id) =>
        set((s) => ({ ticketOptions: s.ticketOptions.filter((t) => t.id !== id) })),
      selectTicketOption: (id) =>
        set((s) => ({
          ticketOptions: s.ticketOptions.map((t) => ({ ...t, isSelected: t.id === id })),
        })),

      addSpecialEvent: (event) =>
        set((s) => ({ specialEvents: [...s.specialEvents, event] })),
      removeSpecialEvent: (id) =>
        set((s) => ({ specialEvents: s.specialEvents.filter((e) => e.id !== id) })),

      addPackingItem: (item) =>
        set((s) => ({ packingItems: [...s.packingItems, item] })),
      togglePackingItem: (id) =>
        set((s) => ({
          packingItems: s.packingItems.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i)),
        })),
      removePackingItem: (id) =>
        set((s) => ({ packingItems: s.packingItems.filter((i) => i.id !== id) })),
      addPreTripTask: (task) =>
        set((s) => ({ preTripTasks: [...s.preTripTasks, task] })),
      togglePreTripTask: (id) =>
        set((s) => ({
          preTripTasks: s.preTripTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      getSnapshot: (): TripSnapshot => {
        const s = get();
        return {
          trip: s.trip,
          parkDays: s.parkDays,
          itineraryItems: s.itineraryItems,
          budgetCategories: s.budgetCategories,
          expenses: s.expenses,
          reservations: s.reservations,
          groceryOrder: s.groceryOrder,
          dvcMembership: s.dvcMembership,
          dvcStayOptions: s.dvcStayOptions,
          ticketOptions: s.ticketOptions,
          specialEvents: s.specialEvents,
          packingItems: s.packingItems,
          preTripTasks: s.preTripTasks,
        };
      },

      loadSnapshot: (snapshot: TripSnapshot) => {
        set({
          trip: snapshot.trip,
          parkDays: snapshot.parkDays ?? [],
          itineraryItems: snapshot.itineraryItems ?? [],
          budgetCategories: snapshot.budgetCategories ?? [],
          expenses: snapshot.expenses ?? [],
          reservations: snapshot.reservations ?? [],
          groceryOrder: snapshot.groceryOrder ?? null,
          dvcMembership: snapshot.dvcMembership ?? null,
          dvcStayOptions: snapshot.dvcStayOptions ?? [],
          ticketOptions: snapshot.ticketOptions ?? [],
          specialEvents: snapshot.specialEvents ?? [],
          packingItems: snapshot.packingItems ?? [],
          preTripTasks: snapshot.preTripTasks ?? [],
        });
      },

      upsertTripSummary: (summary: TripSummary) =>
        set((s) => ({
          tripSummaries: s.tripSummaries.find((t) => t.id === summary.id)
            ? s.tripSummaries.map((t) => (t.id === summary.id ? summary : t))
            : [...s.tripSummaries, summary],
        })),

      removeTripSummary: (id: string) =>
        set((s) => ({ tripSummaries: s.tripSummaries.filter((t) => t.id !== id) })),

      setTripSummaries: (summaries: TripSummary[]) => set({ tripSummaries: summaries }),

      createNewTrip: () => {
        // Save current trip snapshot to localStorage before clearing
        const s = get();
        if (s.trip) {
          const snapshot = s.getSnapshot();
          localStorage.setItem(`wdw-planner-trip-${s.trip.id}`, JSON.stringify(snapshot));
        }
        // Clear to fresh state with new default budget categories
        set({
          trip: null,
          parkDays: [],
          itineraryItems: [],
          budgetCategories: DEFAULT_BUDGET_CATEGORIES.map((c) => ({ ...c, id: generateId() })),
          expenses: [],
          reservations: [],
          groceryOrder: null,
          dvcMembership: null,
          dvcStayOptions: [],
          ticketOptions: [],
          specialEvents: [],
          packingItems: DEFAULT_PACKING_ITEMS.map((p) => ({ ...p, id: generateId() })),
          preTripTasks: DEFAULT_PRE_TRIP_TASKS.map((t) => ({ ...t, id: generateId() })),
        });
      },

      switchToTrip: (snapshot: TripSnapshot) => {
        // Save current trip to localStorage first
        const s = get();
        if (s.trip) {
          const current = s.getSnapshot();
          localStorage.setItem(`wdw-planner-trip-${s.trip.id}`, JSON.stringify(current));
        }
        // Load the target trip
        set({
          trip: snapshot.trip,
          parkDays: snapshot.parkDays ?? [],
          itineraryItems: snapshot.itineraryItems ?? [],
          budgetCategories: snapshot.budgetCategories ?? [],
          expenses: snapshot.expenses ?? [],
          reservations: snapshot.reservations ?? [],
          groceryOrder: snapshot.groceryOrder ?? null,
          dvcMembership: snapshot.dvcMembership ?? null,
          dvcStayOptions: snapshot.dvcStayOptions ?? [],
          ticketOptions: snapshot.ticketOptions ?? [],
          specialEvents: snapshot.specialEvents ?? [],
          packingItems: snapshot.packingItems ?? [],
          preTripTasks: snapshot.preTripTasks ?? [],
        });
      },

      initializeDefaultData: () => {
        const state = get();
        if (state.budgetCategories.length === 0) {
          set({ budgetCategories: DEFAULT_BUDGET_CATEGORIES });
        }
        if (state.preTripTasks.length === 0) {
          set({ preTripTasks: DEFAULT_PRE_TRIP_TASKS });
        }
        if (state.packingItems.length === 0) {
          set({ packingItems: DEFAULT_PACKING_ITEMS });
        }
      },
    }),
    {
      name: 'wdw-planner-storage',
    }
  )
);
