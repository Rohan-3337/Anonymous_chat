import { InferRealtimeEvents, Realtime } from '@upstash/realtime'
import { z } from 'zod'
import { redis } from './redis'

const message = z.object({
            id:z.string(),
            sender:z.string(),
            text:z.string(),
            timestamp:z.number(),
            roomId:z.string(),
            token:z.string().optional(),
        })
export const Schema = {
    chat:{
        message,
        destroy:{
            isDestroyed:z.literal(true),
        }
    }
}


export const realtime  = new Realtime({schema:Schema,redis});
export type RealtimeEvents = InferRealtimeEvents<typeof realtime> ;
export type Message = z.infer<typeof message>;