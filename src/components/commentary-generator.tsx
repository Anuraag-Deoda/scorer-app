"use client"

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Sparkles, Bot } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import type { Match } from "@/types";

type CommentaryGeneratorProps = {
  match: Match;
  commentary: string[];
  setCommentary: React.Dispatch<React.SetStateAction<string[]>>;
  onGenerateCommentary: () => Promise<void>;
};

export default function CommentaryGenerator({ match, commentary, setCommentary, onGenerateCommentary }: CommentaryGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleGenerateCommentary = async () => {
    setIsLoading(true);
    await onGenerateCommentary();
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-center text-xl flex items-center justify-center gap-2">
            <Bot /> AI Commentary
        </CardTitle>
        <CardDescription className="text-center">Live insights powered by AI</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGenerateCommentary} disabled={isLoading} className="w-full">
          <Sparkles className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? "Generating..." : "Generate Commentary"}
        </Button>
        <ScrollArea className="h-48 w-full rounded-md border p-4 bg-secondary/30">
            {commentary.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground pt-12">Click the button to generate the first commentary line!</p>
            ) : (
                <div className="space-y-4">
                    {commentary.map((line, index) => (
                        <p key={index} className="text-sm">
                            {line}
                        </p>
                    ))}
                </div>
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
