export default function Home() {
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

      <p className="text-xs text-gray-400 dark:text-gray-600">
        Team 7160 — Ludington O-Bots
      </p>
    </div>
  );
}
