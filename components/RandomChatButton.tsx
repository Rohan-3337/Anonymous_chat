"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useEffect, useRef, useState } from "react";

export function RandomChatButton() {
  const { username } = useUsername();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "waiting" | "matched">("idle");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const { mutate: joinQueue } = useMutation({
    mutationFn: async () => {
      const res = await client.random.queue.post({ username });
      return res.data;
    },
    onSuccess: (data) => {
  if (!data) return;

  if (data.matched) {
    setStatus("matched");
    router.push(`/room/${data.roomId}`);
    return;
  }

  roomIdRef.current = data.roomId;
  setStatus("waiting");

  // Replace the old polling with this:
  pollingRef.current = setInterval(async () => {
    const res = await client.random.status.get({
      query: { roomId: roomIdRef.current! }
    });

    if (res.data?.status === 'matched') {
      stopPolling();
      setStatus("matched");
      router.push(`/room/${roomIdRef.current}`);
    }

    if (res.data?.status === 'expired') {
      stopPolling();
      setStatus("idle");
    }
  }, 2000);
},
  });

  const { mutate: cancelQueue } = useMutation({
    mutationFn: async () => {
      await client.random.cancel.post({ username });
    },
    onSuccess: () => {
      stopPolling();
      setStatus("idle");
      roomIdRef.current = null;
    },
  });

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  if (status === "waiting") {
    return (
      <div className="space-y-3">
        <div className="w-full border border-zinc-700 p-3 text-sm font-mono text-center text-zinc-400 flex items-center justify-center gap-2">
          <span className="animate-pulse text-green-500">●</span>
          Waiting for a stranger...
        </div>
        <button
          onClick={() => cancelQueue()}
          className="w-full bg-zinc-800 text-zinc-400 p-2 text-xs font-bold hover:bg-zinc-700 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => joinQueue()}
      disabled={status === "matched"}
      className="w-full border border-zinc-700 text-zinc-400 p-3 text-sm font-bold
        hover:border-green-700 hover:text-green-400 transition-colors mt-2 cursor-pointer disabled:opacity-50"
    >
      🎲 Random Chat
    </button>
  );
}