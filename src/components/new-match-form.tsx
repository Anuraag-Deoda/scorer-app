"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { MatchSettings } from '@/types';
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
});

type NewMatchFormProps = {
  onNewMatch: (settings: MatchSettings) => void;
};

export default function NewMatchForm({ onNewMatch }: NewMatchFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      team1Name: 'Team A',
      team2Name: 'Team B',
      overs: 5,
      tossWinner: 'team1',
      decision: 'bat',
    },
  });

  const team1Name = form.watch('team1Name');
  const team2Name = form.watch('team2Name');

  function onSubmit(values: z.infer<typeof formSchema>) {
    const settings: MatchSettings = {
      teamNames: [values.team1Name, values.team2Name],
      oversPerInnings: values.overs,
      toss: {
        winner: values.tossWinner === 'team1' ? values.team1Name : values.team2Name,
        decision: values.decision,
      },
    };
    onNewMatch(settings);
  }

  return (
    <div>
      <h2 className="text-2xl font-headline font-bold text-center mb-4">Start New Match</h2>
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
                    <Input placeholder="Enter team 1 name" {...field} />
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
                    <Input placeholder="Enter team 2 name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="overs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Overs</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />
          
          <div className="space-y-2">
            <Label className="font-headline">Toss</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="tossWinner"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel>Winner</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select toss winner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="team1">{team1Name || 'Team 1'}</SelectItem>
                            <SelectItem value="team2">{team2Name || 'Team 2'}</SelectItem>
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
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          
          <Button type="submit" className="w-full" size="lg">Start Scoring</Button>
        </form>
      </Form>
    </div>
  );
}
