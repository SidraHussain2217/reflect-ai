import React, { useState } from 'react';
import { Sparkles, Mic, Lock, LineChart, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface LandingPageProps {
  onAuthenticated?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      // Auth state listener in App.tsx will automatically transition to dashboard
    } catch (err: any) {
      console.error('Google Sign-In Failed:', err);
      // Friendly message
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled. Please click "Sign In with Google" to retry.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setAuthError(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between">
      {/* Top minimal header */}
      <header className="border-b border-stone-200 bg-white/70 backdrop-blur px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <span className="font-serif font-bold text-lg text-stone-900 tracking-tight">
              Reflective AI
            </span>
          </div>
          <button
            id="btn-header-sign-in"
            onClick={handleSignIn}
            disabled={loading}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Connecting...' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Main hero card */}
      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
        {authError && (
          <div id="auth-error-banner" className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center justify-between text-left">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-xs font-semibold text-amber-800 underline ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-300 text-stone-700 text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Private & Encrypted Firebase Storage</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-tight max-w-2xl mx-auto">
          Your personal empathetic companion for mindful reflection.
        </h1>

        <p className="mt-4 text-base sm:text-lg text-stone-600 max-w-xl mx-auto leading-relaxed">
          Speak your mind with voice memos or write private journal entries. Gemini acts as an empathetic guide, analyzing your emotional journey, mapping mood trends, and providing daily actionable practices.
        </p>

        {/* Primary CTA button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="btn-google-sign-in"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 font-medium text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-60"
          >
            {/* Google G icon */}
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.37 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? 'Signing In...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
          </button>
        </div>

        <p className="mt-3 text-xs text-stone-500">
          No passwords stored. Isolated per user via Firebase Authentication & Cloud Firestore.
        </p>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-stone-300 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-1">Voice Memos & Text</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Record voice reflections effortlessly or type free-form thoughts. Gemini listens to emotional pacing and sentiment.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-stone-300 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <LineChart className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-1">Mood Trends & Actions</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Track your longitudinal emotional wellbeing with mood scoring, theme categorizations, and daily micro-habits.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-stone-300 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-1">Strict User Isolation</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Zero cross-user data leakage. Hardened Firestore rules guarantee only you can read and write your personal entries.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <p>Built with Google Cloud Run, Cloud Firestore, and Gemini 3.6 Flash</p>
      </footer>
    </div>
  );
};
