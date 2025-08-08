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
exports.redisManager = exports.getSubscriber = exports.getClient = exports.connection = void 0;
var redis_1 = require("redis");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
// Retry configuration
var MAX_RETRIES = 5;
var RETRY_DELAY = 1000; // 1 second
var RedisManager = /** @class */ (function () {
    function RedisManager() {
        this.isConnected = false;
        this.retryCount = 0;
        var redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            throw new Error("REDIS_URL environment variable is required");
        }
        this.client = (0, redis_1.createClient)({
            url: redisUrl,
            socket: {
                reconnectStrategy: function (retries) {
                    if (retries > MAX_RETRIES) {
                        console.error("Max Redis reconnection attempts reached");
                        return new Error("Max reconnection attempts reached");
                    }
                    return Math.min(retries * RETRY_DELAY, 3000);
                },
            },
        });
        this.subscriber = (0, redis_1.createClient)({
            url: redisUrl,
            socket: {
                reconnectStrategy: function (retries) {
                    if (retries > MAX_RETRIES) {
                        console.error("Max Redis subscriber reconnection attempts reached");
                        return new Error("Max reconnection attempts reached");
                    }
                    return Math.min(retries * RETRY_DELAY, 3000);
                },
            },
        });
        this.setupEventHandlers();
    }
    RedisManager.prototype.setupEventHandlers = function () {
        var _this = this;
        // Client event handlers
        this.client.on("error", function (err) {
            console.error("Redis Client Error:", err.message);
            _this.isConnected = false;
        });
        this.client.on("connect", function () {
            console.log("✅ Connected to Redis Client");
            _this.isConnected = true;
            _this.retryCount = 0;
        });
        this.client.on("reconnecting", function () {
            console.log("🔄 Reconnecting to Redis Client...");
            _this.isConnected = false;
        });
        this.client.on("ready", function () {
            console.log("✅ Redis Client ready");
            _this.isConnected = true;
        });
        // Subscriber event handlers
        this.subscriber.on("error", function (err) {
            console.error("Redis Subscriber Error:", err.message);
        });
        this.subscriber.on("connect", function () {
            console.log("✅ Connected to Redis Subscriber");
        });
        this.subscriber.on("reconnecting", function () {
            console.log("🔄 Reconnecting to Redis Subscriber...");
        });
        this.subscriber.on("ready", function () {
            console.log("✅ Redis Subscriber ready");
        });
    };
    RedisManager.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Promise.all([this.client.connect(), this.subscriber.connect()])];
                    case 1:
                        _a.sent();
                        console.log("✅ All Redis connections established");
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error("❌ Failed to connect to Redis:", error_1);
                        throw new Error("Redis connection failed: ".concat(error_1 instanceof Error ? error_1.message : "Unknown error"));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    RedisManager.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Promise.all([
                                this.client.disconnect(),
                                this.subscriber.disconnect(),
                            ])];
                    case 1:
                        _a.sent();
                        console.log("✅ Redis connections closed");
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        console.error("❌ Error disconnecting from Redis:", error_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    RedisManager.prototype.getClient = function () {
        if (!this.isConnected) {
            throw new Error("Redis client is not connected");
        }
        return this.client;
    };
    RedisManager.prototype.getSubscriber = function () {
        return this.subscriber;
    };
    RedisManager.prototype.isClientConnected = function () {
        return this.isConnected;
    };
    return RedisManager;
}());
var redisManager = new RedisManager();
exports.redisManager = redisManager;
exports.connection = redisManager.connect();
// Export functions that ensure connection is established
var getClient = function () { return redisManager.getClient(); };
exports.getClient = getClient;
var getSubscriber = function () { return redisManager.getSubscriber(); };
exports.getSubscriber = getSubscriber;
// Graceful shutdown handling
process.on("SIGINT", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("\n🛑 Received SIGINT, closing Redis connections...");
                return [4 /*yield*/, redisManager.disconnect()];
            case 1:
                _a.sent();
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
process.on("SIGTERM", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("\n🛑 Received SIGTERM, closing Redis connections...");
                return [4 /*yield*/, redisManager.disconnect()];
            case 1:
                _a.sent();
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
