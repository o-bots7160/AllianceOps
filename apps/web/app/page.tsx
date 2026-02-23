'use client';

import { useAuth } from '../components/use-auth';
import { IS_DEV } from '../lib/api-base';

function LoginCTA() {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
        Sign in to access match briefings, strategy tools, and team management for your FRC team.
      </p>
      <div className="flex gap-3">
        <a
          href="/.auth/login/google"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Sign in with Google
        </a>
        <a
          href="/.auth/login/github"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Sign in with GitHub
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

function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
      {[
        {
          title: 'Match Briefing',
          desc: 'Alliance vs opponents with win conditions and risks',
          icon: '📋',
        },
        {
          title: 'Quals Path',
          desc: 'Difficulty ratings, swing matches, and rest time',
          icon: '📈',
        },
        {
          title: 'Duty Planner',
          desc: 'Assign roles with strategy templates',
          icon: '🎯',
        },
        {
          title: 'Picklist',
          desc: 'Multi-signal draft ordering with filters',
          icon: '📊',
        },
        {
          title: 'Simulation',
          desc: 'Replay past events match by match',
          icon: '🔄',
        },
        {
          title: 'Setup',
          desc: 'Select year, event, and team',
          icon: '⚙️',
        },
      ].map((feature) => (
        <div
          key={feature.title}
          className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-primary-500 transition-colors"
        >
          <div className="text-2xl mb-2">{feature.icon}</div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{feature.desc}</p>
        </div>
      ))}
    </div>
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
      ) : IS_DEV || (user && user.teams.length > 0) ? (
        <FeatureGrid />
      ) : !user ? (
        <LoginCTA />
      ) : (
        <JoinTeamCTA />
      )}

      <p className="text-xs text-gray-400 dark:text-gray-600">
        Team 7160 — Ludington O-Bots
      </p>
    </div>
  );
}
