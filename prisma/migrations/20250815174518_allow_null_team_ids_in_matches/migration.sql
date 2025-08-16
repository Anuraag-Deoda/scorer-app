-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TournamentMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "team1Id" INTEGER,
    "team2Id" INTEGER,
    "matchNumber" INTEGER NOT NULL,
    "round" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "venue" TEXT,
    "result" TEXT,
    "winnerTeamId" INTEGER,
    "loserTeamId" INTEGER,
    "scheduledDate" DATETIME,
    "completedDate" DATETIME,
    "matchData" JSONB,
    CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TournamentMatch_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TournamentMatch_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TournamentMatch" ("completedDate", "id", "loserTeamId", "matchData", "matchNumber", "result", "round", "scheduledDate", "status", "team1Id", "team2Id", "tournamentId", "venue", "winnerTeamId") SELECT "completedDate", "id", "loserTeamId", "matchData", "matchNumber", "result", "round", "scheduledDate", "status", "team1Id", "team2Id", "tournamentId", "venue", "winnerTeamId" FROM "TournamentMatch";
DROP TABLE "TournamentMatch";
ALTER TABLE "new_TournamentMatch" RENAME TO "TournamentMatch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
