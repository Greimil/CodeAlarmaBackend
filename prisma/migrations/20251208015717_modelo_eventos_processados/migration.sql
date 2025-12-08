/*
  Warnings:

  - You are about to drop the column `Operator` on the `processedEvents` table. All the data in the column will be lost.
  - You are about to drop the column `accoundId` on the `processedEvents` table. All the data in the column will be lost.
  - You are about to drop the column `accuntObservation` on the `processedEvents` table. All the data in the column will be lost.
  - You are about to drop the column `complianceSlatime` on the `processedEvents` table. All the data in the column will be lost.
  - You are about to drop the column `operatorComment` on the `processedEvents` table. All the data in the column will be lost.
  - You are about to drop the column `operatorJustify` on the `processedEvents` table. All the data in the column will be lost.
  - You are about to drop the column `slaTime` on the `processedEvents` table. All the data in the column will be lost.
  - Added the required column `accionRecomendada` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountObservation` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conclusion` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cumpleSLA` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cumplimientoProtocolo` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `esFaltaRecurrente` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evaluacionLlamada` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evaluacionQA` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operator` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operatorNotes` to the `processedEvents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puntuacionLlamada` to the `processedEvents` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_processedEvents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL,
    "processedAt" DATETIME NOT NULL,
    "operator" TEXT NOT NULL,
    "operatorNotes" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accountObservation" TEXT NOT NULL,
    "evaluacionLlamada" TEXT NOT NULL,
    "cumplimientoProtocolo" TEXT NOT NULL,
    "esFaltaRecurrente" BOOLEAN NOT NULL,
    "cumpleSLA" BOOLEAN NOT NULL,
    "puntuacionLlamada" INTEGER NOT NULL,
    "evaluacionQA" INTEGER NOT NULL,
    "accionRecomendada" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL
);
INSERT INTO "new_processedEvents" ("code", "createdAt", "id", "processedAt") SELECT "code", "createdAt", "id", "processedAt" FROM "processedEvents";
DROP TABLE "processedEvents";
ALTER TABLE "new_processedEvents" RENAME TO "processedEvents";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
