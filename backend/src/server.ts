import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import cors from "cors";
import {
  createGameSession,
  logEvent,
  getAIResponse,
  setupSessionSubscriber,
  getActiveSessions,
  getSessionDetails,
  joinSession,
  leaveSession,
  deleteSession,
} from "./gameService.js";
import { connection as redisConnection } from "./redisClient.js";
import { validateEnvironment } from "./utils/envValidation.js";

dotenv.config();

// Validate environment variables before starting
try {
  validateEnvironment();
} catch (error) {
  console.error("❌ Environment validation failed:", error);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      process.env.FRONTEND_URL || "http://localhost:5173",
    ],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const port = process.env.PORT || 3001;

// Rate limiting with better error handling
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: 15 * 60, // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
      retryAfter: 15 * 60,
    });
  },
});

// CORS middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      process.env.FRONTEND_URL || "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

// Middleware
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📨 ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ Express error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

async function startServer() {
  try {
    console.log("🚀 Starting AI Dungeon Master server...");

    // Ensure Redis connection is established before starting the server
    await redisConnection;
    console.log("✅ Redis client connected successfully.");

    // Game session creation endpoint
    app.post("/api/game", async (req: Request, res: Response) => {
      try {
        const sessionId = await createGameSession();
        console.log(`✅ Created new game session: ${sessionId}`);
        res.status(201).json({
          success: true,
          sessionId,
          message: "Game session created successfully",
        });
      } catch (error) {
        console.error("❌ Error creating game session:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create game session",
          error:
            process.env.NODE_ENV === "development"
              ? (error as Error).message
              : "Internal server error",
        });
      }
    });

    // Get active sessions for multiplayer discovery
    app.get("/api/sessions", async (req: Request, res: Response) => {
      try {
        const sessions = await getActiveSessions();
        console.log(`✅ Retrieved ${sessions.length} active sessions`);
        res.json({
          success: true,
          sessions,
        });
      } catch (error) {
        console.error("❌ Error getting active sessions:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get active sessions",
          error:
            process.env.NODE_ENV === "development" ? String(error) : undefined,
        });
      }
    });

    // Get specific session details
    app.get("/api/sessions/:sessionId", async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const session = await getSessionDetails(sessionId);

        if (!session) {
          return res.status(404).json({
            success: false,
            message: "Session not found",
          });
        }

        res.json({
          success: true,
          session,
        });
      } catch (error) {
        console.error("❌ Error getting session details:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get session details",
          error:
            process.env.NODE_ENV === "development" ? String(error) : undefined,
        });
      }
    });

    // Delete a session
    app.delete(
      "/api/sessions/:sessionId",
      async (req: Request, res: Response) => {
        try {
          const { sessionId } = req.params;
          const deleted = await deleteSession(sessionId);

          if (!deleted) {
            return res.status(404).json({
              success: false,
              message: "Session not found",
            });
          }

          res.json({
            success: true,
            message: "Session deleted successfully",
          });
        } catch (error) {
          console.error("❌ Error deleting session:", error);
          res.status(500).json({
            success: false,
            message: "Failed to delete session",
            error:
              process.env.NODE_ENV === "development"
                ? String(error)
                : undefined,
          });
        }
      }
    );

    // Enhanced health check endpoint
    app.get("/api/health", async (req: Request, res: Response) => {
      try {
        // Check Redis connection
        const redisStatus = await redisConnection
          .then(() => "connected")
          .catch(() => "disconnected");

        res.status(200).json({
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          redis: redisStatus,
          environment: process.env.NODE_ENV || "development",
          version: process.env.npm_package_version || "1.0.0",
        });
      } catch (error) {
        console.error("❌ Health check failed:", error);
        res.status(503).json({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error:
            process.env.NODE_ENV === "development"
              ? (error as Error).message
              : "Health check failed",
        });
      }
    });

    // Socket.io connection handling with comprehensive error handling
    io.on("connection", (socket) => {
      console.log(
        `🔌 Socket connected: ${socket.id} (not yet joined any session)`
      );

      // Handle connection errors
      socket.on("connect_error", (error) => {
        console.error(`❌ Socket connection error for ${socket.id}:`, error);
        socket.emit("game:error", {
          message: "Connection error occurred",
          timestamp: Date.now(),
        });
      });

      socket.on("game:join", async (data: { sessionId: string }) => {
        try {
          if (!data.sessionId) {
            socket.emit("game:error", {
              message: "Session ID is required",
              timestamp: Date.now(),
            });
            return;
          }

          console.log(
            `🎮 Player ${socket.id} joining game session: ${data.sessionId}`
          );

          // Join the session in Redis
          const joined = await joinSession(data.sessionId, socket.id);
          if (!joined) {
            socket.emit("game:error", {
              message: "Session not found or inactive",
              timestamp: Date.now(),
            });
            return;
          }

          socket.join(data.sessionId);
          socket.data.sessionId = data.sessionId;

          // Set up pub/sub for this session if not already done
          try {
            await setupSessionSubscriber(data.sessionId, io);
          } catch (error) {
            console.error("❌ Error setting up session subscriber:", error);
            socket.emit("game:error", {
              message: "Failed to setup game session",
              timestamp: Date.now(),
            });
            return;
          }

          socket.emit("game:joined", {
            sessionId: data.sessionId,
            playerId: socket.id,
            timestamp: Date.now(),
          });

          // Notify other players in the session
          socket.to(data.sessionId).emit("game:player_joined", {
            playerId: socket.id,
            sessionId: data.sessionId,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("❌ Error in game:join:", error);
          socket.emit("game:error", {
            message: "Failed to join game session",
            timestamp: Date.now(),
          });
        }
      });

      socket.on("game:command", async (data: { command: string }) => {
        try {
          const sessionId = socket.data.sessionId;
          if (!sessionId) {
            socket.emit("game:error", {
              message: "Not joined to any session",
              timestamp: Date.now(),
            });
            return;
          }

          if (!data.command || data.command.trim().length === 0) {
            socket.emit("game:error", {
              message: "Command cannot be empty",
              timestamp: Date.now(),
            });
            return;
          }

          console.log(
            `🎯 Received command from ${socket.id} in session ${sessionId}: ${data.command}`
          );

          // Log the command event
          await logEvent(sessionId, socket.id, {
            action: "command",
            target: data.command,
          });

          // Get AI response
          await getAIResponse(sessionId, data.command);
          // The narrative will be broadcast via pub/sub
        } catch (error) {
          console.error("❌ Error processing command:", error);
          socket.emit("game:error", {
            message: "Failed to process command. Please try again.",
            timestamp: Date.now(),
          });
        }
      });

      socket.on("disconnect", (reason) => {
        if (socket.data.sessionId) {
          console.log(
            `🔌 Player ${socket.id} disconnected from session: ${socket.data.sessionId} - Reason: ${reason}`
          );
          // Remove player from Redis session
          leaveSession(socket.data.sessionId, socket.id).catch((error) => {
            console.error("❌ Error leaving session:", error);
          });

          socket.to(socket.data.sessionId).emit("game:player_left", {
            playerId: socket.id,
            sessionId: socket.data.sessionId,
            timestamp: Date.now(),
          });
        } else {
          console.log(
            `🔌 Socket disconnected: ${socket.id} (was not in any session) - Reason: ${reason}`
          );
        }
      });

      // Handle any other socket errors
      socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
        socket.emit("game:error", {
          message: "A socket error occurred",
          timestamp: Date.now(),
        });
      });
    });

    // 404 handler - must be after all routes
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: "Endpoint not found",
        path: req.path,
      });
    });

    // Start the server
    httpServer.listen(port, () => {
      console.log(`✅ Server listening on port ${port}`);
      console.log(
        `🌐 Health check available at http://localhost:${port}/api/health`
      );
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

      try {
        // Close HTTP server
        httpServer.close(() => {
          console.log("✅ HTTP server closed");
        });

        // Close Socket.io
        io.close(() => {
          console.log("✅ Socket.io server closed");
        });

        // Close Redis connections
        const { redisManager } = await import("./redisClient.js");
        await redisManager.disconnect();

        console.log("✅ Redis connections closed");
        console.log("✅ Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error during graceful shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer();
