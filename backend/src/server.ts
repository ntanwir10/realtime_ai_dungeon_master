import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  generalLimiter,
  gameCommandLimiter,
  sessionCreationLimiter,
  loreLimiter,
  socketRateLimiter,
} from "./utils/rateLimiter.js";
import {
  errorHandler,
  asyncHandler,
  socketErrorHandler,
} from "./utils/errorHandler.js";
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
  cleanupAllSubscribers,
} from "./gameService.js";
import { initializeDefaultLore } from "./loreService.js";
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
app.use(generalLimiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📨 ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Root route handler
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "AI Dungeon Master API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      sessions: "/api/sessions",
      game: "/api/game",
      lore: "/api/lore",
    },
  });
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

    // Initialize lore system
    try {
      await initializeDefaultLore();
      console.log("✅ Lore system initialized successfully.");
    } catch (error) {
      console.error("❌ Failed to initialize lore system:", error);
      console.warn("⚠️ Continuing without lore system...");
    }

    // Game session creation endpoint
    app.get("/api/game", (req: Request, res: Response) => {
      res.json({
        success: true,
        message: "Game API endpoint",
        description:
          "Create a new game session by sending a POST request to this endpoint",
        example: {
          method: "POST",
          url: "/api/game",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      });
    });

    app.post(
      "/api/game",
      sessionCreationLimiter,
      asyncHandler(async (req: Request, res: Response) => {
        console.log("🎮 Creating new game session...");
        const sessionId = await createGameSession();
        console.log(`✅ Created new game session: ${sessionId}`);
        res.status(201).json({
          success: true,
          sessionId,
          message: "Game session created successfully",
        });
      })
    );

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

    // Lore management endpoints
    app.get(
      "/api/lore",
      loreLimiter,
      asyncHandler(async (req: Request, res: Response) => {
        const { type } = req.query;
        const { getLoreByType } = await import("./loreService.js");

        if (type && typeof type === "string") {
          const lore = await getLoreByType(type);
          res.json({
            success: true,
            lore,
            type,
          });
        } else {
          // Get all lore entries using basic Redis operations
          const { getClient } = await import("./redisClient.js");
          const client = await getClient();
          const allKeys = await client.keys("lore:*");
          const loreKeys = allKeys.filter(
            (key: string) =>
              key.startsWith("lore:") &&
              !key.includes(":type:") &&
              !key.includes(":tag:")
          );

          const allLore = [];
          for (const key of loreKeys) {
            try {
              const loreData = await client.json.get(key);
              if (loreData) {
                allLore.push(loreData as any);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to get lore from ${key}:`, error);
            }
          }

          res.json({
            success: true,
            lore: allLore,
          });
        }
      })
    );

    app.post(
      "/api/lore",
      loreLimiter,
      asyncHandler(async (req: Request, res: Response) => {
        const { type, title, content, tags } = req.body;

        if (!type || !title || !content) {
          return res.status(400).json({
            success: false,
            message: "Type, title, and content are required",
          });
        }

        const { createLoreEntry } = await import("./loreService.js");
        const id = await createLoreEntry(type, title, content, tags || []);

        res.status(201).json({
          success: true,
          id,
          message: "Lore entry created successfully",
        });
      })
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

      // Apply rate limiting to socket
      const socketLimiter = socketRateLimiter(50, 60000); // 50 events per minute
      socketLimiter(socket, (err?: Error) => {
        if (err) {
          socketErrorHandler(socket, err);
          return;
        }
      });

      // Handle connection errors
      socket.on("connect_error", (error) => {
        socketErrorHandler(socket, error);
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

    // Error handling middleware - must be last
    app.use(errorHandler);

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

        // Clean up all session subscribers
        await cleanupAllSubscribers();

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
