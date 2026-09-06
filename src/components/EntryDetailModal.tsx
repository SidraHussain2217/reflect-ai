import React from 'react';
import { X, Sparkles, Volume2, Compass, Calendar, Smile } from 'lucide-react';
import type { Interaction } from '../types';

interface EntryDetailModalProps {
  entry: Interaction | null;
  onClose: () => void;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({ entry, onClose }) => {
  if (!entry) return null;

  const date = new Date(entry.createdAt);
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-stone-200 shadow-xl flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-sm text-stone-900 leading-tight">
                {formattedDate}
              </h3>
              <p className="text-[11px] text-stone-500">{formattedTime}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Mood badge & Score Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                  Detected Mood
                </p>
                <p className="text-sm font-semibold text-stone-900">{entry.moodLabel}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-bold text-stone-900">{entry.moodScore}</span>
              <span className="text-xs text-stone-500"> / 10</span>
            </div>
          </div>

          {/* User's Original Input */}
          <div>
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Your Reflection
            </h4>
            <div className="p-4 rounded-xl bg-stone-50 text-xs sm:text-sm text-stone-800 leading-relaxed border border-stone-100 whitespace-pre-wrap">
              {entry.prompt}
            </div>
          </div>

          {/* Voice Memo Playback if present */}
          {entry.audioData && (
            <div>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                Recorded Voice Memo
              </h4>
              <audio
                controls
                src={
                  entry.audioData.startsWith('data:')
                    ? entry.audioData
                    : `data:audio/webm;base64,${entry.audioData}`
                }
                className="w-full h-10 rounded-lg"
              />
            </div>
          )}

          {/* Gemini Empathetic Reflection */}
          <div>
            <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Empathetic Guide's Reflection
            </h4>
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs sm:text-sm text-stone-800 leading-relaxed">
              {entry.reflection}
            </div>
          </div>

          {/* Daily Actionable Takeaway */}
          {entry.actionableTakeaway && (
            <div>
              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                Actionable Takeaway
              </h4>
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-stone-800 leading-relaxed">
                {entry.actionableTakeaway}
              </div>
            </div>
          )}

          {/* Themes / Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="pt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-stone-400">Themes:</span>
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
