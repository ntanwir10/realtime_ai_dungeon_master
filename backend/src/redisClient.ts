import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

dotenv.config();

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

class RedisManager {
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private isConnected = false;
  private retryCount = 0;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is required");
    }

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > MAX_RETRIES) {
            console.error("Max Redis reconnection attempts reached");
            return new Error("Max reconnection attempts reached");
          }
          return Math.min(retries * RETRY_DELAY, 3000);
        },
      },
    });

    this.subscriber = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
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

  private setupEventHandlers() {
    // Client event handlers
    this.client.on("error", (err: Error) => {
      console.error("Redis Client Error:", err.message);
      this.isConnected = false;
    });

    this.client.on("connect", () => {
      console.log("✅ Connected to Redis Client");
      this.isConnected = true;
      this.retryCount = 0;
    });

    this.client.on("reconnecting", () => {
      console.log("🔄 Reconnecting to Redis Client...");
      this.isConnected = false;
    });

    this.client.on("ready", () => {
      console.log("✅ Redis Client ready");
      this.isConnected = true;
    });

    // Subscriber event handlers
    this.subscriber.on("error", (err: Error) => {
      console.error("Redis Subscriber Error:", err.message);
    });

    this.subscriber.on("connect", () => {
      console.log("✅ Connected to Redis Subscriber");
    });

    this.subscriber.on("reconnecting", () => {
      console.log("🔄 Reconnecting to Redis Subscriber...");
    });

    this.subscriber.on("ready", () => {
      console.log("✅ Redis Subscriber ready");
    });
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([this.client.connect(), this.subscriber.connect()]);
      console.log("✅ All Redis connections established");
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error);
      throw new Error(
        `Redis connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.client.disconnect(),
        this.subscriber.disconnect(),
      ]);
      console.log("✅ Redis connections closed");
    } catch (error) {
      console.error("❌ Error disconnecting from Redis:", error);
    }
  }

  getClient(): RedisClientType {
    if (!this.isConnected) {
      throw new Error("Redis client is not connected");
    }
    return this.client;
  }

  getSubscriber(): RedisClientType {
    return this.subscriber;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}

const redisManager = new RedisManager();

export const connection = redisManager.connect();

// Export functions that ensure connection is established
export const getClient = () => redisManager.getClient();
export const getSubscriber = () => redisManager.getSubscriber();

// For backward compatibility, export the manager instance
export { redisManager };

// Graceful shutdown handling
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, closing Redis connections...");
  await redisManager.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, closing Redis connections...");
  await redisManager.disconnect();
  process.exit(0);
});
