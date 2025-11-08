import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs, Output } from "ai";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { auth } from "@clerk/nextjs/server";
import { z } from 'zod/v3';
import { createChatAgent } from "@/lib/agents/chat-agent";
import { type ChatMessage } from "@/lib/agents/chat-agent";
import { prisma, executeWithRetry } from "@/lib/db";
import { generateTextEmbedding } from "@/lib/services/embeddings";
import { randomUUID } from "crypto";

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  sessionId: z.string().optional(),
});

// Response schema for structured output
const SearchResponseSchema = z.object({
  response: z.string().describe("The AI assistant's conversational response to the user's query"),
  results: z.array(
    z.object({
      builderId: z.string(),
      name: z.string(),
      role: z.string(),
      score: z.number(),
      matchReason: z.string().describe("Explanation of why this builder matches the query"),
      skills: z.array(z.string()),
      avatarUrl: z.string().nullable(),
      bio: z.string().nullable(),
      location: z.string().nullable(),
    })
  ).describe("List of matching builder profiles found by the search"),
  message: z.string().describe("A friendly summary message about the search results"),
});

export async function POST(request: NextRequest) {
  try {
    // Get auth status
    const { userId } = await auth();
    const isAuthenticated = !!userId;

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const identifier = userId || ip;
    const rateLimitResult = await checkRateLimit(identifier, isAuthenticated);

    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.reset);
      const now = new Date();
      const minutesUntilReset = Math.ceil(
        (resetTime.getTime() - now.getTime()) / 1000 / 60
      );

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: isAuthenticated
            ? `You've reached your limit of ${rateLimitResult.limit} searches per hour. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? "s" : ""}.`
            : `You've reached your limit of ${rateLimitResult.limit} searches per hour. Sign in to get 50 searches per hour, or try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? "s" : ""}.`,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
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
    const body = await request.json();
    const validated = ChatRequestSchema.parse(body);

    // Process the search query and limit history to 20 messages
    const conversationHistory: ChatMessage[] =
      validated.conversationHistory
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
        .slice(-20); // Keep only the last 20 messages

    // Initialize tracking
    const startTime = Date.now();
    let chatSessionId = validated.sessionId;

    // Create or get session
    if (!chatSessionId) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
      
      const newSession = await executeWithRetry(async () => {
        return await (prisma as any).chatSession.create({
          data: {
            sessionId: randomUUID(),
            userId: userId || null,
            userIp: ip,
            messages: [],
            messageCount: 0,
            isActive: true,
          },
        });
      });
      chatSessionId = newSession.sessionId;
    } else {
      // Check if session exists and is active
      const existingSession = await executeWithRetry(async () => {
        return await (prisma as any).chatSession.findUnique({
          where: { sessionId: chatSessionId },
        });
      });

      // If session doesn't exist or is inactive, create a new one
      if (!existingSession || !existingSession.isActive) {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "unknown";
        
        // Mark old session as inactive if it exists
        if (existingSession) {
          await executeWithRetry(async () => {
            return await (prisma as any).chatSession.update({
              where: { sessionId: chatSessionId },
              data: { isActive: false },
            });
          }).catch(console.error);
        }

        // Create new active session
        const newSession = await executeWithRetry(async () => {
          return await (prisma as any).chatSession.create({
            data: {
              sessionId: randomUUID(),
              userId: userId || null,
              userIp: ip,
              messages: [],
              messageCount: 0,
              isActive: true,
            },
          });
        });
        chatSessionId = newSession.sessionId;
      }
    }

    // Create chat agent
    const { model, tools, systemPrompt } = await createChatAgent();

    // Track tool calls
    const usedToolCalls: any[] = [];
    const toolsUsedSet = new Set<string>();

    // Format conversation history for prompt
    const historyText = conversationHistory.length > 0
      ? `Conversation so far:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n`
      : '';

    // Generate structured response with tool calling
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: `${historyText}${validated.message}`,
      tools,
      temperature: 0.2,
      experimental_output: Output.object({
        schema: SearchResponseSchema,
      }),
      stopWhen: stepCountIs(5),
      onStepFinish: (event: any) => {
        const parts = Array.isArray(event?.content) ? event.content : [];
        for (const part of parts) {
          if (part?.type === 'tool-result') {
            usedToolCalls.push({
              id: part.toolCallId,
              toolName: part.toolName,
              args: part.input,
              toolResult: part.output,
            });
            toolsUsedSet.add(part.toolName);
          }
        }
      },
    });

    // Extract structured output
    const structuredOutput = result.experimental_output || {
      response: result.text || "I couldn't find any matches for your query.",
      results: [],
      message: "I couldn't find any matches for your query. Try refining your search terms or being more specific.",
    };

    // Update session with new messages
    const updatedMessages = [
      ...conversationHistory,
      { role: "user" as const, content: validated.message },
      {
        role: "assistant" as const,
        content: structuredOutput.response,
        results: structuredOutput.results,
      },
    ];

    await executeWithRetry(async () => {
      return await (prisma as any).chatSession.update({
        where: { sessionId: chatSessionId },
        data: {
          messages: updatedMessages,
          messageCount: updatedMessages.length,
          lastQuery: validated.message,
          updatedAt: new Date(),
        },
      });
    }).catch(console.error);

    // Log the search
    logSearch({
      sessionId: chatSessionId!,
      query: validated.message,
      conversationHistory,
      searchResponse: structuredOutput,
      toolsUsed: Array.from(toolsUsedSet),
      toolCalls: usedToolCalls,
      latencyMs: Date.now() - startTime,
      userId: userId || null,
      ip,
    }).catch(console.error);

    // Return structured JSON response
    return NextResponse.json(
      {
        ...structuredOutput,
        toolCalls: usedToolCalls,
        text: result.text,
        sessionId: chatSessionId,
      },
      {
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Chat API error:", error);

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

/**
 * Log search to database with new schema fields
 */
async function logSearch({
  sessionId,
  query,
  conversationHistory,
  searchResponse,
  toolsUsed,
  toolCalls,
  latencyMs,
  userId,
  ip,
}: {
  sessionId: string;
  query: string;
  conversationHistory: ChatMessage[];
  searchResponse: { results: any[]; message: string };
  toolsUsed: string[];
  toolCalls?: any[];
  latencyMs: number;
  userId: string | null;
  ip: string;
}) {
  try {
    // Generate query embedding
    const { embedding: queryEmbedding } = await generateTextEmbedding(query);

    // Look up Builder by clerkId to get the actual builder ID
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
        console.warn(`Failed to lookup builder for userId ${userId}:`, lookupError);
        builderId = null;
      }
    }

    // Prepare conversation history for storage
    const conversationHistoryData = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Prepare results data
    const resultsData = searchResponse.results.map((r) => ({
      builderId: r.builderId,
      name: r.name,
      role: r.role,
      score: r.score,
      matchReason: r.matchReason,
    }));

    const topResultIds = searchResponse.results.map((r) => r.builderId);

    // Build data object
    const logData: any = {
      sessionId,
      query,
      queryEmbedding: queryEmbedding as any,
      toolCalls: toolCalls || null,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : null,
      conversationHistory: conversationHistoryData.length > 0 ? conversationHistoryData : null,
      results: resultsData,
      topResultIds,
      resultCount: searchResponse.results.length,
      latencyMs,
      llmCallsCount: toolCalls?.length || 0,
    };

    // Only include builderId if it's not null
    if (builderId) {
      logData.builderId = builderId;
    }

    await executeWithRetry(async () => {
      return await (prisma as any).searchLog.create({
        data: logData,
      });
    });
  } catch (error) {
    // Log the error but don't throw - search logging is non-critical
    console.error("Failed to log search:", error);
  }
}

