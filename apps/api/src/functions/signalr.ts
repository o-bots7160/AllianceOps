import { app, input, output, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireUser, isAuthError } from '../lib/auth.js';

const HUB_NAME = 'allianceops';

const signalRInput = input.generic({
  type: 'signalRConnectionInfo',
  name: 'connectionInfo',
  hubName: HUB_NAME,
  connectionStringSetting: 'AzureSignalRConnectionString',
});

app.http('negotiate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'signalr/negotiate',
  extraInputs: [signalRInput],
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;

    const connectionInfo = context.extraInputs.get(signalRInput);
    if (!connectionInfo) {
      return {
        status: 503,
        jsonBody: { error: 'SignalR service unavailable' },
      };
    }

    return {
      status: 200,
      jsonBody: connectionInfo,
    };
  },
});

/**
 * Shared SignalR output binding for broadcasting messages.
 * Other function files import this to send messages after data mutations.
 */
export const signalROutput = output.generic({
  type: 'signalR',
  name: 'signalRMessages',
  hubName: HUB_NAME,
  connectionStringSetting: 'AzureSignalRConnectionString',
});
