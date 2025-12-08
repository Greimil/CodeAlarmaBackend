/*
  Warnings:

  - The primary key for the `processedEvents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `processedEvents` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `eventID` to the `processedEvents` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_processedEvents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventID" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "processedAt" DATETIME NOT NULL,
    "operator" TEXT NOT NULL,
    "operatorNotes" TEXT,
    "accountId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accountObservation" TEXT,
    "evaluacionLlamada" TEXT NOT NULL,
    "cumplimientoProtocolo" TEXT NOT NULL,
    "esFaltaRecurrente" BOOLEAN NOT NULL,
    "cumpleSLA" BOOLEAN NOT NULL,
    "puntuacionLlamada" INTEGER NOT NULL,
    "evaluacionQA" INTEGER NOT NULL,
    "accionRecomendada" TEXT NOT NULL
);
INSERT INTO "new_processedEvents" ("accionRecomendada", "accountId", "accountObservation", "code", "createdAt", "cumpleSLA", "cumplimientoProtocolo", "esFaltaRecurrente", "evaluacionLlamada", "evaluacionQA", "id", "operator", "operatorNotes", "processedAt", "puntuacionLlamada") SELECT "accionRecomendada", "accountId", "accountObservation", "code", "createdAt", "cumpleSLA", "cumplimientoProtocolo", "esFaltaRecurrente", "evaluacionLlamada", "evaluacionQA", "id", "operator", "operatorNotes", "processedAt", "puntuacionLlamada" FROM "processedEvents";
DROP TABLE "processedEvents";
ALTER TABLE "new_processedEvents" RENAME TO "processedEvents";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
