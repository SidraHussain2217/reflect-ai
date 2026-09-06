import React from 'react';
import { Sparkles, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
  onSignOut: () => void;
  totalEntries: number;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSignOut, totalEntries }) => {
  return (
    <header id="app-navbar" className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Status */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif font-semibold text-lg text-stone-900 tracking-tight">
                Reflective AI
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Firestore Isolated
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Empathetic journaling powered by Gemini & Firestore
            </p>
          </div>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} saved</span>
          </div>

          <div className="flex items-center space-x-3 pl-2 sm:border-l sm:border-stone-200">
            <div className="flex items-center space-x-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-stone-200 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-stone-800 leading-none">
                  {user.displayName || user.email?.split('@')[0] || 'Member'}
                </p>
                <p className="text-[10px] text-stone-500 truncate max-w-[140px] leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              id="btn-sign-out"
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
