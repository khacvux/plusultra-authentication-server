/*
  Warnings:

  - A unique constraint covering the columns `[accessToken]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "accessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_accessToken_key" ON "user"("accessToken");
