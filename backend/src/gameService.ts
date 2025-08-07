import { z } from "zod";
import { getClient, getSubscriber } from "./redisClient.js";
import { nanoid } from "nanoid";
import OpenAI from "openai";

// Initialize OpenAI with error handling
let openai: OpenAI | null = null;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "⚠️ OpenAI API key not configured - AI features will be disabled"
    );
  } else {
    openai = new OpenAI({ apiKey });
    console.log("✅ OpenAI initialized successfully");
  }
} catch (error) {
  console.error("❌ Failed to initialize OpenAI:", error);
  console.warn("⚠️ AI features will be disabled");
}

const eventSchema = z.object({
  action: z.string(),
  location: z.string().optional(),
  target: z.string().optional(),
});

export type EventData = z.infer<typeof eventSchema>;

// Retry configuration for Redis operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `⚠️ ${operationName} attempt ${attempt} failed:`,
        lastError.message
      );

      if (attempt === maxRetries) {
        throw new Error(
          `${operationName} failed after ${maxRetries} attempts: ${lastError.message}`
        );
      }

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY * attempt)
      );
    }
  }

  throw lastError!;
}

export async function createGameSession(): Promise<string> {
  try {
    const sessionId = nanoid(10);
    const key = `game:${sessionId}:state`;

    await retryOperation(
      () =>
        getClient().hSet(key, {
          status: "active",
          created_at: String(Date.now()),
          last_activity: String(Date.now()),
        }),
      "Create game session"
    );

    console.log(`✅ Created game session: ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error("❌ Failed to create game session:", error);
    throw new Error(
      `Failed to create game session: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function logEvent(
  sessionId: string,
  playerId: string,
  eventData: EventData
): Promise<void> {
  try {
    const validatedEvent = eventSchema.parse(eventData);
    const key = `game:${sessionId}:events`;

    await retryOperation(
      () =>
        getClient().xAdd(key, "*", {
          playerId,
          event: JSON.stringify(validatedEvent),
          timestamp: String(Date.now()),
        }),
      "Log event"
    );

    console.log(
      `✅ Logged event for session ${sessionId}:`,
      validatedEvent.action
    );
  } catch (error) {
    console.error("❌ Failed to log event:", error);
    throw new Error(
      `Failed to log event: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function getAIResponse(
  sessionId: string,
  command: string
): Promise<string> {
  try {
    const historyKey = `game:${sessionId}:events`;
    const stateKey = `game:${sessionId}:state`;

    // Get game state and history with retry
    const [history, state] = await Promise.all([
      retryOperation(
        () => getClient().xRange(historyKey, "-", "+"),
        "Get game history"
      ),
      retryOperation(() => getClient().hGetAll(stateKey), "Get game state"),
    ]);

    // Build a more robust prompt
    const gameState = state || {};
    const storyHistory = history
      .map((entry: any) => {
        try {
          const eventData = JSON.parse(entry.message.event || "{}");
          return eventData.action || "Unknown action";
        } catch {
          return "Unknown action";
        }
      })
      .join("\n");

    const prompt = `You are a text-based RPG game master. 

Current game state: ${JSON.stringify(gameState, null, 2)}

Story so far:
${storyHistory || "This is the beginning of the adventure."}

A player issues the following command: "${command}"

Describe what happens next in a vivid, engaging way. Keep your response under 200 words.`;

    // Call OpenAI API with error handling
    if (!openai) {
      const fallbackResponse =
        "The AI is currently unavailable. Please try again later.";
      await getClient().publish(
        `game:${sessionId}:updates`,
        JSON.stringify({
          type: "narrative",
          narrative: fallbackResponse,
          timestamp: Date.now(),
          error: true,
        })
      );
      return fallbackResponse;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.8,
    });

    const narrative =
      response.choices[0].message.content?.trim() || "The world is silent.";

    // Publish the narrative with retry
    await retryOperation(
      () =>
        getClient().publish(
          `game:${sessionId}:updates`,
          JSON.stringify({
            type: "narrative",
            narrative,
            timestamp: Date.now(),
          })
        ),
      "Publish narrative"
    );

    console.log(`✅ Generated AI response for session ${sessionId}`);
    return narrative;
  } catch (error) {
    console.error("❌ Failed to get AI response:", error);

    // Provide more specific error messages
    let fallbackResponse =
      "The world seems to be experiencing some technical difficulties. Please try your command again.";

    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        fallbackResponse =
          "The AI is currently busy. Please wait a moment and try again.";
      } else if (error.message.includes("quota")) {
        fallbackResponse = "AI service quota exceeded. Please try again later.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        fallbackResponse =
          "Network connection issue. Please check your connection and try again.";
      }
    }

    try {
      // Still try to publish the fallback response
      await getClient().publish(
        `game:${sessionId}:updates`,
        JSON.stringify({
          type: "narrative",
          narrative: fallbackResponse,
          timestamp: Date.now(),
          error: true,
        })
      );
    } catch (publishError) {
      console.error("❌ Failed to publish fallback response:", publishError);
    }

    throw new Error(
      `Failed to get AI response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function setupSessionSubscriber(sessionId: string, io: any) {
  try {
    const channel = `game:${sessionId}:updates`;

    await getSubscriber().subscribe(channel, (message: string) => {
      try {
        const data = JSON.parse(message);
        io.to(sessionId).emit("game:update", data);
      } catch (error) {
        console.error("❌ Error parsing pub/sub message:", error);
        // Emit error to client
        io.to(sessionId).emit("game:error", {
          message: "Failed to process game update",
          timestamp: Date.now(),
        });
      }
    });

    console.log(`✅ Subscribed to channel: ${channel}`);
  } catch (error) {
    console.error("❌ Failed to setup session subscriber:", error);
    throw new Error(
      `Failed to setup session subscriber: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function getActiveSessions(): Promise<
  Array<{
    sessionId: string;
    playerCount: number;
    createdAt: number;
    lastActivity: number;
  }>
> {
  try {
    const client = getClient();

    // Get all game session keys
    const sessionKeys = await client.keys("game:*:state");
    const sessions = [];

    for (const key of sessionKeys) {
      const sessionId = key.split(":")[1];
      const state = await client.hGetAll(key);

      if (state.status === "active" || state.status === "initializing") {
        // Get player count from session
        const playerCount =
          (await client.sCard(`game:${sessionId}:players`)) || 0;
        const lastActivity = parseInt(state.last_activity || "0");

        sessions.push({
          sessionId,
          playerCount: parseInt(playerCount.toString()),
          createdAt: parseInt(state.created_at || "0"),
          lastActivity,
        });
      }
    }

    // Sort by last activity (most recent first)
    return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
  } catch (error) {
    console.error("❌ Failed to get active sessions:", error);
    return [];
  }
}

export async function getSessionDetails(sessionId: string): Promise<{
  sessionId: string;
  playerCount: number;
  createdAt: number;
  lastActivity: number;
  status: string;
} | null> {
  try {
    const client = getClient();
    const state = await client.hGetAll(`game:${sessionId}:state`);

    if (!state.status) {
      return null; // Session doesn't exist
    }

    const playerCount = (await client.sCard(`game:${sessionId}:players`)) || 0;

    return {
      sessionId,
      playerCount: parseInt(playerCount.toString()),
      createdAt: parseInt(state.created_at || "0"),
      lastActivity: parseInt(state.last_activity || "0"),
      status: state.status,
    };
  } catch (error) {
    console.error("❌ Failed to get session details:", error);
    return null;
  }
}

export async function joinSession(
  sessionId: string,
  playerId: string
): Promise<boolean> {
  try {
    const client = getClient();

    // Check if session exists and is active
    const state = await client.hGetAll(`game:${sessionId}:state`);
    if (!state.status || state.status === "ended") {
      return false;
    }

    // Add player to session
    await client.sAdd(`game:${sessionId}:players`, playerId);

    // Update last activity
    await client.hSet(
      `game:${sessionId}:state`,
      "last_activity",
      String(Date.now())
    );

    console.log(`✅ Player ${playerId} joined session ${sessionId}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to join session:", error);
    return false;
  }
}

export async function leaveSession(
  sessionId: string,
  playerId: string
): Promise<void> {
  try {
    const client = getClient();
    await client.sRem(`game:${sessionId}:players`, playerId);

    // Update last activity
    await client.hSet(
      `game:${sessionId}:state`,
      "last_activity",
      String(Date.now())
    );

    console.log(`✅ Player ${playerId} left session ${sessionId}`);
  } catch (error) {
    console.error("❌ Failed to leave session:", error);
  }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const client = getClient();
    
    // Check if session exists
    const state = await client.hGetAll(`game:${sessionId}:state`);
    if (!state.status) {
      return false; // Session doesn't exist
    }
    
    // Delete all session data
    await client.del(`game:${sessionId}:state`);
    await client.del(`game:${sessionId}:events`);
    await client.del(`game:${sessionId}:players`);
    
    // Also delete any pub/sub channels (they'll be cleaned up automatically)
    console.log(`✅ Session ${sessionId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("❌ Failed to delete session:", error);
    return false;
  }
}
