-- DropForeignKey
ALTER TABLE "MatchPlan" DROP CONSTRAINT "MatchPlan_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Picklist" DROP CONSTRAINT "Picklist_teamId_fkey";

-- AddForeignKey
ALTER TABLE "MatchPlan" ADD CONSTRAINT "MatchPlan_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Picklist" ADD CONSTRAINT "Picklist_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename TOWER_CLIMBER slot keys to ENDGAME keys for 2026 events
UPDATE "DutyAssignment" da
SET "slotKey" = CASE da."slotKey"
    WHEN 'TOWER_CLIMBER_1' THEN 'ENDGAME_1'
    WHEN 'TOWER_CLIMBER_2' THEN 'ENDGAME_2'
  END
FROM "MatchPlan" mp
WHERE da."matchPlanId" = mp."id"
  AND mp."eventKey" LIKE '2026%'
  AND da."slotKey" IN ('TOWER_CLIMBER_1', 'TOWER_CLIMBER_2');
