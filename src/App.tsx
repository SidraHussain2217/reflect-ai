import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signOutUser, subscribeToUserInteractions, toggleTakeawayCompleted, deleteUserInteraction } from './lib/firebase';
import type { Interaction, UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { JournalInput } from './components/JournalInput';
import { MoodTrendChart } from './components/MoodTrendChart';
import { ActionableTakeaways } from './components/ActionableTakeaways';
import { EntryHistory } from './components/EntryHistory';
import { EntryDetailModal } from './components/EntryDetailModal';
import { Sparkles, Heart } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Interaction | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      } else {
        setCurrentUser(null);
        setInteractions([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore subscription isolated to authenticated user
  useEffect(() => {
    if (!currentUser) return;

    setDbError(null);
    const unsubscribe = subscribeToUserInteractions(
      currentUser.uid,
      (data) => {
        setInteractions(data);
      },
      (err) => {
        console.error('Real-time interaction subscription error:', err);
        setDbError('Could not sync journal entries with Firestore. Retrying connection...');
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Toggle takeaway completion
  const handleToggleTakeaway = async (interactionId: string, currentStatus: boolean) => {
    if (!currentUser) return;
    try {
      await toggleTakeawayCompleted(currentUser.uid, interactionId, !currentStatus);
    } catch (err) {
      console.error('Failed to toggle takeaway:', err);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (interactionId: string) => {
    if (!currentUser) return;
    if (window.confirm('Are you sure you want to delete this journal interaction from Firestore?')) {
      try {
        await deleteUserInteraction(currentUser.uid, interactionId);
        if (selectedEntry?.id === interactionId) {
          setSelectedEntry(null);
        }
      } catch (err) {
        console.error('Failed to delete interaction:', err);
      }
    }
  };

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-200 flex items-center justify-center shadow-md animate-pulse mb-4">
          <Sparkles className="w-6 h-6 text-amber-300" />
        </div>
        <p className="font-serif font-medium text-stone-700 text-sm">Reflective AI Journal</p>
        <p className="text-xs text-stone-400 mt-1">Checking secure session...</p>
      </div>
    );
  }

  // Unauthenticated View
  if (!currentUser) {
    return <LandingPage />;
  }

  // Authenticated User Dashboard
  return (
    <div className="min-h-screen bg-stone-50/70 text-stone-900 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onSignOut={handleSignOut}
        totalEntries={interactions.length}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Firestore Alert if any */}
        {dbError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <span>{dbError}</span>
            <button
              onClick={() => setDbError(null)}
              className="text-xs font-semibold text-amber-800 underline ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Welcome greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
              Welcome, {currentUser.displayName?.split(' ')[0] || 'Friend'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Take a mindful breath. What would you like to reflect upon today?
            </p>
          </div>
        </div>

        {/* Input composer (text or voice memo) */}
        <JournalInput
          userId={currentUser.uid}
          recentInteractions={interactions}
          onEntrySaved={(newEntry) => {
            setSelectedEntry(newEntry);
          }}
        />

        {/* Visualizations & Takeaways Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MoodTrendChart interactions={interactions} />
          </div>
          <div>
            <ActionableTakeaways
              interactions={interactions}
              onToggleCompleted={handleToggleTakeaway}
            />
          </div>
        </div>

        {/* Entry History & Archive */}
        <EntryHistory
          interactions={interactions}
          onSelectEntry={(entry) => setSelectedEntry(entry)}
          onDeleteEntry={handleDeleteEntry}
        />
      </main>

      {/* Detail Modal */}
      <EntryDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />

      {/* Subtle Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400 flex items-center justify-center gap-1">
        <span>Mindfully crafted with Gemini 3.6 Flash & Cloud Firestore</span>
        <span>•</span>
        <Heart className="w-3 h-3 text-rose-400 fill-current inline" />
      </footer>
    </div>
  );
}
