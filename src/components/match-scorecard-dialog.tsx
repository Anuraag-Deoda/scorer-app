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
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <DialogTitle className="text-lg sm:text-xl">Match Scorecard</DialogTitle>
          </DialogHeader>
          <div className="p-2 sm:p-4 overflow-hidden">
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
