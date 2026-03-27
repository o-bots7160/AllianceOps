import { app, input, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireUser, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';
import { createHmac } from 'node:crypto';

const HUB_NAME = 'allianceops';

const signalRInput = input.generic({
  type: 'signalRConnectionInfo',
  name: 'connectionInfo',
  hubName: HUB_NAME,
  connectionStringSetting: 'AzureSignalRConnectionString',
});

/**
 * Rewrite Docker-internal hostnames in the negotiate response so the
 * browser (running on the host) can reach the SignalR emulator.
 * In production the endpoint is a public Azure URL — no rewrite needed.
 */
function rewriteConnectionInfo(info: Record<string, unknown>): Record<string, unknown> {
  if (typeof info.url === 'string') {
    // Rewrite Docker-internal or bind-all hostnames so the browser can reach the emulator.
    const rewritten = info.url
      .replace('signalr-emulator', 'localhost')
      .replace('0.0.0.0', 'localhost');
    if (rewritten !== info.url) {
      return { ...info, url: rewritten };
    }
  }
  return info;
}

app.http('negotiate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'signalr/negotiate',
  extraInputs: [signalRInput],
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) {
      return auth;
    }

    const connectionInfo = context.extraInputs.get(signalRInput) as Record<string, unknown> | null;
    if (!connectionInfo) {
      return {
        status: 503,
        jsonBody: { error: 'SignalR service unavailable' },
      };
    }

    return {
      status: 200,
      jsonBody: rewriteConnectionInfo(connectionInfo),
    };
  },
});

// ---------------------------------------------------------------------------
// Broadcast helper — sends messages via the SignalR Service REST API
// instead of output bindings so that failures never crash save operations.
// ---------------------------------------------------------------------------

interface ParsedConnectionString {
  endpoint: string;
  accessKey: string;
}

function parseConnectionString(): ParsedConnectionString | null {
  const cs = process.env.AzureSignalRConnectionString;
  if (!cs) return null;
  const endpointMatch = cs.match(/Endpoint=(.*?);/i);
  const keyMatch = cs.match(/AccessKey=(.*?)(;|$)/i);
  const portMatch = cs.match(/Port=(\d+)/i);
  if (!endpointMatch || !keyMatch) return null;
  let endpoint = endpointMatch[1].replace(/\/$/, '');
  // The emulator's connection string may use 0.0.0.0 (bind-all) which isn't
  // routable from the Functions container. Rewrite to the Docker service name.
  endpoint = endpoint.replace('0.0.0.0', 'signalr-emulator');
  if (portMatch) {
    endpoint = `${endpoint}:${portMatch[1]}`;
  }
  return { endpoint, accessKey: keyMatch[1] };
}

function generateToken(url: string, accessKey: string, ttlSeconds = 300): string {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const audience = url.toLowerCase();
  const payload = Buffer.from(
    JSON.stringify({ aud: audience, exp: expiry, iat: Math.floor(Date.now() / 1000) }),
  ).toString('base64url');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const signature = createHmac('sha256', accessKey)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export interface SignalRMessage {
  target: string;
  groupName?: string;
  arguments: unknown[];
}

/**
 * Fire-and-forget broadcast via the SignalR Service REST API.
 * If SignalR is unavailable the error is logged but never propagated.
 */
export async function broadcastSignalR(messages: SignalRMessage[]): Promise<void> {
  const conn = parseConnectionString();
  if (!conn) return; // SignalR not configured — silently skip

  for (const msg of messages) {
    try {
      const path = msg.groupName
        ? `/api/v1/hubs/${HUB_NAME}/groups/${encodeURIComponent(msg.groupName)}`
        : `/api/v1/hubs/${HUB_NAME}`;
      const url = `${conn.endpoint}${path}`;
      const token = generateToken(url, conn.accessKey);

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target: msg.target, arguments: msg.arguments }),
      });
    } catch (err) {
      // Non-fatal — save must succeed even when SignalR is down
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'broadcastSignalR',
        target: msg.target,
      });
    }
  }
}
