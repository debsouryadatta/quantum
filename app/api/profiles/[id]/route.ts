import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cache, cacheKeys } from "@/lib/services/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check cache
    const cacheKey = cacheKeys.profile(id);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    // Validate ID format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error(`Invalid builder ID format: ${id}`);
      return NextResponse.json(
        { error: "Invalid profile ID format" },
        { status: 400 }
      );
    }

    const profile = await prisma.builder.findUnique({
      where: { id },
      include: {
        skills: true,
        projects: {
          orderBy: { startDate: "desc" },
          take: 10,
        },
      },
    });

    if (!profile) {
      console.error(`Builder not found with ID: ${id}`);
      return NextResponse.json(
        { error: "Profile not found", id },
        { status: 404 }
      );
    }

    // Increment profile views
    await prisma.builder.update({
      where: { id },
      data: { profileViews: { increment: 1 } },
    });

    // Find related builders (similar role and experience)
    const relatedBuilders = await prisma.builder.findMany({
      where: {
        id: { not: id },
        role: profile.role,
        experienceLevel: profile.experienceLevel,
        availabilityStatus: "available",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        bio: true,
        role: true,
        experienceLevel: true,
        avatarUrl: true,
      },
    });

    const response = {
      profile,
      relatedBuilders,
    };

    // Cache for 15 minutes
    await cache.set(cacheKey, response, 900);

    return NextResponse.json(response, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Get profile by ID error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

