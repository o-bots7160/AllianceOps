-- Make teamId and createdBy required on MatchPlan and Picklist.
-- Change MatchPlan unique constraint from (eventKey, matchKey) to (teamId, eventKey, matchKey)
-- to support multiple teams having their own plan for the same match.

-- Step 1: Remove orphaned rows with NULL teamId (if any exist)
DELETE FROM "MatchPlan" WHERE "teamId" IS NULL;
DELETE FROM "Picklist" WHERE "teamId" IS NULL;

-- Step 2: Update NULL createdBy to a placeholder (should not exist in practice)
UPDATE "MatchPlan" SET "createdBy" = 'system' WHERE "createdBy" IS NULL;
UPDATE "Picklist" SET "createdBy" = 'system' WHERE "createdBy" IS NULL;

-- Step 3: Drop the old unique constraint on MatchPlan
DROP INDEX IF EXISTS "MatchPlan_eventKey_matchKey_key";

-- Step 4: Make columns required
ALTER TABLE "MatchPlan" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "MatchPlan" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "Picklist" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "Picklist" ALTER COLUMN "createdBy" SET NOT NULL;

-- Step 5: Create the new team-scoped unique constraint on MatchPlan
CREATE UNIQUE INDEX "MatchPlan_teamId_eventKey_matchKey_key" ON "MatchPlan"("teamId", "eventKey", "matchKey");
