import { app } from '@azure/functions';
import { trackApiLatency } from './telemetry.js';

/**
 * Global error-handling and telemetry hooks for Azure Functions v4.
 *
 * - preInvocation: records the start time for latency tracking
 * - postInvocation: catches unhandled errors and returns a structured 500,
 *   and tracks API response latency via App Insights.
 */
export function registerHooks(): void {
  app.hook.preInvocation((context) => {
    context.invocationContext.extraInputs.set('startTime', Date.now());
  });

  app.hook.postInvocation((context) => {
    const startTime = context.invocationContext.extraInputs.get('startTime') as number | undefined;
    if (startTime) {
      const durationMs = Date.now() - startTime;
      const functionName = context.invocationContext.functionName;
      trackApiLatency(functionName, durationMs);
    }

    if (context.error) {
      const err = context.error;
      const message = err instanceof Error ? err.message : String(err);

      // Log the full error for debugging (App Insights auto-collects exceptions)
      context.invocationContext.error(
        `Unhandled error in ${context.invocationContext.functionName}: ${message}`,
      );

      // Replace the response with a structured error envelope (plain object, not HttpResponse class)
      context.result = {
        status: 500,
        jsonBody: { error: 'Internal server error' },
      };
    }
  });
}
