import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";

interface CommandInputProps {
  onCommand: (command: string) => void;
  disabled?: boolean;
}

function CommandInput({ onCommand, disabled = false }: CommandInputProps) {
  const [command, setCommand] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !disabled) {
      onCommand(command);
      setCommand("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex space-x-2">
        <Input
          type="text"
          value={command}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommand(e.target.value)}
          placeholder="What do you do? (e.g., 'explore the cave', 'talk to the merchant')"
          disabled={disabled}
          className="flex-1"
        />
        <Button type="submit" disabled={disabled || !command.trim()}>
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Be descriptive with your actions for better AI responses
      </p>
    </form>
  );
}

export default CommandInput;
