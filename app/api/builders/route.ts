import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { keywordSearch, getBuilderDetails } from "@/lib/services/search";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50); // Max 50 per page
    const role = searchParams.get("role") || undefined;
    const experienceLevel = searchParams.get("experienceLevel") || undefined;
    const availabilityStatus = searchParams.get("availabilityStatus") || undefined;

    const skip = (page - 1) * limit;

    let builderIds: string[] = [];
    let totalCount = 0;

    // If there's a search query, use keyword search
    if (query.trim().length > 0) {
      const searchResults = await keywordSearch(query.trim(), 100); // Get more results for better ranking
      builderIds = searchResults.map((r) => r.id);
    }

    // Build where clause for filters
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }
    
    if (availabilityStatus) {
      where.availabilityStatus = availabilityStatus;
    }

    // If we have filters but no search query, get all builders matching filters
    if (builderIds.length === 0 && Object.keys(where).length > 0) {
      const builders = await prisma.builder.findMany({
        where,
        select: { id: true },
      });
      builderIds = builders.map((b) => b.id);
    }

    // If no search and no filters, get all builders
    if (builderIds.length === 0 && Object.keys(where).length === 0) {
      const builders = await prisma.builder.findMany({
        select: { id: true },
      });
      builderIds = builders.map((b) => b.id);
    }

    // Apply filters to search results if we have both
    if (builderIds.length > 0 && Object.keys(where).length > 0) {
      const filteredBuilders = await prisma.builder.findMany({
        where: {
          id: { in: builderIds },
          ...where,
        },
        select: { id: true },
      });
      builderIds = filteredBuilders.map((b) => b.id);
    }

    totalCount = builderIds.length;

    // Paginate
    const paginatedBuilderIds = builderIds.slice(skip, skip + limit);

    // Get full builder details
    const builders = paginatedBuilderIds.length > 0
      ? await getBuilderDetails(paginatedBuilderIds)
      : [];

    // Sort by relevance if we have a search query (maintain order from keyword search)
    // Otherwise sort by updatedAt (most recent first)
    if (query.trim().length === 0) {
      builders.sort((a, b) => {
        const dateA = a.updatedAt?.getTime() || 0;
        const dateB = b.updatedAt?.getTime() || 0;
        return dateB - dateA;
      });
    }

    return NextResponse.json({
      builders: builders.map((builder) => ({
        id: builder.id,
        name: builder.name,
        bio: builder.bio,
        role: builder.role,
        experienceLevel: builder.experienceLevel,
        avatarUrl: builder.avatarUrl,
        location: builder.location,
        availabilityStatus: builder.availabilityStatus,
        github: builder.github,
        skills: builder.skills.map((s) => ({
          name: s.name,
          category: s.category,
          proficiencyLevel: s.proficiencyLevel,
        })),
        projects: builder.projects.slice(0, 3), // Limit projects for list view
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: skip + limit < totalCount,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get builders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

