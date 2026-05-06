"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";
import { useState } from "react";

export const Provider = ({ children }:{ children: React.ReactNode }) => {
    const [queryclient] = useState(()=> new QueryClient());

    return (
        <RealtimeProvider>

        <QueryClientProvider client={queryclient}>
            {children}
        </QueryClientProvider>
        </RealtimeProvider>
    );
}