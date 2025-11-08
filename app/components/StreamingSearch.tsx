"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface StreamingSearchProps {
  query: string;
  onComplete: (results: any[]) => void;
}

export function StreamingSearch({ query, onComplete }: StreamingSearchProps) {
  const [phase, setPhase] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!query) return;

    const eventSource = new EventSource(
      `/api/search/stream?q=${encodeURIComponent(query)}`
    );

    eventSource.addEventListener("error", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error === "Rate limit exceeded") {
          toast.error("Rate Limit Exceeded", {
            description: data.message || "Rate limit exceeded. Please try again later.",
            duration: 5000,
          });
        } else {
          toast.error("Search Error", {
            description: data.message || data.error || "An error occurred during search",
          });
        }
        eventSource.close();
      } catch (error) {
        console.error("Error parsing error event:", error);
      }
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.phase) {
          setPhase(data.phase);
          setMessage(data.message || "");
          setProgress(data.progress || 0);
        }

        if (data.phase === "complete" && data.results) {
          onComplete(data.results);
          eventSource.close();
        }

        if (data.phase === "error") {
          toast.error("Search Error", {
            description: data.error || "An error occurred during search",
          });
          eventSource.close();
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      
      // Check if connection was closed due to an error
      if (eventSource.readyState === EventSource.CLOSED) {
        // Connection closed - might be a rate limit or other error
        // The server should have sent an error event, but if not, show generic message
        toast.error("Connection Error", {
          description: "The search connection was interrupted. Please try again.",
        });
      }
      
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [query, onComplete]);

  if (!phase) return null;

  return (
    <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-black transition-all duration-300 dark:bg-white"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {progress}%
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
        {message}
      </p>
    </div>
  );
}

