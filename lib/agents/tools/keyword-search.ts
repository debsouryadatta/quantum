import { keywordSearch, getBuilderDetails } from "@/lib/services/search";
import { prisma } from "@/lib/db";
import { z } from 'zod/v3';

export const keywordSearchSchema = z.object({
  keywords: z.string().describe("Keywords to search for in names, github usernames, skills, projects, bio, or any other fields"),
  limit: z.number().int().min(1).max(50).optional().default(20).describe("Maximum number of results to return"),
  filters: z.object({
    name: z.string().optional().describe("Filter by exact name match"),
    githubUsername: z.string().optional().describe("Filter by GitHub username"),
    skills: z.array(z.string()).optional().describe("Filter by specific skills"),
    role: z.string().optional().describe("Filter by role (frontend, backend, fullstack, design, product, data, ml)"),
    experienceLevel: z.string().optional().describe("Filter by experience level (beginner, intermediate, advanced, expert)"),
    availability: z.string().optional().describe("Filter by availability (available, busy, not_looking)"),
  }).optional().describe("Additional filters to apply"),
});

export type KeywordSearchParams = z.infer<typeof keywordSearchSchema>;

export interface KeywordSearchResult {
  builderId: string;
  name: string;
  role: string;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  availabilityStatus: string;
  github: string | null;
  skills: Array<{ name: string; category: string; proficiencyLevel: string }>;
  projects: Array<{ title: string; description: string; techStack: string[] }>;
  keywordScore: number;
}

/**
 * Keyword search tool - searches across multiple fields
 */
export async function keywordSearchTool(params: KeywordSearchParams): Promise<KeywordSearchResult[]> {
  const { keywords, limit = 20, filters } = params;

  try {
    let builderIds: string[] = [];

    // If specific filters are provided, use direct database queries
    if (filters) {
      const where: any = {};

      if (filters.name) {
        where.name = { contains: filters.name, mode: "insensitive" };
      }

      if (filters.githubUsername) {
        where.github = { contains: filters.githubUsername, mode: "insensitive" };
      }

      if (filters.role) {
        where.role = filters.role;
      }

      if (filters.experienceLevel) {
        where.experienceLevel = filters.experienceLevel;
      }

      if (filters.availability) {
        where.availabilityStatus = filters.availability;
      }

      // If skills filter is provided, search builders with those skills
      if (filters.skills && filters.skills.length > 0) {
        const buildersWithSkills = await prisma.builder.findMany({
          where: {
            ...where,
            skills: {
              some: {
                name: {
                  in: filters.skills.map((s) => s.toLowerCase()),
                  mode: "insensitive",
                },
              },
            },
          },
          select: { id: true },
        });
        builderIds = buildersWithSkills.map((b) => b.id);
      } else {
        const builders = await prisma.builder.findMany({
          where,
          select: { id: true },
        });
        builderIds = builders.map((b) => b.id);
      }
    }

    // Perform keyword search if keywords are provided
    let keywordResults: Array<{ id: string; keywordScore: number }> = [];
    if (keywords && keywords.trim().length > 0) {
      const searchResults = await keywordSearch(keywords, limit * 2);
      keywordResults = searchResults.map((r) => ({
        id: r.id,
        keywordScore: r.keywordScore,
      }));

      // If we have filters, intersect with keyword results
      if (builderIds.length > 0) {
        const keywordIds = new Set(keywordResults.map((r) => r.id));
        builderIds = builderIds.filter((id) => keywordIds.has(id));
      } else {
        builderIds = keywordResults.map((r) => r.id);
      }
    }

    // If no results, return empty array
    if (builderIds.length === 0) {
      return [];
    }

    // Get full builder details
    const builderDetails = await getBuilderDetails(builderIds);

    // Create a map of keyword scores
    const scoreMap = new Map<string, number>();
    keywordResults.forEach((r) => {
      scoreMap.set(r.id, r.keywordScore);
    });

    // Combine results with scores
    const results: KeywordSearchResult[] = builderDetails.map((builder) => {
      // If we have a keyword score, use it; otherwise assign a default score based on filters
      const keywordScore = scoreMap.get(builder.id) || (filters ? 0.5 : 0);

      return {
        builderId: builder.id,
        name: builder.name,
        role: builder.role,
        bio: builder.bio,
        avatarUrl: builder.avatarUrl,
        location: builder.location,
        availabilityStatus: builder.availabilityStatus,
        github: builder.github,
        skills: builder.skills,
        projects: builder.projects,
        keywordScore,
      };
    });

    // Sort by keyword score (descending) and limit
    return results
      .sort((a, b) => b.keywordScore - a.keywordScore)
      .slice(0, limit);
  } catch (error) {
    console.error("Keyword search error:", error);
    throw new Error(`Keyword search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

