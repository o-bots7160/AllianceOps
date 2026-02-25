'use client';

import Link from 'next/link';
import { useAuth } from '../components/use-auth';
import { FeatureCarousel } from '../components/feature-carousel';

const FEATURES = [
  {
    title: 'Event',
    desc: 'Live rankings, OPRs, and match results',
    icon: '📅',
    image: '/images/aop-product-event.png',
    href: '/event/',
    detail:
      'View live event rankings, OPR breakdowns, and match results for any FRC event. See how every team is performing at a glance — updated automatically from The Blue Alliance.',
  },
  {
    title: 'Match Briefing',
    desc: 'Alliance vs opponents with win conditions and risks',
    icon: '📋',
    image: '/images/aop-product-briefing.png',
    href: '/briefing/',
    detail:
      'Get a comprehensive breakdown before every match. The briefing engine analyzes your alliance and opponents using EPA ratings, scoring breakdowns, and historical performance to highlight win conditions, key risks, and where your alliance has an edge — all without manual scouting.',
  },
  {
    title: 'Quals Path',
    desc: 'Difficulty ratings, swing matches, and rest time',
    icon: '📈',
    image: '/images/aop-product-path.png',
    href: '/path/',
    detail:
      'Visualize your entire qualification schedule with difficulty ratings for each match based on opponent strength and alliance composition. Identify swing matches where extra preparation pays off, and see rest time gaps to plan your pit strategy.',
  },
  {
    title: 'Duty Planner',
    desc: 'Assign roles with strategy templates',
    icon: '🎯',
    image: '/images/aop-product-planner.png',
    href: '/planner/',
    detail:
      'Assign game-specific roles to alliance members using strategy templates tailored to each season\'s game. Pre-built templates suggest optimal duty assignments based on team strengths, and you can customize them for your alliance\'s unique strategy.',
  },
  {
    title: 'Picklist',
    desc: 'Multi-signal draft ordering with filters',
    icon: '📊',
    image: '/images/aop-product-picklist.png',
    href: '/picklist/',
    detail:
      'Build your alliance selection picklist using multiple ranking signals — EPA, component scores, compatibility, and more. Filter and weight the signals that matter most to your strategy, and share the list with your drive team in real time.',
  },
  {
    title: 'Simulation',
    desc: 'Replay past events match by match',
    icon: '🔄',
    image: '/images/aop-product-sim.png',
    href: '/simulation/',
    detail:
      'Step through a past event match by match to see how rankings, stats, and strategies evolved over time. Use the simulation cursor to view any page as it would have looked at that point in the event — perfect for post-season analysis and training.',
  },
  {
    title: 'Teams',
    desc: 'Create, join, and manage your FRC team',
    icon: '👥',
    image: '/images/aop-product-team.png',
    href: '/team/',
    detail:
      'Create a new team or join an existing one with an invite code. Manage team members, assign roles (Coach, Mentor, Student), and switch between teams if you mentor multiple FRC programs.',
  },
];

const LOGIN_PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    href: '/.auth/login/google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    href: '/.auth/login/aad',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M3 3h8.5v8.5H3V3zm9.5 0H21v8.5h-8.5V3zM3 12.5h8.5V21H3v-8.5zm9.5 0H21V21h-8.5v-8.5z" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'GitHub',
    href: '/.auth/login/github',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
];

function LoginCTA() {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
        Log in to access match briefings, strategy tools, and team management for your FRC team.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {LOGIN_PROVIDERS.map((provider) => (
          <a
            key={provider.id}
            href={provider.href}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            aria-label={`Log in with ${provider.label}`}
            title={provider.label}
          >
            {provider.icon}
          </a>
        ))}
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
      <Link
        href="/team/"
        className="inline-flex items-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        aria-label="Navigate to team creation or join page"
      >
        Create or Join a Team
      </Link>
    </div>
  );
}

function FeatureLinks() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
      {FEATURES.map((feature) => (
        <Link
          key={feature.title}
          href={feature.href}
          className="text-left rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-primary-500 transition-colors"
          aria-label={`Go to ${feature.title}: ${feature.desc}`}
        >
          <div className="text-2xl mb-2">{feature.icon}</div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{feature.desc}</p>
        </Link>
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
      ) : !user ? (
        <>
          <LoginCTA />
          <FeatureCarousel features={FEATURES} />
        </>
      ) : user.teams.length > 0 ? (
        <FeatureLinks />
      ) : (
        <>
          <JoinTeamCTA />
          <FeatureLinks />
        </>
      )}
    </div>
  );
}
