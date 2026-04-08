'use client';

import { useState, useEffect } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useAuth } from '@/hooks/useAuth';
import { useHealthData } from '@/hooks/useHealthData';
import { useDiaryEntries } from '@/hooks/useDiaryEntries';
import { useContextNotes } from '@/hooks/useContextNotes';
import { LatestReading } from '@/components/LatestReading';
import { SummaryCard } from '@/components/SummaryCard';
import { Timeline } from '@/components/Timeline';
import { PeriodSelector, PERIOD_OPTIONS } from '@/components/PeriodSelector';

import { ContextNotesPanel } from '@/components/ContextNotesPanel';
import { ChatPanel } from '@/components/ChatPanel';
import type { BloodPressureData } from '@/lib/types/metrics';

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const { isLoggedIn, isLoading: isAuthLoading, logout } = useAuth();

  // Show nothing while checking auth
  if (isAuthLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return <AuthRedirect />;
  }

  return <Dashboard chatOpen={chatOpen} setChatOpen={setChatOpen} logout={logout} />;
}

function AuthRedirect() {
  useEffect(() => {
    window.location.href = '/login';
  }, []);
  return null;
}

function Dashboard({
  chatOpen,
  setChatOpen,
  logout,
}: {
  chatOpen: boolean;
  setChatOpen: (fn: (prev: boolean) => boolean) => void;
  logout: () => Promise<void>;
}) {
  const [periodDays, setPeriodDays] = useState(30);

  const { data, summary, isLoading, error, refresh } = useHealthData<BloodPressureData>({
    metricType: 'blood_pressure',
    dateRange: { days: periodDays },
  });

  const latestReading = data.length > 0
    ? [...data].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
    : null;

  const averagedGroupCount = data.filter((g) => g.isGrouped).length;

  const dayCount = data.length > 0
    ? new Set(data.map((g) => g.timestamp.slice(0, 10))).size
    : periodDays;

  // Compute date range from readings for diary fetch
  const dateRange = data.length > 0
    ? (() => {
        const dates = data.map((g) => g.timestamp.slice(0, 10)).sort();
        return { start: dates[0], end: dates[dates.length - 1] };
      })()
    : null;

  const { entries: diaryEntries, saveEntry: saveDiary, deleteEntry: deleteDiary } = useDiaryEntries({
    startDate: dateRange?.start ?? '',
    endDate: dateRange?.end ?? '',
    enabled: !!dateRange,
  });

  const { notes: contextNotes, createNote: createContextNote, deleteNote: deleteContextNote, isLoading: isContextLoading } = useContextNotes();

  const dashboardContent = (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Latest Reading */}
        {isLoading ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-12 w-48 bg-gray-200 rounded mb-3" />
            <div className="h-5 w-20 bg-gray-200 rounded mb-4" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        ) : error ? null : (
          <LatestReading reading={latestReading} dayCount={dayCount} />
        )}

        {/* Summary */}
        {!isLoading && !error && (
          <SummaryCard summary={summary} averagedGroupCount={averagedGroupCount} dayCount={dayCount} />
        )}

        {/* Timeline */}
        <Timeline
          readings={data}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
          diaryEntries={diaryEntries}
          onSaveDiary={saveDiary}
          onDeleteDiary={deleteDiary}
        />

        {/* General Context */}
        {!isLoading && data.length > 0 && (
          <ContextNotesPanel
            notes={contextNotes}
            onCreate={createContextNote}
            onDelete={deleteContextNote}
            isLoading={isContextLoading}
          />
        )}

        {/* Disclaimer footer */}
        {!isLoading && data.length > 0 && (
          <footer className="text-center pb-8">
            <p className="text-xs text-gray-400 leading-relaxed max-w-lg mx-auto">
              ⚠️ Blood pressure readings are for informational purposes only. Blood
              pressure varies throughout the day and is influenced by stress, activity,
              and posture. Target: 120/80 mmHg — consult your doctor for personal goals
              and always seek physician advice for medical decisions.
            </p>
          </footer>
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col bg-gray-50 ${chatOpen ? 'h-screen overflow-hidden' : 'flex-1'}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className={`${chatOpen ? '' : 'max-w-4xl'} mx-auto px-4 sm:px-6 py-4 flex items-center justify-between`}>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Withings Coach</h1>
            <div className="mt-1">
              <PeriodSelector selectedDays={periodDays} onChange={setPeriodDays} disabled={isLoading} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => setChatOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                chatOpen
                  ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
              aria-label={chatOpen ? 'Close chat' : 'Open chat'}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Log out"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      {chatOpen ? (
        <div className="flex-1 min-h-0">
          {/* Mobile: show chat only */}
          <div className="block md:hidden h-full">
            <ChatPanel />
          </div>

          {/* Desktop: split pane */}
          <div className="hidden md:block h-full">
            <Group orientation="horizontal" className="h-full">
              <Panel id="dashboard" defaultSize={60} minSize={30}>
                {dashboardContent}
              </Panel>
              <Separator className="w-px bg-gray-200 hover:bg-blue-400 transition-colors data-[resize-handle-active]:bg-blue-500" />
              <Panel id="chat" defaultSize={40} minSize={20}>
                <ChatPanel />
              </Panel>
            </Group>
          </div>
        </div>
      ) : (
        <main className="flex-1">
          {dashboardContent}
        </main>
      )}
    </div>
  );
}
