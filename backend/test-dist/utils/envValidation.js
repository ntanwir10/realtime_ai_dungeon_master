"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
function validateEnvironment() {
    var requiredEnvVars = ["REDIS_URL", "OPENAI_API_KEY", "PORT"];
    var missingVars = requiredEnvVars.filter(function (varName) { return !process.env[varName]; });
    if (missingVars.length > 0) {
        throw new Error("Missing required environment variables: ".concat(missingVars.join(", "), ". ") +
            "Please check your .env file and ensure all required variables are set.");
    }
    // Validate OpenAI API key format
    var openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && !openaiKey.startsWith("sk-")) {
        console.warn('Warning: OPENAI_API_KEY does not appear to be in the correct format (should start with "sk-")');
    }
    // Validate Redis URL format
    var redisUrl = process.env.REDIS_URL;
    if (redisUrl && !redisUrl.startsWith("redis://")) {
        throw new Error('REDIS_URL must be a valid Redis URL starting with "redis://"');
    }
    // Validate PORT is a number
    var port = process.env.PORT;
    if (port && isNaN(Number(port))) {
        throw new Error("PORT must be a valid number");
    }
    console.log("✅ Environment validation passed");
}
