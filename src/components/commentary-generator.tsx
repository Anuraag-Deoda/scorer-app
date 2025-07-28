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
    <Card className="shadow-none border-0">
      <CardHeader className="pb-2">
        <CardTitle className="font-sans text-lg font-semibold text-center flex items-center justify-center gap-2">
            <Bot className="w-5 h-5 text-muted-foreground" /> AI Commentary
        </CardTitle>
        <CardDescription className="text-center text-sm text-muted-foreground">Live insights powered by AI</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0">
        <Button onClick={handleGenerateCommentary} disabled={isLoading} className="w-full text-sm py-2 h-auto">
          <Sparkles className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin text-primary/80' : ''}`} />
          {isLoading ? "Generating..." : "Generate Commentary"}
        </Button>
        <ScrollArea className="h-40 w-full rounded-md border p-3 text-sm bg-gray-50 dark:bg-gray-900">
            {commentary.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground pt-8">Click the button to generate the first commentary line!</p>
            ) : (
                <div className="space-y-3">
                    {commentary.map((line, index) => (
                        <p key={index} className="text-sm leading-relaxed">
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
