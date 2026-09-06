import React, { useState } from 'react';
import {
  History,
  Search,
  Volume2,
  Trash2,
  Smile,
  ChevronRight,
  Filter,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { Interaction } from '../types';

interface EntryHistoryProps {
  interactions: Interaction[];
  onSelectEntry: (entry: Interaction) => void;
  onDeleteEntry: (id: string) => void;
}

export const EntryHistory: React.FC<EntryHistoryProps> = ({
  interactions,
  onSelectEntry,
  onDeleteEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // Extract all unique tags
  const allTags = Array.from(
    new Set(interactions.flatMap((item) => item.tags || []))
  ).filter(Boolean);

  // Filtered entries
  const filteredInteractions = interactions.filter((item) => {
    const matchesSearch =
      (item.prompt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reflection || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.moodLabel || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = selectedTag === 'ALL' || (item.tags || []).includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const getMoodBadgeClass = (score: number) => {
    if (score >= 7.5) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 5.0) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div id="entry-history-card" className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-serif font-semibold text-lg text-stone-900 flex items-center gap-2">
            <History className="w-4 h-4 text-stone-700" />
            Journal Archive & Past Conversations
          </h3>
          <p className="text-xs text-stone-500">
            {interactions.length} {interactions.length === 1 ? 'interaction' : 'interactions'} securely persisted in Cloud Firestore
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries or feelings..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
      </div>

      {/* Filter Tag Chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 text-xs">
          <span className="text-stone-400 text-[11px] flex items-center gap-1 flex-shrink-0 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            onClick={() => setSelectedTag('ALL')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition flex-shrink-0 cursor-pointer ${
              selectedTag === 'ALL'
                ? 'bg-stone-900 text-stone-50'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Themes
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition flex-shrink-0 cursor-pointer ${
                selectedTag === tag
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filteredInteractions.length === 0 ? (
        <div className="p-8 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center">
          <Calendar className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-stone-700">No entries match your filter</p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {interactions.length === 0
              ? 'Start by writing your first journal reflection or voice memo above.'
              : 'Try searching for a different keyword or resetting the theme filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInteractions.map((entry) => {
            const date = new Date(entry.createdAt);
            const dateStr = date.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = date.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={entry.id}
                className="group p-4 rounded-xl border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/50 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer"
                onClick={() => onSelectEntry(entry)}
              >
                <div className="flex-1 min-w-0">
                  {/* Top line: Date & Mood Badge */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-medium text-stone-700">
                      {dateStr} <span className="text-stone-400">• {timeStr}</span>
                    </span>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${getMoodBadgeClass(
                        entry.moodScore
                      )}`}
                    >
                      <Smile className="w-3 h-3" />
                      {entry.moodLabel} ({entry.moodScore}/10)
                    </span>

                    {entry.audioData && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-medium flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        Voice Memo
                      </span>
                    )}
                  </div>

                  {/* User prompt snippet */}
                  <p className="text-xs font-medium text-stone-900 line-clamp-2">
                    "{entry.prompt}"
                  </p>

                  {/* Gemini reflection snippet */}
                  <div className="mt-2 text-xs text-stone-600 bg-stone-50 rounded-lg p-2.5 border border-stone-100 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="line-clamp-2 italic">{entry.reflection}</p>
                  </div>

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right actions */}
                <div className="flex items-center sm:flex-col justify-end gap-2 sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntry(entry.id);
                    }}
                    title="Delete entry from Firestore"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="text-xs text-stone-400 flex items-center gap-0.5 group-hover:text-stone-900 transition">
                    <span>Read</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
