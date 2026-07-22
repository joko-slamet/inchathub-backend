/*
  Warnings:

  - You are about to drop the column `content` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `excerpt` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `articles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "articles" DROP COLUMN "content",
DROP COLUMN "excerpt",
DROP COLUMN "title";

-- CreateTable
CREATE TABLE "article_translations" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT[],

    CONSTRAINT "article_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "article_translations_articleId_locale_key" ON "article_translations"("articleId", "locale");

-- AddForeignKey
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
