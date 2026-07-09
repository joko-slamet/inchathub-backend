-- Product decision: ChatHub no longer sells/processes anything on-site (no
-- checkout, no payment gateway, no customer purchase flow) — the site is now
-- admin-only.

-- Drop order-related foreign keys and the orders table first — some
-- customer accounts we're about to delete still have orders referencing
-- them, so those references must go before the users themselves.
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_planId_fkey";
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_userId_fkey";
ALTER TABLE "public"."users" DROP CONSTRAINT "users_activePlanId_fkey";

DROP TABLE "public"."orders";
DROP TYPE "public"."OrderStatus";

-- The "USER" role (customer accounts) is removed entirely, so any existing
-- customer accounts must be deleted before the enum can drop that value
-- (Postgres won't let a column keep a value that's no longer part of its
-- enum type).
DELETE FROM "public"."users" WHERE "role" = 'USER';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Role_new" AS ENUM ('ADMIN');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."users" ALTER COLUMN "role" TYPE "public"."Role_new" USING ("role"::text::"public"."Role_new");
ALTER TYPE "public"."Role" RENAME TO "Role_old";
ALTER TYPE "public"."Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
COMMIT;

-- AlterTable
ALTER TABLE "public"."pricing_plans" DROP COLUMN "durationDays";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "activePlanId",
DROP COLUMN "planExpiresAt",
ALTER COLUMN "role" SET DEFAULT 'ADMIN';
