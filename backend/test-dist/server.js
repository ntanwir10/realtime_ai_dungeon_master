"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var dotenv_1 = require("dotenv");
var http_1 = require("http");
var socket_io_1 = require("socket.io");
var cors_1 = require("cors");
var rateLimiter_js_1 = require("./utils/rateLimiter.js");
var errorHandler_js_1 = require("./utils/errorHandler.js");
var gameService_js_1 = require("./gameService.js");
var loreService_js_1 = require("./loreService.js");
var redisClient_js_1 = require("./redisClient.js");
var envValidation_js_1 = require("./utils/envValidation.js");
dotenv_1.default.config();
// Validate environment variables before starting
try {
    (0, envValidation_js_1.validateEnvironment)();
}
catch (error) {
    console.error("❌ Environment validation failed:", error);
    process.exit(1);
}
var app = (0, express_1.default)();
var httpServer = (0, http_1.createServer)(app);
var io = new socket_io_1.Server(httpServer, {
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
var port = process.env.PORT || 3001;
// CORS middleware
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        process.env.FRONTEND_URL || "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
}));
// Middleware
app.use(rateLimiter_js_1.generalLimiter);
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Request logging middleware
app.use(function (req, res, next) {
    console.log("\uD83D\uDCE8 ".concat(req.method, " ").concat(req.path, " - ").concat(req.ip));
    next();
});
// Error handling middleware
app.use(function (error, req, res, next) {
    console.error("❌ Express error:", error);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
});
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1, gracefulShutdown_1, error_2;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    console.log("🚀 Starting AI Dungeon Master server...");
                    // Ensure Redis connection is established before starting the server
                    return [4 /*yield*/, redisClient_js_1.connection];
                case 1:
                    // Ensure Redis connection is established before starting the server
                    _a.sent();
                    console.log("✅ Redis client connected successfully.");
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, loreService_js_1.initializeDefaultLore)()];
                case 3:
                    _a.sent();
                    console.log("✅ Lore system initialized successfully.");
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error("❌ Failed to initialize lore system:", error_1);
                    console.warn("⚠️ Continuing without lore system...");
                    return [3 /*break*/, 5];
                case 5:
                    // Game session creation endpoint
                    app.post("/api/game", rateLimiter_js_1.sessionCreationLimiter, (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var sessionId;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, gameService_js_1.createGameSession)()];
                                case 1:
                                    sessionId = _a.sent();
                                    console.log("\u2705 Created new game session: ".concat(sessionId));
                                    res.status(201).json({
                                        success: true,
                                        sessionId: sessionId,
                                        message: "Game session created successfully",
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); }));
                    // Get active sessions for multiplayer discovery
                    app.get("/api/sessions", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var sessions, error_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, (0, gameService_js_1.getActiveSessions)()];
                                case 1:
                                    sessions = _a.sent();
                                    console.log("\u2705 Retrieved ".concat(sessions.length, " active sessions"));
                                    res.json({
                                        success: true,
                                        sessions: sessions,
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_3 = _a.sent();
                                    console.error("❌ Error getting active sessions:", error_3);
                                    res.status(500).json({
                                        success: false,
                                        message: "Failed to get active sessions",
                                        error: process.env.NODE_ENV === "development" ? String(error_3) : undefined,
                                    });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Get specific session details
                    app.get("/api/sessions/:sessionId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var sessionId, session, error_4;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    sessionId = req.params.sessionId;
                                    return [4 /*yield*/, (0, gameService_js_1.getSessionDetails)(sessionId)];
                                case 1:
                                    session = _a.sent();
                                    if (!session) {
                                        return [2 /*return*/, res.status(404).json({
                                                success: false,
                                                message: "Session not found",
                                            })];
                                    }
                                    res.json({
                                        success: true,
                                        session: session,
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_4 = _a.sent();
                                    console.error("❌ Error getting session details:", error_4);
                                    res.status(500).json({
                                        success: false,
                                        message: "Failed to get session details",
                                        error: process.env.NODE_ENV === "development" ? String(error_4) : undefined,
                                    });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Delete a session
                    app.delete("/api/sessions/:sessionId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var sessionId, deleted, error_5;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    sessionId = req.params.sessionId;
                                    return [4 /*yield*/, (0, gameService_js_1.deleteSession)(sessionId)];
                                case 1:
                                    deleted = _a.sent();
                                    if (!deleted) {
                                        return [2 /*return*/, res.status(404).json({
                                                success: false,
                                                message: "Session not found",
                                            })];
                                    }
                                    res.json({
                                        success: true,
                                        message: "Session deleted successfully",
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_5 = _a.sent();
                                    console.error("❌ Error deleting session:", error_5);
                                    res.status(500).json({
                                        success: false,
                                        message: "Failed to delete session",
                                        error: process.env.NODE_ENV === "development"
                                            ? String(error_5)
                                            : undefined,
                                    });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Lore management endpoints
                    app.get("/api/lore", rateLimiter_js_1.loreLimiter, (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var type, getLoreByType, lore, getClient, client, allKeys, loreKeys, allLore, _i, loreKeys_1, key, loreData, error_6;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    type = req.query.type;
                                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./loreService.js"); })];
                                case 1:
                                    getLoreByType = (_a.sent()).getLoreByType;
                                    if (!(type && typeof type === "string")) return [3 /*break*/, 3];
                                    return [4 /*yield*/, getLoreByType(type)];
                                case 2:
                                    lore = _a.sent();
                                    res.json({
                                        success: true,
                                        lore: lore,
                                        type: type,
                                    });
                                    return [3 /*break*/, 13];
                                case 3: return [4 /*yield*/, Promise.resolve().then(function () { return require("./redisClient.js"); })];
                                case 4:
                                    getClient = (_a.sent()).getClient;
                                    return [4 /*yield*/, getClient()];
                                case 5:
                                    client = _a.sent();
                                    return [4 /*yield*/, client.keys("lore:*")];
                                case 6:
                                    allKeys = _a.sent();
                                    loreKeys = allKeys.filter(function (key) {
                                        return key.startsWith("lore:") &&
                                            !key.includes(":type:") &&
                                            !key.includes(":tag:");
                                    });
                                    allLore = [];
                                    _i = 0, loreKeys_1 = loreKeys;
                                    _a.label = 7;
                                case 7:
                                    if (!(_i < loreKeys_1.length)) return [3 /*break*/, 12];
                                    key = loreKeys_1[_i];
                                    _a.label = 8;
                                case 8:
                                    _a.trys.push([8, 10, , 11]);
                                    return [4 /*yield*/, client.json.get(key)];
                                case 9:
                                    loreData = _a.sent();
                                    if (loreData) {
                                        allLore.push(loreData);
                                    }
                                    return [3 /*break*/, 11];
                                case 10:
                                    error_6 = _a.sent();
                                    console.warn("\u26A0\uFE0F Failed to get lore from ".concat(key, ":"), error_6);
                                    return [3 /*break*/, 11];
                                case 11:
                                    _i++;
                                    return [3 /*break*/, 7];
                                case 12:
                                    res.json({
                                        success: true,
                                        lore: allLore,
                                    });
                                    _a.label = 13;
                                case 13: return [2 /*return*/];
                            }
                        });
                    }); }));
                    app.post("/api/lore", rateLimiter_js_1.loreLimiter, (0, errorHandler_js_1.asyncHandler)(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, type, title, content, tags, createLoreEntry, id;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, type = _a.type, title = _a.title, content = _a.content, tags = _a.tags;
                                    if (!type || !title || !content) {
                                        return [2 /*return*/, res.status(400).json({
                                                success: false,
                                                message: "Type, title, and content are required",
                                            })];
                                    }
                                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./loreService.js"); })];
                                case 1:
                                    createLoreEntry = (_b.sent()).createLoreEntry;
                                    return [4 /*yield*/, createLoreEntry(type, title, content, tags || [])];
                                case 2:
                                    id = _b.sent();
                                    res.status(201).json({
                                        success: true,
                                        id: id,
                                        message: "Lore entry created successfully",
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); }));
                    // Enhanced health check endpoint
                    app.get("/api/health", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var redisStatus, error_7;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, redisClient_js_1.connection
                                            .then(function () { return "connected"; })
                                            .catch(function () { return "disconnected"; })];
                                case 1:
                                    redisStatus = _a.sent();
                                    res.status(200).json({
                                        status: "healthy",
                                        timestamp: new Date().toISOString(),
                                        uptime: process.uptime(),
                                        redis: redisStatus,
                                        environment: process.env.NODE_ENV || "development",
                                        version: process.env.npm_package_version || "1.0.0",
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_7 = _a.sent();
                                    console.error("❌ Health check failed:", error_7);
                                    res.status(503).json({
                                        status: "unhealthy",
                                        timestamp: new Date().toISOString(),
                                        error: process.env.NODE_ENV === "development"
                                            ? error_7.message
                                            : "Health check failed",
                                    });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Socket.io connection handling with comprehensive error handling
                    io.on("connection", function (socket) {
                        console.log("\uD83D\uDD0C Socket connected: ".concat(socket.id, " (not yet joined any session)"));
                        // Apply rate limiting to socket
                        var socketLimiter = (0, rateLimiter_js_1.socketRateLimiter)(50, 60000); // 50 events per minute
                        socketLimiter(socket, function (err) {
                            if (err) {
                                (0, errorHandler_js_1.socketErrorHandler)(socket, err);
                                return;
                            }
                        });
                        // Handle connection errors
                        socket.on("connect_error", function (error) {
                            (0, errorHandler_js_1.socketErrorHandler)(socket, error);
                        });
                        socket.on("game:join", function (data) { return __awaiter(_this, void 0, void 0, function () {
                            var joined, error_8, error_9;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 6, , 7]);
                                        if (!data.sessionId) {
                                            socket.emit("game:error", {
                                                message: "Session ID is required",
                                                timestamp: Date.now(),
                                            });
                                            return [2 /*return*/];
                                        }
                                        console.log("\uD83C\uDFAE Player ".concat(socket.id, " joining game session: ").concat(data.sessionId));
                                        return [4 /*yield*/, (0, gameService_js_1.joinSession)(data.sessionId, socket.id)];
                                    case 1:
                                        joined = _a.sent();
                                        if (!joined) {
                                            socket.emit("game:error", {
                                                message: "Session not found or inactive",
                                                timestamp: Date.now(),
                                            });
                                            return [2 /*return*/];
                                        }
                                        socket.join(data.sessionId);
                                        socket.data.sessionId = data.sessionId;
                                        _a.label = 2;
                                    case 2:
                                        _a.trys.push([2, 4, , 5]);
                                        return [4 /*yield*/, (0, gameService_js_1.setupSessionSubscriber)(data.sessionId, io)];
                                    case 3:
                                        _a.sent();
                                        return [3 /*break*/, 5];
                                    case 4:
                                        error_8 = _a.sent();
                                        console.error("❌ Error setting up session subscriber:", error_8);
                                        socket.emit("game:error", {
                                            message: "Failed to setup game session",
                                            timestamp: Date.now(),
                                        });
                                        return [2 /*return*/];
                                    case 5:
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
                                        return [3 /*break*/, 7];
                                    case 6:
                                        error_9 = _a.sent();
                                        console.error("❌ Error in game:join:", error_9);
                                        socket.emit("game:error", {
                                            message: "Failed to join game session",
                                            timestamp: Date.now(),
                                        });
                                        return [3 /*break*/, 7];
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); });
                        socket.on("game:command", function (data) { return __awaiter(_this, void 0, void 0, function () {
                            var sessionId, error_10;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 3, , 4]);
                                        sessionId = socket.data.sessionId;
                                        if (!sessionId) {
                                            socket.emit("game:error", {
                                                message: "Not joined to any session",
                                                timestamp: Date.now(),
                                            });
                                            return [2 /*return*/];
                                        }
                                        if (!data.command || data.command.trim().length === 0) {
                                            socket.emit("game:error", {
                                                message: "Command cannot be empty",
                                                timestamp: Date.now(),
                                            });
                                            return [2 /*return*/];
                                        }
                                        console.log("\uD83C\uDFAF Received command from ".concat(socket.id, " in session ").concat(sessionId, ": ").concat(data.command));
                                        // Log the command event
                                        return [4 /*yield*/, (0, gameService_js_1.logEvent)(sessionId, socket.id, {
                                                action: "command",
                                                target: data.command,
                                            })];
                                    case 1:
                                        // Log the command event
                                        _a.sent();
                                        // Get AI response
                                        return [4 /*yield*/, (0, gameService_js_1.getAIResponse)(sessionId, data.command)];
                                    case 2:
                                        // Get AI response
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_10 = _a.sent();
                                        console.error("❌ Error processing command:", error_10);
                                        socket.emit("game:error", {
                                            message: "Failed to process command. Please try again.",
                                            timestamp: Date.now(),
                                        });
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        socket.on("disconnect", function (reason) {
                            if (socket.data.sessionId) {
                                console.log("\uD83D\uDD0C Player ".concat(socket.id, " disconnected from session: ").concat(socket.data.sessionId, " - Reason: ").concat(reason));
                                // Remove player from Redis session
                                (0, gameService_js_1.leaveSession)(socket.data.sessionId, socket.id).catch(function (error) {
                                    console.error("❌ Error leaving session:", error);
                                });
                                socket.to(socket.data.sessionId).emit("game:player_left", {
                                    playerId: socket.id,
                                    sessionId: socket.data.sessionId,
                                    timestamp: Date.now(),
                                });
                            }
                            else {
                                console.log("\uD83D\uDD0C Socket disconnected: ".concat(socket.id, " (was not in any session) - Reason: ").concat(reason));
                            }
                        });
                        // Handle any other socket errors
                        socket.on("error", function (error) {
                            console.error("\u274C Socket error for ".concat(socket.id, ":"), error);
                            socket.emit("game:error", {
                                message: "A socket error occurred",
                                timestamp: Date.now(),
                            });
                        });
                    });
                    // 404 handler - must be after all routes
                    app.use(function (req, res) {
                        res.status(404).json({
                            success: false,
                            message: "Endpoint not found",
                            path: req.path,
                        });
                    });
                    // Error handling middleware - must be last
                    app.use(errorHandler_js_1.errorHandler);
                    // Start the server
                    httpServer.listen(port, function () {
                        console.log("\u2705 Server listening on port ".concat(port));
                        console.log("\uD83C\uDF10 Health check available at http://localhost:".concat(port, "/api/health"));
                    });
                    gracefulShutdown_1 = function (signal) { return __awaiter(_this, void 0, void 0, function () {
                        var redisManager, error_11;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log("\n\uD83D\uDED1 Received ".concat(signal, ", shutting down gracefully..."));
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 5, , 6]);
                                    // Close HTTP server
                                    httpServer.close(function () {
                                        console.log("✅ HTTP server closed");
                                    });
                                    // Close Socket.io
                                    io.close(function () {
                                        console.log("✅ Socket.io server closed");
                                    });
                                    // Clean up all session subscribers
                                    return [4 /*yield*/, (0, gameService_js_1.cleanupAllSubscribers)()];
                                case 2:
                                    // Clean up all session subscribers
                                    _a.sent();
                                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./redisClient.js"); })];
                                case 3:
                                    redisManager = (_a.sent()).redisManager;
                                    return [4 /*yield*/, redisManager.disconnect()];
                                case 4:
                                    _a.sent();
                                    console.log("✅ Redis connections closed");
                                    console.log("✅ Graceful shutdown completed");
                                    process.exit(0);
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_11 = _a.sent();
                                    console.error("❌ Error during graceful shutdown:", error_11);
                                    process.exit(1);
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); };
                    process.on("SIGINT", function () { return gracefulShutdown_1("SIGINT"); });
                    process.on("SIGTERM", function () { return gracefulShutdown_1("SIGTERM"); });
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _a.sent();
                    console.error("❌ Failed to start server:", error_2);
                    process.exit(1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Handle uncaught exceptions
process.on("uncaughtException", function (error) {
    console.error("❌ Uncaught Exception:", error);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on("unhandledRejection", function (reason, promise) {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
});
startServer();
