"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketRateLimiter = exports.loreLimiter = exports.sessionCreationLimiter = exports.gameCommandLimiter = exports.generalLimiter = exports.createRateLimiter = void 0;
var express_rate_limit_1 = require("express-rate-limit");
// Helper function to normalize IPv6 addresses
function normalizeIPv6(ip) {
    // Handle IPv6 addresses properly
    if (ip.includes(":")) {
        // Remove scope ID if present (e.g., %eth0)
        return ip.split("%")[0];
    }
    return ip;
}
// Enhanced rate limiter with different configurations
var createRateLimiter = function (windowMs, max, message, skipSuccessfulRequests) {
    if (skipSuccessfulRequests === void 0) { skipSuccessfulRequests = false; }
    return (0, express_rate_limit_1.default)({
        windowMs: windowMs,
        max: max,
        skipSuccessfulRequests: skipSuccessfulRequests,
        message: {
            error: message || "Too many requests from this IP, please try again later.",
            retryAfter: Math.ceil(windowMs / 1000),
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: function (req, res) {
            res.status(429).json({
                success: false,
                message: message || "Too many requests from this IP, please try again later.",
                retryAfter: Math.ceil(windowMs / 1000),
                timestamp: new Date().toISOString(),
            });
        },
        // Proper custom keyGenerator with IPv6 normalization
        keyGenerator: function (req) {
            var ip = normalizeIPv6(req.ip ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                "unknown");
            var userAgent = req.get("User-Agent") || "unknown";
            return "".concat(ip, "-").concat(userAgent);
        },
    });
};
exports.createRateLimiter = createRateLimiter;
// Different rate limiters for different endpoints
exports.generalLimiter = (0, exports.createRateLimiter)(15 * 60 * 1000, // 15 minutes
100, // 100 requests per window
"Too many requests from this IP, please try again later.");
exports.gameCommandLimiter = (0, exports.createRateLimiter)(60 * 1000, // 1 minute
10, // 10 commands per minute
"You're sending commands too quickly. Please wait a moment.", true // Skip successful requests
);
exports.sessionCreationLimiter = (0, exports.createRateLimiter)(5 * 60 * 1000, // 5 minutes
5, // 5 session creations per 5 minutes
"Too many session creation attempts. Please wait before creating another session.");
exports.loreLimiter = (0, exports.createRateLimiter)(10 * 60 * 1000, // 10 minutes
20, // 20 lore operations per 10 minutes
"Too many lore operations. Please wait before making more changes.");
// Socket.io rate limiting middleware
var socketRateLimiter = function (maxEvents, windowMs) {
    var eventCounts = new Map();
    return function (socket, next) {
        var key = socket.handshake.address;
        var now = Date.now();
        var userEvents = eventCounts.get(key);
        if (!userEvents || now > userEvents.resetTime) {
            eventCounts.set(key, { count: 1, resetTime: now + windowMs });
            next();
        }
        else if (userEvents.count < maxEvents) {
            userEvents.count++;
            next();
        }
        else {
            next(new Error("Rate limit exceeded for socket events"));
        }
    };
};
exports.socketRateLimiter = socketRateLimiter;
