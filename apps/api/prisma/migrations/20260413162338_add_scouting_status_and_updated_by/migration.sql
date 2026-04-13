-- AlterTable
ALTER TABLE "ScoutingNote" ADD COLUMN     "scoutingStatus" TEXT NOT NULL DEFAULT 'not_scouted',
ADD COLUMN     "updatedBy" TEXT;
