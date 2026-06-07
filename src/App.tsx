import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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
import { useStore } from './store/useStore';
import { loadFromSupabase, scheduleSave } from './lib/sync';

export default function App() {
  const initializeDefaultData = useStore((s) => s.initializeDefaultData);

  useEffect(() => {
    // Load from Supabase first; fall back to localStorage defaults
    loadFromSupabase().then((loaded) => {
      if (!loaded) initializeDefaultData();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to store changes and sync to Supabase
  useEffect(() => {
    const unsub = useStore.subscribe(() => scheduleSave());
    return unsub;
  }, []);

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
      </Routes>
    </Layout>
  );
}
