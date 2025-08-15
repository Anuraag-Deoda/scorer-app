"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Match } from '@/types';
import Scoreboard from './scoreboard';

export default function MatchScorecardDialog({ trigger, match }: { trigger: React.ReactNode; match: Match }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div onClick={() => setOpen(true)} className="w-full">{trigger}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Match Scorecard</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <Scoreboard 
              match={match}
              setMatch={() => {}}
              onBowlerChange={() => {}}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
