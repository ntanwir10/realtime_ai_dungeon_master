import { getClient } from "./redisClient.js";
import OpenAI from "openai";

// Initialize OpenAI for embeddings
let openai: OpenAI | null = null;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    openai = new OpenAI({ apiKey });
    console.log("✅ OpenAI initialized for lore embeddings");
  }
} catch (error) {
  console.error("❌ Failed to initialize OpenAI for lore:", error);
}

// Lore interface
export interface Lore {
  id: string;
  type: string; // 'character', 'location', 'item', 'world_rule', 'quest'
  title: string;
  content: string;
  embedding: number[];
  tags: string[];
  created_at: number;
  updated_at: number;
}

// Generate embedding for text
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error("OpenAI not initialized for embeddings");
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("❌ Failed to generate embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Create lore entry
export async function createLoreEntry(
  type: string,
  title: string,
  content: string,
  tags: string[] = []
): Promise<string> {
  try {
    const client = await getClient();
    const embedding = await generateEmbedding(`${title}: ${content}`);
    const id = `${type}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const lore: Lore = {
      id,
      type,
      title,
      content,
      embedding,
      tags,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Store in Redis using JSON
    await client.json.set(`lore:${id}`, "$", lore as any);

    // Add to type index
    await client.sAdd(`lore:type:${type}`, id);

    // Add to tags index
    for (const tag of tags) {
      await client.sAdd(`lore:tag:${tag}`, id);
    }

    console.log(`✅ Created lore entry: ${id}`);
    return id;
  } catch (error) {
    console.error("❌ Failed to create lore entry:", error);
    throw new Error(
      `Failed to create lore entry: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Search lore by similarity using cosine similarity
export async function searchLoreBySimilarity(
  query: string,
  limit: number = 5,
  type?: string
): Promise<Lore[]> {
  try {
    const client = await getClient();
    const queryEmbedding = await generateEmbedding(query);

    // Get lore IDs based on type filter
    let loreIds: string[] = [];

    if (type) {
      loreIds = await client.sMembers(`lore:type:${type}`);
    } else {
      // Get all lore IDs (this is a simplified approach)
      const allKeys = await client.keys("lore:*");
      loreIds = allKeys
        .filter(
          (key) =>
            key.startsWith("lore:") &&
            !key.includes(":type:") &&
            !key.includes(":tag:")
        )
        .map((key) => key.replace("lore:", ""));
    }

    // Get all lore entries and calculate similarity
    const loreWithSimilarity: { lore: Lore; similarity: number }[] = [];

    for (const id of loreIds) {
      try {
        const loreData = await client.json.get(`lore:${id}`);
        if (loreData) {
          const lore = loreData as unknown as Lore;
          const similarity = cosineSimilarity(queryEmbedding, lore.embedding);
          loreWithSimilarity.push({ lore, similarity });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get lore entry ${id}:`, error);
      }
    }

    // Sort by similarity and return top results
    const sortedLore = loreWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((item) => item.lore);

    console.log(`✅ Found ${sortedLore.length} relevant lore entries`);
    return sortedLore;
  } catch (error) {
    console.error("❌ Failed to search lore:", error);
    return [];
  }
}

// Get lore by type
export async function getLoreByType(type: string): Promise<Lore[]> {
  try {
    const client = await getClient();
    const loreIds = await client.sMembers(`lore:type:${type}`);
    const loreEntries: Lore[] = [];

    for (const id of loreIds) {
      try {
        const loreData = await client.json.get(`lore:${id}`);
        if (loreData) {
          loreEntries.push(loreData as unknown as Lore);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get lore entry ${id}:`, error);
      }
    }

    return loreEntries;
  } catch (error) {
    console.error("❌ Failed to get lore by type:", error);
    return [];
  }
}

// Update lore entry
export async function updateLoreEntry(
  id: string,
  updates: Partial<{ title: string; content: string; tags: string[] }>
): Promise<boolean> {
  try {
    const client = await getClient();
    const loreData = await client.json.get(`lore:${id}`);

    if (!loreData) {
      return false;
    }

    const lore = loreData as unknown as Lore;

    // Update fields
    if (updates.title) lore.title = updates.title;
    if (updates.content) lore.content = updates.content;
    if (updates.tags) lore.tags = updates.tags;

    // Regenerate embedding if content changed
    if (updates.content) {
      lore.embedding = await generateEmbedding(
        `${lore.title}: ${lore.content}`
      );
    }

    lore.updated_at = Date.now();

    // Update in Redis
    await client.json.set(`lore:${id}`, "$", lore as any);

    console.log(`✅ Updated lore entry: ${id}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to update lore entry:", error);
    return false;
  }
}

// Delete lore entry
export async function deleteLoreEntry(id: string): Promise<boolean> {
  try {
    const client = await getClient();

    // Get lore data to remove from indexes
    const loreData = await client.json.get(`lore:${id}`);
    if (loreData) {
      const lore = loreData as unknown as Lore;

      // Remove from type index
      await client.sRem(`lore:type:${lore.type}`, id);

      // Remove from tag indexes
      for (const tag of lore.tags) {
        await client.sRem(`lore:tag:${tag}`, id);
      }
    }

    // Delete the lore entry
    await client.del(`lore:${id}`);

    console.log(`✅ Deleted lore entry: ${id}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to delete lore entry:", error);
    return false;
  }
}

// Initialize default lore
export async function initializeDefaultLore(): Promise<void> {
  try {
    const client = await getClient();

    // Check if lore already exists
    const existingKeys = await client.keys("lore:*");
    const loreKeys = existingKeys.filter(
      (key) =>
        key.startsWith("lore:") &&
        !key.includes(":type:") &&
        !key.includes(":tag:")
    );

    if (loreKeys.length > 0) {
      console.log("✅ Lore already initialized, skipping...");
      return;
    }

    console.log("🔄 Initializing default lore...");

    // World Rules
    await createLoreEntry(
      "world_rule",
      "Magic System",
      "Magic in this world is based on elemental forces. There are four primary elements: Fire, Water, Earth, and Air. Magic users can combine these elements to create powerful spells. Magic requires concentration and can be exhausting to use.",
      ["magic", "elements", "spells", "concentration"]
    );

    await createLoreEntry(
      "world_rule",
      "Combat System",
      "Combat is turn-based and tactical. Characters have health points (HP) and can use various weapons and armor. Critical hits deal double damage, and armor reduces incoming damage. Special abilities can be used once per combat encounter.",
      ["combat", "health", "weapons", "armor", "critical"]
    );

    // Characters
    await createLoreEntry(
      "character",
      "Eldric the Wise",
      "An ancient wizard who lives in a tower on the outskirts of the village. He is known for his wisdom and knowledge of ancient magic. He often helps travelers with advice and occasionally teaches magic to worthy students. He has a long white beard and always carries a staff with a glowing crystal.",
      ["wizard", "wise", "magic", "tower", "ancient"]
    );

    await createLoreEntry(
      "character",
      "Captain Thorne",
      "The captain of the village guard. A stern but fair leader who protects the village from bandits and monsters. He is skilled with a sword and shield, and his men respect him greatly. He has a scar across his left cheek from an old battle.",
      ["guard", "captain", "sword", "shield", "leader", "stern"]
    );

    // Locations
    await createLoreEntry(
      "location",
      "The Rusty Anchor Tavern",
      "A cozy tavern in the center of the village. The walls are decorated with fishing nets and old maps. The tavern serves the best ale in the region and is a popular gathering place for locals and travelers. The owner, Greta, is friendly and always has a story to tell.",
      ["tavern", "ale", "village", "gathering", "friendly"]
    );

    await createLoreEntry(
      "location",
      "The Dark Forest",
      "A mysterious forest that surrounds the village. The trees are tall and ancient, and the canopy blocks most sunlight. Strange sounds can be heard at night, and locals say the forest is home to magical creatures. Few dare to venture deep into its depths.",
      ["forest", "dark", "mysterious", "magical", "dangerous"]
    );

    // Items
    await createLoreEntry(
      "item",
      "Healing Potion",
      "A red liquid that glows faintly. When consumed, it restores health and can cure minor wounds. Made from rare herbs found in the Dark Forest. Each potion can heal 10-20 health points depending on the quality.",
      ["potion", "healing", "health", "herbs", "red"]
    );

    await createLoreEntry(
      "item",
      "Magic Scroll",
      "An ancient parchment inscribed with magical runes. When read aloud, it can cast a spell once before the runes fade. The scrolls are rare and valuable, often found in ancient ruins or sold by traveling merchants.",
      ["scroll", "magic", "runes", "spell", "ancient", "rare"]
    );

    // Quests
    await createLoreEntry(
      "quest",
      "The Missing Merchant",
      "A traveling merchant named Marcus has gone missing while traveling through the Dark Forest. His family is offering a reward for anyone who can find him or discover what happened to him. The quest involves investigating the forest and following clues.",
      ["quest", "missing", "merchant", "forest", "investigation", "reward"]
    );

    console.log("✅ Default lore initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize default lore:", error);
  }
}

// Get contextual lore for AI prompts
export async function getContextualLore(
  command: string,
  gameHistory: string[],
  limit: number = 3
): Promise<string> {
  try {
    // Create a context string from command and recent history
    const context = `${command} ${gameHistory.slice(-3).join(" ")}`;

    // Search for relevant lore
    const relevantLore = await searchLoreBySimilarity(context, limit);

    if (relevantLore.length === 0) {
      return "";
    }

    // Format lore for AI prompt
    const loreContext = relevantLore
      .map(
        (lore) => `${lore.type.toUpperCase()}: ${lore.title}\n${lore.content}`
      )
      .join("\n\n");

    return `\n\nRELEVANT WORLD KNOWLEDGE:\n${loreContext}\n\n`;
  } catch (error) {
    console.error("❌ Failed to get contextual lore:", error);
    return "";
  }
}
