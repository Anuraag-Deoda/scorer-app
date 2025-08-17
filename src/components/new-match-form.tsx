"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { CloudRain, Cloud, Sun } from 'lucide-react';
import { MatchType } from '@/types';

const formSchema = z.object({
  team1Name: z.string().min(1, 'Team 1 name is required'),
  team2Name: z.string().min(1, 'Team 2 name is required'),
  overs: z.coerce.number().min(1, 'Minimum 1 over').max(100, 'Maximum 100 overs'),
  tossWinner: z.enum(['team1', 'team2']),
  decision: z.enum(['bat', 'bowl']),
  matchType: z.nativeEnum(MatchType),
  rainProbability: z.coerce.number().min(0, 'Minimum 0%').max(100, 'Maximum 100%').optional(),
});

type NewMatchFormProps = {
  onNewMatch: (settings: MatchSettings) => void;
  prefillSettings?: {
    teamNames: [string, string];
    oversPerInnings: number;
    toss: { winner: string; decision: 'bat' | 'bowl' };
    matchType: MatchType;
  };
};

export default function NewMatchForm({ onNewMatch, prefillSettings }: NewMatchFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      team1Name: prefillSettings?.teamNames[0] || 'Team A',
      team2Name: prefillSettings?.teamNames[1] || 'Team B',
      overs: prefillSettings?.oversPerInnings || 20,
      tossWinner: prefillSettings?.toss.winner === prefillSettings?.teamNames[0] ? 'team1' : 'team2',
      decision: prefillSettings?.toss.decision || 'bat',
      matchType: prefillSettings?.matchType || MatchType.T20,
      rainProbability: 0,
    },
  });

  const team1Name = form.watch('team1Name');
  const team2Name = form.watch('team2Name');

  const handleRandomizeToss = () => {
    const tossWinner = Math.random() < 0.5 ? 'team1' : 'team2';
    const decision = Math.random() < 0.5 ? 'bat' : 'bowl';
    form.setValue('tossWinner', tossWinner);
    form.setValue('decision', decision);
  };

  const handleMatchTypeChange = (value: MatchType) => {
    let overs = 20;
    switch (value) {
      case MatchType.T20:
        overs = 20;
        break;
      case MatchType.TenOvers:
        overs = 10;
        break;
      case MatchType.FiveOvers:
        overs = 5;
        break;
      case MatchType.TwoOvers:
        overs = 2;
        break;
      case MatchType.FiftyOvers:
        overs = 50;
        break;
    }
    form.setValue('overs', overs);
    form.setValue('matchType', value);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch('/api/special-players');
      const specialPlayerIds = await response.json();

      const settings: MatchSettings = {
        teamNames: [values.team1Name, values.team2Name],
        oversPerInnings: values.overs,
        toss: {
          winner: values.tossWinner === 'team1' ? values.team1Name : values.team2Name,
          decision: values.decision,
        },
        matchType: values.matchType,
        specialPlayerIds,
        rainProbability: values.rainProbability || 0,
      };

      onNewMatch(settings);
    } catch (error) {
      console.error('Failed to fetch special players:', error);
      // Fallback without special players
      const settings: MatchSettings = {
        teamNames: [values.team1Name, values.team2Name],
        oversPerInnings: values.overs,
        toss: {
          winner: values.tossWinner === 'team1' ? values.team1Name : values.team2Name,
          decision: values.decision,
        },
        matchType: values.matchType,
        rainProbability: values.rainProbability || 0,
      };
      onNewMatch(settings);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="team1Name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team 1 Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter team 1 name" 
                    {...field} 
                    disabled={!!prefillSettings}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="team2Name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team 2 Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter team 2 name" 
                    {...field} 
                    disabled={!!prefillSettings}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="overs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Overs per Innings</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="20" 
                    {...field} 
                    disabled={!!prefillSettings}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="matchType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Match Type</FormLabel>
                <Select onValueChange={handleMatchTypeChange} value={field.value} disabled={!!prefillSettings}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select match type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={MatchType.T20}>T20</SelectItem>
                    <SelectItem value={MatchType.TenOvers}>10 Overs</SelectItem>
                    <SelectItem value={MatchType.FiveOvers}>5 Overs</SelectItem>
                    <SelectItem value={MatchType.TwoOvers}>2 Overs</SelectItem>
                    <SelectItem value={MatchType.FiftyOvers}>50 Overs</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Toss</h3>
            <Button type="button" variant="outline" onClick={handleRandomizeToss}>
              Randomize Toss
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tossWinner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Toss Winner</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select toss winner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="team1">{team1Name}</SelectItem>
                      <SelectItem value="team2">{team2Name}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="decision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select decision" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bat">Bat</SelectItem>
                      <SelectItem value="bowl">Bowl</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-500" />
            Weather Conditions
          </h3>
          
          <FormField
            control={form.control}
            name="rainProbability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rain Probability</FormLabel>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        field.onChange(value);
                      }}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Chance of Rain</span>
                      <span className="font-medium">{field.value || 0}%</span>
                    </div>
                    <Progress value={field.value || 0} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Sun className="w-3 h-3" />
                        <span>Clear</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Cloud className="w-3 h-3" />
                        <span>Cloudy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CloudRain className="w-3 h-3" />
                        <span>Rain</span>
                      </div>
                    </div>
                  </div>
                  
                  {field.value && field.value > 0 && (
                    <div className="p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> If rain occurs during the match, overs may be reduced and targets adjusted using Duckworth-Lewis calculations.
                      </p>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          {prefillSettings ? 'Start Match' : 'Create Match'}
        </Button>
      </form>
    </Form>
  );
}
