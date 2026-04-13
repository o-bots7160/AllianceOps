-- CreateEnum
CREATE TYPE "ScoutingStatus" AS ENUM ('not_scouted', 'in_progress', 'scouted');

-- Normalise any unexpected values before converting to enum
UPDATE "ScoutingNote" SET "scoutingStatus" = 'not_scouted'
WHERE "scoutingStatus" NOT IN ('not_scouted', 'in_progress', 'scouted');

-- AlterTable: convert text column to enum
ALTER TABLE "ScoutingNote"
  ALTER COLUMN "scoutingStatus" DROP DEFAULT,
  ALTER COLUMN "scoutingStatus" TYPE "ScoutingStatus" USING "scoutingStatus"::"ScoutingStatus",
  ALTER COLUMN "scoutingStatus" SET DEFAULT 'not_scouted';
