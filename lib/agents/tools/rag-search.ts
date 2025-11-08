import { generateTextEmbedding } from "@/lib/services/embeddings";
import { semanticSearch, getBuilderDetails } from "@/lib/services/search";
import { z } from 'zod/v3';

export const ragSearchSchema = z.object({
  query: z.string().describe("The search query to find matching builders using semantic similarity"),
  limit: z.number().int().min(1).max(50).optional().default(20).describe("Maximum number of results to return"),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.6).describe("Minimum similarity score threshold"),
});

export type RagSearchParams = z.infer<typeof ragSearchSchema>;

export interface RagSearchResult {
  builderId: string;
  name: string;
  role: string;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  availabilityStatus: string;
  skills: Array<{ name: string; category: string; proficiencyLevel: string }>;
  projects: Array<{ title: string; description: string; techStack: string[] }>;
  similarityScore: number;
}

/**
 * RAG search tool - performs semantic search using embeddings
 */
export async function ragSearchTool(params: RagSearchParams): Promise<RagSearchResult[]> {
  const { query, limit = 20, similarityThreshold = 0.6 } = params;

  try {
    // Generate embedding for the query
    const { embedding } = await generateTextEmbedding(query);

    // Perform semantic search
    const semanticResults = await semanticSearch(embedding, limit * 2, similarityThreshold);

    if (semanticResults.length === 0) {
      return [];
    }

    // Get full builder details
    const builderIds = semanticResults.map((r) => r.id);
    const builderDetails = await getBuilderDetails(builderIds);

    // Create a map of similarity scores
    const scoreMap = new Map<string, number>();
    semanticResults.forEach((r) => {
      scoreMap.set(r.id, r.similarityScore);
    });

    // Combine results with scores
    const results: RagSearchResult[] = builderDetails.map((builder) => {
      const similarityScore = scoreMap.get(builder.id) || 0;

      return {
        builderId: builder.id,
        name: builder.name,
        role: builder.role,
        bio: builder.bio,
        avatarUrl: builder.avatarUrl,
        location: builder.location,
        availabilityStatus: builder.availabilityStatus,
        skills: builder.skills,
        projects: builder.projects,
        similarityScore,
      };
    });

    // Sort by similarity score (descending) and limit
    return results
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  } catch (error) {
    console.error("RAG search error:", error);
    throw new Error(`RAG search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

