export type Park = 'Magic Kingdom' | 'EPCOT' | 'Hollywood Studios' | 'Animal Kingdom';

export interface TripSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  resortName?: string;
  createdAt: string;
}

export interface TripSnapshot {
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
}
export type ServiceType = 'table-service' | 'quick-service' | 'snack';
export type PriceTier = '$' | '$$' | '$$$' | '$$$$';
export type TicketType = 'multi-day' | 'annual-pass' | 'mwr';
export type IntensityLevel = 'mild' | 'moderate' | 'thrilling';
export type ItemType = 'attraction' | 'show' | 'meal' | 'break' | 'event';

export interface PartyMember {
  id: string;
  name: string;
  role: 'adult' | 'kid' | 'toddler';
}

export interface DiningCounts {
  qsBreakfasts: number;
  qsDinners: number;
  qsDinnerAlcohol: boolean;
  tsDinners: number;
  charBreakfasts: number;
  charDinners: number;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  partyMembers: PartyMember[];
  overallBudget: number;
  resortName?: string;
  notes?: string;
  giftCardBalance?: number;
  diningCounts?: DiningCounts;
}

export interface ParkDay {
  id: string;
  tripId: string;
  date: string;
  park: Park;
  isHopDay: boolean;
  hopToPark?: Park;
  hopTime?: string;
  notes?: string;
}

export interface ItineraryItem {
  id: string;
  parkDayId: string;
  type: ItemType;
  name: string;
  time?: string;
  duration?: number;
  notes?: string;
  lightningLane: boolean;
  sortOrder: number;
}

export interface Attraction {
  id: string;
  park: Park;
  land: string;
  name: string;
  heightRequirementInches?: number;
  lightningLaneEligible: boolean;
  waitTimeTier: 'low' | 'medium' | 'high';
  isIndoor: boolean;
  intensity: IntensityLevel;
  description?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  location: string;
  serviceType: ServiceType;
  cuisine: string;
  priceTier: PriceTier;
  diningPlanEligible: boolean;
  dietaryTags: string[];
  description?: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  confirmationNumber?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  plannedAmount: number;
  actualAmount: number;
  paidOff: boolean;
  notes?: string;
  icon?: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  date: string;
  description: string;
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  assignedPersonId?: string;
  packed: boolean;
}

export interface PreTripTask {
  id: string;
  name: string;
  daysBeforeTrip?: number;
  dueDate?: string;
  done: boolean;
  category: string;
}

export interface GroceryItem {
  id: string;
  orderId: string;
  name: string;
  category: string;
  quantity: number;
  estimatedUnitPrice: number;
}

export interface GroceryOrder {
  id: string;
  deliveryDate?: string;
  deliveryWindow?: string;
  deliveryNotes?: string;
  items: GroceryItem[];
}

export interface DVCMembership {
  homeResort: string;
  currentPoints: number;
  bankedPoints: number;
  borrowedPoints: number;
  useYearMonth: number;
  expirationDate?: string;
}

export interface DVCStayOption {
  id: string;
  resort: string;
  roomType: 'Studio' | '1BR' | '2BR' | 'Grand Villa';
  startDate: string;
  endDate: string;
  pointsRequired: number;
  equivalentCashRate?: number;
  notes?: string;
}

export interface SpecialEvent {
  id: string;
  name: string;
  type: 'hard-ticket-party' | 'after-hours' | 'festival' | 'tour';
  dates: string[];
  affectedPark: Park;
  ticketCost?: number;
  notes?: string;
  festivalBoothNotes?: string;
}

export interface TicketOption {
  id: string;
  type: TicketType;
  tierOrPlanName?: string;
  quantity: number;
  pricePerTicket: number;
  expirationDate?: string;
  blockoutDates?: string[];
  buyByDate?: string;
  notes?: string;
  isSelected: boolean;
}
