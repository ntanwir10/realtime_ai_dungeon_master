"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiErrorHandler = exports.redisErrorHandler = exports.socketErrorHandler = exports.asyncHandler = exports.errorHandler = exports.ServiceUnavailableError = exports.RateLimitError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.CustomError = void 0;
var CustomError = /** @class */ (function (_super) {
    __extends(CustomError, _super);
    function CustomError(message, statusCode, code) {
        if (statusCode === void 0) { statusCode = 500; }
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.isOperational = true;
        _this.code = code;
        Error.captureStackTrace(_this, _this.constructor);
        return _this;
    }
    return CustomError;
}(Error));
exports.CustomError = CustomError;
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message) {
        return _super.call(this, message, 400, "VALIDATION_ERROR") || this;
    }
    return ValidationError;
}(CustomError));
exports.ValidationError = ValidationError;
var AuthenticationError = /** @class */ (function (_super) {
    __extends(AuthenticationError, _super);
    function AuthenticationError(message) {
        if (message === void 0) { message = "Authentication required"; }
        return _super.call(this, message, 401, "AUTHENTICATION_ERROR") || this;
    }
    return AuthenticationError;
}(CustomError));
exports.AuthenticationError = AuthenticationError;
var AuthorizationError = /** @class */ (function (_super) {
    __extends(AuthorizationError, _super);
    function AuthorizationError(message) {
        if (message === void 0) { message = "Insufficient permissions"; }
        return _super.call(this, message, 403, "AUTHORIZATION_ERROR") || this;
    }
    return AuthorizationError;
}(CustomError));
exports.AuthorizationError = AuthorizationError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message) {
        if (message === void 0) { message = "Resource not found"; }
        return _super.call(this, message, 404, "NOT_FOUND") || this;
    }
    return NotFoundError;
}(CustomError));
exports.NotFoundError = NotFoundError;
var RateLimitError = /** @class */ (function (_super) {
    __extends(RateLimitError, _super);
    function RateLimitError(message) {
        if (message === void 0) { message = "Rate limit exceeded"; }
        return _super.call(this, message, 429, "RATE_LIMIT_EXCEEDED") || this;
    }
    return RateLimitError;
}(CustomError));
exports.RateLimitError = RateLimitError;
var ServiceUnavailableError = /** @class */ (function (_super) {
    __extends(ServiceUnavailableError, _super);
    function ServiceUnavailableError(message) {
        if (message === void 0) { message = "Service temporarily unavailable"; }
        return _super.call(this, message, 503, "SERVICE_UNAVAILABLE") || this;
    }
    return ServiceUnavailableError;
}(CustomError));
exports.ServiceUnavailableError = ServiceUnavailableError;
// Enhanced error handler middleware
var errorHandler = function (error, req, res, next) {
    var statusCode = error.statusCode || 500;
    var isOperational = error.isOperational || false;
    // Log error details
    console.error("❌ Error occurred:", {
        message: error.message,
        stack: error.stack,
        statusCode: statusCode,
        isOperational: isOperational,
        code: error.code,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
    });
    // Don't leak error details in production
    var isDevelopment = process.env.NODE_ENV === "development";
    var errorResponse = __assign(__assign({ success: false, message: isOperational ? error.message : "Internal server error" }, (isDevelopment && {
        error: error.message,
        stack: error.stack,
        code: error.code,
    })), { timestamp: new Date().toISOString() });
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Async error wrapper
var asyncHandler = function (fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Socket.io error handler
var socketErrorHandler = function (socket, error) {
    console.error("❌ Socket error:", {
        socketId: socket.id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
    });
    // Send appropriate error to client
    var errorMessage = "An error occurred";
    var errorCode = "UNKNOWN_ERROR";
    if (error.message.includes("Rate limit")) {
        errorMessage = "You're sending messages too quickly. Please wait a moment.";
        errorCode = "RATE_LIMIT_EXCEEDED";
    }
    else if (error.message.includes("Session")) {
        errorMessage = "Session error occurred. Please try rejoining.";
        errorCode = "SESSION_ERROR";
    }
    else if (error.message.includes("AI")) {
        errorMessage = "AI service is temporarily unavailable. Please try again.";
        errorCode = "AI_SERVICE_ERROR";
    }
    socket.emit("game:error", {
        message: errorMessage,
        code: errorCode,
        timestamp: Date.now(),
    });
};
exports.socketErrorHandler = socketErrorHandler;
// Redis error handler
var redisErrorHandler = function (error, context) {
    console.error("\u274C Redis error in ".concat(context, ":"), {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
    });
    // Implement retry logic or fallback mechanisms here
    if (error.message.includes("ECONNREFUSED")) {
        console.error("❌ Redis connection refused. Check if Redis is running.");
    }
    else if (error.message.includes("timeout")) {
        console.error("❌ Redis operation timed out.");
    }
};
exports.redisErrorHandler = redisErrorHandler;
// OpenAI error handler
var openaiErrorHandler = function (error, context) {
    console.error("\u274C OpenAI error in ".concat(context, ":"), {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
    });
    // Handle specific OpenAI errors
    if (error.message.includes("rate limit")) {
        console.warn("⚠️ OpenAI rate limit reached. Consider implementing backoff.");
    }
    else if (error.message.includes("quota")) {
        console.error("❌ OpenAI quota exceeded. Check API key and billing.");
    }
    else if (error.message.includes("invalid api key")) {
        console.error("❌ Invalid OpenAI API key. Check environment variables.");
    }
};
exports.openaiErrorHandler = openaiErrorHandler;
