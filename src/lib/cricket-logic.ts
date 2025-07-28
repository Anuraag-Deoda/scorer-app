import type { Match, MatchSettings, Innings, Team, Player, Ball, BallDetails } from '@/types';

const MAX_PLAYERS = 11;
const SQUAD_SIZE = 15;
const SAVED_TEAMS_KEY = 'cricket-clash-saved-teams';

function createPlayer(id: number, name: string, rating: number): Player {
  return {
    id,
    name,
    rating,
    isSubstitute: false,
    isImpactPlayer: false,
    batting: { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, status: 'did not bat', strikeRate: 0 },
    bowling: { ballsBowled: 0, runsConceded: 0, maidens: 0, wickets: 0, economyRate: 0 },
  };
}

function createTeam(id: number, name: string, players: Player[]): Team {
  return {
    id,
    name,
    players: players.map(p => ({ ...p, isSubstitute: false, isImpactPlayer: false })),
    impactPlayerUsed: false,
  };
}

function createInnings(battingTeam: Team, bowlingTeam: Team): Innings {
  // Set initial batting status
  battingTeam.players.forEach((p, i) => {
    p.batting.status = (p.isSubstitute || i >= MAX_PLAYERS) ? 'did not bat' : 'not out';
  });

  const playingXI = battingTeam.players.filter(p => !p.isSubstitute || p.isImpactPlayer);

  return {
    battingTeam,
    bowlingTeam,
    score: 0,
    wickets: 0,
    overs: 0,
    ballsThisOver: 0,
    timeline: [],
    fallOfWickets: [],
    currentPartnership: { batsman1: playingXI[0]?.id ?? -1, batsman2: playingXI[1]?.id ?? -1, runs: 0, balls: 0 },
    batsmanOnStrike: playingXI[0]?.id ?? -1,
    batsmanNonStrike: playingXI[1]?.id ?? -1,
    currentBowler: -1, // No bowler selected initially
  };
}

export function createMatch(settings: MatchSettings, allPlayers: Player[]): Match {
  let savedTeams: Record<string, Player[]> = {};
  try {
      const savedTeamsData = localStorage.getItem(SAVED_TEAMS_KEY);
      if (savedTeamsData) {
          savedTeams = JSON.parse(savedTeamsData);
      }
  } catch (e) {
      console.error("Could not load saved teams", e);
  }

  const getTeamPlayers = (name: string): Player[] => {
      if (savedTeams[name]) {
          return savedTeams[name].map(p => createPlayer(p.id, p.name, p.rating ?? 75));
      }
      const shuffledPlayers = [...allPlayers].sort(() => 0.5 - Math.random());
      return shuffledPlayers.slice(0, SQUAD_SIZE).map(p => createPlayer(p.id, p.name, p.rating ?? 75));
  };
  
  const team1Players = getTeamPlayers(settings.teamNames[0]);
  const team2Players = getTeamPlayers(settings.teamNames[1]);

  const teams: [Team, Team] = [
    createTeam(0, settings.teamNames[0], team1Players),
    createTeam(1, settings.teamNames[1], team2Players),
  ];
  
  teams.forEach(team => {
      for (let i = MAX_PLAYERS; i < SQUAD_SIZE; i++) {
          if(team.players[i]) team.players[i].isSubstitute = true;
      }
  });

  const battingFirstTeam = settings.toss.winner === teams[0].name
    ? (settings.toss.decision === 'bat' ? teams[0] : teams[1])
    : (settings.toss.decision === 'bat' ? teams[1] : teams[0]);
  
  const bowlingFirstTeam = battingFirstTeam.id === teams[0].id ? teams[1] : teams[0];

  const innings = createInnings(battingFirstTeam, bowlingFirstTeam);

  return {
    id: `match_${Date.now()}`,
    teams,
    oversPerInnings: settings.oversPerInnings,
    toss: settings.toss,
    innings: [innings],
    currentInnings: 1,
    status: 'inprogress',
  };
}

function calculateRatingUpdate(player: Player): number {
    let ratingChange = 0;
    const baseRating = player.rating || 75;

    // Batting performance
    const { runs, ballsFaced, strikeRate } = player.batting;
    if (ballsFaced > 0) {
        ratingChange += runs * 0.1;
        if (runs >= 100) ratingChange += 10;
        else if (runs >= 50) ratingChange += 5;

        if (strikeRate > 150) ratingChange += (strikeRate - 150) * 0.02;
        if (strikeRate < 80 && ballsFaced > 10) ratingChange -= (80 - strikeRate) * 0.02;
    }
    
    // Bowling performance
    const { wickets, ballsBowled, economyRate, maidens } = player.bowling;
    if (ballsBowled > 0) {
        ratingChange += wickets * 2;
        if (wickets >= 5) ratingChange += 10;
        else if (wickets >= 3) ratingChange += 5;
        ratingChange += maidens * 2;

        if (economyRate < 4.0 && ballsBowled >= 12) ratingChange += (4.0 - economyRate);
        if (economyRate > 10.0 && ballsBowled >= 12) ratingChange -= (economyRate - 10.0) * 0.5;
    }

    const newRating = baseRating + ratingChange;
    return Math.max(1, Math.min(100, newRating));
}


function finishMatch(match: Match): Match {
    const newMatch = JSON.parse(JSON.stringify(match));
    newMatch.status = 'finished';

    const score1 = newMatch.innings[0].score;
    const score2 = newMatch.innings.length > 1 ? newMatch.innings[1].score : 0;
    const team1 = newMatch.innings[0].battingTeam;
    const team2 = newMatch.innings[0].bowlingTeam;
    
    if (newMatch.currentInnings === 2 && score2 > score1) {
        const wicketsLeft = MAX_PLAYERS - 1 - newMatch.innings[1].wickets;
        newMatch.result = `${newMatch.innings[1].battingTeam.name} won by ${wicketsLeft} wickets.`;
    } else if (newMatch.currentInnings === 2 && score1 > score2) {
        newMatch.result = `${newMatch.innings[0].battingTeam.name} won by ${score1 - score2} runs.`;
    } else if (score1 === score2) {
        newMatch.result = 'Match tied.';
    } else if (newMatch.currentInnings === 1 && newMatch.status === 'finished') {
        newMatch.result = `${team1.name} scored ${score1}. Target for ${team2.name} is ${score1 + 1}.`;
    }

    let savedTeams: Record<string, Player[]> = {};
     try {
        const savedTeamsData = localStorage.getItem(SAVED_TEAMS_KEY);
        if (savedTeamsData) {
            savedTeams = JSON.parse(savedTeamsData);
        }
    } catch (e) {
        console.error("Could not load saved teams for updating", e);
    }

    newMatch.teams.forEach((team: Team) => {
        team.players.forEach((player: Player) => {
            const originalPlayer = allPlayersFromMatch(match).find(p => p.id === player.id);
            if(originalPlayer) {
              player.rating = calculateRatingUpdate(originalPlayer);
            }
        });
        savedTeams[team.name] = JSON.parse(JSON.stringify(team.players));
    });

    try {
        localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(savedTeams));
    } catch (e) {
        console.error("Could not save teams", e);
    }


    return newMatch;
}

function allPlayersFromMatch(match: Match): Player[] {
    const playersMap = new Map<number, Player>();

    match.innings.forEach(inning => {
        [...inning.battingTeam.players, ...inning.bowlingTeam.players].forEach(p => {
            if (!playersMap.has(p.id)) {
                playersMap.set(p.id, JSON.parse(JSON.stringify(p)));
            } else {
                const existingPlayer = playersMap.get(p.id)!;
                if (p.batting.ballsFaced > existingPlayer.batting.ballsFaced) {
                    existingPlayer.batting = {...p.batting};
                }
                 if (p.bowling.ballsBowled > existingPlayer.bowling.ballsBowled) {
                    existingPlayer.bowling = {...p.bowling};
                }
                if (p.isSubstitute) existingPlayer.isSubstitute = p.isSubstitute;
                if (p.isImpactPlayer) existingPlayer.isImpactPlayer = p.isImpactPlayer;
            }
        });
    });

    return Array.from(playersMap.values());
}


function endOfInnings(match: Match): Match {
    const newMatch = JSON.parse(JSON.stringify(match));
    if (newMatch.currentInnings === 1) {
        newMatch.currentInnings = 2;
        const newBattingTeam = newMatch.teams.find((t: Team) => t.id === newMatch.innings[0].bowlingTeam.id)!;
        const newBowlingTeam = newMatch.teams.find((t: Team) => t.id === newMatch.innings[0].battingTeam.id)!;
        const newInnings = createInnings(newBattingTeam, newBowlingTeam);
        newMatch.innings.push(newInnings);
    } else {
        return finishMatch(newMatch);
    }
    return newMatch;
}

function updateStats(match: Match, ball: BallDetails): Match {
    const newMatch = JSON.parse(JSON.stringify(match));
    let currentInnings: Innings = newMatch.innings[newMatch.currentInnings - 1];
    
    const battingTeam = currentInnings.battingTeam;
    const bowlingTeam = currentInnings.bowlingTeam;

    let onStrike = battingTeam.players.find((p: Player) => p.id === currentInnings.batsmanOnStrike);
    const bowler = bowlingTeam.players.find((p: Player) => p.id === currentInnings.currentBowler)!;
    
    const isLegalBall = ball.event !== 'wd' && ball.event !== 'nb';
    
    currentInnings.score += ball.runs + ball.extras;
    
    // Update bowler stats first
    bowler.bowling.runsConceded += ball.runs + ball.extras;
    if (isLegalBall) {
        bowler.bowling.ballsBowled++;
        currentInnings.ballsThisOver++;
    }

    if (onStrike) {
        // Update batting stats
        if (isLegalBall) {
            onStrike.batting.ballsFaced++;
            currentInnings.currentPartnership.balls++;
        }
        
        if (ball.event === 'run') {
            onStrike.batting.runs += ball.runs;
            currentInnings.currentPartnership.runs += ball.runs;
            if (ball.runs === 4) onStrike.batting.fours++;
            if (ball.runs === 6) onStrike.batting.sixes++;
        }
    }


    if (ball.event === 'w') {
        currentInnings.wickets++;
        if (onStrike) {
            onStrike.batting.status = 'out';
            
            const fielder = bowlingTeam.players.find((p: Player) => p.id === ball.fielderId);
            let outDetails = `b. ${bowler.name}`;

            switch (ball.wicketType) {
                case "Caught":
                    outDetails = `c. ${fielder?.name || 'Fielder'} b. ${bowler.name}`;
                    bowler.bowling.wickets++;
                    break;
                case "Run Out":
                   outDetails = `run out (${fielder?.name || 'Fielder'})`;
                   break;
                case "Stumped":
                    outDetails = `st. ${fielder?.name || 'Fielder'} b. ${bowler.name}`;
                    bowler.bowling.wickets++;
                    break;
                default: // Bowled, LBW, Hit Wicket
                    outDetails = `${ball.wicketType} b. ${bowler.name}`;
                    bowler.bowling.wickets++;
                    break;
            }
            
            onStrike.batting.outDetails = outDetails;
            
            currentInnings.fallOfWickets.push({
                wicket: currentInnings.wickets,
                score: currentInnings.score,
                over: currentInnings.overs + currentInnings.ballsThisOver / 10,
                playerOut: onStrike.name,
            });
            
            const playingXI = battingTeam.players.filter((p: Player) => !p.isSubstitute || p.isImpactPlayer);
            if (currentInnings.wickets < playingXI.length - 1) {
                let nextBatsman = battingTeam.players.find((p: Player) => p.batting.status === 'not out' && p.id !== currentInnings.batsmanNonStrike && (!p.isSubstitute || p.isImpactPlayer));
               
                if(nextBatsman) {
                    currentInnings.batsmanOnStrike = nextBatsman.id
                } else {
                    currentInnings.batsmanOnStrike = -1;
                }

                currentInnings.currentPartnership = {
                     batsman1: currentInnings.batsmanOnStrike, 
                     batsman2: currentInnings.batsmanNonStrike, 
                     runs: 0,
                     balls: 0 
                };
            } else {
                 currentInnings.batsmanOnStrike = -1;
            }
        }
    }

    if (onStrike && ball.runs % 2 === 1 && isLegalBall) {
        [currentInnings.batsmanOnStrike, currentInnings.batsmanNonStrike] = [currentInnings.batsmanNonStrike, currentInnings.batsmanOnStrike];
    }
    
    // Check for end of over
    if (currentInnings.ballsThisOver === 6) {
        currentInnings.overs++;
        currentInnings.ballsThisOver = 0;
        
        // Change strike
        [currentInnings.batsmanOnStrike, currentInnings.batsmanNonStrike] = [currentInnings.batsmanNonStrike, currentInnings.batsmanOnStrike];
        
        // Check for maiden
        const overTimeline = currentInnings.timeline.slice(currentInnings.timeline.length - 5);
        const runsInOver = overTimeline.reduce((acc, b) => acc + b.runs + b.extras, ball.runs + ball.extras);
        if(runsInOver === 0 && overTimeline.every(b => b.extras === 0) && ball.extras === 0) {
            bowler.bowling.maidens++;
        }
        
        // Reset bowler for next over
        if (currentInnings.overs < newMatch.oversPerInnings) {
            currentInnings.currentBowler = -1;
        }
    }

    // Update player SR and bowler economy
    battingTeam.players.forEach(p => {
        if (p.batting.ballsFaced > 0) {
          p.batting.strikeRate = (p.batting.runs / p.batting.ballsFaced) * 100;
        }
    });
    
    bowlingTeam.players.forEach(p => {
        if (p.bowling.ballsBowled > 0) {
            p.bowling.economyRate = p.bowling.runsConceded / (p.bowling.ballsBowled / 6);
        }
    });

    const playingXI = battingTeam.players.filter((p: Player) => !p.isSubstitute || p.isImpactPlayer);
    const allOut = currentInnings.wickets >= playingXI.length - 1;
    const oversFinished = currentInnings.overs >= newMatch.oversPerInnings;
    
    if (allOut || oversFinished) {
        return endOfInnings(newMatch);
    }
    
    if (newMatch.currentInnings === 2 && currentInnings.score > newMatch.innings[0].score) {
        return finishMatch(newMatch);
    }

    return newMatch;
}

export function processBall(match: Match, ball: BallDetails): Match | null {
    if (match.status === 'finished') return match;
    
    let currentInnings = match.innings[match.currentInnings - 1];
    
    if (currentInnings.currentBowler === -1) {
        console.error("No bowler selected");
        return null;
    }

    let displayValue = '';
    switch(ball.event) {
        case 'run': displayValue = ball.runs.toString(); break;
        case 'w': displayValue = 'W'; break;
        case 'wd': displayValue = 'wd'; break;
        case 'nb': displayValue = 'nb'; break;
        case 'lb': displayValue = `${ball.extras}lb`; break;
        case 'b': displayValue = `${ball.extras}b`; break;
    }

    const newBall: Ball = {
        ...ball,
        isWicket: ball.event === 'w',
        batsmanId: currentInnings.batsmanOnStrike,
        bowlerId: currentInnings.currentBowler,
        display: displayValue,
        over: currentInnings.overs + (currentInnings.ballsThisOver / 10)
    };

    const newMatch = updateStats(match, ball);
    const newCurrentInnings = newMatch.innings[newMatch.currentInnings - 1];
    
    // Only push to timeline if it's the same innings
    if (newMatch.currentInnings === match.currentInnings) {
       newCurrentInnings.timeline.push(newBall);
    } else if (newMatch.innings.length > match.innings.length) {
        // If new innings, the ball belongs to the previous one
        newMatch.innings[match.currentInnings-1].timeline.push(newBall);
    }

    return newMatch;
}

export function undoLastBall(match: Match): Match | null {
    const originalMatchState = JSON.parse(JSON.stringify(match));
    if (originalMatchState.innings[0].timeline.length === 0 && originalMatchState.innings.length === 1) return null;

    let replayedMatch = createMatch(
        {
            teamNames: [match.teams[0].name, match.teams[1].name],
            oversPerInnings: match.oversPerInnings,
            toss: match.toss,
        },
        match.teams.flatMap(t => t.players)
    );
    
    replayedMatch.teams = JSON.parse(JSON.stringify(match.teams));
    
    const allBalls = originalMatchState.innings.flatMap((i: Innings) => i.timeline);
    allBalls.pop();

    if (allBalls.length === 0) {
       const battingFirstTeam = match.toss.winner === match.teams[0].name
        ? (match.toss.decision === 'bat' ? match.teams[0] : match.teams[1])
        : (match.toss.decision === 'bat' ? match.teams[1] : match.teams[0]);
  
      const bowlingFirstTeam = battingFirstTeam.id === match.teams[0].id ? match.teams[1] : match.teams[0];
      replayedMatch.innings = [createInnings(battingFirstTeam, bowlingFirstTeam)];
      return replayedMatch;
    }


    replayedMatch.innings = [createInnings(replayedMatch.teams.find(t => t.id === match.innings[0].battingTeam.id)!, replayedMatch.teams.find(t => t.id === match.innings[0].bowlingTeam.id)! )]
    replayedMatch.currentInnings = 1;


    for(const ball of allBalls) {
        let currentInnings = replayedMatch.innings[replayedMatch.currentInnings - 1];
        
        if (currentInnings.currentBowler === -1) {
            currentInnings.currentBowler = ball.bowlerId;
        }

        const processedMatch = processBall(replayedMatch, { ...ball });

        if (processedMatch) {
            replayedMatch = processedMatch;
        }
    }
    
    const finalInnings = replayedMatch.innings[replayedMatch.currentInnings - 1];
    const lastBall = allBalls[allBalls.length - 1];
    if(lastBall) {
        if (finalInnings.ballsThisOver > 0) {
            finalInnings.currentBowler = lastBall.bowlerId;
        }
    }
    
    return replayedMatch;
}

    