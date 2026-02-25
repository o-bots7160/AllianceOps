import { config } from 'dotenv';
import { resolve } from 'path';

// Load root .env as fallback for local development.
// In production, env vars come from Azure Key Vault / App Settings.
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

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
import './functions/picklists.js';
import './functions/teams.js';
import './functions/team-site.js';
import './functions/team-site-batch.js';
import './functions/me.js';
