import React from 'react';
import { CheckCircle2, Circle, Sparkles, Compass } from 'lucide-react';
import type { Interaction } from '../types';

interface ActionableTakeawaysProps {
  interactions: Interaction[];
  onToggleCompleted: (interactionId: string, currentStatus: boolean) => void;
}

export const ActionableTakeaways: React.FC<ActionableTakeawaysProps> = ({
  interactions,
  onToggleCompleted,
}) => {
  // Extract items that have an actionable takeaway
  const takeawayItems = interactions.filter((item) => item.actionableTakeaway?.trim());

  return (
    <div id="actionable-takeaways-card" className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif font-semibold text-lg text-stone-900 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-600" />
            Daily Actionable Takeaways
          </h3>
          <p className="text-xs text-stone-500">
            Somatic grounding practices and micro-actions suggested by your guide
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-medium">
          {takeawayItems.filter((t) => t.completedTakeaway).length}/{takeawayItems.length} Done
        </span>
      </div>

      {takeawayItems.length === 0 ? (
        <div className="p-6 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center">
          <Sparkles className="w-6 h-6 text-stone-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-stone-700">No takeaways generated yet</p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Submit a journal reflection to receive a tailored micro-action for your day.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {takeawayItems.slice(0, 8).map((item) => {
            const isCompleted = !!item.completedTakeaway;
            const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={item.id}
                onClick={() => onToggleCompleted(item.id, isCompleted)}
                className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isCompleted
                    ? 'bg-stone-50/70 border-stone-200 opacity-60'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
                }`}
              >
                <button
                  type="button"
                  aria-label="Toggle completion"
                  className="mt-0.5 flex-shrink-0 text-stone-400 group-hover:text-emerald-600 transition"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs text-stone-800 leading-relaxed ${
                      isCompleted ? 'line-through text-stone-500' : ''
                    }`}
                  >
                    {item.actionableTakeaway}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-stone-400">
                    <span>{dateStr}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                      {item.moodLabel}
                    </span>
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
