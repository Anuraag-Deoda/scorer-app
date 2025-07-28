"use client";

import type { Player } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";

interface PlayerRatingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  players: Player[];
}

export default function PlayerRatingsDialog({
  isOpen,
  onOpenChange,
  players,
}: PlayerRatingsDialogProps) {
  const sortedPlayers = [...players].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Player Ratings</DialogTitle>
          <DialogDescription>
            Overall ratings of all available players.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       <span className="w-12 font-bold">{player.rating?.toFixed(0)}</span>
                       <Progress value={player.rating} className="w-24 h-2" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
