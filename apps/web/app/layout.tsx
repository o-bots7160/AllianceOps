import type { Metadata } from 'next';
import { Providers } from '../components/providers';
import { SimulationBar } from '../components/simulation-bar';
import { AppHeader } from '../components/app-header';
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
          <AppHeader />
          <SimulationBar />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
