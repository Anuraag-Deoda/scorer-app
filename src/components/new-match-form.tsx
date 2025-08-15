"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MatchType, type MatchSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from './ui/separator';

const formSchema = z.object({
  team1Name: z.string().min(1, 'Team name is required'),
  team2Name: z.string().min(1, 'Team name is required'),
  overs: z.coerce.number().min(1, 'Minimum 1 over').max(100, 'Maximum 100 overs'),
  tossWinner: z.enum(['team1', 'team2']),
  decision: z.enum(['bat', 'bowl']),
  matchType: z.nativeEnum(MatchType),
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

        <Button type="submit" className="w-full">
          {prefillSettings ? 'Start Match' : 'Create Match'}
        </Button>
      </form>
    </Form>
  );
}
