import { client, connection } from "../src/redisClient.js";

async function testPhase1() {
  console.log("--- Starting Phase 1 Verification ---");

  try {
    await connection;
    console.log("✓ Redis connection established");

    // Test basic Redis operations
    const testKey = "test:phase1:key";
    const testValue = "test_value";

    console.log("\nStep 1: Testing basic Redis operations...");
    await client.set(testKey, testValue);
    const retrievedValue = await client.get(testKey);
    console.log(`✓ Set and retrieved value: ${retrievedValue}`);

    // Test Hash operations (like game state)
    console.log("\nStep 2: Testing Hash operations...");
    const stateKey = "test:game:state";
    await client.hSet(stateKey, {
      status: "initializing",
      created_at: String(Date.now()),
    });
    const state = await client.hGetAll(stateKey);
    console.log(`✓ Created and retrieved game state:`, state);

    // Test Stream operations (like events)
    console.log("\nStep 3: Testing Stream operations...");
    const eventsKey = "test:game:events";
    await client.xAdd(eventsKey, "*", {
      playerId: "player1",
      event: JSON.stringify({ action: "enter", location: "tavern" }),
      timestamp: String(Date.now()),
    });
    const events = await client.xRange(eventsKey, "-", "+");
    console.log(`✓ Created and retrieved events stream:`, events);

    // Clean up test data
    console.log("\nStep 4: Cleaning up test data...");
    await client.del(testKey);
    await client.del(stateKey);
    await client.del(eventsKey);
    console.log("✓ Test data cleaned up");
  } catch (error) {
    console.error("\nVerification script failed:", error);
  } finally {
    await client.quit();
    console.log("\n--- Phase 1 Verification Complete ---");
  }
}

testPhase1();
