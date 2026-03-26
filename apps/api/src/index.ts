import { config } from 'dotenv';
import { resolve } from 'path';

// Load root .env as fallback for local development.
// In production, env vars come from Azure Key Vault / App Settings.
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

import { initTelemetry, trackAuthEvent } from './lib/telemetry.js';
import { SWAAuthProvider, setAuthProvider } from '@allianceops/shared';
import { registerHooks } from './lib/hooks.js';

initTelemetry();
registerHooks();

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
import './functions/team-crud.js';
import './functions/team-members.js';
import './functions/team-invites.js';
import './functions/team-requests.js';
import './functions/team-site.js';
import './functions/team-site-batch.js';
import './functions/team-info.js';
import './functions/me.js';
import './functions/admin.js';
