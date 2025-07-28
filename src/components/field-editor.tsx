"use client"

import { useState } from "react";
import type { Match, Player, FielderPlacement } from "@/types";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DialogFooter, DialogClose } from "./ui/dialog";

// Define a basic set of fielding positions (can be expanded later)
const FIELDING_POSITIONS = [
    "Slip", "Gully", "Point", "Cover", "Mid Off", "Mid On", "Mid Wicket", "Square Leg", "Fine Leg", "Third Man", "Wicket Keeper", "Long Off", "Long On", "Deep Mid Wicket", "Deep Square Leg", "Deep Fine Leg", "Deep Extra Cover", "Deep Point", "Cow Corner"
];

type FieldEditorProps = {
    match: Match;
    setMatch: (match: Match) => void;
    onSave: (placements: FielderPlacement[]) => void; // Add onSave prop
}

export default function FieldEditor({ match, setMatch, onSave }: FieldEditorProps) {
    const currentInnings = match.innings[match.currentInnings - 1];
    // Filter out the bowler from the list of available fielders for the current over
    const availableFielders = currentInnings.bowlingTeam.players.filter(p => (!p.isSubstitute || p.isImpactPlayer) && p.id !== currentInnings.currentBowler);
    const [fielderPlacements, setFielderPlacements] = useState<FielderPlacement[]>(currentInnings.fieldPlacements || []);
    const [selectedPlayer, setSelectedPlayer] = useState<number | "">("");
    const [selectedPosition, setSelectedPosition] = useState<string | "">("");

    const handleAddFielder = () => {
        if (selectedPlayer !== "" && selectedPosition !== "") {
            // Prevent adding the same player multiple times
            if (fielderPlacements.some(p => p.playerId === selectedPlayer)) {
                 // Optionally show a toast or other feedback
                 console.log("Player already added as a fielder.");
                 return;
            }
            setFielderPlacements([...fielderPlacements, { playerId: selectedPlayer, position: selectedPosition }]);
            setSelectedPlayer("");
            setSelectedPosition("");
        }
    };

    const handleRemoveFielder = (playerId: number) => {
        setFielderPlacements(fielderPlacements.filter(p => p.playerId !== playerId));
    };
    
    const handleSave = () => {
        onSave(fielderPlacements);
    }

    return (
        <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">Select players and their approximate fielding positions for the current over. (Note: A visual editor will be added later.)</p>
            
            <div className="flex gap-4">
                 <div className="flex-1 space-y-2">
                    <Label htmlFor="select-player">Select Player</Label>
                    <Select onValueChange={(value) => setSelectedPlayer(parseInt(value, 10))} value={selectedPlayer.toString()}>
                        <SelectTrigger id="select-player">
                            <SelectValue placeholder="Select a player" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFielders.map(player => (
                                <SelectItem key={player.id} value={player.id.toString()}>
                                    {player.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="select-position">Select Position</Label>
                     <Select onValueChange={(value) => setSelectedPosition(value)} value={selectedPosition}>
                        <SelectTrigger id="select-position">
                            <SelectValue placeholder="Select a position" />
                        </SelectTrigger>
                        <SelectContent>
                            {FIELDING_POSITIONS.map(position => (
                                <SelectItem key={position} value={position}>
                                    {position}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
           
            <Button onClick={handleAddFielder} disabled={selectedPlayer === "" || selectedPosition === "" || fielderPlacements.length >= 10}>Add Fielder ({fielderPlacements.length}/10)</Button>

            {fielderPlacements.length > 0 && (
                <div className="border rounded-md p-4 space-y-2">
                    <h5 className="font-semibold">Current Placements:</h5>
                    {fielderPlacements.map((placement, index) => {
                        const player = match.teams.flatMap(t => t.players).find(p => p.id === placement.playerId); // Find player across both teams
                        return (
                            <div key={placement.playerId} className="flex justify-between items-center text-sm text-muted-foreground">
                                <p>
                                     <span className="font-medium text-foreground">{player?.name || 'Unknown Player'}:</span> {placement.position}
                                </p>
                                <Button variant="destructive" size="sm" onClick={() => handleRemoveFielder(placement.playerId)}>Remove</Button>
                            </div>
                        );
                    })}
                </div>
            )}

             <DialogFooter>
                <Button onClick={handleSave}>Save Placements</Button>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
        </div>
    );
}
