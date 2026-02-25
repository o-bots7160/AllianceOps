/*
  Warnings:

  - A unique constraint covering the columns `[teamId,eventKey,name]` on the table `Picklist` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Picklist_teamId_eventKey_name_key" ON "Picklist"("teamId", "eventKey", "name");
