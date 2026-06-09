import { useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthScreen from './components/AuthScreen';
import Dashboard from './pages/Dashboard';
import TripSetup from './pages/TripSetup';
import Itinerary from './pages/Itinerary';
import AttractionBrowser from './pages/AttractionBrowser';
import Dining from './pages/Dining';
import Budget from './pages/Budget';
import Groceries from './pages/Groceries';
import Lodging from './pages/Lodging';
import Tickets from './pages/Tickets';
import SpecialEvents from './pages/SpecialEvents';
import Packing from './pages/Packing';
import Settings from './pages/Settings';
import WishList from './pages/WishList';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import { loadFromSupabase, scheduleSave } from './lib/sync';

export default function App() {
  const { user, loading } = useAuth();
  const initializeDefaultData = useStore((s) => s.initializeDefaultData);
  const clearStore = useStore((s) => s.clearStore);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Clear state when a different user signs in
    if (prevUserId.current && prevUserId.current !== user.id) {
      clearStore();
    }
    prevUserId.current = user.id;

    loadFromSupabase().then((loaded) => {
      if (!loaded) initializeDefaultData();
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to store changes and sync to Supabase
  useEffect(() => {
    const unsub = useStore.subscribe(() => scheduleSave());
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
        <div className="text-white text-lg font-medium animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={<TripSetup />} />
        <Route path="/itinerary" element={<Itinerary />} />
        <Route path="/attractions" element={<AttractionBrowser />} />
        <Route path="/dining" element={<Dining />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/events" element={<SpecialEvents />} />
        <Route path="/groceries" element={<Groceries />} />
        <Route path="/lodging" element={<Lodging />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/packing" element={<Packing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/wishlist" element={<WishList />} />
      </Routes>
    </Layout>
  );
}
