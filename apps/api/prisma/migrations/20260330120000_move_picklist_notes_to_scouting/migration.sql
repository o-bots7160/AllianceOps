-- Step 1: Migrate non-empty picklist notes into ScoutingNote.
-- For each PicklistEntry with a non-null, non-empty notes value,
-- upsert a ScoutingNote keyed by (teamId, eventKey, targetTeamNumber).
-- If a ScoutingNote already exists, append the picklist note to the
-- existing notes (separated by a newline header).
INSERT INTO "ScoutingNote" ("id", "teamId", "eventKey", "targetTeamNumber", "notes", "data", "createdBy", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  p."teamId",
  p."eventKey",
  pe."teamNumber",
  pe."notes",
  '{}',
  p."createdBy",
  NOW(),
  NOW()
FROM "PicklistEntry" pe
JOIN "Picklist" p ON pe."picklistId" = p."id"
WHERE pe."notes" IS NOT NULL AND pe."notes" != ''
ON CONFLICT ("teamId", "eventKey", "targetTeamNumber")
DO UPDATE SET
  "notes" = CASE
    WHEN "ScoutingNote"."notes" = '' THEN EXCLUDED."notes"
    ELSE "ScoutingNote"."notes" || E'\n\n--- Imported from picklist ---\n' || EXCLUDED."notes"
  END,
  "updatedAt" = NOW();

-- Step 2: Drop the view that depends on the notes column.
DROP VIEW IF EXISTS v_team_picklists;

-- Step 3: Drop the notes column from PicklistEntry.
ALTER TABLE "PicklistEntry" DROP COLUMN "notes";

-- Step 4: Recreate the view without the notes column.
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
    pe.excluded       AS entry_excluded
FROM "Team" t
JOIN "Picklist" p          ON p."teamId" = t.id
LEFT JOIN "PicklistEntry" pe ON pe."picklistId" = p.id
ORDER BY t."teamNumber", p."eventKey", p.name, pe.rank;
