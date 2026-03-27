# ADR-031: Real-Time Sync with Azure SignalR Service (Serverless)

## Status

Accepted — supplements ADR-022's polling approach with push-based notifications

## Context

AllianceOps relies on polling (picklist: 30-second interval) or no automatic refresh (planner: load-once) for data synchronization between team members. During alliance selection and match planning at FRC events, multiple team members edit the same picklist or match plan concurrently. The current limitations:

- **Picklist** (ADR-022): 30-second polling means up to 30 seconds of data staleness. Polling pauses while the user has unsaved local edits to avoid overwriting them. Two users saving concurrently results in last-write-wins with no awareness of the conflict.
- **Planner** (ADR-012): Data loads once on mount with zero multi-user sync. Concurrent edits silently overwrite each other on save.

ADR-022 explicitly rejected WebSocket real-time sync as "overkill for the use case." This decision is revisited because:

1. The planner has no sync mechanism at all — not even polling
2. Azure SignalR Service in serverless mode requires no socket servers to manage — it's a fully managed, zero-ops service
3. The cost is free for small teams (Free tier: 20 concurrent connections, 20K messages/day) or ~$49/month for Standard
4. The UX improvement during high-pressure alliance selection is significant

### SWA WebSocket Constraint

Azure Static Web Apps' linked backend proxy **only supports HTTP requests**. WebSocket connections cannot be routed through the `/api` proxy. This is a known platform limitation ([Azure/static-web-apps#1487](https://github.com/Azure/static-web-apps/issues/1487)). The standard serverless SignalR pattern handles this naturally:

1. Client calls the `negotiate` HTTP endpoint via the SWA `/api` proxy — returns a SignalR Service URL and access token
2. Client connects directly to the Azure SignalR Service endpoint via WebSocket (bypasses SWA)
3. Functions broadcast messages to SignalR Service via output bindings (server-side)

## Decision

### Add Azure SignalR Service in Serverless Mode

Provision an Azure SignalR Service resource in serverless mode, integrated with Azure Functions via the existing extension bundle (v4.x, which includes SignalR bindings). The service handles persistent WebSocket connections from browser clients; Functions handle negotiate (token issuance) and broadcast (message sending) via input/output bindings.

### Notification-Only Messages

SignalR messages are lightweight notifications, not full data payloads. When a teammate saves, a small notification is broadcast (e.g., `{ type: 'picklist-updated', updatedBy, updatedAt }`). Receiving clients re-fetch from the API using existing fetch logic. This keeps messages tiny, avoids data duplication, and ensures clients always see authoritative DB state.

### Group Strategy

Messages are scoped to team+event groups so only relevant team members receive updates:

- `picklist:{teamId}:{eventKey}` — picklist save notifications
- `matchplan:{teamId}:{eventKey}:{matchKey}` — match plan save notifications

### Graceful Degradation

The SignalR connection is optional. If the service is unavailable, the connection string is not configured, or the client can't establish a WebSocket, the app falls back to existing behavior (polling for picklist, manual refresh for planner). No feature is gated behind SignalR availability.

### Autosave Opt-In

Pair SignalR with an optional autosave feature — a combo/split Save button with an "Auto-save" toggle (off by default). When enabled, changes are debounced and saved automatically (2s for picklist, 3s for planner), propagating to teammates in near-real-time via SignalR. Manual save remains the default to respect the existing convention (ADR-022's reasoning about explicit save predictability).

### Infrastructure

- New Bicep module `infra/modules/signalR.bicep` for the SignalR Service resource
- Connection string stored in Key Vault, referenced by Function App via `@Microsoft.KeyVault()` syntax
- CORS configured on the SignalR Service for SWA custom domains and localhost (dev)
- Free tier for dev; Free or Standard for prod (parameterized)
- Diagnostic settings to Log Analytics for observability

### Local Development

The Docker-based Azure SignalR Local Emulator (built from `docker/signalr-emulator/Dockerfile` using the .NET SDK) is added to `docker-compose.yml`, running alongside PostgreSQL and Azurite. The custom Dockerfile ensures cross-platform support (amd64 + arm64). The emulator supports the serverless negotiate flow and WebSocket connections locally. If the emulator isn't running, the app degrades gracefully.

## Alternatives Considered

1. **Keep polling only (status quo)** — Works for picklist but the planner has no sync at all. 30-second staleness is noticeable during fast-paced alliance selection. Rejected in favor of push notifications that provide near-instant awareness.

2. **Server-Sent Events (SSE)** — One-directional (server → client), simpler than WebSockets, but Azure Functions doesn't natively support SSE streaming responses. Would require a custom implementation outside the Functions binding model. SignalR serverless is the Azure-native solution with first-class Functions support.

3. **Full data payloads in SignalR messages** — Instead of notification-only, send the entire picklist or plan in the SignalR message. Rejected because it duplicates the API's role, increases message size (affecting Free tier limits), and creates a secondary data path that must stay in sync with the DB.

4. **Azure Web PubSub** — Similar to SignalR but lower-level (no hub abstraction, no auto-reconnect). SignalR provides a richer client SDK with built-in reconnection, group management, and the negotiate pattern. Both are similarly priced.

5. **Always-on autosave (no toggle)** — Simpler UX but less predictable for users accustomed to explicit save. The toggle preserves user choice while enabling the feature for those who want it.

## Consequences

- **Positive**: Teammates see each other's picklist and plan changes within seconds instead of up to 30 seconds (or never, for the planner)
- **Positive**: Autosave option reduces friction — teammates don't need to remember to click Save for changes to propagate
- **Positive**: Graceful degradation means no new failure modes — worst case is the existing polling/manual behavior
- **Positive**: Free tier is sufficient for a single FRC team's usage during events; Standard is an easy parameter upgrade
- **Positive**: Docker-based emulator enables full local development without an Azure subscription
- **Negative**: New infrastructure resource to manage (though serverless mode is minimal ops)
- **Negative**: SWA WebSocket limitation requires the client to connect directly to SignalR Service (separate domain), adding a CORS dependency
- **Negative**: Free tier limit of 20 concurrent connections may be hit by larger teams; monitoring and upgrade path needed
- **Negative**: Last-write-wins conflict model is unchanged — SignalR improves awareness but does not add conflict resolution (deferred to a future ADR)
