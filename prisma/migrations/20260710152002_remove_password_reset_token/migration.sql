-- DropIndex
DROP INDEX "public"."users_resetPasswordTokenHash_key";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "resetPasswordTokenExpiresAt",
DROP COLUMN "resetPasswordTokenHash";
