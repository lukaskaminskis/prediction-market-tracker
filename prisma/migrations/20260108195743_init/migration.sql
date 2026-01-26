-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "resolution" TEXT,
    "url" TEXT,
    "volume" REAL,
    "liquidity" REAL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "groupId" TEXT,
    CONSTRAINT "Market_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Market_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MarketGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "marketId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "previousPrice" REAL,
    "volume" REAL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Outcome_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canonicalTitle" TEXT NOT NULL,
    "category" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "spread" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "avgLiquidity" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MarketGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "marketsProcessed" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT
);

-- CreateIndex
CREATE INDEX "Market_title_idx" ON "Market"("title");

-- CreateIndex
CREATE INDEX "Market_groupId_idx" ON "Market"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Market_venueId_externalId_key" ON "Market"("venueId", "externalId");

-- CreateIndex
CREATE INDEX "Outcome_marketId_idx" ON "Outcome"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "Outcome_marketId_name_key" ON "Outcome"("marketId", "name");

-- CreateIndex
CREATE INDEX "MarketGroup_canonicalTitle_idx" ON "MarketGroup"("canonicalTitle");

-- CreateIndex
CREATE INDEX "Opportunity_groupId_idx" ON "Opportunity"("groupId");

-- CreateIndex
CREATE INDEX "Opportunity_score_idx" ON "Opportunity"("score");

-- CreateIndex
CREATE INDEX "Opportunity_isActive_idx" ON "Opportunity"("isActive");
