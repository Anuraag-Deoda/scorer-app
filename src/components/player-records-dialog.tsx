"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { loadAllPlayerHistories } from '@/lib/player-stats-store';

export default function PlayerRecordsDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const histories = loadAllPlayerHistories();
  const players = Object.values(histories).map(h => h.stats);
  const filtered = players.filter(p => p.playerName.toLowerCase().includes(query.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">View Player Records</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>Player Records</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Input placeholder="Search player" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 h-[calc(80vh-140px)] overflow-auto px-6 pb-6">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Wickets</TableHead>
                  <TableHead>SR</TableHead>
                  <TableHead>Econ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.playerId}>
                    <TableCell className="font-medium">{p.playerName}</TableCell>
                    <TableCell>{p.matches}</TableCell>
                    <TableCell>{p.runs}</TableCell>
                    <TableCell>{p.wickets}</TableCell>
                    <TableCell>{p.strikeRate.toFixed(1)}</TableCell>
                    <TableCell>{p.economyRate.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No records yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
