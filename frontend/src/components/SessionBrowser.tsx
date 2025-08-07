import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "./ToastProvider";
import {
  Users,
  Clock,
  RefreshCw,
  Search,
  Gamepad2,
  Trash2,
} from "lucide-react";

interface Session {
  sessionId: string;
  playerCount: number;
  createdAt: number;
  lastActivity: number;
}

interface SessionBrowserProps {
  onJoinSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export default function SessionBrowser({
  onJoinSession,
  onCreateSession,
  onDeleteSession,
}: SessionBrowserProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [manualSessionId, setManualSessionId] = useState("");
  const { showError, showSuccess } = useToast();

  const fetchSessions = useCallback(async () => {
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
      showError("Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleJoinSession = (sessionId: string) => {
    showSuccess(`Joining session: ${sessionId}`);
    onJoinSession(sessionId);
  };

  const handleManualJoin = () => {
    if (!manualSessionId.trim()) {
      showError("Please enter a session ID");
      return;
    }
    showSuccess(`Joining session: ${manualSessionId.trim()}`);
    onJoinSession(manualSessionId.trim());
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!onDeleteSession) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("✅ Session deleted, showing success toast");
        showSuccess("Session deleted successfully");
        onDeleteSession(sessionId);
        // Refresh the sessions list
        fetchSessions();
      } else {
        const data = await response.json();
        showError(data.message || "Failed to delete session");
      }
    } catch (error) {
      console.error("❌ Error deleting session:", error);
      showError("Failed to delete session");
    }
  };

  const filteredSessions = sessions.filter((session) =>
    session.sessionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Multiplayer Sessions</h2>
        <p className="text-muted-foreground">
          Join an existing adventure or create a new one
        </p>
      </div>

      {/* Create New Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gamepad2 className="h-5 w-5" />
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

      {/* Manual Join */}
      <Card>
        <CardHeader>
          <CardTitle>Join by Session ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter session ID (e.g., abc123def4)"
              value={manualSessionId}
              onChange={(e) => setManualSessionId(e.target.value)}
            />
            <Button
              onClick={handleManualJoin}
              disabled={!manualSessionId.trim()}
            >
              Join
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask a friend for their session ID to join their game
          </p>
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
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
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
                    {onDeleteSession && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSession(session.sessionId)}
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
    </div>
  );
}
