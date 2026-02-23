import type { Metadata } from 'next';
import { Providers } from '../components/providers';
import { SimulationBar } from '../components/simulation-bar';
import './globals.css';

export const metadata: Metadata = {
  title: 'AllianceOps',
  description: 'FRC match strategy dashboard — powered by TBA and Statbotics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        <Providers>
          <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                AllianceOps
              </h1>
              <nav className="flex gap-4 text-sm">
                <a href="/event/" className="text-gray-600 dark:text-gray-400 hover:text-primary-600">
                  Event
                </a>
                <a href="/briefing/" className="text-gray-600 dark:text-gray-400 hover:text-primary-600">
                  Briefing
                </a>
                <a href="/path/" className="text-gray-600 dark:text-gray-400 hover:text-primary-600">
                  Path
                </a>
                <a href="/planner/" className="text-gray-600 dark:text-gray-400 hover:text-primary-600">
                  Planner
                </a>
                <a href="/picklist/" className="text-gray-600 dark:text-gray-400 hover:text-primary-600">
                  Picklist
                </a>
                <a href="/simulation/" className="text-gray-600 dark:text-gray-400 hover:text-primary-600">
                  Sim
                </a>
                <span className="text-gray-500">v0.0.1</span>
              </nav>
            </div>
          </header>
          <SimulationBar />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
