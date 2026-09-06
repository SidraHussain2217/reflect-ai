import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Smile, Calendar } from 'lucide-react';
import type { Interaction } from '../types';

interface MoodTrendChartProps {
  interactions: Interaction[];
}

export const MoodTrendChart: React.FC<MoodTrendChartProps> = ({ interactions }) => {
  // Sort chronologically for chart display (oldest to newest)
  const sortedData = [...interactions]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((item) => {
      const d = new Date(item.createdAt);
      return {
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        score: Number(item.moodScore) || 5,
        mood: item.moodLabel || 'Reflective',
        prompt: item.prompt,
      };
    });

  // Calculate average mood
  const avgMood =
    sortedData.length > 0
      ? (sortedData.reduce((acc, curr) => acc + curr.score, 0) / sortedData.length).toFixed(1)
      : null;

  // Most common emotion tag
  const moodCounts = interactions.reduce((acc: Record<string, number>, item) => {
    const label = item.moodLabel || 'Reflective';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const primaryMood =
    Object.keys(moodCounts).length > 0
      ? (Object.entries(moodCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0]
      : 'Calm';

  return (
    <div id="mood-trend-card" className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="font-serif font-semibold text-lg text-stone-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Mood Progression & Trajectory
          </h3>
          <p className="text-xs text-stone-500">
            Longitudinal emotional sentiment tracked across your journal entries
          </p>
        </div>

        {avgMood && (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-stone-50 border border-stone-200 text-xs flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-stone-500">Avg Score:</span>
              <span className="font-semibold text-stone-900">{avgMood} / 10</span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-stone-50 border border-stone-200 text-xs flex items-center gap-1.5">
              <span className="text-stone-500">Primary Tone:</span>
              <span className="font-semibold text-emerald-700">{primaryMood}</span>
            </div>
          </div>
        )}
      </div>

      {sortedData.length < 2 ? (
        <div className="h-52 flex flex-col items-center justify-center rounded-xl bg-stone-50 border border-dashed border-stone-200 p-6 text-center">
          <Calendar className="w-8 h-8 text-stone-400 mb-2" />
          <p className="text-sm font-medium text-stone-700">Not enough data points yet</p>
          <p className="text-xs text-stone-500 max-w-sm mt-0.5">
            Log at least two journal entries or voice memos to visualize your mood trends over time.
          </p>
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#78716C' }}
                tickLine={false}
                axisLine={{ stroke: '#E7E5E4' }}
              />
              <YAxis
                domain={[1, 10]}
                ticks={[2, 4, 6, 8, 10]}
                tick={{ fontSize: 11, fill: '#78716C' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-stone-900 text-stone-100 p-2.5 rounded-xl text-xs shadow-lg border border-stone-800 space-y-1">
                        <div className="flex items-center justify-between gap-3 text-stone-400">
                          <span>{data.date} • {data.time}</span>
                          <span className="font-bold text-amber-300">{data.score} / 10</span>
                        </div>
                        <p className="font-semibold text-emerald-400">{data.mood}</p>
                        <p className="text-[11px] text-stone-300 max-w-[200px] truncate">
                          "{data.prompt}"
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#moodGradient)"
                dot={{ r: 3, fill: '#059669', strokeWidth: 1, stroke: '#FFFFFF' }}
                activeDot={{ r: 5, fill: '#059669' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
