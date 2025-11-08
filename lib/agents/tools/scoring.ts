import { RagSearchResult } from "./rag-search";
import { KeywordSearchResult } from "./keyword-search";
import {
  calculateSkillMatchScore,
  calculateAvailabilityBoost,
  calculateRecentActivityBoost,
  calculateProfileCompletenessBoost,
  type RankingFactors,
} from "@/lib/services/ranking";

export interface ScoredResult {
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
  score: number;
  matchReason: string;
  relevanceFactors: Array<{ factor: string; contribution: number }>;
}

/**
 * Combine RAG and keyword search results with unified scoring
 */
export function combineAndScoreResults(
  ragResults: RagSearchResult[],
  keywordResults: KeywordSearchResult[],
  query: string,
  ragWeight: number = 0.6,
  keywordWeight: number = 0.4
): ScoredResult[] {
  // Create maps for quick lookup
  const ragMap = new Map<string, RagSearchResult>();
  ragResults.forEach((r) => {
    ragMap.set(r.builderId, r);
  });

  const keywordMap = new Map<string, KeywordSearchResult>();
  keywordResults.forEach((r) => {
    keywordMap.set(r.builderId, r);
  });

  // Get all unique builder IDs
  const allBuilderIds = new Set([
    ...ragResults.map((r) => r.builderId),
    ...keywordResults.map((r) => r.builderId),
  ]);

  // Extract skills from query (simple keyword extraction)
  const queryLower = query.toLowerCase();
  const querySkills = extractSkillsFromQuery(query);

  // Combine and score results
  const scoredResults: ScoredResult[] = Array.from(allBuilderIds).map((builderId) => {
    const ragResult = ragMap.get(builderId);
    const keywordResult = keywordMap.get(builderId);

    // Use whichever result has more complete data
    const baseResult = ragResult || keywordResult;
    if (!baseResult) {
      throw new Error(`Missing result for builder ${builderId}`);
    }

    // Get scores (normalize to 0-1 range)
    const ragScore = ragResult?.similarityScore || 0;
    const keywordScore = keywordResult?.keywordScore || 0;

    // Normalize keyword score (it's typically 0-1 already, but ensure it)
    const normalizedKeywordScore = Math.min(1, Math.max(0, keywordScore));

    // Calculate combined base score
    const baseScore = ragScore * ragWeight + normalizedKeywordScore * keywordWeight;

    // Calculate additional factors
    const skillMatchScore = calculateSkillMatchScore(baseResult.skills, querySkills);
    const availabilityBoost = calculateAvailabilityBoost(baseResult.availabilityStatus);
    const profileCompletenessBoost = calculateProfileCompletenessBoost({
      avatarUrl: baseResult.avatarUrl,
      bio: baseResult.bio,
      projects: baseResult.projects,
      github: keywordResult?.github || null,
    });

    // Calculate final score with boosts
    const finalScore = Math.min(
      1.0,
      Math.max(
        0.0,
        baseScore * 0.7 +
          skillMatchScore * 0.2 +
          (availabilityBoost - 1.0) * 0.05 +
          profileCompletenessBoost * 0.05
      )
    );

    // Generate match reason
    const matchReason = generateMatchReason(
      baseResult,
      ragScore,
      normalizedKeywordScore,
      skillMatchScore,
      availabilityBoost,
      query
    );

    // Extract relevance factors
    const relevanceFactors = extractRelevanceFactors({
      semanticScore: ragScore,
      keywordScore: normalizedKeywordScore,
      skillMatchScore,
      availabilityBoost,
      profileCompletenessBoost,
    });

    return {
      builderId: baseResult.builderId,
      name: baseResult.name,
      role: baseResult.role,
      bio: baseResult.bio,
      avatarUrl: baseResult.avatarUrl,
      location: baseResult.location,
      availabilityStatus: baseResult.availabilityStatus,
      github: keywordResult?.github || null,
      skills: baseResult.skills,
      projects: baseResult.projects,
      score: finalScore,
      matchReason,
      relevanceFactors,
    };
  });

  // Sort by score (descending)
  return scoredResults.sort((a, b) => b.score - a.score);
}

/**
 * Extract skills from query (simple keyword matching)
 */
function extractSkillsFromQuery(query: string): string[] {
  const commonSkills = [
    "react",
    "vue",
    "angular",
    "node",
    "python",
    "java",
    "javascript",
    "typescript",
    "go",
    "rust",
    "php",
    "ruby",
    "swift",
    "kotlin",
    "django",
    "flask",
    "express",
    "next",
    "nuxt",
    "svelte",
    "mongodb",
    "postgresql",
    "mysql",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure",
    "figma",
    "sketch",
    "adobe",
    "design",
    "ui",
    "ux",
  ];

  const queryLower = query.toLowerCase();
  return commonSkills.filter((skill) => queryLower.includes(skill));
}

/**
 * Generate human-readable match reason
 */
function generateMatchReason(
  result: RagSearchResult | KeywordSearchResult,
  ragScore: number,
  keywordScore: number,
  skillMatchScore: number,
  availabilityBoost: number,
  query: string
): string {
  const reasons: string[] = [];

  if (ragScore > 0.7) {
    reasons.push("Strong semantic match with your query");
  } else if (ragScore > 0.5) {
    reasons.push("Good semantic match");
  }

  if (keywordScore > 0.5) {
    reasons.push("Relevant keywords found");
  }

  if (skillMatchScore > 0.6) {
    const matchedSkills = result.skills
      .slice(0, 3)
      .map((s) => s.name)
      .join(", ");
    reasons.push(`Relevant skills: ${matchedSkills}`);
  }

  if (availabilityBoost > 1.0) {
    reasons.push("Currently available for projects");
  }

  if (reasons.length === 0) {
    return `Matches your search for "${query}"`;
  }

  return reasons.join(". ") + ".";
}

/**
 * Extract relevance factors for display
 */
function extractRelevanceFactors(factors: {
  semanticScore: number;
  keywordScore: number;
  skillMatchScore: number;
  availabilityBoost: number;
  profileCompletenessBoost: number;
}): Array<{ factor: string; contribution: number }> {
  return [
    { factor: "Semantic match", contribution: factors.semanticScore },
    { factor: "Keyword match", contribution: factors.keywordScore },
    { factor: "Skill match", contribution: factors.skillMatchScore },
    { factor: "Availability", contribution: Math.max(0, factors.availabilityBoost - 1.0) },
    { factor: "Profile completeness", contribution: factors.profileCompletenessBoost },
  ].filter((f) => f.contribution > 0.1);
}

