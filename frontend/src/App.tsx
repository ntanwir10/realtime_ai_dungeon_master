import "./App.css";
import { useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { ToastProvider } from "./components/ToastProvider";
import GameView from "./components/GameView";
import LandingPage from "./components/LandingPage";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const [currentSession, setCurrentSession] = useState<string | null>(null);

  const handleJoinSession = (sessionId: string) => {
    setCurrentSession(sessionId);
    window.history.replaceState({}, "", `?session=${sessionId}`);
  };

  const handleCreateSession = () => {
    // This will be handled by GameView when it mounts
    setCurrentSession("new");
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <div className="App">
            {!currentSession ? (
              <LandingPage
                onJoinSession={handleJoinSession}
                onCreateSession={handleCreateSession}
              />
            ) : (
              <GameView />
            )}
          </div>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
