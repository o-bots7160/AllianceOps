# ADR 015: User & Team Management

## Status
Accepted

## Context
AllianceOps had auth infrastructure (SWA EasyAuth, pluggable AuthProvider) but no user or team data model. Match plans were accessible to anyone, team number was manually entered per-device via localStorage, and there was no ownership or membership concept. As the application matures, we need:

- Users linked to SSO identities (or fabricated in dev)
- FRC team ownership with Coach/Mentor/Student roles
- Team-scoped access control on persistent data (plans, picklists)
- Invite code and open-join flows for team onboarding
- Multi-team support for mentors who help multiple teams

## Decision
Add User, Team, and TeamMember models to the Prisma schema with a role-based membership system:

**Team Roles:**
- **Coach** (owner): Full team management — settings, roles, invites, approvals, member removal
- **Mentor** (admin): Invite code generation, join request approval, student removal
- **Student** (member): Create and view plans, participate in strategy

**Joining a team:**
1. **Invite code**: Coach or Mentor generates a code; anyone with the code joins automatically as Student
2. **Open join request**: User looks up a team by number and submits a request; Coach or Mentor approves/rejects

**Access control:**
- MatchPlan and Picklist gain a `teamId` foreign key — all persistent data is team-scoped
- API endpoints for plans require team membership
- Read-only TBA/Statbotics data (events, matches, rankings) remain public
- User records are upserted automatically on first authenticated API call

**UI consolidation:**
- Team number auto-populates in the header from the user's active team membership
- Multi-team users get a team switcher dropdown
- Manual team number override remains available

## Alternatives Considered
- **No teams, just users with a team number field**: Simpler but no access control or team management. Every user would need to manually enter team numbers.
- **Organization-level auth via Entra/Auth0**: More robust but significant complexity; overkill for an FRC dashboard used by small teams.
- **Single role (member) with no hierarchy**: Simpler but prevents coaches from managing who can access team data.
- **Email-based invitations**: Better UX for initial onboarding but requires email infrastructure; in-app invite codes are simpler for MVP.

## Consequences
- All new API endpoints that create or read team-scoped data must check team membership via `requireTeamMember()` or `requireTeamRole()`
- Existing plan routes change from `/api/event/{eventKey}/...` to `/api/teams/{teamId}/event/{eventKey}/...`
- The web app must fetch `/api/me` on load to hydrate user and team context
- DevAuthProvider returns a consistent `dev-user` ID — local dev works with a single fabricated user
- Team number uniqueness is enforced at the database level — only one Team record per FRC team number
- Future features (picklist endpoints, match notes, etc.) must follow the team-scoped pattern
