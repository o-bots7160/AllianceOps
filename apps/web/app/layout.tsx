import type { Metadata } from 'next';
import { Providers } from '../components/providers';
import { SimulationBar } from '../components/simulation-bar';
import { GlobalControls } from '../components/global-controls';
import { NavLinks } from '../components/nav-links';
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
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400 shrink-0">
                AllianceOps
              </h1>
              <GlobalControls />
              <NavLinks />
            </div>
          </header>
          <SimulationBar />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
