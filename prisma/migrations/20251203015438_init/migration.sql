-- CreateEnum
CREATE TYPE "AccountProvider" AS ENUM ('google');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('locked', 'ready', 'in_progress', 'completed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "onboardingData" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AccountProvider" NOT NULL,
    "provider_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boat_maintenance_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "estimatedTime" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'ready',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "boat_maintenance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_routing_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "estimatedTime" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'ready',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "weather_routing_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_systems_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "estimatedTime" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'ready',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "safety_systems_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_management_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "estimatedTime" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'ready',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "budget_management_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passage_planning_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "estimatedTime" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'ready',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "routeName" TEXT,
    "departurePort" TEXT,
    "departureLat" DOUBLE PRECISION,
    "departureLng" DOUBLE PRECISION,
    "destinationPort" TEXT,
    "destinationLat" DOUBLE PRECISION,
    "destinationLng" DOUBLE PRECISION,
    "totalDistance" DOUBLE PRECISION,
    "routeEstimatedTime" TEXT,
    "routeStatus" TEXT NOT NULL DEFAULT 'planning',
    "routeData" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "passage_planning_tasks_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "waypoints" (
    "id" TEXT NOT NULL,
    "passagePlanningTaskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sequence" INTEGER NOT NULL,
    "course" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unique_account_provider" ON "accounts"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "boat_maintenance_tasks_userId_priority_idx" ON "boat_maintenance_tasks"("userId", "priority");

-- CreateIndex
CREATE INDEX "boat_maintenance_tasks_userId_status_idx" ON "boat_maintenance_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "weather_routing_tasks_userId_priority_idx" ON "weather_routing_tasks"("userId", "priority");

-- CreateIndex
CREATE INDEX "weather_routing_tasks_userId_status_idx" ON "weather_routing_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "safety_systems_tasks_userId_priority_idx" ON "safety_systems_tasks"("userId", "priority");

-- CreateIndex
CREATE INDEX "safety_systems_tasks_userId_status_idx" ON "safety_systems_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "budget_management_tasks_userId_priority_idx" ON "budget_management_tasks"("userId", "priority");

-- CreateIndex
CREATE INDEX "budget_management_tasks_userId_status_idx" ON "budget_management_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "passage_planning_tasks_userId_priority_idx" ON "passage_planning_tasks"("userId", "priority");

-- CreateIndex
CREATE INDEX "passage_planning_tasks_userId_status_idx" ON "passage_planning_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "passage_planning_tasks_userId_routeStatus_idx" ON "passage_planning_tasks"("userId", "routeStatus");

-- CreateIndex
CREATE INDEX "domain_progress_userId_idx" ON "domain_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "domain_progress_userId_name_key" ON "domain_progress"("userId", "name");

-- CreateIndex
CREATE INDEX "waypoints_passagePlanningTaskId_idx" ON "waypoints"("passagePlanningTaskId");

-- CreateIndex
CREATE INDEX "waypoints_passagePlanningTaskId_sequence_idx" ON "waypoints"("passagePlanningTaskId", "sequence");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_maintenance_tasks" ADD CONSTRAINT "boat_maintenance_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_routing_tasks" ADD CONSTRAINT "weather_routing_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_systems_tasks" ADD CONSTRAINT "safety_systems_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_management_tasks" ADD CONSTRAINT "budget_management_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passage_planning_tasks" ADD CONSTRAINT "passage_planning_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_progress" ADD CONSTRAINT "domain_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waypoints" ADD CONSTRAINT "waypoints_passagePlanningTaskId_fkey" FOREIGN KEY ("passagePlanningTaskId") REFERENCES "passage_planning_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
