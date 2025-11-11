-- CreateTable
CREATE TABLE "SearchConfig" (
    "id" TEXT NOT NULL,
    "tavilyApiKey" TEXT,
    "jinaApiKey" TEXT,
    "ncbiApiKey" TEXT,
    "searchProvider" TEXT NOT NULL DEFAULT 'tavily',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchConfig_userId_key" ON "SearchConfig"("userId");

-- CreateIndex
CREATE INDEX "SearchConfig_userId_idx" ON "SearchConfig"("userId");

-- AddForeignKey
ALTER TABLE "SearchConfig" ADD CONSTRAINT "SearchConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
