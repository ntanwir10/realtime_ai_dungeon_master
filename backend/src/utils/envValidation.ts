export function validateEnvironment(): void {
  const requiredEnvVars = ["REDIS_URL", "OPENAI_API_KEY", "PORT"];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}. ` +
        "Please check your .env file and ensure all required variables are set."
    );
  }

  // Validate OpenAI API key format
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && !openaiKey.startsWith("sk-")) {
    console.warn(
      'Warning: OPENAI_API_KEY does not appear to be in the correct format (should start with "sk-")'
    );
  }

  // Validate Redis URL format
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && !redisUrl.startsWith("redis://")) {
    throw new Error(
      'REDIS_URL must be a valid Redis URL starting with "redis://"'
    );
  }

  // Validate PORT is a number
  const port = process.env.PORT;
  if (port && isNaN(Number(port))) {
    throw new Error("PORT must be a valid number");
  }

  console.log("✅ Environment validation passed");
}
