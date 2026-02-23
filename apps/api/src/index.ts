import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load root .env as fallback for local development
// Resolve up from apps/api/dist/src/ to monorepo root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });

import { initTelemetry } from './lib/telemetry.js';
import { setAuthProvider, SWAAuthProvider } from '@allianceops/shared';

initTelemetry();

// Use SWA EasyAuth in production, DevAuthProvider (default) in development
if (process.env.NODE_ENV === 'production') {
  setAuthProvider(new SWAAuthProvider());
}

import './functions/health.js';
import './functions/events.js';
import './functions/plans.js';
import './functions/teams.js';
import './functions/team-site.js';
import './functions/me.js';
