# ADR 005: Pluggable Auth Abstraction

## Status
Accepted

## Context
AllianceOps needs role-based access control (viewer vs editor) for features like the Duty Planner and Picklist. The project targets Azure Static Web Apps (SWA), which provides built-in EasyAuth with social SSO providers (Google, GitHub, Facebook, Apple). However:
- Full provider rollout should not block MVP development
- Local development needs auth without Azure SWA infrastructure
- Future migration to Microsoft Entra External ID should be possible

## Decision
Implement a pluggable `AuthProvider` interface in `packages/shared/src/auth/`:

```typescript
interface AuthProvider {
  getUser(request: HttpRequest): Promise<AuthUser | null>;
}

interface AuthUser {
  id: string;
  displayName: string;
  role: 'viewer' | 'editor';
}
```

Two implementations:
- **`DevAuthProvider`**: Always returns an editor user. Used in local development.
- **`SWAAuthProvider`**: Reads Azure SWA EasyAuth headers (`x-ms-client-principal`). Used in deployed environments.

The active provider is selected based on environment (e.g., `NODE_ENV`).

## Alternatives Considered
- **JWT-based custom auth**: Full control but significant implementation effort; duplicates what SWA EasyAuth provides for free.
- **Hard-coded SWA auth only**: Blocks local development and testing without Azure infrastructure.
- **No auth for MVP**: Simpler but makes it harder to retrofit later; role-based features need auth from the start.

## Consequences
- MVP development is unblocked with DevAuthProvider (no real auth setup required)
- Production uses SWA EasyAuth with zero custom token management
- Adding new providers (Entra External ID, custom JWT) requires only implementing the `AuthProvider` interface
- Role assignment is currently implicit (all authenticated users are editors); a proper role management system will be needed for multi-team use
