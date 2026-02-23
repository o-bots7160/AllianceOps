# ADR 002: Static Next.js Export for Azure Static Web Apps

## Status
Accepted

## Context
The frontend needs to be hosted on Azure Static Web Apps. SWA serves static files and can proxy API requests to Azure Functions. We need to decide between SSR (server-side rendering) and static export.

## Decision
Use Next.js with `output: 'export'` for fully static builds.

- No SSR — all pages are pre-rendered at build time or rendered client-side
- API calls go to Azure Functions via SWA's API proxy or direct fetch
- Tailwind CSS for styling

## Consequences
- Simpler deployment — just static files, no Node.js runtime on SWA
- Client-side data fetching for dynamic content (match results, briefings)
- Cannot use Next.js API routes or server components (use Azure Functions instead)
- Fast initial load, cacheable at CDN edge
