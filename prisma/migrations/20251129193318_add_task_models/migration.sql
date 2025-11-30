-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('locked', 'ready', 'in_progress', 'completed');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "estimatedTime" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'ready',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "required" INTEGER NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execution_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_userId_priority_idx" ON "tasks"("userId", "priority");

-- CreateIndex
CREATE INDEX "tasks_userId_status_idx" ON "tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "tasks_userId_domain_idx" ON "tasks"("userId", "domain");

-- CreateIndex
CREATE INDEX "domain_progress_userId_idx" ON "domain_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "domain_progress_userId_name_key" ON "domain_progress"("userId", "name");

-- CreateIndex
CREATE INDEX "execution_progress_userId_idx" ON "execution_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "execution_progress_userId_level_key" ON "execution_progress"("userId", "level");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_progress" ADD CONSTRAINT "domain_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_progress" ADD CONSTRAINT "execution_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
