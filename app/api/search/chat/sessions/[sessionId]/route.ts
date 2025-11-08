import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, executeWithRetry } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { userId } = await auth();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const session = await executeWithRetry(async () => {
      return await prisma.chatSession.findUnique({
        where: {
          sessionId: sessionId,
        },
      });
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check authorization
    if (session.userId && session.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (!session.userId && session.userIp !== ip) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const messages = Array.isArray(session.messages) ? session.messages : [];

    return NextResponse.json({
      sessionId: session.sessionId,
      isActive: session.isActive,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        results: m.results || [],
      })),
    });
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { userId } = await auth();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const session = await executeWithRetry(async () => {
      return await prisma.chatSession.findUnique({
        where: {
          sessionId: sessionId,
        },
      });
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check authorization
    if (session.userId && session.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (!session.userId && session.userIp !== ip) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await executeWithRetry(async () => {
      return await prisma.chatSession.delete({
        where: {
          sessionId: sessionId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}

