# 💣 AnonChat — Self-Destructing Anonymous Chat

> Secure, ephemeral chat rooms that vanish without a trace. No accounts. No history. No logs.

---

## What is this?

AnonChat lets you create temporary, anonymous chat rooms that **automatically self-destruct** after a set time — taking all messages with them. Perfect for sensitive conversations, one-time sharing, or just vibing with a stranger.

Two modes:
- **Create a Room** — share the link with someone you know
- **Random Chat** — get matched with a stranger via a matchmaking queue

---

## Features

- 🕵️ **Fully Anonymous** — random usernames, no sign-up required
- 💣 **Self-Destructing Rooms** — rooms auto-delete after TTL expires
- ⚡ **Real-time Messaging** — instant messages via WebSocket/SSE (no refresh needed)
- 🎲 **Random Matchmaking** — join a queue and get paired with a stranger
- 🔗 **Shareable Room Links** — one-click copy to clipboard
- 🚨 **Manual Destroy** — nuke the room instantly at any time
- ⏱️ **Live Countdown Timer** — see exactly when the room self-destructs

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React, TailwindCSS |
| **Backend** | Elysia.js (Bun runtime) |
| **Database** | Redis (Upstash) |
| **Realtime** | Realtime channels (SSE/WebSocket) |
| **API Client** | Eden Treaty (type-safe Elysia client) |
| **State** | TanStack Query (React Query) |

---

## How It Works

### Room Lifecycle

```
User creates room
      │
      ▼
Redis stores room metadata + messages
(with TTL countdown)
      │
      ├──► Users chat in real-time
      │
      ├──► TTL hits 0 → room auto-deleted → all users redirected
      │
      └──► Manual destroy → room nuked instantly → all users redirected
```

### Random Matchmaking

```
User A clicks "Random Chat"
      │
      ▼
POST /api/random/queue
No one waiting → create room R1, store in Redis queue
      │
      ▼
Poll /api/random/status?roomId=R1 every 2s
      │
User B clicks "Random Chat"
      │
      ▼
POST /api/random/queue
Finds User A waiting → delete queue, return roomId R1
User B → navigates to /room/R1 ✅
      │
      ▼
User A's poll → queue gone, room exists → "matched"
User A → navigates to /room/R1 ✅
```

---

## Project Structure

```
├── app/
│   ├── page.tsx                  # Lobby (create room / random chat)
│   └── room/
│       └── [roomId]/
│           └── page.tsx          # Chat room page
│
├── app/api/[[...route]]/
│   └── route.ts                  # All backend routes (Elysia)
│       ├── POST /room/create     # Create a new room
│       ├── GET  /room/ttl        # Get remaining TTL
│       ├── DELETE /room          # Destroy a room
│       ├── POST /message         # Send a message
│       ├── GET  /message         # Get all messages
│       ├── POST /random/queue    # Join matchmaking queue
│       ├── GET  /random/status   # Poll for match status
│       └── POST /random/cancel   # Leave the queue
│
├── hooks/
│   └── useUsername.ts            # Auto-generates random anonymous username
│
├── lib/
│   ├── client.ts                 # Eden Treaty type-safe API client
│   ├── redis.ts                  # Upstash Redis client
│   └── realtime-client.ts        # Realtime subscription hook
│
└── components/
    └── RandomChatButton.tsx      # Matchmaking UI component
```

---

## API Reference

### Rooms

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/room/create` | Create a new room, returns `roomId` |
| `GET` | `/api/room/ttl?roomId=` | Get remaining TTL in seconds |
| `DELETE` | `/api/room?roomId=` | Destroy room + all messages |

### Messages

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/message?roomId=` | Send a message |
| `GET` | `/api/message?roomId=` | Fetch all messages in room |

### Random Matchmaking

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/random/queue` | Join queue or get matched |
| `GET` | `/api/random/status?roomId=` | Poll for match (`waiting` / `matched` / `expired`) |
| `POST` | `/api/random/cancel` | Leave queue + cleanup |

---

## Redis Data Model

```
meta:{roomId}        → Hash   → { connected, createdAt, isRandom? }  TTL: 10min (5min random)
messages:{roomId}    → List   → [ Message, Message, ... ]             TTL: same as meta
random:queue         → String → { username, roomId }                  TTL: 30s (stale prevention)
```

---

## Room TTLs

| Room Type | TTL |
|---|---|
| Regular room | 10 minutes |
| Random chat room | 5 minutes |
| Matchmaking queue entry | 30 seconds |

The 30s queue TTL ensures stale waiters (e.g. user closed the tab) don't block others from matching.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- Upstash Redis instance

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/anonchat
cd anonchat

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
REALTIME_TOKEN=your_realtime_token
```

### Run Locally

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Key Design Decisions

**Why Redis for everything?**
Messages, room metadata, and the matchmaking queue all live in Redis. TTL support is native, so self-destruction is automatic — no cron jobs, no cleanup workers needed.

**Why polling for matchmaking instead of WebSockets?**
Matchmaking is a one-time event (you only need to know once). Polling every 2s is cheap, works with the existing stack, and avoids adding a persistent connection just for matching.

**Why Elysia + Eden Treaty?**
End-to-end type safety from backend route definition to frontend API calls — no manual typing of request/response shapes.

**Stale queue prevention**
The queue entry in Redis has a 30s TTL. If User A closes the tab while waiting, the queue auto-expires, and the next person who clicks "Random Chat" starts fresh instead of joining a ghost room.

---

## License

MIT
