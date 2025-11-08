import { NextRequest } from "next/server";
import { orchestrateSearch } from "@/lib/agents/orchestrator";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z
    .object({
      roles: z.array(z.string()).optional(),
      experienceLevels: z.array(z.string()).optional(),
      availability: z.array(z.string()).optional(),
    })
    .optional(),
  options: z
    .object({
      maxResults: z.number().int().min(1).max(50).optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
             request.headers.get("x-real-ip") || 
             "unknown";
  const identifier = userId || ip;
  const rateLimitResult = await checkRateLimit(identifier, isAuthenticated);

  // Check rate limit and handle it via SSE if exceeded
  if (!rateLimitResult.success) {
    const resetTime = new Date(rateLimitResult.reset);
    const now = new Date();
    const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / 1000 / 60);
    const message = isAuthenticated
      ? `You've reached your limit of ${rateLimitResult.limit} searches per hour. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`
      : `You've reached your limit of ${rateLimitResult.limit} searches per hour. Sign in to get 50 searches per hour, or try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`;
    
    // For SSE, send error event instead of returning 429
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const errorEvent = `event: error\ndata: ${JSON.stringify({
          error: "Rate limit exceeded",
          message,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-RateLimit-Limit": rateLimitResult.limit.toString(),
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        "X-RateLimit-Reset": rateLimitResult.reset.toString(),
      },
    });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const validated = SearchRequestSchema.parse({ query });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          // Phase 1: Planning
          sendEvent("planning", {
            phase: "planning",
            progress: 10,
            message: "Analyzing query intent...",
          });

          // We need to modify orchestrator to support streaming
          // For now, we'll simulate streaming by calling orchestrateSearch
          // and sending updates based on the result
          const result = await orchestrateSearch(validated.query, {
            maxResults: validated.options?.maxResults || 10,
            filters: validated.filters,
            userId: userId || undefined,
          });

          // Send execution phase
          sendEvent("executing", {
            phase: "executing",
            progress: 50,
            message: `Found ${result.metadata.totalResults} candidates...`,
            intermediateResults: result.results.slice(0, 5).map((r) => ({
              id: r.id,
              name: r.name,
              role: r.role,
              score: r.score,
            })),
          });

          // Send evaluation phase
          sendEvent("evaluating", {
            phase: "evaluating",
            progress: 80,
            message: "Evaluating result quality...",
            evaluationScore: result.agentReasoning.evaluation.confidenceScore,
          });

          // Send refinement if any
          if (result.agentReasoning.refinements.length > 0) {
            sendEvent("refining", {
              phase: "refining",
              progress: 90,
              message: `Refining search (iteration ${result.agentReasoning.refinements.length})...`,
            });
          }

          // Send complete
          sendEvent("complete", {
            phase: "complete",
            progress: 100,
            message: `Found ${result.results.length} results`,
            results: result.results,
            metadata: result.metadata,
          });

          controller.close();
        } catch (error) {
          sendEvent("error", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-RateLimit-Limit": rateLimitResult.limit.toString(),
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error("Streaming search error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: error.issues }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

