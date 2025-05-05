-- CreateTable
CREATE TABLE "CollectedPubMedArticle" (
    "id" TEXT NOT NULL,
    "pmid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT,
    "journal" TEXT,
    "pubdate" TEXT,
    "abstract" TEXT,
    "pubmedUrl" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectedPubMedArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectedPubMedArticle_pmid_key" ON "CollectedPubMedArticle"("pmid");

-- CreateIndex
CREATE INDEX "CollectedPubMedArticle_userId_idx" ON "CollectedPubMedArticle"("userId");

-- CreateIndex
CREATE INDEX "CollectedPubMedArticle_pmid_idx" ON "CollectedPubMedArticle"("pmid");

-- AddForeignKey
ALTER TABLE "CollectedPubMedArticle" ADD CONSTRAINT "CollectedPubMedArticle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
