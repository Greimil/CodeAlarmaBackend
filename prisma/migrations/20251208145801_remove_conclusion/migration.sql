/*
  Warnings:

  - You are about to drop the column `conclusion` on the `processedEvents` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_processedEvents" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
