-- ============================================================
-- Reporting Views for AllianceOps
-- ============================================================

-- ─── v_team_roster ──────────────────────────────────────────
-- Shows each team with its members, roles, and user details.
-- One row per team-member combination.
CREATE OR REPLACE VIEW v_team_roster AS
SELECT
    t.id              AS team_id,
    t."teamNumber"    AS team_number,
    t.name            AS team_name,
    t."createdAt"     AS team_created_at,
    tm.role           AS member_role,
    tm."joinedAt"     AS member_joined_at,
    u.id              AS user_id,
    u.email           AS user_email,
    u."displayName"   AS user_display_name
FROM "Team" t
LEFT JOIN "TeamMember" tm ON tm."teamId" = t.id
LEFT JOIN "User" u        ON u.id = tm."userId"
ORDER BY t."teamNumber", tm.role, u."displayName";

-- ─── v_match_duty_plans ─────────────────────────────────────
-- Shows match plans with their duty assignments and notes,
-- scoped to each team. One row per duty assignment.
CREATE OR REPLACE VIEW v_match_duty_plans AS
SELECT
    t.id              AS team_id,
    t."teamNumber"    AS team_number,
    t.name            AS team_name,
    mp.id             AS match_plan_id,
    mp."eventKey"     AS event_key,
    mp."matchKey"     AS match_key,
    mp."createdBy"    AS plan_created_by,
    mp."createdAt"    AS plan_created_at,
    mp."updatedAt"    AS plan_updated_at,
    da.id             AS duty_id,
    da."slotKey"      AS duty_slot_key,
    da."teamNumber"   AS duty_team_number,
    da.notes          AS duty_notes,
    (SELECT count(*) FROM "MatchNote" mn WHERE mn."matchPlanId" = mp.id)
                      AS note_count
FROM "Team" t
JOIN "MatchPlan" mp       ON mp."teamId" = t.id
LEFT JOIN "DutyAssignment" da ON da."matchPlanId" = mp.id
ORDER BY t."teamNumber", mp."eventKey", mp."matchKey", da."slotKey";

-- ─── v_team_picklists ───────────────────────────────────────
-- Shows picklists with their ranked entries, scoped to each
-- team. One row per picklist entry.
CREATE OR REPLACE VIEW v_team_picklists AS
SELECT
    t.id              AS team_id,
    t."teamNumber"    AS team_number,
    t.name            AS team_name,
    p.id              AS picklist_id,
    p."eventKey"      AS event_key,
    p.name            AS picklist_name,
    p."createdBy"     AS picklist_created_by,
    p."createdAt"     AS picklist_created_at,
    p."updatedAt"     AS picklist_updated_at,
    pe.id             AS entry_id,
    pe."teamNumber"   AS entry_team_number,
    pe.rank           AS entry_rank,
    pe.tags           AS entry_tags,
    pe.notes          AS entry_notes,
    pe.excluded       AS entry_excluded
FROM "Team" t
JOIN "Picklist" p          ON p."teamId" = t.id
LEFT JOIN "PicklistEntry" pe ON pe."picklistId" = p.id
ORDER BY t."teamNumber", p."eventKey", p.name, pe.rank;
