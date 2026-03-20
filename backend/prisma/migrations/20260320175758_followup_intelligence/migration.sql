-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "source_interaction_id" TEXT;

-- CreateIndex
CREATE INDEX "tasks_source_interaction_id_idx" ON "tasks"("source_interaction_id");
