# This is a submission for the [Redis AI Challenge](https://dev.to/challenges/redis-2025-07-23): Real-Time AI Innovators

## What I Built

Real-Time AI Dungeon Master is a multiplayer, AI-driven storytelling game that uses Redis as its real-time data layer to synchronize sessions, broadcast narrative updates, and persist game history.

- **AI Dungeon Master**: Narrative powered by OpenAI GPT with contextual prompts
- **Multiplayer in real time**: Players join a shared session and collaborate via WebSocket (Socket.IO)
- **Redis-first architecture**:
  - Sessions: `HSET game:{sessionId}:state` (status, created_at, last_activity)
  - Event log: `XADD game:{sessionId}:events` (immutable history and replay)
  - Active players: `SADD game:{sessionId}:players`
  - Broadcasts: `PUBLISH game:{sessionId}:updates` → Socket.IO `game:update`
  - Semantic lore: `JSON.SET lore:{id}` (embeddings + metadata)
- **Production-friendly**: Rate limiting, error handling, environment validation, health checks, graceful shutdown
- **Full stack**: Node.js/TypeScript backend, React + Tailwind frontend, Dockerized with nginx proxy

Repository: [github.com/ntanwir10/realtime_ai_dungeon_master](https://github.com/ntanwir10/realtime_ai_dungeon_master)

## Demo

If this isn’t live at the moment, you can run it locally in minutes.

Quick start with Docker:

```bash
git clone https://github.com/ntanwir10/realtime_ai_dungeon_master
cd realtime_ai_dungeon_master
cp backend/.env.example backend/.env   # add your OpenAI API key
docker-compose up --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

Manual development setup:

```bash
# Redis JSON
docker run -d -p 6379:6379 redislabs/rejson:latest

# Backend
cd backend && npm install && npm run dev

# Frontend
cd ../frontend && npm install && npm run dev
```

Suggested screenshots to include:

- Landing/Session browser
- In-session story log with streaming updates
- Command input and AI response
- Redis CLI views (keys, streams, sets) from the README

## How I Used Redis 8

This project treats Redis as the system-of-record and realtime backbone. It uses Redis 8–compatible primitives plus RedisJSON for AI-centric data.

- **Real-time event streaming (Streams)**
  - `XADD game:{sessionId}:events` captures every player action as an immutable event
  - `XRANGE` builds AI context and enables replay/debugging

- **Low-latency state access (Hashes)**
  - `HSET game:{sessionId}:state` stores session status and timestamps for fast reads (`HGETALL`, `HGET`)

- **Presence and discovery (Sets + Keys)**
  - `SADD game:{sessionId}:players` tracks active players; `SCARD` for presence count
  - `KEYS game:*:state` supports session discovery for the session browser

- **Broadcast updates (Pub/Sub)**
  - Backend publishes narrative updates to `game:{sessionId}:updates`
  - A Redis subscriber relays messages to Socket.IO `game:update` for all connected clients

- **Semantic lore with JSON and embeddings (RedisJSON)**
  - Lore entries are stored as JSON: `lore:{id}` with `{ id, type, title, content, embedding, tags, created_at, updated_at }`
  - Embeddings are generated with OpenAI and stored directly in Redis JSON
  - Semantic similarity is computed in the app layer via cosine similarity, enabling contextual prompts
  - Type and tag indexing via Sets: `lore:type:{type}`, `lore:tag:{tag}`
  - Future enhancement: swap app-layer similarity for Redis Stack vector indexes for server-side vector search

Why Redis 8 for AI apps:

- **Streams + Pub/Sub** deliver real-time narrative fan-out with minimal latency
- **Hashes/Sets** keep presence and session state O(1)
- **RedisJSON** stores rich, evolving AI knowledge artifacts (lore) adjacent to fast operational data
- The combination forms a semantic cache that reduces LLM prompt size and calls by grounding responses in structured, retrievable context

Team: Solo project. Cover image optional.

Thanks for reading! If you try it, I’d love feedback. Repo: [github.com/ntanwir10/realtime_ai_dungeon_master](https://github.com/ntanwir10/realtime_ai_dungeon_master)

---

By submitting this entry, you agree to receive communications from Redis regarding products, services, events, and special offers. You can unsubscribe at any time. Your information will be handled in accordance with [Redis's Privacy Policy](https://redis.io/legal/privacy-policy/).
