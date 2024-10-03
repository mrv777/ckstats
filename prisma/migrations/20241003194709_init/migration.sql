-- CreateTable
CREATE TABLE "PoolStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runtime" INTEGER NOT NULL,
    "users" INTEGER NOT NULL,
    "workers" INTEGER NOT NULL,
    "idle" INTEGER NOT NULL,
    "disconnected" INTEGER NOT NULL,
    "hashrate1m" TEXT NOT NULL,
    "hashrate5m" TEXT NOT NULL,
    "hashrate15m" TEXT NOT NULL,
    "hashrate1hr" TEXT NOT NULL,
    "hashrate6hr" TEXT NOT NULL,
    "hashrate1d" TEXT NOT NULL,
    "hashrate7d" TEXT NOT NULL,
    "diff" REAL NOT NULL,
    "accepted" BIGINT NOT NULL,
    "rejected" BIGINT NOT NULL,
    "bestshare" BIGINT NOT NULL,
    "SPS1m" REAL NOT NULL,
    "SPS5m" REAL NOT NULL,
    "SPS15m" REAL NOT NULL,
    "SPS1h" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorised" BIGINT NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "UserStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userAddress" TEXT NOT NULL,
    "hashrate1m" TEXT NOT NULL DEFAULT '0',
    "hashrate5m" TEXT NOT NULL DEFAULT '0',
    "hashrate1hr" TEXT NOT NULL DEFAULT '0',
    "hashrate1d" TEXT NOT NULL DEFAULT '0',
    "hashrate7d" TEXT NOT NULL DEFAULT '0',
    "lastShare" BIGINT NOT NULL DEFAULT 0,
    "workerCount" INTEGER NOT NULL DEFAULT 0,
    "shares" BIGINT NOT NULL DEFAULT 0,
    "bestShare" REAL NOT NULL DEFAULT 0,
    "bestEver" BIGINT NOT NULL DEFAULT 0,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "hashrate1m" TEXT NOT NULL DEFAULT '0',
    "hashrate5m" TEXT NOT NULL DEFAULT '0',
    "hashrate1hr" TEXT NOT NULL DEFAULT '0',
    "hashrate1d" TEXT NOT NULL DEFAULT '0',
    "hashrate7d" TEXT NOT NULL DEFAULT '0',
    "lastUpdate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shares" BIGINT NOT NULL DEFAULT 0,
    "bestShare" REAL NOT NULL DEFAULT 0,
    "bestEver" BIGINT NOT NULL DEFAULT 0,
    "userAddress" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "WorkerStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workerId" INTEGER NOT NULL,
    "hashrate1m" TEXT NOT NULL DEFAULT '0',
    "hashrate5m" TEXT NOT NULL DEFAULT '0',
    "hashrate1hr" TEXT NOT NULL DEFAULT '0',
    "hashrate1d" TEXT NOT NULL DEFAULT '0',
    "hashrate7d" TEXT NOT NULL DEFAULT '0',
    "shares" BIGINT NOT NULL DEFAULT 0,
    "bestShare" REAL NOT NULL DEFAULT 0,
    "bestEver" BIGINT NOT NULL DEFAULT 0,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE INDEX "UserStats_timestamp_idx" ON "UserStats"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_userAddress_name_key" ON "Worker"("userAddress", "name");

-- CreateIndex
CREATE INDEX "WorkerStats_timestamp_idx" ON "WorkerStats"("timestamp");
