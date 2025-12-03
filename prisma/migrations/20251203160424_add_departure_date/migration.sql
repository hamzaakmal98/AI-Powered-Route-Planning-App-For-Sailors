-- AlterTable
ALTER TABLE "passage_planning_tasks" ADD COLUMN     "departureDate" TEXT;

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "passagePlanningTaskId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_items_passagePlanningTaskId_idx" ON "checklist_items"("passagePlanningTaskId");

-- CreateIndex
CREATE INDEX "checklist_items_passagePlanningTaskId_category_sequence_idx" ON "checklist_items"("passagePlanningTaskId", "category", "sequence");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_passagePlanningTaskId_fkey" FOREIGN KEY ("passagePlanningTaskId") REFERENCES "passage_planning_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
