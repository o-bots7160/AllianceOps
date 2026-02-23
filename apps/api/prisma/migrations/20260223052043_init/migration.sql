-- CreateTable
CREATE TABLE "MatchPlan" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "matchKey" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyAssignment" (
    "id" TEXT NOT NULL,
    "matchPlanId" TEXT NOT NULL,
    "slotKey" TEXT NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DutyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchNote" (
    "id" TEXT NOT NULL,
    "matchPlanId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Picklist" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Picklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PicklistEntry" (
    "id" TEXT NOT NULL,
    "picklistId" TEXT NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "excluded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PicklistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchPlan_eventKey_idx" ON "MatchPlan"("eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlan_eventKey_matchKey_key" ON "MatchPlan"("eventKey", "matchKey");

-- CreateIndex
CREATE UNIQUE INDEX "DutyAssignment_matchPlanId_slotKey_key" ON "DutyAssignment"("matchPlanId", "slotKey");

-- CreateIndex
CREATE INDEX "Picklist_eventKey_idx" ON "Picklist"("eventKey");

-- CreateIndex
CREATE INDEX "PicklistEntry_picklistId_rank_idx" ON "PicklistEntry"("picklistId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "PicklistEntry_picklistId_teamNumber_key" ON "PicklistEntry"("picklistId", "teamNumber");

-- AddForeignKey
ALTER TABLE "DutyAssignment" ADD CONSTRAINT "DutyAssignment_matchPlanId_fkey" FOREIGN KEY ("matchPlanId") REFERENCES "MatchPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchNote" ADD CONSTRAINT "MatchNote_matchPlanId_fkey" FOREIGN KEY ("matchPlanId") REFERENCES "MatchPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PicklistEntry" ADD CONSTRAINT "PicklistEntry_picklistId_fkey" FOREIGN KEY ("picklistId") REFERENCES "Picklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
