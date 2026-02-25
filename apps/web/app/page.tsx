'use client';

import { useState } from 'react';
import { useAuth } from '../components/use-auth';
import { FeatureModal } from '../components/feature-modal';

function LoginCTA() {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
        Log in to access match briefings, strategy tools, and team management for your FRC team.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a
          href="/.auth/login/google"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Log in with Google
        </a>
        <a
          href="/.auth/login/aad"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Log in with Microsoft
        </a>
        <a
          href="/.auth/login/github"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Log in with GitHub
        </a>
      </div>
    </div>
  );
}

function JoinTeamCTA() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950 p-6 max-w-md">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Get Started</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Create a new team or join an existing one with an invite code to start using AllianceOps.
      </p>
      <a
        href="/team/"
        className="inline-flex items-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
      >
        Create or Join a Team
      </a>
    </div>
  );
}

const FEATURES = [
  {
    title: 'Match Briefing',
    desc: 'Alliance vs opponents with win conditions and risks',
    icon: '📋',
    detail:
      'Get a comprehensive breakdown before every match. The briefing engine analyzes your alliance and opponents using EPA ratings, scoring breakdowns, and historical performance to highlight win conditions, key risks, and where your alliance has an edge — all without manual scouting.',
  },
  {
    title: 'Quals Path',
    desc: 'Difficulty ratings, swing matches, and rest time',
    icon: '📈',
    detail:
      'Visualize your entire qualification schedule with difficulty ratings for each match based on opponent strength and alliance composition. Identify swing matches where extra preparation pays off, and see rest time gaps to plan your pit strategy.',
  },
  {
    title: 'Duty Planner',
    desc: 'Assign roles with strategy templates',
    icon: '🎯',
    detail:
      'Assign game-specific roles to alliance members using strategy templates tailored to each season\'s game. Pre-built templates suggest optimal duty assignments based on team strengths, and you can customize them for your alliance\'s unique strategy.',
  },
  {
    title: 'Picklist',
    desc: 'Multi-signal draft ordering with filters',
    icon: '📊',
    detail:
      'Build your alliance selection picklist using multiple ranking signals — EPA, component scores, compatibility, and more. Filter and weight the signals that matter most to your strategy, and share the list with your drive team in real time.',
  },
  {
    title: 'Simulation',
    desc: 'Replay past events match by match',
    icon: '🔄',
    detail:
      'Step through a past event match by match to see how rankings, stats, and strategies evolved over time. Use the simulation cursor to view any page as it would have looked at that point in the event — perfect for post-season analysis and training.',
  },
  {
    title: 'Setup',
    desc: 'Select year, event, and team',
    icon: '⚙️',
    detail:
      'Configure your year, event, and team number to focus the entire dashboard on the data that matters to you. Settings persist across sessions so you can pick up right where you left off. Multi-team users can switch between teams instantly.',
  },
];

function FeatureGrid() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selected = selectedIdx !== null ? FEATURES[selectedIdx] : null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
        {FEATURES.map((feature, idx) => (
          <button
            key={feature.title}
            onClick={() => setSelectedIdx(idx)}
            className="text-left rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-primary-500 transition-colors cursor-pointer"
          >
            <div className="text-2xl mb-2">{feature.icon}</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{feature.desc}</p>
          </button>
        ))}
      </div>
      <FeatureModal
        open={selected !== null}
        onClose={() => setSelectedIdx(null)}
        title={selected?.title ?? ''}
        icon={selected?.icon ?? ''}
        description={selected?.detail ?? ''}
      />
    </>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          AllianceOps
        </h2>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          FRC Match Strategy Dashboard
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
          Powered by The Blue Alliance &amp; Statbotics — zero scouting required
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : !user ? (
        <>
          <LoginCTA />
          <FeatureGrid />
        </>
      ) : user.teams.length > 0 ? (
        <FeatureGrid />
      ) : (
        <>
          <JoinTeamCTA />
          <FeatureGrid />
        </>
      )}
    </div>
  );
}
