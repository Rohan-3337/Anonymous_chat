import { redis } from '@/lib/redis';
import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { authMiddleware } from './auth';
import z from 'zod' ;
import { Message, realtime } from '@/lib/realtime';

const ROOM_TTL_SECONDS = 60 * 10;

const room  = new Elysia({prefix: '/room'})
    .post('/create',async()=>{
        const roomId = nanoid();
        await redis.hset(`meta:${roomId}`, {
            connected:[],
            createdAt: Date.now(),
        })
        await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);
        return {
            roomId
        }
    })
.use(authMiddleware)
.get("/ttl",async({auth})=>{
    const ttl = await redis.ttl(`meta:${auth.roomId}`);
    return {
        ttl: ttl > 0 ? ttl : 0
    }

},{
    query:z.object({
        roomId:z.string()
    })
})
  .delete(
    "/",
    async ({ auth }) => {
      await realtime.channel(auth.roomId).emit("chat.destroy.isDestroyed", true)

      await Promise.all([
        redis.del(auth.roomId),
        redis.del(`meta:${auth.roomId}`),
        redis.del(`messages:${auth.roomId}`),
      ])
    },
    { query: z.object({ roomId: z.string() }) }
  )


const message = new Elysia({prefix: '/message'})
.use(authMiddleware)
.post("/",
    async ({ auth, body }) => {
        const {sender,text} = body;
        const { roomId } = auth;
        const roomExists = await redis.exists(`meta:${roomId}`);
        if (!roomExists) {
            return new Error("Room does not exist");
        }
        const message:Message = {
            id:nanoid(),
            sender,
            text,
            timestamp: Date.now(),
            roomId,

        }
        await redis.rpush(`messages:${roomId}`, {...message,token:auth.token});
        await realtime.channel(roomId).emit("chat.message", message);
        const remaining = await redis.ttl(`meta:${roomId}`);
        await redis.expire(`meta:${roomId}`, remaining);
        await redis.expire(`messages:${roomId}`, remaining);
        await redis.expire(roomId, remaining);


    }
    ,{
        query:z.object({
            roomId:z.string()
        }),
        body:z.object({
            sender:z.string(),
            text:z.string()
        })
    }
)
.get("/",async({auth})=>{
    const messages = await redis.lrange<Message>(`messages:${auth.roomId}`, 0, -1);
    return {
        messages:messages.map((m)=>({
            ...m,
            token: m.token === auth.token ? m.token : undefined
        }))
    }

},
{
    query:z.object({
        roomId:z.string()
    })
})



// In your Elysia API file

const RANDOM_ROOM_TTL_SECONDS = 60 * 10; // 10 min for random rooms

const randomChat = new Elysia({ prefix: '/random' })
  .post('/queue', async ({ body }) => {
    const { username } = body;

    // Check if someone is already waiting in the queue
    const waiting = await redis.get<{ username: string; roomId: string }>('random:queue');

    if (waiting && waiting.username !== username) {
      // Match found — both join the existing room
      await redis.del('random:queue');
      return { roomId: waiting.roomId, matched: true };
    }

    // No one waiting — create a room and sit in queue
    const roomId = nanoid();
    await redis.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
      isRandom: true,
    });
    await redis.expire(`meta:${roomId}`, RANDOM_ROOM_TTL_SECONDS);

    // Store in queue with 30s expiry (so stale waiters don't block)
    await redis.set('random:queue', { username, roomId }, { ex: 30 });

    return { roomId, matched: false };
  }, {
    body: z.object({ username: z.string() })
  })
  .post('/cancel', async ({ body }) => {
    const { username } = body;
    const waiting = await redis.get<{ username: string; roomId: string }>('random:queue');
    if (waiting?.username === username) {
      await redis.del('random:queue');
      // Clean up the room they created
      await redis.del(`meta:${waiting.roomId}`);
    }
    return { ok: true };
  }, {
    body: z.object({ username: z.string() })
  })
  .get('/status', async ({ query }) => {
  const { roomId } = query;
  
  // Check if someone else joined — meta key exists but queue is gone
  const queueEntry = await redis.get<{ username: string; roomId: string }>('random:queue');
  const roomExists = await redis.exists(`meta:${roomId}`);
  
  if (!roomExists) {
    // Room expired
    return { status: 'expired' };
  }
  
  if (queueEntry?.roomId === roomId) {
    // Still waiting, no one joined yet
    return { status: 'waiting' };
  }
  
  // Queue entry is gone but room exists — someone joined!
  return { status: 'matched' };
}, {
  query: z.object({ roomId: z.string() })
});



const app = new Elysia({ prefix: '/api' })
    .use(room).use(message).use(randomChat)

export const GET = app.fetch 
export const POST = app.fetch 
export const DELETE = app.fetch 


export type App = typeof app;