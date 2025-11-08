import { NextRequest, NextResponse } from "next/server";
import { orchestrateSearch } from "@/lib/agents/orchestrator";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { cache, cacheKeys } from "@/lib/services/cache";
import { createHash } from "crypto";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma, executeWithRetry } from "@/lib/db";

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z
    .object({
      roles: z.array(z.string()).optional(),
      experienceLevels: z.array(z.string()).optional(),
      availability: z.array(z.string()).optional(),
      location: z.string().optional(),
    })
    .optional(),
  options: z
    .object({
      maxResults: z.number().int().min(1).max(200).optional(),
      includeReasoning: z.boolean().optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(50).optional(),
      skipCache: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get auth status
    const { userId } = await auth();
    const isAuthenticated = !!userId;

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "unknown";
    const identifier = userId || ip;
    const rateLimitResult = await checkRateLimit(identifier, isAuthenticated);

    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.reset);
      const now = new Date();
      const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / 1000 / 60);
      
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: isAuthenticated
            ? `You've reached your limit of ${rateLimitResult.limit} searches per hour. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`
            : `You've reached your limit of ${rateLimitResult.limit} searches per hour. Sign in to get 50 searches per hour, or try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
          resetTime: resetTime.toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Parse and validate request
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        return NextResponse.json(
          { error: "Invalid request body", message: "Request body cannot be empty" },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body", message: error instanceof Error ? error.message : "Request body must be valid JSON" },
        { status: 400 }
      );
    }
    
    const validated = SearchRequestSchema.parse(body);

    // Check cache (include pagination in cache key)
    const pageSize = validated.options?.pageSize || 10;
    const page = validated.options?.page || 1;
    const skipCache = validated.options?.skipCache || false;
    
    const cacheKey = cacheKeys.queryResult(
      createHash("sha256")
        .update(JSON.stringify({ 
          query: validated.query, 
          filters: validated.filters,
          page,
          pageSize,
        }))
        .digest("hex")
    );

    // Only check cache if skipCache is false
    if (!skipCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            "X-Cache": "HIT",
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        });
      }
    }

    // Execute search - fetch more results than needed for pagination
    const maxResults = validated.options?.maxResults || Math.max(100, pageSize * 10); // Fetch enough for pagination

    const result = await orchestrateSearch(validated.query, {
      maxResults,
      filters: validated.filters,
      userId: userId || undefined,
    });

    // Sort results by score (descending) - ensure highest scores first
    const sortedResults = [...result.results].sort((a, b) => b.score - a.score);

    // Apply pagination
    const totalResults = sortedResults.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = sortedResults.slice(startIndex, endIndex);

    // Prepare response
    const response = {
      sessionId: result.sessionId,
      query: result.query,
      agentReasoning: validated.options?.includeReasoning ? result.agentReasoning : undefined,
      results: paginatedResults.map((r) => ({
        builder: {
          id: r.id,
          name: r.name,
          bio: r.bio,
          role: r.role,
          experienceLevel: r.experienceLevel,
          avatarUrl: r.avatarUrl,
          location: r.location,
          availabilityStatus: r.availabilityStatus,
          skills: r.skills,
          projects: r.projects,
        },
        score: r.score,
        matchScorePercentage: Math.round(r.score * 100), // Convert to percentage
        matchExplanation: r.matchExplanation,
        relevanceFactors: r.relevanceFactors,
      })),
      pagination: {
        page,
        pageSize,
        totalResults,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      metadata: result.metadata,
    };

    // Cache result for 5 minutes (only if results exist and not skipping cache)
    // Don't cache 0 results to allow users to refresh and get new results
    if (!skipCache && paginatedResults.length > 0) {
      await cache.set(cacheKey, response, 300);
    }

    // Log search (async, don't wait)
    logSearch(result, userId || null).catch(console.error);

    return NextResponse.json(response, {
      headers: {
        "X-Cache": "MISS",
        "X-RateLimit-Limit": rateLimitResult.limit.toString(),
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error("Search API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function logSearch(
  result: Awaited<ReturnType<typeof orchestrateSearch>>,
  userId: string | null
) {
  try {
    // Look up Builder by clerkId to get the actual builder ID
    // Only set builderId if the user has a Builder profile
    let builderId: string | null = null;
    if (userId) {
      try {
        builderId = await executeWithRetry(async () => {
          const builder = await prisma.builder.findUnique({
            where: { clerkId: userId },
            select: { id: true },
          });
          return builder?.id || null;
        });
      } catch (lookupError) {
        // If lookup fails, log but continue without builderId
        console.warn(`Failed to lookup builder for userId ${userId}:`, lookupError);
        builderId = null;
      }
    }

    // Build data object, only including builderId if it exists
    const logData: any = {
      sessionId: result.sessionId,
      query: result.query,
      plannerThought: result.agentReasoning.plan as any,
      executionSteps: result.agentReasoning.executionSteps as any,
      evaluationScore: result.agentReasoning.evaluation.confidenceScore,
      refinementCount: result.agentReasoning.refinements.length,
      results: result.results as any,
      topResultIds: result.results.slice(0, 10).map((r) => r.id) as any,
      latencyMs: result.metadata.latencyMs,
      llmCallsCount: result.metadata.llmCallsCount,
    };

    // Only include builderId if it's not null (Prisma handles null correctly, but be explicit)
    if (builderId) {
      logData.builderId = builderId;
    }

    await executeWithRetry(async () => {
      await prisma.searchLog.create({
        data: logData,
      });
    });
  } catch (error) {
    // Log the error but don't throw - search logging is non-critical
    console.error("Failed to log search:", error);
    if (error instanceof Error && 'code' in error) {
      console.error("Error details:", {
        code: (error as any).code,
        meta: (error as any).meta,
      });
    }
  }
}

