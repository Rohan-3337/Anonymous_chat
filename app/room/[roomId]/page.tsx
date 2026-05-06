"use client";

import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {format} from "date-fns";
import { useRealtime } from "@/lib/realtime-client";
const RoomPage = () => {
    const { username } = useUsername();
    const params = useParams();
    const router =  useRouter();
    const roomId = params.roomId as string;
    const [input,setInput] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);
    const [copyStatus, setCopyStatus] = useState<string>("Copy");
    const [timeRemaining, setTimeRemaining] = useState<number | null>(51);
    const {mutate:destroyRoom}  = useMutation({
      mutationFn: async () => {
        await client.room.delete(
          null,{
          query:{
            roomId
          }
        })
      }
    })
    const {data:ttlData} = useQuery({
      queryKey:["ttl",roomId],
      queryFn: async () => {
        const res = await client.room.ttl.get({
          query:{
            roomId
          }
        })
        return res?.data
      }
    })

    useEffect(() => {
      if (ttlData?.ttl !== undefined) {
        setTimeRemaining(ttlData.ttl);
      }
    }, [ttlData]);
      useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return

    if (timeRemaining === 0) {
      router.push("/?destroyed=true")
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, router])
    const CopyLink = () =>{
        navigator.clipboard.writeText(window.location.href)
        .then(() => {
            setCopyStatus("Copied!");
            setTimeout(() => setCopyStatus("Copy"), 2000);
        })
        .catch(() => {
            setCopyStatus("Failed to copy");
            setTimeout(() => setCopyStatus("Copy"), 2000);
        });
    }

    const formatTimeRemaining = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
    const {data:messages, refetch} = useQuery({
      queryKey:["messages",roomId],
      queryFn: async () => {
        const res = await client.message.get({
          query:{
            roomId
          }
        })
        return res?.data
    },
})
    useRealtime({
      channels:[roomId],
      events:['chat.message',"chat.destroy.isDestroyed"],
      onData:({event})=>{
        if(event === "chat.message"){
          refetch();
        }
          if(event === "chat.destroy.isDestroyed"){
             router.push("/?destroyed=true");
          }
      }
    })
    const {mutate:SendMessage,isPending} = useMutation({
          mutationFn: async ({text}:{text:string}) => {
            await client.message.post({
              sender:username,text
            },
            {
              query:{
                roomId
              }
            }
          )
          },

    })

    return (
          <main className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">Room ID</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-500 truncate">{roomId.slice(0,10) + "..."}</span>
              <button
                onClick={CopyLink}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copyStatus}
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">Self-Destruct</span>
            <span
              className={`text-sm font-bold flex items-center gap-2 ${
                timeRemaining !== null && timeRemaining < 60
                  ? "text-red-500"
                  : "text-amber-500"
              }`}
            >
              {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
            </span>
          </div>
        </div>

        <button
          onClick={() => destroyRoom()}
          className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50"
        >
          <span className="group-hover:animate-pulse">💣</span>
          DESTROY NOW
        </button>
      </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages?.messages.length === 0 && (
                <div className="flex items-center uppercase justify-center h-full">

                <div className="text-sm text-zinc-600 font-mono">
                  No messages yet. Start the conversation!
                </div>
                </div>
              )}

            {messages?.messages.map((message)=>(
              <div key={message.id} className="flex flex-col items-start">
                <div className="max-w-[80%] group">
                 <div className="flex items-baseline gap-3 mb-1">
                  <span className={` text-xs font-bold ${message.sender === username ? "text-green-500" : "text-blue-500"}`}>
                    {message.sender === username ? "You" : message.sender}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {format(message.timestamp,"hh:mm")}
                  </span>
                 </div>
                 <p className="text-sm text-zinc-300 leading-relaxed break-all">
                  {message.text}
                 </p>
                </div>
              </div>
            ) )
          }
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex gap-4">
            <div className="flex-1 relative group">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-500 animate-pulse">
              {">"}
            </span>
            <input autoFocus type="text" className=" w-full bg-black  border border-zinc-800
            focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100
            placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {                
                if(e.key === "Enter" && input.trim()){
                  SendMessage({text:input});
                  setInput("");
                   inputRef.current?.focus();
                }
            }
            
        }
        placeholder="Type message ..."
             />
            </div>
            <button
            onClick={()=>{

              SendMessage({text: input});
              setInput("");
            }
          }
          disabled={!input.trim() || isPending}

             className="bg-zinc-800 px-4 text-zinc-400 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">SEND</button>
        </div>

        </div>
     
    </main>
    );
}

export default RoomPage;