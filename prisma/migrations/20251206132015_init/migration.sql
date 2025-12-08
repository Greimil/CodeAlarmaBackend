-- CreateTable
CREATE TABLE "processedEvents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL,
    "processedAt" DATETIME NOT NULL,
    "slaTime" DATETIME NOT NULL,
    "complianceSlatime" BOOLEAN NOT NULL,
    "Operator" TEXT NOT NULL,
    "operatorJustify" TEXT NOT NULL,
    "operatorComment" TEXT NOT NULL,
    "accoundId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accuntObservation" TEXT NOT NULL
);
