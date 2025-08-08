import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request, Response } from "express";

// Enhanced rate limiter with different configurations
export const createRateLimiter = (
  windowMs: number,
  max: number,
  message?: string,
  skipSuccessfulRequests = false
) => {
  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    message: {
      error:
        message || "Too many requests from this IP, please try again later.",
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message:
          message || "Too many requests from this IP, please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString(),
      });
    },
    // Use the built-in ipKeyGenerator for proper IPv6 handling
    keyGenerator: (req: Request) => {
      const ip = ipKeyGenerator(
        req.ip ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          "unknown"
      );
      const userAgent = req.get("User-Agent") || "unknown";
      return `${ip}-${userAgent}`;
    },
  });
};

// Different rate limiters for different endpoints
export const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  "Too many requests from this IP, please try again later."
);

export const gameCommandLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 commands per minute
  "You're sending commands too quickly. Please wait a moment.",
  true // Skip successful requests
);

export const sessionCreationLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  5, // 5 session creations per 5 minutes
  "Too many session creation attempts. Please wait before creating another session."
);

export const loreLimiter = createRateLimiter(
  10 * 60 * 1000, // 10 minutes
  20, // 20 lore operations per 10 minutes
  "Too many lore operations. Please wait before making more changes."
);

// Socket.io rate limiting middleware
export const socketRateLimiter = (maxEvents: number, windowMs: number) => {
  const eventCounts = new Map<string, { count: number; resetTime: number }>();

  return (socket: any, next: (err?: Error) => void) => {
    const key = socket.handshake.address;
    const now = Date.now();
    const userEvents = eventCounts.get(key);

    if (!userEvents || now > userEvents.resetTime) {
      eventCounts.set(key, { count: 1, resetTime: now + windowMs });
      next();
    } else if (userEvents.count < maxEvents) {
      userEvents.count++;
      next();
    } else {
      next(new Error("Rate limit exceeded for socket events"));
    }
  };
};
