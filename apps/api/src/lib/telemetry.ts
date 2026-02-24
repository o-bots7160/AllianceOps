import * as appInsights from 'applicationinsights';

let client: appInsights.TelemetryClient | null = null;

export function initTelemetry(): void {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) return;

  appInsights
    .setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoDependencyCorrelation(true)
    .setSendLiveMetrics(false)
    .start();

  client = appInsights.defaultClient;
}

export function trackCacheMetric(hit: boolean, endpoint: string): void {
  client?.trackMetric({
    name: 'CacheHitRate',
    value: hit ? 1 : 0,
    properties: { endpoint },
  });
}

export function trackUpstreamError(source: 'tba' | 'statbotics', endpoint: string, statusCode: number): void {
  client?.trackEvent({
    name: 'UpstreamApiError',
    properties: { source, endpoint, statusCode: String(statusCode) },
  });
}

export function trackApiLatency(endpoint: string, durationMs: number): void {
  client?.trackMetric({
    name: 'ApiResponseTime',
    value: durationMs,
    properties: { endpoint },
  });
}

export function trackAuthEvent(
  event: 'success' | 'missing_headers' | 'blob_parse_error',
  properties?: Record<string, string>,
): void {
  client?.trackEvent({
    name: 'AuthValidation',
    properties: { event, ...properties },
  });
}
