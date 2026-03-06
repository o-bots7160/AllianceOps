# ADR-029: Admin Role

## Status

Accepted

## Context

AllianceOps has a team-scoped role system (COACH > MENTOR > STUDENT) for access control within FRC teams. However, there is no concept of a global "super user" who can view system-wide data such as all registered users, teams, and usage stats. As the platform grows, operators need visibility into the system without being tied to any specific team.

Key requirements:
- Admin access must be independent of team membership
- Admin assignment should not be possible from the self-service UI (team page)
- The system needs a simple, auditable way to grant/revoke admin access
- An admin dashboard should provide an overview of platform usage

## Decision

Create a **separate `AdminUser` table** rather than adding an `ADMIN` value to the existing `TeamRole` enum. Admin status is managed exclusively through direct database operations, with convenience SQL functions for promotion and revocation.

### Implementation Details

1. **`AdminUser` table** — Links to `User` via a unique `userId` foreign key. A user is an admin if and only if they have a record in this table.

2. **SQL helper functions** — `promote_to_admin(email)` and `revoke_admin(email)` are created in the migration for convenience. These are idempotent and return descriptive result strings.

3. **`requireAdmin()` middleware** — New auth helper in `apps/api/src/lib/auth.ts` that checks the `AdminUser` table. Returns 403 if the user is not an admin.

4. **`/me` endpoint augmented** — Returns `isAdmin: boolean` so the web app can conditionally show admin UI without extra API calls.

5. **Admin API endpoints** — `GET /admin/stats` and `GET /admin/users` (paginated, searchable, sortable) protected by `requireAdmin()`.

6. **Admin link** — Appears in the user dropdown menu (not the main nav bar), visible only when `isAdmin` is true.

## Alternatives Considered

### Add `ADMIN` to `TeamRole` enum
Rejected because admin is not a team-scoped concept. An admin is a platform-level role, and mixing it into the team role hierarchy would create confusion (which team would the admin belong to?) and require changes to all team-role-checking middleware.

### Add an `isAdmin` boolean column to `User`
Simpler but less auditable — no `createdAt` timestamp for when admin was granted, and schema changes to the `User` table have wider blast radius. A separate table is cleaner and follows the principle of least surprise.

### Build an admin management UI
Deferred intentionally. Direct database management is sufficient for the small number of admins expected, and avoids the security surface area of an admin self-service UI. Can be added later if needed.

## Consequences

### Positive
- Clean separation between team roles and platform admin
- No changes to existing team role logic or middleware
- Auditable via `createdAt` timestamp on `AdminUser` records
- SQL functions make promotion/revocation simple and idempotent
- `isAdmin` flag on `/me` avoids extra API roundtrips

### Negative
- Admin management requires database access (intentional trade-off)
- No UI for admin management (by design, can be added later)
- Additional DB query on `/me` endpoint (mitigated by `Promise.all` parallelism)
