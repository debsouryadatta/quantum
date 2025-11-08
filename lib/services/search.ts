import { prisma } from "@/lib/db";
import { embeddingToVectorString } from "./embeddings";

export interface SearchFilters {
  roles?: string[];
  experienceLevels?: string[];
  availability?: string[];
  location?: string;
}

export interface SearchResult {
  builder: {
    id: string;
    name: string;
    bio: string | null;
    role: string;
    experienceLevel: string;
    avatarUrl: string | null;
    location: string | null;
    availabilityStatus: string;
    skills: Array<{ name: string; category: string; proficiencyLevel: string }>;
    projects: Array<{ title: string; description: string; techStack: string[] }>;
  };
  similarityScore: number;
  keywordScore: number;
  finalScore: number;
}

/**
 * Semantic search using pgvector
 */
export async function semanticSearch(
  queryEmbedding: number[],
  limit: number = 100,
  similarityThreshold: number = 0.7
): Promise<Array<{ id: string; similarityScore: number }>> {
  const vectorString = `[${queryEmbedding.join(",")}]`;
  // Quote the vector string for PostgreSQL
  const quotedVectorString = "'" + vectorString + "'";

  // Use pgvector cosine distance operator (<=>)
  // Note: Build query string using concatenation to avoid Prisma parameter parsing issues
  const query =
    "SELECT " +
    "b.id, " +
    "1 - (b.profile_embedding <=> " +
    quotedVectorString +
    "::vector) as similarity_score " +
    "FROM builders b " +
    "WHERE b.profile_embedding IS NOT NULL " +
    "AND 1 - (b.profile_embedding <=> " +
    quotedVectorString +
    "::vector) > " +
    similarityThreshold +
    " " +
    "ORDER BY b.profile_embedding <=> " +
    quotedVectorString +
    "::vector " +
    "LIMIT " +
    limit;

  const results = await prisma.$queryRawUnsafe<
    Array<{ id: string; similarity_score: number }>
  >(query);

  return results.map((r) => ({
    id: r.id,
    similarityScore: Number(r.similarity_score),
  }));
}

/**
 * Keyword search using PostgreSQL full-text search
 */
export async function keywordSearch(
  keywords: string,
  limit: number = 100
): Promise<Array<{ id: string; keywordScore: number }>> {
  // Build full-text search query
  const searchTerms = keywords
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .map((t) => `${t}:*`)
    .join(" & ");

  if (!searchTerms) {
    return [];
  }

  const results = await prisma.$queryRaw<
    Array<{ id: string; keyword_score: number }>
  >`
    SELECT 
      b.id,
      ts_rank(
        COALESCE(b.search_vector, to_tsvector('english', '')),
        plainto_tsquery('english', ${searchTerms})
      ) as keyword_score
    FROM builders b
    WHERE b.search_vector @@ plainto_tsquery('english', ${searchTerms})
       OR to_tsvector('english', COALESCE(b.name, '') || ' ' || COALESCE(b.bio, '') || ' ' || b.role::text) 
          @@ plainto_tsquery('english', ${searchTerms})
    ORDER BY keyword_score DESC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    id: r.id,
    keywordScore: Number(r.keyword_score),
  }));
}

/**
 * Hybrid search combining semantic and keyword results
 */
export async function hybridSearch(
  queryEmbedding: number[],
  keywords: string,
  limit: number = 20,
  semanticWeight: number = 0.3,
  keywordWeight: number = 0.7
): Promise<Array<{ id: string; finalScore: number }>> {
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(queryEmbedding, limit * 2, 0.6), // Lower threshold for broader results
    keywordSearch(keywords, limit * 2),
  ]);

  // Combine results
  const scoreMap = new Map<string, { semantic: number; keyword: number }>();

  // Add semantic scores
  for (const result of semanticResults) {
    scoreMap.set(result.id, {
      semantic: result.similarityScore,
      keyword: 0,
    });
  }

  // Add keyword scores
  for (const result of keywordResults) {
    const existing = scoreMap.get(result.id);
    if (existing) {
      existing.keyword = result.keywordScore;
    } else {
      scoreMap.set(result.id, {
        semantic: 0,
        keyword: result.keywordScore,
      });
    }
  }

  // Normalize scores and calculate final score
  const maxSemantic = Math.max(...Array.from(scoreMap.values()).map((s) => s.semantic), 1);
  const maxKeyword = Math.max(...Array.from(scoreMap.values()).map((s) => s.keyword), 1);

  const finalResults = Array.from(scoreMap.entries()).map(([id, scores]) => {
    const normalizedSemantic = maxSemantic > 0 ? scores.semantic / maxSemantic : 0;
    const normalizedKeyword = maxKeyword > 0 ? scores.keyword / maxKeyword : 0;

    const finalScore =
      normalizedSemantic * semanticWeight + normalizedKeyword * keywordWeight;

    return { id, finalScore };
  });

  // Sort by final score and limit
  return finalResults.sort((a, b) => b.finalScore - a.finalScore).slice(0, limit);
}

/**
 * Apply filters to search results
 */
export async function applyFilters(
  builderIds: string[],
  filters: SearchFilters
): Promise<string[]> {
  if (builderIds.length === 0) return [];

  const where: any = {
    id: { in: builderIds },
  };

  if (filters.roles && filters.roles.length > 0) {
    where.role = { in: filters.roles };
  }

  if (filters.experienceLevels && filters.experienceLevels.length > 0) {
    where.experienceLevel = { in: filters.experienceLevels };
  }

  if (filters.availability && filters.availability.length > 0) {
    where.availabilityStatus = { in: filters.availability };
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: "insensitive" };
  }

  const filtered = await prisma.builder.findMany({
    where,
    select: { id: true },
  });

  return filtered.map((b) => b.id);
}

/**
 * Get full builder data for search results
 */
export async function getBuilderDetails(
  builderIds: string[]
): Promise<Array<SearchResult["builder"] & { github: string | null; updatedAt: Date }>> {
  const builders = await prisma.builder.findMany({
    where: { id: { in: builderIds } },
    select: {
      id: true,
      name: true,
      bio: true,
      role: true,
      experienceLevel: true,
      avatarUrl: true,
      location: true,
      availabilityStatus: true,
      github: true,
      updatedAt: true,
      skills: {
        select: {
          name: true,
          category: true,
          proficiencyLevel: true,
        },
      },
      projects: {
        select: {
          title: true,
          description: true,
          techStack: true,
        },
        take: 5,
      },
    },
  });

  return builders.map((builder) => ({
    ...builder,
    role: builder.role as string,
    experienceLevel: builder.experienceLevel as string,
    availabilityStatus: builder.availabilityStatus as string,
    skills: builder.skills.map((skill) => ({
      name: skill.name,
      category: skill.category as string,
      proficiencyLevel: skill.proficiencyLevel as string,
    })),
    projects: builder.projects.map((project) => ({
      title: project.title,
      description: project.description,
      techStack: Array.isArray(project.techStack)
        ? (project.techStack as string[])
        : [],
    })),
  }));
}

