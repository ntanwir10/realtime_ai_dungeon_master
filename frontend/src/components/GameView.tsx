import { useEffect, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ThemeToggle } from "./theme-toggle";
import {
  ArrowLeft,
  Copy,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Trash2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import StoryLog from "./StoryLog";
import CommandInput from "./CommandInput";
import { useToast } from "./ToastProvider";
import { LoadingSpinner } from "./LoadingSpinner";
import { FadeInContainer } from "./AnimatedCard";

// Socket connection with retry logic
let socket: Socket;

const createSocket = (): Socket => {
  const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  return io(socketUrl, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });
};

interface GameUpdate {
  playerId: string;
  command: string;
  narrative: string;
  timestamp?: number;
}

function GameView() {
  const [story, setStory] = useState<GameUpdate[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const { showError, showSuccess, showInfo, showWarning } = useToast();

  // Initialize socket connection
  useEffect(() => {
    socket = createSocket();

    // Socket event handlers with comprehensive error handling
    socket.on("connect", () => {
      console.log("✅ Connected to server");
      setIsConnected(true);
      setError("");
      setConnectionRetries(0);
      showSuccess("Connected to game server");
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason);
      setIsConnected(false);
      setError("Connection lost. Attempting to reconnect...");
      showWarning("Connection lost. Attempting to reconnect...");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      setConnectionRetries((prev) => prev + 1);
      const errorMessage = `Connection failed: ${
        error.message || "Unknown error"
      }. Retry ${connectionRetries + 1}/5`;
      setError(errorMessage);
      showError(errorMessage);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("✅ Reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
      setError("");
      showSuccess("Reconnected to server");
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed");
      setError("Failed to reconnect. Please refresh the page.");
      showError("Failed to reconnect. Please refresh the page.");
    });

    socket.on(
      "game:joined",
      (data: { sessionId: string; playerId: string; timestamp: number }) => {
        console.log("✅ Joined session:", data.sessionId);
        showSuccess("Joined game session successfully");
      }
    );

    socket.on(
      "game:update",
      (data: {
        type: string;
        narrative?: string;
        timestamp: number;
        error?: boolean;
      }) => {
        if (data.type === "narrative" && data.narrative) {
          setStory((prevStory) => {
            const newStory = [
              ...prevStory,
              {
                playerId: "AI",
                command: "AI Response",
                narrative: data.narrative!,
                timestamp: data.timestamp,
              },
            ];
            // Keep only the last 50 entries to prevent memory issues
            return newStory.slice(-50);
          });
          setIsLoading(false);

          if (data.error) {
            showWarning("AI response may be incomplete due to an error");
          }
        }
      }
    );

    socket.on(
      "game:player_joined",
      (data: { playerId: string; sessionId: string; timestamp: number }) => {
        setStory((prevStory) => {
          const newStory = [
            ...prevStory,
            {
              playerId: "System",
              command: "Player Joined",
              narrative: `A new player has joined the adventure!`,
              timestamp: data.timestamp,
            },
          ];
          return newStory.slice(-50);
        });
        showInfo("A new player joined the session");
      }
    );

    socket.on(
      "game:player_left",
      (data: { playerId: string; sessionId: string; timestamp: number }) => {
        setStory((prevStory) => {
          const newStory = [
            ...prevStory,
            {
              playerId: "System",
              command: "Player Left",
              narrative: `A player has left the adventure.`,
              timestamp: data.timestamp,
            },
          ];
          return newStory.slice(-50);
        });
        showInfo("A player left the session");
      }
    );

    socket.on("game:error", (data: { message: string; timestamp: number }) => {
      console.error("❌ Game error:", data.message);
      setError(data.message);
      setIsLoading(false);
      showError(data.message);
    });

    // Cleanup function
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("reconnect");
      socket.off("reconnect_failed");
      socket.off("game:joined");
      socket.off("game:update");
      socket.off("game:player_joined");
      socket.off("game:player_left");
      socket.off("game:error");
      socket.disconnect();
    };
  }, [showError, showSuccess, showInfo, showWarning, connectionRetries]);

  // Handle session creation and joining
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Get session ID from URL or localStorage (for rejoining)
        const urlParams = new URLSearchParams(window.location.search);
        const urlSessionId = urlParams.get("session");
        const savedSessionId = localStorage.getItem("ai-dungeon-session-id");

        if (urlSessionId) {
          // URL session takes precedence
          setSessionId(urlSessionId);
          localStorage.setItem("ai-dungeon-session-id", urlSessionId);
          if (isConnected) {
            socket.emit("game:join", { sessionId: urlSessionId });
          }
        } else if (savedSessionId) {
          // Try to rejoin saved session
          console.log(
            `🔄 Attempting to rejoin saved session: ${savedSessionId}`
          );

          const apiUrl =
            import.meta.env.VITE_API_URL || "http://localhost:3001";
          const response = await fetch(
            `${apiUrl}/api/sessions/${savedSessionId}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.session.status === "active") {
              setSessionId(savedSessionId);
              window.history.replaceState({}, "", `?session=${savedSessionId}`);
              if (isConnected) {
                socket.emit("game:join", { sessionId: savedSessionId });
              }
              showSuccess("Rejoined your previous session");
              return;
            }
          }

          // Session doesn't exist or is inactive, create new one
          console.log(
            "❌ Saved session not found or inactive, creating new session"
          );
          localStorage.removeItem("ai-dungeon-session-id");
        }

        // Create new session
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

        console.log(
          `🔄 Attempting to create game session at: ${apiUrl}/api/game`
        );

        const response = await fetch(`${apiUrl}/api/game`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Server error: ${response.status} - ${errorText}`);
          throw new Error(
            `Server error: ${response.status} - ${errorText || "Unknown error"}`
          );
        }

        const data = await response.json();
        console.log(`✅ Session creation response:`, data);

        if (data.success) {
          setSessionId(data.sessionId);
          localStorage.setItem("ai-dungeon-session-id", data.sessionId);
          if (isConnected) {
            socket.emit("game:join", { sessionId: data.sessionId });
          }
          // Update URL with session ID
          window.history.replaceState({}, "", `?session=${data.sessionId}`);
          showSuccess("Game session created successfully");
        } else {
          throw new Error(data.message || "Failed to create game session");
        }
      } catch (error) {
        console.error("❌ Error initializing session:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create game session";
        setError(errorMessage);
        showError(errorMessage);
      }
    };

    if (isConnected) {
      initializeSession();
    }
  }, [isConnected, showSuccess, showError]);

  const handleCommand = useCallback(
    (command: string) => {
      if (!isConnected) {
        setError("Not connected to server");
        showError("Not connected to server. Please wait for connection.");
        return;
      }

      if (!command.trim()) {
        showError("Command cannot be empty");
        return;
      }

      setIsLoading(true);
      setError("");
      showInfo(`Sending command: "${command}"`);
      socket.emit("game:command", { command });
    },
    [isConnected, showError, showInfo]
  );

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    showSuccess("Session ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const clearStory = () => {
    setStory([]);
    showSuccess("Story log cleared successfully");
  };

  const handleBackToLanding = () => {
    window.history.replaceState({}, "", "/");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <FadeInContainer delay={0}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleBackToLanding}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Menu
              </Button>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">AI Dungeon Master</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? (
                  <Wifi className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        </div>
      </FadeInContainer>

      <div className="container mx-auto px-4 pb-8">
        {/* Session Info */}
        {sessionId && (
          <FadeInContainer delay={100}>
            <Card className="mb-6 border-primary/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span>Game Session</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono border border-border">
                      {sessionId}
                    </code>
                    <Button variant="outline" size="sm" onClick={copySessionId}>
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Share this session ID with friends to play together
                </p>
              </CardContent>
            </Card>
          </FadeInContainer>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Interface */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Story Log */}
          <div className="lg:col-span-2">
            <FadeInContainer delay={200}>
              <Card className="h-[600px] flex flex-col shadow-lg border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <span>Adventure Log</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearStory}
                      disabled={story.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <StoryLog story={story} />
                </CardContent>
              </Card>
            </FadeInContainer>
          </div>

          {/* Command Panel */}
          <div className="space-y-6">
            <FadeInContainer delay={300}>
              <Card className="shadow-lg border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Your Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommandInput
                    onCommand={handleCommand}
                    disabled={isLoading}
                  />
                  {isLoading && (
                    <div className="flex items-center justify-center mt-4 text-muted-foreground">
                      <LoadingSpinner size="sm" text="AI is thinking..." />
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeInContainer>

            {/* Quick Commands */}
            <FadeInContainer delay={400}>
              <Card className="shadow-lg border-primary/10">
                <CardHeader>
                  <CardTitle>Quick Commands</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start hover:bg-primary/5 transition-colors"
                    onClick={() => handleCommand("look around")}
                    disabled={isLoading}
                  >
                    Look around
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start hover:bg-primary/5 transition-colors"
                    onClick={() => handleCommand("check inventory")}
                    disabled={isLoading}
                  >
                    Check inventory
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start hover:bg-primary/5 transition-colors"
                    onClick={() => handleCommand("help")}
                    disabled={isLoading}
                  >
                    Help
                  </Button>
                </CardContent>
              </Card>
            </FadeInContainer>

            {/* Game Tips */}
            <FadeInContainer delay={500}>
              <Card className="shadow-lg border-primary/10">
                <CardHeader>
                  <CardTitle>Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Be descriptive with your actions</p>
                  <p>• Use "talk to [character]" for dialogue</p>
                  <p>• Try "examine [object]" for details</p>
                  <p>• Use "go [direction]" to move</p>
                </CardContent>
              </Card>
            </FadeInContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameView;
