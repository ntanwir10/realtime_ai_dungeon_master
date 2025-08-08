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
exports.getActiveSubscribers = void 0;
exports.cleanupAllSubscribers = cleanupAllSubscribers;
exports.createGameSession = createGameSession;
exports.logEvent = logEvent;
exports.getAIResponse = getAIResponse;
exports.setupSessionSubscriber = setupSessionSubscriber;
exports.removeSessionSubscriber = removeSessionSubscriber;
exports.getActiveSessions = getActiveSessions;
exports.getSessionDetails = getSessionDetails;
exports.joinSession = joinSession;
exports.leaveSession = leaveSession;
exports.deleteSession = deleteSession;
var zod_1 = require("zod");
var redisClient_js_1 = require("./redisClient.js");
var nanoid_1 = require("nanoid");
var openai_1 = require("openai");
var loreService_js_1 = require("./loreService.js");
// Track active session subscribers to prevent duplicates
var activeSubscribers = new Set();
// Export for cleanup during shutdown
var getActiveSubscribers = function () { return activeSubscribers; };
exports.getActiveSubscribers = getActiveSubscribers;
function cleanupAllSubscribers() {
    return __awaiter(this, void 0, void 0, function () {
        var subscriber, _i, _a, sessionId, channel, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, , 6]);
                    subscriber = (0, redisClient_js_1.getSubscriber)();
                    _i = 0, _a = Array.from(activeSubscribers);
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    sessionId = _a[_i];
                    channel = "game:".concat(sessionId, ":updates");
                    return [4 /*yield*/, subscriber.unsubscribe(channel)];
                case 2:
                    _b.sent();
                    console.log("\u2705 Unsubscribed from channel: ".concat(channel));
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    activeSubscribers.clear();
                    console.log("✅ All session subscribers cleaned up");
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    console.error("❌ Error cleaning up subscribers:", error_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Initialize OpenAI with error handling
var openai = null;
try {
    var apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ OpenAI API key not configured - AI features will be disabled");
    }
    else {
        openai = new openai_1.default({ apiKey: apiKey });
        console.log("✅ OpenAI initialized successfully");
    }
}
catch (error) {
    console.error("❌ Failed to initialize OpenAI:", error);
    console.warn("⚠️ AI features will be disabled");
}
var eventSchema = zod_1.z.object({
    action: zod_1.z.string(),
    location: zod_1.z.string().optional(),
    target: zod_1.z.string().optional(),
});
// Retry configuration for Redis operations
var MAX_RETRIES = 3;
var RETRY_DELAY = 1000;
function retryOperation(operation_1, operationName_1) {
    return __awaiter(this, arguments, void 0, function (operation, operationName, maxRetries) {
        var lastError, _loop_1, attempt, state_1;
        if (maxRetries === void 0) { maxRetries = MAX_RETRIES; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _loop_1 = function (attempt) {
                        var _b, error_2;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 2, , 4]);
                                    _b = {};
                                    return [4 /*yield*/, operation()];
                                case 1: return [2 /*return*/, (_b.value = _c.sent(), _b)];
                                case 2:
                                    error_2 = _c.sent();
                                    lastError = error_2 instanceof Error ? error_2 : new Error(String(error_2));
                                    console.warn("\u26A0\uFE0F ".concat(operationName, " attempt ").concat(attempt, " failed:"), lastError.message);
                                    if (attempt === maxRetries) {
                                        throw new Error("".concat(operationName, " failed after ").concat(maxRetries, " attempts: ").concat(lastError.message));
                                    }
                                    // Wait before retrying
                                    return [4 /*yield*/, new Promise(function (resolve) {
                                            return setTimeout(resolve, RETRY_DELAY * attempt);
                                        })];
                                case 3:
                                    // Wait before retrying
                                    _c.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 1;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= maxRetries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 3;
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: throw lastError;
            }
        });
    });
}
function createGameSession() {
    return __awaiter(this, void 0, void 0, function () {
        var sessionId, key_1, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    sessionId = (0, nanoid_1.nanoid)(10);
                    key_1 = "game:".concat(sessionId, ":state");
                    return [4 /*yield*/, retryOperation(function () {
                            return (0, redisClient_js_1.getClient)().hSet(key_1, {
                                status: "active",
                                created_at: String(Date.now()),
                                last_activity: String(Date.now()),
                            });
                        }, "Create game session")];
                case 1:
                    _a.sent();
                    console.log("\u2705 Created game session: ".concat(sessionId));
                    return [2 /*return*/, sessionId];
                case 2:
                    error_3 = _a.sent();
                    console.error("❌ Failed to create game session:", error_3);
                    throw new Error("Failed to create game session: ".concat(error_3 instanceof Error ? error_3.message : "Unknown error"));
                case 3: return [2 /*return*/];
            }
        });
    });
}
function logEvent(sessionId, playerId, eventData) {
    return __awaiter(this, void 0, void 0, function () {
        var validatedEvent_1, key_2, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    validatedEvent_1 = eventSchema.parse(eventData);
                    key_2 = "game:".concat(sessionId, ":events");
                    return [4 /*yield*/, retryOperation(function () {
                            return (0, redisClient_js_1.getClient)().xAdd(key_2, "*", {
                                playerId: playerId,
                                event: JSON.stringify(validatedEvent_1),
                                timestamp: String(Date.now()),
                            });
                        }, "Log event")];
                case 1:
                    _a.sent();
                    console.log("\u2705 Logged event for session ".concat(sessionId, ":"), validatedEvent_1.action);
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    console.error("❌ Failed to log event:", error_4);
                    throw new Error("Failed to log event: ".concat(error_4 instanceof Error ? error_4.message : "Unknown error"));
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getAIResponse(sessionId, command) {
    return __awaiter(this, void 0, void 0, function () {
        var historyKey_1, stateKey_1, _a, history_1, state, gameState, storyHistory, loreContext, prompt_1, fallbackResponse, response, narrative_1, error_5, fallbackResponse, publishError_1;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 7, , 12]);
                    historyKey_1 = "game:".concat(sessionId, ":events");
                    stateKey_1 = "game:".concat(sessionId, ":state");
                    return [4 /*yield*/, Promise.all([
                            retryOperation(function () { return (0, redisClient_js_1.getClient)().xRange(historyKey_1, "-", "+"); }, 
                            // XRANGE is used to get the history of the game. Creates the Redis Stream key for the session
                            "Get game history"),
                            retryOperation(function () { return (0, redisClient_js_1.getClient)().hGetAll(stateKey_1); }, "Get game state"),
                            // HGETALL is used to get the state of the game. Creates the Redis Hash key for the session
                        ])];
                case 1:
                    _a = _c.sent(), history_1 = _a[0], state = _a[1];
                    gameState = state || {};
                    storyHistory = history_1
                        .map(function (entry) {
                        try {
                            var eventData = JSON.parse(entry.message.event || "{}");
                            return eventData.action || "Unknown action";
                        }
                        catch (_a) {
                            return "Unknown action";
                        }
                    })
                        .join("\n");
                    return [4 /*yield*/, (0, loreService_js_1.getContextualLore)(command, storyHistory.split("\n"))];
                case 2:
                    loreContext = _c.sent();
                    prompt_1 = "You are a text-based RPG game master. \n\nCurrent game state: ".concat(JSON.stringify(gameState, null, 2), "\n\nStory so far:\n").concat(storyHistory || "This is the beginning of the adventure.", "\n\nA player issues the following command: \"").concat(command, "\"\n\n").concat(loreContext, "\n\nDescribe what happens next in a vivid, engaging way. Keep your response under 200 words. Use the world knowledge provided to make your response consistent with the established lore.");
                    if (!!openai) return [3 /*break*/, 4];
                    fallbackResponse = "The AI is currently unavailable. Please try again later.";
                    return [4 /*yield*/, (0, redisClient_js_1.getClient)().publish("game:".concat(sessionId, ":updates"), JSON.stringify({
                            type: "narrative",
                            narrative: fallbackResponse,
                            timestamp: Date.now(),
                            error: true,
                        }))];
                case 3:
                    _c.sent();
                    return [2 /*return*/, fallbackResponse];
                case 4: return [4 /*yield*/, openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: prompt_1 }],
                        max_tokens: 500,
                        temperature: 0.8,
                    })];
                case 5:
                    response = _c.sent();
                    narrative_1 = ((_b = response.choices[0].message.content) === null || _b === void 0 ? void 0 : _b.trim()) || "The world is silent.";
                    // Publish the narrative with retry
                    return [4 /*yield*/, retryOperation(function () {
                            return (0, redisClient_js_1.getClient)().publish("game:".concat(sessionId, ":updates"), JSON.stringify({
                                type: "narrative",
                                narrative: narrative_1,
                                timestamp: Date.now(),
                            }));
                        }, "Publish narrative")];
                case 6:
                    // Publish the narrative with retry
                    _c.sent();
                    console.log("\u2705 Generated AI response for session ".concat(sessionId));
                    return [2 /*return*/, narrative_1];
                case 7:
                    error_5 = _c.sent();
                    console.error("❌ Failed to get AI response:", error_5);
                    fallbackResponse = "The world seems to be experiencing some technical difficulties. Please try your command again.";
                    if (error_5 instanceof Error) {
                        if (error_5.message.includes("rate limit")) {
                            fallbackResponse =
                                "The AI is currently busy. Please wait a moment and try again.";
                        }
                        else if (error_5.message.includes("quota")) {
                            fallbackResponse = "AI service quota exceeded. Please try again later.";
                        }
                        else if (error_5.message.includes("network") ||
                            error_5.message.includes("timeout")) {
                            fallbackResponse =
                                "Network connection issue. Please check your connection and try again.";
                        }
                    }
                    _c.label = 8;
                case 8:
                    _c.trys.push([8, 10, , 11]);
                    // Still try to publish the fallback response
                    return [4 /*yield*/, (0, redisClient_js_1.getClient)().publish("game:".concat(sessionId, ":updates"), JSON.stringify({
                            type: "narrative",
                            narrative: fallbackResponse,
                            timestamp: Date.now(),
                            error: true,
                        }))];
                case 9:
                    // Still try to publish the fallback response
                    _c.sent();
                    return [3 /*break*/, 11];
                case 10:
                    publishError_1 = _c.sent();
                    console.error("❌ Failed to publish fallback response:", publishError_1);
                    return [3 /*break*/, 11];
                case 11: throw new Error("Failed to get AI response: ".concat(error_5 instanceof Error ? error_5.message : "Unknown error"));
                case 12: return [2 /*return*/];
            }
        });
    });
}
function setupSessionSubscriber(sessionId, io) {
    return __awaiter(this, void 0, void 0, function () {
        var channel, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // Check if subscriber already exists for this session
                    if (activeSubscribers.has(sessionId)) {
                        console.log("\u2705 Subscriber already exists for session: ".concat(sessionId));
                        return [2 /*return*/];
                    }
                    channel = "game:".concat(sessionId, ":updates");
                    return [4 /*yield*/, (0, redisClient_js_1.getSubscriber)().subscribe(channel, function (message) {
                            try {
                                var data = JSON.parse(message);
                                io.to(sessionId).emit("game:update", data);
                            }
                            catch (error) {
                                console.error("❌ Error parsing pub/sub message:", error);
                                // Emit error to client
                                io.to(sessionId).emit("game:error", {
                                    message: "Failed to process game update",
                                    timestamp: Date.now(),
                                });
                            }
                        })];
                case 1:
                    _a.sent();
                    // Mark this session as having an active subscriber
                    activeSubscribers.add(sessionId);
                    console.log("\u2705 Subscribed to channel: ".concat(channel));
                    return [3 /*break*/, 3];
                case 2:
                    error_6 = _a.sent();
                    console.error("❌ Failed to setup session subscriber:", error_6);
                    throw new Error("Failed to setup session subscriber: ".concat(error_6 instanceof Error ? error_6.message : "Unknown error"));
                case 3: return [2 /*return*/];
            }
        });
    });
}
function removeSessionSubscriber(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var channel, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    channel = "game:".concat(sessionId, ":updates");
                    return [4 /*yield*/, (0, redisClient_js_1.getSubscriber)().unsubscribe(channel)];
                case 1:
                    _a.sent();
                    activeSubscribers.delete(sessionId);
                    console.log("\u2705 Unsubscribed from channel: ".concat(channel));
                    return [3 /*break*/, 3];
                case 2:
                    error_7 = _a.sent();
                    console.error("❌ Failed to remove session subscriber:", error_7);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getActiveSessions() {
    return __awaiter(this, void 0, void 0, function () {
        var client, sessionKeys, sessions, _i, sessionKeys_1, key, sessionId, state, playerCount, lastActivity, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    client = (0, redisClient_js_1.getClient)();
                    return [4 /*yield*/, client.keys("game:*:state")];
                case 1:
                    sessionKeys = _a.sent();
                    sessions = [];
                    _i = 0, sessionKeys_1 = sessionKeys;
                    _a.label = 2;
                case 2:
                    if (!(_i < sessionKeys_1.length)) return [3 /*break*/, 6];
                    key = sessionKeys_1[_i];
                    sessionId = key.split(":")[1];
                    return [4 /*yield*/, client.hGetAll(key)];
                case 3:
                    state = _a.sent();
                    if (!(state.status === "active" || state.status === "initializing")) return [3 /*break*/, 5];
                    return [4 /*yield*/, client.sCard("game:".concat(sessionId, ":players"))];
                case 4:
                    playerCount = (_a.sent()) || 0;
                    lastActivity = parseInt(state.last_activity || "0");
                    sessions.push({
                        sessionId: sessionId,
                        playerCount: parseInt(playerCount.toString()),
                        createdAt: parseInt(state.created_at || "0"),
                        lastActivity: lastActivity,
                    });
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: 
                // Sort by last activity (most recent first)
                return [2 /*return*/, sessions.sort(function (a, b) { return b.lastActivity - a.lastActivity; })];
                case 7:
                    error_8 = _a.sent();
                    console.error("❌ Failed to get active sessions:", error_8);
                    return [2 /*return*/, []];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function getSessionDetails(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var client, state, playerCount, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    client = (0, redisClient_js_1.getClient)();
                    return [4 /*yield*/, client.hGetAll("game:".concat(sessionId, ":state"))];
                case 1:
                    state = _a.sent();
                    if (!state.status) {
                        return [2 /*return*/, null]; // Session doesn't exist
                    }
                    return [4 /*yield*/, client.sCard("game:".concat(sessionId, ":players"))];
                case 2:
                    playerCount = (_a.sent()) || 0;
                    return [2 /*return*/, {
                            sessionId: sessionId,
                            playerCount: parseInt(playerCount.toString()),
                            createdAt: parseInt(state.created_at || "0"),
                            lastActivity: parseInt(state.last_activity || "0"),
                            status: state.status,
                        }];
                case 3:
                    error_9 = _a.sent();
                    console.error("❌ Failed to get session details:", error_9);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function joinSession(sessionId, playerId) {
    return __awaiter(this, void 0, void 0, function () {
        var client, state, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    client = (0, redisClient_js_1.getClient)();
                    return [4 /*yield*/, client.hGetAll("game:".concat(sessionId, ":state"))];
                case 1:
                    state = _a.sent();
                    if (!state.status || state.status === "ended") {
                        return [2 /*return*/, false];
                    }
                    // Add player to session
                    return [4 /*yield*/, client.sAdd("game:".concat(sessionId, ":players"), playerId)];
                case 2:
                    // Add player to session
                    _a.sent();
                    // Update last activity
                    return [4 /*yield*/, client.hSet("game:".concat(sessionId, ":state"), "last_activity", String(Date.now()))];
                case 3:
                    // Update last activity
                    _a.sent();
                    console.log("\u2705 Player ".concat(playerId, " joined session ").concat(sessionId));
                    return [2 /*return*/, true];
                case 4:
                    error_10 = _a.sent();
                    console.error("❌ Failed to join session:", error_10);
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function leaveSession(sessionId, playerId) {
    return __awaiter(this, void 0, void 0, function () {
        var client, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    client = (0, redisClient_js_1.getClient)();
                    return [4 /*yield*/, client.sRem("game:".concat(sessionId, ":players"), playerId)];
                case 1:
                    _a.sent();
                    // Update last activity
                    return [4 /*yield*/, client.hSet("game:".concat(sessionId, ":state"), "last_activity", String(Date.now()))];
                case 2:
                    // Update last activity
                    _a.sent();
                    console.log("\u2705 Player ".concat(playerId, " left session ").concat(sessionId));
                    return [3 /*break*/, 4];
                case 3:
                    error_11 = _a.sent();
                    console.error("❌ Failed to leave session:", error_11);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function deleteSession(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var client, state, error_12;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    client = (0, redisClient_js_1.getClient)();
                    return [4 /*yield*/, client.hGetAll("game:".concat(sessionId, ":state"))];
                case 1:
                    state = _a.sent();
                    if (!state.status) {
                        return [2 /*return*/, false]; // Session doesn't exist
                    }
                    // Delete all session data
                    return [4 /*yield*/, client.del("game:".concat(sessionId, ":state"))];
                case 2:
                    // Delete all session data
                    _a.sent();
                    return [4 /*yield*/, client.del("game:".concat(sessionId, ":events"))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client.del("game:".concat(sessionId, ":players"))];
                case 4:
                    _a.sent();
                    // Remove session subscriber
                    return [4 /*yield*/, removeSessionSubscriber(sessionId)];
                case 5:
                    // Remove session subscriber
                    _a.sent();
                    console.log("\u2705 Session ".concat(sessionId, " deleted successfully"));
                    return [2 /*return*/, true];
                case 6:
                    error_12 = _a.sent();
                    console.error("❌ Failed to delete session:", error_12);
                    return [2 /*return*/, false];
                case 7: return [2 /*return*/];
            }
        });
    });
}
