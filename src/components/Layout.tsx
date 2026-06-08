import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Settings2, Calendar, Star, UtensilsCrossed, Ticket,
  PartyPopper, ShoppingCart, Hotel, DollarSign, Luggage, Settings, MoreHorizontal,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { daysUntil } from '../utils/dates';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/setup', label: 'Trip Setup', icon: Settings2 },
  { to: '/itinerary', label: 'Itinerary', icon: Calendar },
  { to: '/attractions', label: 'Attractions', icon: Star },
  { to: '/dining', label: 'Dining', icon: UtensilsCrossed },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/events', label: 'Events', icon: PartyPopper },
  { to: '/groceries', label: 'Groceries', icon: ShoppingCart },
  { to: '/lodging', label: 'Lodging', icon: Hotel },
  { to: '/budget', label: 'Budget', icon: DollarSign },
  { to: '/packing', label: 'Prep & Pack', icon: Luggage },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const PRIMARY_NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/itinerary', label: 'Itinerary', icon: Calendar },
  { to: '/dining', label: 'Dining', icon: UtensilsCrossed },
  { to: '/budget', label: 'Budget', icon: DollarSign },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const trip = useStore((s) => s.trip);
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const daysLeft = trip ? daysUntil(trip.startDate) : null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏰</span>
            <span className="font-bold text-lg leading-none">WDW Planner</span>
            {trip && (
              <span className="text-blue-200 text-sm hidden sm:block">— {trip.name}</span>
            )}
          </div>
          {daysLeft !== null && daysLeft >= 0 && (
            <div className="bg-amber-400 text-blue-900 font-bold text-sm px-3 py-1 rounded-full">
              {daysLeft === 0 ? 'Today!' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go!`}
            </div>
          )}
          {daysLeft !== null && daysLeft < 0 && (
            <div className="bg-green-400 text-green-900 font-bold text-sm px-3 py-1 rounded-full">
              Trip in progress!
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <nav className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200 py-4 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 max-w-full overflow-x-hidden pb-20 lg:pb-4">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex">
          {PRIMARY_NAV.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-blue-700' : 'text-gray-500'
                }`}
              >
                <Icon size={20} />
                <span className="mt-0.5 text-[10px]">{label}</span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors ${
              moreOpen ? 'text-blue-700' : 'text-gray-500'
            }`}
          >
            <MoreHorizontal size={20} />
            <span className="mt-0.5 text-[10px]">More</span>
          </button>
        </div>
      </nav>

      {/* More slide-up drawer */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-t-2xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-4 gap-2">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
                const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 active:bg-gray-100'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-center leading-tight">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
