import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "./theme-toggle";
import { useToast } from "./ToastProvider";
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  Info,
  Users,
  Globe,
  Clock,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

interface LandingPageProps {
  onJoinSession: (sessionId: string) => void;
  onCreateSession: () => void;
}

function LandingPage({ onJoinSession, onCreateSession }: LandingPageProps) {
  const [sessions, setSessions] = useState<
    Array<{
      sessionId: string;
      playerCount: number;
      createdAt: number;
      lastActivity: number;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { showSuccess } = useToast();

  const handleJoinSession = (sessionId: string) => {
    onJoinSession(sessionId);
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/sessions`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      } else {
        throw new Error(data.message || "Failed to fetch sessions");
      }
    } catch (error) {
      console.error("❌ Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showSuccess("Session deleted successfully");
        // Remove from localStorage if it was the current session
        const currentSession = localStorage.getItem("ai-dungeon-session-id");
        if (currentSession === sessionId) {
          localStorage.removeItem("ai-dungeon-session-id");
        }
        // Refresh the sessions list
        fetchSessions();
      } else {
        const data = await response.json();
        console.error(data.message || "Failed to delete session");
      }
    } catch (error) {
      console.error("❌ Error deleting session:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return "Just now";
    }
  };

  const filteredSessions = sessions.filter((session) =>
    session.sessionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "AI Dungeon Master",
      description:
        "Powered by advanced AI for dynamic storytelling and immersive adventures.",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Real-time Multiplayer",
      description:
        "Play with friends in real-time with synchronized game state.",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Persistent Worlds",
      description:
        "Your adventures are saved and can be continued across sessions.",
    },
  ];

  const howToPlay = [
    {
      step: "1",
      title: "Create or Join",
      description:
        "Start a new adventure or join an existing one with a session ID.",
    },
    {
      step: "2",
      title: "Describe Actions",
      description:
        "Type commands like 'explore the cave', 'talk to the merchant', or 'cast a spell'.",
    },
    {
      step: "3",
      title: "Experience the Story",
      description:
        "Watch as the AI brings your actions to life with rich narrative responses.",
    },
    {
      step: "4",
      title: "Collaborate",
      description:
        "Work together with other players to solve puzzles and overcome challenges.",
    },
  ];

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-3xl">🐍</span>
            <h1 className="text-2xl font-bold">AI Dungeon Master</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Real-Time AI Dungeon Master
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Experience collaborative storytelling with an AI that adapts to your
            choices. Create epic adventures with friends in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onCreateSession}
              className="text-lg px-8"
            >
              Start New Adventure
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Sparkles className="mr-2 h-4 w-4" />
              Powered by AI
            </Badge>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Column - Create & Join Sessions */}
          <div className="space-y-6">
            {/* Create New Session */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span className="text-xl">🐍</span>
                  <span>Start New Adventure</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Create a new game session and invite friends to join
                </p>
                <Button
                  onClick={() => {
                    showSuccess("Creating new session...");
                    onCreateSession();
                  }}
                  className="w-full"
                >
                  Create New Session
                </Button>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Active Sessions</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchSessions}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sessions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Session Count Indicator */}
                {!loading && filteredSessions.length > 0 && (
                  <div
                    className={`mb-4 text-sm ${
                      sessions.length === 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {searchTerm
                      ? `Found ${filteredSessions.length} matching session${
                          filteredSessions.length !== 1 ? "s" : ""
                        }`
                      : sessions.length === 0
                      ? "No active sessions found"
                      : `Found ${sessions.length} active session${
                          sessions.length !== 1 ? "s" : ""
                        }`}
                  </div>
                )}

                {/* Sessions List */}
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading sessions...
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-red-600 dark:text-red-400">
                    {searchTerm
                      ? "No sessions match your search"
                      : "No active sessions found"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSessions.map((session) => (
                      <div
                        key={session.sessionId}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {session.sessionId}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {session.playerCount} player
                              {session.playerCount !== 1 ? "s" : ""}
                            </Badge>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(session.lastActivity)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleJoinSession(session.sessionId)}
                          >
                            Join
                          </Button>
                          {handleDeleteSession && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleDeleteSession(session.sessionId)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pro Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>Pro Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    Be descriptive with your actions for better AI responses
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    Share session IDs with friends to play together
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm">
                    Use commands like "inventory", "status", or "help" for game
                    info
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Features, How to Play & Tips */}
          <div className="space-y-6">
            {/* Features */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Features</h2>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-start space-x-4 p-4">
                      <div className="text-primary mt-1">{feature.icon}</div>
                      <div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm">
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* How to Play */}
            <div>
              <h2 className="text-2xl font-bold mb-6">How to Play</h2>
              {/* Compact responsive grid for better visual balance (great for screenshots) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {howToPlay.map((step, index) => (
                  <Card key={index} className="h-full">
                    <CardContent className="h-full flex items-start space-x-4 p-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {step.step}
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">{step.title}</h3>
                        <p className="text-muted-foreground text-sm">
                          {step.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
