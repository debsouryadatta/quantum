import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from 'zod/v3';
import { auth } from "@clerk/nextjs/server";

const FeedbackSchema = z.object({
  sessionId: z.string().uuid(),
  resultId: z.string().uuid(),
  action: z.enum(["click", "contact", "skip"]),
  feedbackScore: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    const body = await request.json();
    const validated = FeedbackSchema.parse(body);

    // Update search log with feedback
    // Use findFirst since sessionId is not unique (it's only indexed)
    const searchLog = await prisma.searchLog.findFirst({
      where: { sessionId: validated.sessionId },
      orderBy: { createdAt: "desc" }, // Get the most recent search log for this session
    });

    if (searchLog) {
      const clickedResults = (searchLog.clickedResults as string[]) || [];
      if (!clickedResults.includes(validated.resultId)) {
        clickedResults.push(validated.resultId);
      }

      await prisma.searchLog.update({
        where: { id: searchLog.id }, // Use id for update since it's unique
        data: {
          clickedResults: clickedResults as any,
          feedbackScore: validated.feedbackScore || searchLog.feedbackScore,
        },
      });
    }

    // Update builder analytics
    if (validated.action === "click" || validated.action === "contact") {
      await prisma.builder.update({
        where: { id: validated.resultId },
        data: {
          searchAppearances: { increment: 1 },
          ...(validated.action === "contact" && {
            teamUps: { increment: 1 },
          }),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);

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

