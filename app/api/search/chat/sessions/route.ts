import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, executeWithRetry } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const sessions = await executeWithRetry(async () => {
      // Return all sessions for the current user (both active and inactive)
      return await prisma.chatSession.findMany({
        where: userId 
          ? { userId }
          : { userIp: ip },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        createdAt: s.createdAt.toISOString(),
        lastQuery: s.lastQuery,
        messageCount: s.messageCount,
        isActive: s.isActive,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const sessionId = randomUUID();

    const session = await executeWithRetry(async () => {
      return await prisma.chatSession.create({
        data: {
          sessionId,
          userId: userId || null,
          userIp: ip,
          messages: [],
          messageCount: 0,
          isActive: true,
        },
      });
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      id: session.id,
    });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

