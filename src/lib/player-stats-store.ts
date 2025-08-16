const PLAYER_STATS_KEY = 'cricket-clash-player-stats';

export type StoredPlayerStats = {
  playerId: number;
  playerName: string;
  matches: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  maidens: number;
  strikeRate: number;
  economyRate: number;
};

export type PlayerHistory = {
  stats: StoredPlayerStats;
  recentMatches: Array<{
    matchId: string;
    tournamentId?: string;
    date: string;
    runs?: number;
    wickets?: number;
  }>;
};

export function loadAllPlayerHistories(): Record<number, PlayerHistory> {
  try {
    const raw = localStorage.getItem(PLAYER_STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAllPlayerHistories(data: Record<number, PlayerHistory>) {
  try {
    localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(data));
  } catch {}
}

export function updatePlayerHistoriesFromMatch(match: any, tournamentId?: string) {
  const histories = loadAllPlayerHistories();

  // Aggregate per player from match
  const battingAgg: Record<number, { runs: number; balls: number; fours: number; sixes: number }> = {};
  const bowlingAgg: Record<number, { balls: number; runs: number; wickets: number; maidens: number }> = {};

  match.innings.forEach((inn: any) => {
    let ballsInOver = 0;
    let runsInOver = 0;
    let wicketsInOver = 0;
    inn.timeline.forEach((ball: any) => {
      // Batting
      battingAgg[ball.batsmanId] ||= { runs: 0, balls: 0, fours: 0, sixes: 0 };
      if (ball.event === 'run') {
        battingAgg[ball.batsmanId].runs += ball.runs;
        battingAgg[ball.batsmanId].balls += 1;
        if (ball.runs === 4) battingAgg[ball.batsmanId].fours += 1;
        if (ball.runs === 6) battingAgg[ball.batsmanId].sixes += 1;
      }
      if (ball.event === 'lb' || ball.event === 'b' || ball.event === 'w' || ball.event === 'wd' || ball.event === 'nb') {
        if (ball.event !== 'wd' && ball.event !== 'nb') battingAgg[ball.batsmanId].balls += 1;
      }

      // Bowling
      bowlingAgg[ball.bowlerId] ||= { balls: 0, runs: 0, wickets: 0, maidens: 0 };
      if (ball.event !== 'wd' && ball.event !== 'nb') {
        bowlingAgg[ball.bowlerId].balls += 1;
        ballsInOver += 1;
        runsInOver += ball.runs + ball.extras;
        if (ball.isWicket) {
          bowlingAgg[ball.bowlerId].wickets += 1;
          wicketsInOver += 1;
        }
        if (ballsInOver === 6) {
          if (runsInOver === 0) bowlingAgg[ball.bowlerId].maidens += 1;
          ballsInOver = 0;
          runsInOver = 0;
          wicketsInOver = 0;
        }
      } else {
        bowlingAgg[ball.bowlerId].runs += ball.extras;
      }
      bowlingAgg[ball.bowlerId].runs += ball.runs;
    });
  });

  const date = new Date().toISOString();

  const upsert = (playerId: number, playerName: string, add: Partial<StoredPlayerStats>, summary?: { runs?: number; wickets?: number }) => {
    const existing = histories[playerId]?.stats;
    const base: StoredPlayerStats = existing || {
      playerId,
      playerName,
      matches: 0,
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      wickets: 0,
      ballsBowled: 0,
      runsConceded: 0,
      maidens: 0,
      strikeRate: 0,
      economyRate: 0,
    };
    const merged: StoredPlayerStats = {
      ...base,
      matches: base.matches + 1,
      runs: base.runs + (add.runs || 0),
      ballsFaced: base.ballsFaced + (add.ballsFaced || 0),
      fours: base.fours + (add.fours || 0),
      sixes: base.sixes + (add.sixes || 0),
      wickets: base.wickets + (add.wickets || 0),
      ballsBowled: base.ballsBowled + (add.ballsBowled || 0),
      runsConceded: base.runsConceded + (add.runsConceded || 0),
      maidens: base.maidens + (add.maidens || 0),
      strikeRate: 0, // recompute below
      economyRate: 0, // recompute below
    };
    merged.strikeRate = merged.ballsFaced > 0 ? (merged.runs / merged.ballsFaced) * 100 : 0;
    merged.economyRate = merged.ballsBowled > 0 ? (merged.runsConceded / merged.ballsBowled) * 6 : 0;

    const recent = histories[playerId]?.recentMatches || [];
    histories[playerId] = {
      stats: merged,
      recentMatches: [
        { matchId: match.id, tournamentId, date, runs: summary?.runs, wickets: summary?.wickets },
        ...recent.slice(0, 19), // keep last 20
      ],
    };
  };

  // Merge batting
  Object.entries(battingAgg).forEach(([pid, b]) => {
    const playerId = Number(pid);
    const name = match.teams[0].players.concat(match.teams[1].players).find((p: any) => p.id === playerId)?.name || `Player ${playerId}`;
    upsert(playerId, name, { runs: b.runs, ballsFaced: b.balls, fours: b.fours, sixes: b.sixes }, { runs: b.runs });
  });
  // Merge bowling
  Object.entries(bowlingAgg).forEach(([pid, bw]) => {
    const playerId = Number(pid);
    const name = match.teams[0].players.concat(match.teams[1].players).find((p: any) => p.id === playerId)?.name || `Player ${playerId}`;
    upsert(playerId, name, { ballsBowled: bw.balls, runsConceded: bw.runs, wickets: bw.wickets, maidens: bw.maidens }, { wickets: bw.wickets });
  });

  saveAllPlayerHistories(histories);
}

export function getPlayerHistory(playerId: number): PlayerHistory | null {
  const histories = loadAllPlayerHistories();
  return histories[playerId] || null;
}



