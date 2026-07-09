-- AlterTable
ALTER TABLE "public"."ai_article_configs" ADD COLUMN     "internalLinks" JSONB NOT NULL DEFAULT '[]';
