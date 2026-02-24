import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load root .env as fallback for local development
// Resolve up from apps/api/dist/src/ to monorepo root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });

import { initTelemetry, trackAuthEvent } from './lib/telemetry.js';
import { SWAAuthProvider, setAuthProvider } from '@allianceops/shared';

initTelemetry();

// Configure SWA auth provider with telemetry for blob parse errors
setAuthProvider(
  new SWAAuthProvider({
    onError: (error, details) => trackAuthEvent(error as 'blob_parse_error', details),
  }),
);

import './functions/health.js';
import './functions/events.js';
import './functions/plans.js';
import './functions/teams.js';
import './functions/team-site.js';
import './functions/me.js';
