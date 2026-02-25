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
];

export function NavLinks({ vertical, onNavigate }: { vertical?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className={
        vertical
          ? 'flex flex-col gap-2 text-sm'
          : 'flex gap-4 text-sm shrink-0'
      }
    >
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
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
    </nav>
  );
}
