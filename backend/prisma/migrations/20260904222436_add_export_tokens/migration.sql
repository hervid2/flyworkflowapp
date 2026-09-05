-- CreateTable
CREATE TABLE "ExportToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExportToken_userId_key" ON "ExportToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExportToken_tokenHash_key" ON "ExportToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ExportToken_orgId_idx" ON "ExportToken"("orgId");

-- AddForeignKey
ALTER TABLE "ExportToken" ADD CONSTRAINT "ExportToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
