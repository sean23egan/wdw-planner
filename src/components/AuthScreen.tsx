import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGoogle = async () => {
    if (!supabase) {
      setError('App is not connected to Supabase. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel environment variables.');
      return;
    }
    setError(null);
    setSuccess(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('App is not connected to Supabase. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel environment variables.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        // Email confirmation disabled — signed in immediately
      } else {
        setSuccess('Account created! If you need to confirm your email, check your inbox first, then sign in here.');
        setMode('signin');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes('confirm')) {
          setError('Please confirm your email address first — check your inbox for a confirmation link. Or ask your Supabase admin to disable email confirmation under Authentication → Email.');
        } else {
          setError(error.message);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="text-5xl">🏰</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-3">WDW Planner</h1>
          <p className="text-gray-500 text-sm mt-1">Plan your Walt Disney World vacation</p>
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or use email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'signin' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'signup' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {mode === 'signup' && (
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-blue-700 text-white rounded-xl py-3 font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center">
          Your trip data is private to your account and syncs across all your devices.
        </p>
      </div>
    </div>
  );
}
