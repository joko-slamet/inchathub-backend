-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "resetPasswordTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetPasswordTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_resetPasswordTokenHash_key" ON "public"."users"("resetPasswordTokenHash");

