'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/event/', label: 'Event' },
  { href: '/briefing/', label: 'Briefing' },
  { href: '/path/', label: 'Path' },
  { href: '/planner/', label: 'Planner' },
  { href: '/picklist/', label: 'Picklist' },
  { href: '/simulation/', label: 'Sim' },
  { href: '/team/', label: 'Team' },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 text-sm shrink-0">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? 'text-primary-600 dark:text-primary-400 font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-primary-600'
            }
          >
            {label}
          </Link>
        );
      })}
      <span className="text-gray-500">v0.0.1</span>
    </nav>
  );
}
