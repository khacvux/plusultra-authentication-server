/*
  Warnings:

  - You are about to drop the column `accessToken` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_accessToken_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "accessToken";
