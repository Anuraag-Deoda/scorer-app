"use client";

import type { Innings, Player } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function InningsSummary({ innings }: { innings: Innings }) {
  const topBatsmen = innings.battingTeam.players
    .filter(p => p.batting.ballsFaced > 0)
    .sort((a, b) => b.batting.runs - a.batting.runs)
    .slice(0, 3);

  const topBowlers = innings.bowlingTeam.players
    .filter(p => p.bowling.ballsBowled > 0)
    .sort((a, b) => b.bowling.wickets - a.bowling.wickets)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2">Top Batsmen</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Runs</TableHead>
              <TableHead>Balls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topBatsmen.map(player => (
              <TableRow key={player.id}>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.batting.runs}</TableCell>
                <TableCell>{player.batting.ballsFaced}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Top Bowlers</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Figures</TableHead>
              <TableHead>Overs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topBowlers.map(player => (
              <TableRow key={player.id}>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.bowling.wickets}/{player.bowling.runsConceded}</TableCell>
                <TableCell>{Math.floor(player.bowling.ballsBowled / 6)}.{player.bowling.ballsBowled % 6}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
