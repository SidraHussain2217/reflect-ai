import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Sparkles, Volume2, AlertCircle, RefreshCw, PenLine } from 'lucide-react';
import { AudioRecorder, type AudioRecordResult } from '../lib/audioRecorder';
import { saveUserInteraction } from '../lib/firebase';
import type { Interaction } from '../types';

interface JournalInputProps {
  userId: string;
  recentInteractions: Interaction[];
  onEntrySaved: (newEntry: Interaction) => void;
}

export const JournalInput: React.FC<JournalInputProps> = ({
  userId,
  recentInteractions,
  onEntrySaved,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');
  const [promptText, setPromptText] = useState('');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioResult, setAudioResult] = useState<AudioRecordResult | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<any>(null);

  // Submission & Transaction state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedPayload, setLastFailedPayload] = useState<any | null>(null);

  // Quick reflection prompts
  const PROMPTS = [
    "What brought me genuine peace today?",
    "What emotion feels heavy or unresolved right now?",
    "A small victory or moment of gratitude...",
    "How does my body physically feel after today?",
  ];

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current) recorderRef.current.cancel();
    };
  }, []);

  // Voice memo start
  const handleStartRecording = async () => {
    setErrorMessage(null);
    try {
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      setAudioResult(null);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage(
        err.message || 'Microphone access was denied or is unavailable. Please grant audio permissions.'
      );
    }
  };

  // Voice memo stop
  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const result = await recorderRef.current.stop();
      setIsRecording(false);
      setAudioResult(result);
    } catch (err: any) {
      console.error('Stop recording failed:', err);
      setIsRecording(false);
      setErrorMessage('Could not process audio recording. Please try again.');
    }
  };

  const handleDiscardAudio = () => {
    if (audioResult?.audioUrl) {
      URL.revokeObjectURL(audioResult.audioUrl);
    }
    setAudioResult(null);
    setRecordDuration(0);
  };

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Core submission flow with guaranteed transaction verification
  const handleSubmit = async (retryPayload?: any) => {
    const currentPrompt = retryPayload ? retryPayload.prompt : promptText;
    const currentAudio = retryPayload ? retryPayload.audioResult : audioResult;

    if (!currentPrompt.trim() && !currentAudio) {
      setErrorMessage('Please share a thought or record a voice memo first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const payload = {
      prompt: currentPrompt.trim(),
      audioResult: currentAudio,
    };

    try {
      // 1. Send to server-side Gemini route with resilience against transient proxy warmups
      let resData: any = null;
      const maxAttempts = 3;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await fetch('/api/gemini/reflect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              prompt: currentPrompt.trim() || (currentAudio ? 'Audio Voice Reflection' : ''),
              audioBase64: currentAudio
                ? (currentAudio.base64.includes(',')
                    ? currentAudio.base64.split(',')[1].trim()
                    : currentAudio.base64.trim())
                : undefined,
              audioMimeType: currentAudio ? currentAudio.mimeType : undefined,
              recentInteractions: recentInteractions.slice(0, 5),
            }),
          });

          const contentType = response.headers.get('content-type') || '';
          const resText = await response.text();

          // Check if response returned HTML (e.g. proxy warmup page or unexpected fallback)
          if (
            contentType.includes('text/html') ||
            resText.trim().startsWith('<!doctype') ||
            resText.trim().startsWith('<html')
          ) {
            if (attempt < maxAttempts - 1) {
              // Wait with progressive backoff for dev server to finish boot
              await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
              continue;
            }
            throw new Error(
              'The reflection service is currently warming up. Please click "Retry Save" in a moment.'
            );
          }

          // Safe JSON parsing without raw syntax crash
          try {
            resData = JSON.parse(resText);
          } catch {
            throw new Error(`Server returned non-JSON data: ${resText.slice(0, 80)}`);
          }

          if (!response.ok) {
            const err = new Error(resData?.error || `Server returned error status ${response.status}`);
            (err as any).statusCode = response.status;
            throw err;
          }

          break; // Success!
        } catch (fetchErr: any) {
          // Do not retry on client-side 4xx errors
          if (fetchErr.statusCode && fetchErr.statusCode >= 400 && fetchErr.statusCode < 500) {
            throw fetchErr;
          }
          if (attempt < maxAttempts - 1 && !fetchErr.message?.includes('warming up')) {
            await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
            continue;
          }
          throw fetchErr;
        }
      }

      if (!resData || !resData.success || !resData.data) {
        throw new Error(resData?.error || 'Invalid reflection data received from guidance service.');
      }

      const reflectionData = resData.data;

      // 2. Guaranteed Persistence to Firestore
      const newEntryData: Omit<Interaction, 'id'> = {
        userId,
        prompt: currentPrompt.trim() || 'Voice Memo Reflection',
        audioData: currentAudio ? currentAudio.base64 : undefined,
        audioDurationSeconds: currentAudio ? currentAudio.durationSeconds : undefined,
        reflection: reflectionData.reflection,
        moodScore: reflectionData.moodScore,
        moodLabel: reflectionData.moodLabel,
        actionableTakeaway: reflectionData.actionableTakeaway,
        tags: reflectionData.tags || ['Journal'],
        createdAt: new Date().toISOString(),
        completedTakeaway: false,
      };

      const docId = await saveUserInteraction(userId, newEntryData);

      // Successfully saved! Clean up buffers
      if (currentAudio?.audioUrl) {
        URL.revokeObjectURL(currentAudio.audioUrl);
      }
      setPromptText('');
      setAudioResult(null);
      setLastFailedPayload(null);

      // Notify parent
      onEntrySaved({
        id: docId,
        ...newEntryData,
      });
    } catch (err: any) {
      console.error('Submission or save failure:', err);
      // Retain input buffer and expose explicit retry option
      setLastFailedPayload(payload);
      setErrorMessage(
        err.message || 'Failed to complete reflection and save to Firestore. Your input is safely preserved.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="journal-input-container" className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div>
          <h2 className="font-serif font-semibold text-lg text-stone-900 flex items-center gap-2">
            <PenLine className="w-4 h-4 text-stone-700" />
            New Journal Reflection
          </h2>
          <p className="text-xs text-stone-500">
            Express yourself honestly. Gemini reflects with empathetic continuity.
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex rounded-lg bg-stone-100 p-1 self-start sm:self-auto">
          <button
            id="tab-text-entry"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Written Journal
          </button>
          <button
            id="tab-voice-memo"
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-rose-500" />
            Voice Memo
          </button>
        </div>
      </div>

      {/* Error Banner with Explicit Retry Option */}
      {errorMessage && (
        <div id="save-error-banner" className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {lastFailedPayload && (
            <button
              id="btn-retry-save"
              onClick={() => handleSubmit(lastFailedPayload)}
              disabled={isProcessing}
              className="px-3 py-1 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 transition flex items-center gap-1.5 text-xs flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
              Retry Save
            </button>
          )}
        </div>
      )}

      {/* Mode 1: Written Journal Input */}
      {activeTab === 'text' && (
        <div className="mt-4 space-y-3">
          {/* Prompt chips */}
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPromptText(prompt + ' ')}
                className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition text-left cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          <textarea
            id="textarea-journal-prompt"
            rows={4}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            disabled={isProcessing}
            placeholder="Write about what you experienced today, any struggles you encountered, or subtle feelings you are holding onto..."
            className="w-full p-3.5 text-sm text-stone-800 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition resize-none placeholder:text-stone-400"
          />
        </div>
      )}

      {/* Mode 2: Voice Memo Recording */}
      {activeTab === 'voice' && (
        <div className="mt-4 p-6 rounded-xl bg-stone-50 border border-stone-200 text-center flex flex-col items-center justify-center">
          {!audioResult && !isRecording && (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <Mic className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">Record a Voice Reflection</p>
                <p className="text-xs text-stone-500 max-w-sm mt-0.5">
                  Gemini analyzes vocal tone, speech pacing, and spoken thoughts with full empathy.
                </p>
              </div>
              <button
                id="btn-start-record"
                onClick={handleStartRecording}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-medium text-xs hover:bg-rose-700 transition shadow-sm flex items-center gap-2 mx-auto cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                Start Recording Memo
              </button>
            </div>
          )}

          {isRecording && (
            <div className="space-y-4 py-2">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-rose-100 animate-ping absolute opacity-75" />
                <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center relative shadow-md">
                  <Mic className="w-7 h-7 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="text-xl font-mono font-semibold text-rose-700">
                  {formatTime(recordDuration)}
                </span>
                <p className="text-xs text-stone-500 mt-1">Listening to your voice reflection...</p>
              </div>
              <button
                id="btn-stop-record"
                onClick={handleStopRecording}
                className="px-5 py-2 rounded-xl bg-stone-900 text-white font-medium text-xs hover:bg-stone-800 transition flex items-center gap-2 mx-auto cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 text-rose-400 fill-current" />
                Finish Recording
              </button>
            </div>
          )}

          {audioResult && !isRecording && (
            <div className="w-full max-w-md space-y-3">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-stone-200">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-medium text-stone-700">
                    Voice Memo ({formatTime(audioResult.durationSeconds)})
                  </span>
                </div>
                <button
                  id="btn-discard-audio"
                  onClick={handleDiscardAudio}
                  disabled={isProcessing}
                  title="Discard recording"
                  className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <audio
                controls
                src={audioResult.audioUrl}
                className="w-full h-10 rounded-lg"
              />

              <div className="text-left">
                <label className="text-[11px] font-medium text-stone-600 block mb-1">
                  Add optional notes or context (optional):
                </label>
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g. Feeling a bit tired after a long meeting..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
        <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Gemini 3.6 Flash empathetic analysis</span>
        </div>

        <button
          id="btn-submit-reflection"
          onClick={() => handleSubmit()}
          disabled={isProcessing || (activeTab === 'text' && !promptText.trim()) || (activeTab === 'voice' && !audioResult && !isRecording)}
          className="px-5 py-2.5 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 transition shadow-sm font-medium text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Reflecting & Saving...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Converse with Gemini</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
