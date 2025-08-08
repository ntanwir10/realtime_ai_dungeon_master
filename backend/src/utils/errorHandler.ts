import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

export class ServiceUnavailableError extends CustomError {
  constructor(message: string = "Service temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

// Enhanced error handler middleware
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  // Log error details
  console.error("❌ Error occurred:", {
    message: error.message,
    stack: error.stack,
    statusCode,
    isOperational,
    code: error.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  const errorResponse = {
    success: false,
    message: isOperational ? error.message : "Internal server error",
    ...(isDevelopment && {
      error: error.message,
      stack: error.stack,
      code: error.code,
    }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Socket.io error handler
export const socketErrorHandler = (socket: any, error: Error) => {
  console.error("❌ Socket error:", {
    socketId: socket.id,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Send appropriate error to client
  let errorMessage = "An error occurred";
  let errorCode = "UNKNOWN_ERROR";

  if (error.message.includes("Rate limit")) {
    errorMessage = "You're sending messages too quickly. Please wait a moment.";
    errorCode = "RATE_LIMIT_EXCEEDED";
  } else if (error.message.includes("Session")) {
    errorMessage = "Session error occurred. Please try rejoining.";
    errorCode = "SESSION_ERROR";
  } else if (error.message.includes("AI")) {
    errorMessage = "AI service is temporarily unavailable. Please try again.";
    errorCode = "AI_SERVICE_ERROR";
  }

  socket.emit("game:error", {
    message: errorMessage,
    code: errorCode,
    timestamp: Date.now(),
  });
};

// Redis error handler
export const redisErrorHandler = (error: Error, context: string) => {
  console.error(`❌ Redis error in ${context}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Implement retry logic or fallback mechanisms here
  if (error.message.includes("ECONNREFUSED")) {
    console.error("❌ Redis connection refused. Check if Redis is running.");
  } else if (error.message.includes("timeout")) {
    console.error("❌ Redis operation timed out.");
  }
};

// OpenAI error handler
export const openaiErrorHandler = (error: Error, context: string) => {
  console.error(`❌ OpenAI error in ${context}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Handle specific OpenAI errors
  if (error.message.includes("rate limit")) {
    console.warn(
      "⚠️ OpenAI rate limit reached. Consider implementing backoff."
    );
  } else if (error.message.includes("quota")) {
    console.error("❌ OpenAI quota exceeded. Check API key and billing.");
  } else if (error.message.includes("invalid api key")) {
    console.error("❌ Invalid OpenAI API key. Check environment variables.");
  }
};
