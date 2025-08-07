import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GameUpdate {
  playerId: string;
  command: string;
  narrative: string;
}

interface StoryLogProps {
  story: GameUpdate[];
}

function StoryLog({ story }: StoryLogProps) {
  if (story.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Welcome to your adventure!</p>
          <p className="text-sm">
            Start by describing your first action below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        {story.map((update, index) => (
          <Card key={index} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary" className="text-xs">
                  {update.playerId}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {update.command}
                </span>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm leading-relaxed">{update.narrative}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

export default StoryLog;
