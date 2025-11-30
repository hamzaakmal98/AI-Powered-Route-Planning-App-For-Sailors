/*
  Warnings:

  - You are about to drop the `execution_progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "execution_progress" DROP CONSTRAINT "execution_progress_userId_fkey";

-- DropTable
DROP TABLE "execution_progress";
