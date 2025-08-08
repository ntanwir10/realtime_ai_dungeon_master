"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
exports.createLoreEntry = createLoreEntry;
exports.searchLoreBySimilarity = searchLoreBySimilarity;
exports.getLoreByType = getLoreByType;
exports.updateLoreEntry = updateLoreEntry;
exports.deleteLoreEntry = deleteLoreEntry;
exports.initializeDefaultLore = initializeDefaultLore;
exports.getContextualLore = getContextualLore;
var redisClient_js_1 = require("./redisClient.js");
var openai_1 = require("openai");
// Initialize OpenAI for embeddings
var openai = null;
try {
    var apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
        openai = new openai_1.default({ apiKey: apiKey });
        console.log("✅ OpenAI initialized for lore embeddings");
    }
}
catch (error) {
    console.error("❌ Failed to initialize OpenAI for lore:", error);
}
// Generate embedding for text
function generateEmbedding(text) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!openai) {
                        throw new Error("OpenAI not initialized for embeddings");
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, openai.embeddings.create({
                            model: "text-embedding-3-small",
                            input: text,
                            encoding_format: "float",
                        })];
                case 2:
                    response = _a.sent();
                    return [2 /*return*/, response.data[0].embedding];
                case 3:
                    error_1 = _a.sent();
                    console.error("❌ Failed to generate embedding:", error_1);
                    throw new Error("Failed to generate embedding: ".concat(error_1 instanceof Error ? error_1.message : "Unknown error"));
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Create lore entry
function createLoreEntry(type_1, title_1, content_1) {
    return __awaiter(this, arguments, void 0, function (type, title, content, tags) {
        var client, embedding, id, lore, _i, tags_1, tag, error_2;
        if (tags === void 0) { tags = []; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, (0, redisClient_js_1.getClient)()];
                case 1:
                    client = _a.sent();
                    return [4 /*yield*/, generateEmbedding("".concat(title, ": ").concat(content))];
                case 2:
                    embedding = _a.sent();
                    id = "".concat(type, "_").concat(Date.now(), "_").concat(Math.random()
                        .toString(36)
                        .substr(2, 9));
                    lore = {
                        id: id,
                        type: type,
                        title: title,
                        content: content,
                        embedding: embedding,
                        tags: tags,
                        created_at: Date.now(),
                        updated_at: Date.now(),
                    };
                    // Store in Redis using JSON
                    return [4 /*yield*/, client.json.set("lore:".concat(id), "$", lore)];
                case 3:
                    // Store in Redis using JSON
                    _a.sent();
                    // Add to type index
                    return [4 /*yield*/, client.sAdd("lore:type:".concat(type), id)];
                case 4:
                    // Add to type index
                    _a.sent();
                    _i = 0, tags_1 = tags;
                    _a.label = 5;
                case 5:
                    if (!(_i < tags_1.length)) return [3 /*break*/, 8];
                    tag = tags_1[_i];
                    return [4 /*yield*/, client.sAdd("lore:tag:".concat(tag), id)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log("\u2705 Created lore entry: ".concat(id));
                    return [2 /*return*/, id];
                case 9:
                    error_2 = _a.sent();
                    console.error("❌ Failed to create lore entry:", error_2);
                    throw new Error("Failed to create lore entry: ".concat(error_2 instanceof Error ? error_2.message : "Unknown error"));
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        return 0;
    }
    var dotProduct = 0;
    var normA = 0;
    var normB = 0;
    for (var i = 0; i < vecA.length; i++) {
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
function searchLoreBySimilarity(query_1) {
    return __awaiter(this, arguments, void 0, function (query, limit, type) {
        var client, queryEmbedding, loreIds, allKeys, loreWithSimilarity, _i, loreIds_1, id, loreData, lore, similarity, error_3, sortedLore, error_4;
        if (limit === void 0) { limit = 5; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 13, , 14]);
                    return [4 /*yield*/, (0, redisClient_js_1.getClient)()];
                case 1:
                    client = _a.sent();
                    return [4 /*yield*/, generateEmbedding(query)];
                case 2:
                    queryEmbedding = _a.sent();
                    loreIds = [];
                    if (!type) return [3 /*break*/, 4];
                    return [4 /*yield*/, client.sMembers("lore:type:".concat(type))];
                case 3:
                    loreIds = _a.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, client.keys("lore:*")];
                case 5:
                    allKeys = _a.sent();
                    loreIds = allKeys
                        .filter(function (key) {
                        return key.startsWith("lore:") &&
                            !key.includes(":type:") &&
                            !key.includes(":tag:");
                    })
                        .map(function (key) { return key.replace("lore:", ""); });
                    _a.label = 6;
                case 6:
                    loreWithSimilarity = [];
                    _i = 0, loreIds_1 = loreIds;
                    _a.label = 7;
                case 7:
                    if (!(_i < loreIds_1.length)) return [3 /*break*/, 12];
                    id = loreIds_1[_i];
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, client.json.get("lore:".concat(id))];
                case 9:
                    loreData = _a.sent();
                    if (loreData) {
                        lore = loreData;
                        similarity = cosineSimilarity(queryEmbedding, lore.embedding);
                        loreWithSimilarity.push({ lore: lore, similarity: similarity });
                    }
                    return [3 /*break*/, 11];
                case 10:
                    error_3 = _a.sent();
                    console.warn("\u26A0\uFE0F Failed to get lore entry ".concat(id, ":"), error_3);
                    return [3 /*break*/, 11];
                case 11:
                    _i++;
                    return [3 /*break*/, 7];
                case 12:
                    sortedLore = loreWithSimilarity
                        .sort(function (a, b) { return b.similarity - a.similarity; })
                        .slice(0, limit)
                        .map(function (item) { return item.lore; });
                    console.log("\u2705 Found ".concat(sortedLore.length, " relevant lore entries"));
                    return [2 /*return*/, sortedLore];
                case 13:
                    error_4 = _a.sent();
                    console.error("❌ Failed to search lore:", error_4);
                    return [2 /*return*/, []];
                case 14: return [2 /*return*/];
            }
        });
    });
}
// Get lore by type
function getLoreByType(type) {
    return __awaiter(this, void 0, void 0, function () {
        var client, loreIds, loreEntries, _i, loreIds_2, id, loreData, error_5, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, (0, redisClient_js_1.getClient)()];
                case 1:
                    client = _a.sent();
                    return [4 /*yield*/, client.sMembers("lore:type:".concat(type))];
                case 2:
                    loreIds = _a.sent();
                    loreEntries = [];
                    _i = 0, loreIds_2 = loreIds;
                    _a.label = 3;
                case 3:
                    if (!(_i < loreIds_2.length)) return [3 /*break*/, 8];
                    id = loreIds_2[_i];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, client.json.get("lore:".concat(id))];
                case 5:
                    loreData = _a.sent();
                    if (loreData) {
                        loreEntries.push(loreData);
                    }
                    return [3 /*break*/, 7];
                case 6:
                    error_5 = _a.sent();
                    console.warn("\u26A0\uFE0F Failed to get lore entry ".concat(id, ":"), error_5);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8: return [2 /*return*/, loreEntries];
                case 9:
                    error_6 = _a.sent();
                    console.error("❌ Failed to get lore by type:", error_6);
                    return [2 /*return*/, []];
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Update lore entry
function updateLoreEntry(id, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var client, loreData, lore, _a, error_7;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, (0, redisClient_js_1.getClient)()];
                case 1:
                    client = _b.sent();
                    return [4 /*yield*/, client.json.get("lore:".concat(id))];
                case 2:
                    loreData = _b.sent();
                    if (!loreData) {
                        return [2 /*return*/, false];
                    }
                    lore = loreData;
                    // Update fields
                    if (updates.title)
                        lore.title = updates.title;
                    if (updates.content)
                        lore.content = updates.content;
                    if (updates.tags)
                        lore.tags = updates.tags;
                    if (!updates.content) return [3 /*break*/, 4];
                    _a = lore;
                    return [4 /*yield*/, generateEmbedding("".concat(lore.title, ": ").concat(lore.content))];
                case 3:
                    _a.embedding = _b.sent();
                    _b.label = 4;
                case 4:
                    lore.updated_at = Date.now();
                    // Update in Redis
                    return [4 /*yield*/, client.json.set("lore:".concat(id), "$", lore)];
                case 5:
                    // Update in Redis
                    _b.sent();
                    console.log("\u2705 Updated lore entry: ".concat(id));
                    return [2 /*return*/, true];
                case 6:
                    error_7 = _b.sent();
                    console.error("❌ Failed to update lore entry:", error_7);
                    return [2 /*return*/, false];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Delete lore entry
function deleteLoreEntry(id) {
    return __awaiter(this, void 0, void 0, function () {
        var client, loreData, lore, _i, _a, tag, error_8;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, (0, redisClient_js_1.getClient)()];
                case 1:
                    client = _b.sent();
                    return [4 /*yield*/, client.json.get("lore:".concat(id))];
                case 2:
                    loreData = _b.sent();
                    if (!loreData) return [3 /*break*/, 7];
                    lore = loreData;
                    // Remove from type index
                    return [4 /*yield*/, client.sRem("lore:type:".concat(lore.type), id)];
                case 3:
                    // Remove from type index
                    _b.sent();
                    _i = 0, _a = lore.tags;
                    _b.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    tag = _a[_i];
                    return [4 /*yield*/, client.sRem("lore:tag:".concat(tag), id)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7: 
                // Delete the lore entry
                return [4 /*yield*/, client.del("lore:".concat(id))];
                case 8:
                    // Delete the lore entry
                    _b.sent();
                    console.log("\u2705 Deleted lore entry: ".concat(id));
                    return [2 /*return*/, true];
                case 9:
                    error_8 = _b.sent();
                    console.error("❌ Failed to delete lore entry:", error_8);
                    return [2 /*return*/, false];
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Initialize default lore
function initializeDefaultLore() {
    return __awaiter(this, void 0, void 0, function () {
        var client, existingKeys, loreKeys, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 12, , 13]);
                    return [4 /*yield*/, (0, redisClient_js_1.getClient)()];
                case 1:
                    client = _a.sent();
                    return [4 /*yield*/, client.keys("lore:*")];
                case 2:
                    existingKeys = _a.sent();
                    loreKeys = existingKeys.filter(function (key) {
                        return key.startsWith("lore:") &&
                            !key.includes(":type:") &&
                            !key.includes(":tag:");
                    });
                    if (loreKeys.length > 0) {
                        console.log("✅ Lore already initialized, skipping...");
                        return [2 /*return*/];
                    }
                    console.log("🔄 Initializing default lore...");
                    // World Rules
                    return [4 /*yield*/, createLoreEntry("world_rule", "Magic System", "Magic in this world is based on elemental forces. There are four primary elements: Fire, Water, Earth, and Air. Magic users can combine these elements to create powerful spells. Magic requires concentration and can be exhausting to use.", ["magic", "elements", "spells", "concentration"])];
                case 3:
                    // World Rules
                    _a.sent();
                    return [4 /*yield*/, createLoreEntry("world_rule", "Combat System", "Combat is turn-based and tactical. Characters have health points (HP) and can use various weapons and armor. Critical hits deal double damage, and armor reduces incoming damage. Special abilities can be used once per combat encounter.", ["combat", "health", "weapons", "armor", "critical"])];
                case 4:
                    _a.sent();
                    // Characters
                    return [4 /*yield*/, createLoreEntry("character", "Eldric the Wise", "An ancient wizard who lives in a tower on the outskirts of the village. He is known for his wisdom and knowledge of ancient magic. He often helps travelers with advice and occasionally teaches magic to worthy students. He has a long white beard and always carries a staff with a glowing crystal.", ["wizard", "wise", "magic", "tower", "ancient"])];
                case 5:
                    // Characters
                    _a.sent();
                    return [4 /*yield*/, createLoreEntry("character", "Captain Thorne", "The captain of the village guard. A stern but fair leader who protects the village from bandits and monsters. He is skilled with a sword and shield, and his men respect him greatly. He has a scar across his left cheek from an old battle.", ["guard", "captain", "sword", "shield", "leader", "stern"])];
                case 6:
                    _a.sent();
                    // Locations
                    return [4 /*yield*/, createLoreEntry("location", "The Rusty Anchor Tavern", "A cozy tavern in the center of the village. The walls are decorated with fishing nets and old maps. The tavern serves the best ale in the region and is a popular gathering place for locals and travelers. The owner, Greta, is friendly and always has a story to tell.", ["tavern", "ale", "village", "gathering", "friendly"])];
                case 7:
                    // Locations
                    _a.sent();
                    return [4 /*yield*/, createLoreEntry("location", "The Dark Forest", "A mysterious forest that surrounds the village. The trees are tall and ancient, and the canopy blocks most sunlight. Strange sounds can be heard at night, and locals say the forest is home to magical creatures. Few dare to venture deep into its depths.", ["forest", "dark", "mysterious", "magical", "dangerous"])];
                case 8:
                    _a.sent();
                    // Items
                    return [4 /*yield*/, createLoreEntry("item", "Healing Potion", "A red liquid that glows faintly. When consumed, it restores health and can cure minor wounds. Made from rare herbs found in the Dark Forest. Each potion can heal 10-20 health points depending on the quality.", ["potion", "healing", "health", "herbs", "red"])];
                case 9:
                    // Items
                    _a.sent();
                    return [4 /*yield*/, createLoreEntry("item", "Magic Scroll", "An ancient parchment inscribed with magical runes. When read aloud, it can cast a spell once before the runes fade. The scrolls are rare and valuable, often found in ancient ruins or sold by traveling merchants.", ["scroll", "magic", "runes", "spell", "ancient", "rare"])];
                case 10:
                    _a.sent();
                    // Quests
                    return [4 /*yield*/, createLoreEntry("quest", "The Missing Merchant", "A traveling merchant named Marcus has gone missing while traveling through the Dark Forest. His family is offering a reward for anyone who can find him or discover what happened to him. The quest involves investigating the forest and following clues.", ["quest", "missing", "merchant", "forest", "investigation", "reward"])];
                case 11:
                    // Quests
                    _a.sent();
                    console.log("✅ Default lore initialized successfully");
                    return [3 /*break*/, 13];
                case 12:
                    error_9 = _a.sent();
                    console.error("❌ Failed to initialize default lore:", error_9);
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    });
}
// Get contextual lore for AI prompts
function getContextualLore(command_1, gameHistory_1) {
    return __awaiter(this, arguments, void 0, function (command, gameHistory, limit) {
        var context, relevantLore, loreContext, error_10;
        if (limit === void 0) { limit = 3; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    context = "".concat(command, " ").concat(gameHistory.slice(-3).join(" "));
                    return [4 /*yield*/, searchLoreBySimilarity(context, limit)];
                case 1:
                    relevantLore = _a.sent();
                    if (relevantLore.length === 0) {
                        return [2 /*return*/, ""];
                    }
                    loreContext = relevantLore
                        .map(function (lore) { return "".concat(lore.type.toUpperCase(), ": ").concat(lore.title, "\n").concat(lore.content); })
                        .join("\n\n");
                    return [2 /*return*/, "\n\nRELEVANT WORLD KNOWLEDGE:\n".concat(loreContext, "\n\n")];
                case 2:
                    error_10 = _a.sent();
                    console.error("❌ Failed to get contextual lore:", error_10);
                    return [2 /*return*/, ""];
                case 3: return [2 /*return*/];
            }
        });
    });
}
