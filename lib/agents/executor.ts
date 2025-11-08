import { generateTextEmbedding } from "@/lib/services/embeddings";
import {
  semanticSearch,
  keywordSearch,
  hybridSearch,
  applyFilters,
  getBuilderDetails,
  SearchFilters,
} from "@/lib/services/search";
import { rankResults, ensureDiversity } from "@/lib/services/ranking";
import { prisma } from "@/lib/db";
import type { SearchPlan } from "./planner";

export interface ExecutionStep {
  phase: string;
  description: string;
  resultsCount: number;
  timestamp: number;
}

export interface ExecutionResult {
  builders: Array<{
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
    score: number;
    matchExplanation: string;
    relevanceFactors: Array<{ factor: string; contribution: number }>;
  }>;
  steps: ExecutionStep[];
  totalCandidates: number;
}

/**
 * Execute search plan and retrieve candidates
 */
export async function executeSearch(
  plan: SearchPlan,
  maxResults: number = 20
): Promise<ExecutionResult> {
  const steps: ExecutionStep[] = [];
  const startTime = Date.now();

  try {
    // Step 1: Generate query embedding
    const queryText = `${plan.queryIntent.primary} ${plan.queryIntent.secondary.join(" ")}`;
    const { embedding: queryEmbedding } = await generateTextEmbedding(queryText);
    steps.push({
      phase: "embedding",
      description: "Generated query embedding",
      resultsCount: 0,
      timestamp: Date.now() - startTime,
    });

    // Step 2: Query expansion - generate semantic variations
    const expandedQueries = [
      queryText,
      plan.queryIntent.primary,
      ...plan.queryIntent.secondary,
    ].filter(Boolean);

    // Step 3: Multi-stage retrieval
    let candidateIds: string[] = [];
    let semanticScores: Map<string, number> = new Map();
    let keywordScores: Map<string, number> = new Map();

    if (plan.searchStrategy.approach === "semantic" || plan.searchStrategy.approach === "hybrid") {
      const semanticResults = await semanticSearch(
        queryEmbedding,
        100,
        0.6 // Lower threshold for broader results
      );
      semanticResults.forEach((r) => {
        candidateIds.push(r.id);
        semanticScores.set(r.id, r.similarityScore);
      });
      steps.push({
        phase: "semantic_search",
        description: `Found ${semanticResults.length} candidates via semantic search`,
        resultsCount: semanticResults.length,
        timestamp: Date.now() - startTime,
      });
    }

    if (plan.searchStrategy.approach === "keyword" || plan.searchStrategy.approach === "hybrid") {
      const keywordQuery = [
        plan.queryIntent.primary,
        ...plan.queryIntent.secondary,
        ...(plan.searchStrategy.filters.skills ?? []),
      ].join(" ");

      const keywordResults = await keywordSearch(keywordQuery, 100);
      keywordResults.forEach((r) => {
        if (!candidateIds.includes(r.id)) {
          candidateIds.push(r.id);
        }
        keywordScores.set(r.id, r.keywordScore);
      });
      steps.push({
        phase: "keyword_search",
        description: `Found ${keywordResults.length} candidates via keyword search`,
        resultsCount: keywordResults.length,
        timestamp: Date.now() - startTime,
      });
    }

    // Step 4: Apply hard filters
    const filters: SearchFilters = {
      roles: plan.searchStrategy.filters.roles ?? undefined,
      experienceLevels: plan.searchStrategy.filters.experienceLevels ?? undefined,
      availability: plan.searchStrategy.filters.availability ?? undefined,
    };

    const filteredIds = await applyFilters(candidateIds, filters);
    steps.push({
      phase: "filtering",
      description: `Applied filters, ${filteredIds.length} candidates remaining`,
      resultsCount: filteredIds.length,
      timestamp: Date.now() - startTime,
    });

    // Step 5: Get full builder details
    const builderDetails = await getBuilderDetails(filteredIds);
    steps.push({
      phase: "enrichment",
      description: `Enriched ${builderDetails.length} profiles`,
      resultsCount: builderDetails.length,
      timestamp: Date.now() - startTime,
    });

    // Step 6: Rank results
    const rankedResults = rankResults(
      builderDetails.map((builder) => {
        // Destructure to exclude github and updatedAt from builder object
        const { github, updatedAt, ...builderWithoutExtra } = builder;
        return {
          builder: builderWithoutExtra,
          similarityScore: semanticScores.get(builder.id) || 0,
          keywordScore: keywordScores.get(builder.id) || 0,
          updatedAt: builder.updatedAt,
        };
      }),
      plan.searchStrategy.filters.skills || [],
      builderDetails.map((b) => ({ id: b.id, github: b.github }))
    );

    // Step 7: Ensure diversity
    const diverseResults = ensureDiversity(rankedResults, 3);
    steps.push({
      phase: "diversity",
      description: `Applied diversity filter, ${diverseResults.length} final results`,
      resultsCount: diverseResults.length,
      timestamp: Date.now() - startTime,
    });

    // Step 8: Generate match explanations
    const finalResults = await Promise.all(
      diverseResults.slice(0, maxResults).map(async (result) => {
        const explanation = generateMatchExplanation(result, plan);
        const relevanceFactors = extractRelevanceFactors(result.rankingFactors);

        return {
          ...result.builder,
          score: result.finalScore,
          matchExplanation: explanation,
          relevanceFactors,
        };
      })
    );

    const latency = Date.now() - startTime;
    console.log(`[Executor] Response time: ${latency}ms (found ${finalResults.length} results)`);

    return {
      builders: finalResults,
      steps,
      totalCandidates: candidateIds.length,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[Executor] Error after ${latency}ms:`, error);
    throw error;
  }
}

/**
 * Generate match explanation for a result
 */
function generateMatchExplanation(
  result: {
    builder: {
      name: string;
      role: string;
      skills: Array<{ name: string }>;
    };
    rankingFactors: {
      semanticScore: number;
      skillMatchScore: number;
      availabilityBoost: number;
    };
  },
  plan: SearchPlan
): string {
  const factors: string[] = [];

  if (result.rankingFactors.semanticScore > 0.7) {
    factors.push("Strong semantic match with your query");
  }

  if (result.rankingFactors.skillMatchScore > 0.6) {
    const matchedSkills = result.builder.skills
      .slice(0, 3)
      .map((s) => s.name)
      .join(", ");
    factors.push(`Relevant skills: ${matchedSkills}`);
  }

  if (result.rankingFactors.availabilityBoost > 1.0) {
    factors.push("Currently available for projects");
  }

  if (factors.length === 0) {
    return `Matches your search for ${plan.queryIntent.primary}`;
  }

  return factors.join(". ") + ".";
}

/**
 * Extract relevance factors for display
 */
function extractRelevanceFactors(factors: {
  semanticScore: number;
  keywordScore: number;
  skillMatchScore: number;
  availabilityBoost: number;
  recentActivityBoost: number;
  profileCompletenessBoost: number;
}): Array<{ factor: string; contribution: number }> {
  return [
    { factor: "Semantic match", contribution: factors.semanticScore },
    { factor: "Keyword match", contribution: factors.keywordScore },
    { factor: "Skill match", contribution: factors.skillMatchScore },
    { factor: "Availability", contribution: factors.availabilityBoost - 1.0 },
    { factor: "Profile completeness", contribution: factors.profileCompletenessBoost },
  ].filter((f) => f.contribution > 0.1);
}

