-- CreateTable
CREATE TABLE "ScoutingNote" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "targetTeamNumber" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoutingNote_eventKey_idx" ON "ScoutingNote"("eventKey");

-- CreateIndex
CREATE INDEX "ScoutingNote_teamId_idx" ON "ScoutingNote"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingNote_teamId_eventKey_targetTeamNumber_key" ON "ScoutingNote"("teamId", "eventKey", "targetTeamNumber");

-- AddForeignKey
ALTER TABLE "ScoutingNote" ADD CONSTRAINT "ScoutingNote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
