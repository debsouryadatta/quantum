import { SearchResult } from "./search";

export interface RankingFactors {
  semanticScore: number;
  keywordScore: number;
  skillMatchScore: number;
  availabilityBoost: number;
  recentActivityBoost: number;
  profileCompletenessBoost: number;
}

/**
 * Calculate skill match score
 */
export function calculateSkillMatchScore(
  builderSkills: Array<{ name: string; proficiencyLevel: string }>,
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) return 0.5; // Neutral score if no skills required

  const matchedSkills = builderSkills.filter((skill) =>
    requiredSkills.some((req) =>
      skill.name.toLowerCase().includes(req.toLowerCase()) ||
      req.toLowerCase().includes(skill.name.toLowerCase())
    )
  ).length;

  const matchRatio = matchedSkills / requiredSkills.length;

  // Weight by proficiency level
  const avgProficiency = matchedSkills > 0
    ? builderSkills
        .filter((skill) =>
          requiredSkills.some((req) =>
            skill.name.toLowerCase().includes(req.toLowerCase()) ||
            req.toLowerCase().includes(skill.name.toLowerCase())
          )
        )
        .reduce((sum, skill) => {
          const proficiencyMap = {
            beginner: 0.25,
            intermediate: 0.5,
            advanced: 0.75,
            expert: 1.0,
          };
          return sum + (proficiencyMap[skill.proficiencyLevel as keyof typeof proficiencyMap] || 0.5);
        }, 0) / matchedSkills
    : 0;

  return matchRatio * avgProficiency;
}

/**
 * Calculate availability boost
 */
export function calculateAvailabilityBoost(availabilityStatus: string): number {
  const boostMap: Record<string, number> = {
    available: 1.2,
    busy: 0.9,
    not_looking: 0.5,
  };

  return boostMap[availabilityStatus] || 1.0;
}

/**
 * Calculate recent activity boost based on update time
 */
export function calculateRecentActivityBoost(updatedAt: Date): number {
  const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysSinceUpdate / 30) * 0.2 + 0.8; // Decay over 30 days
}

/**
 * Calculate profile completeness boost
 */
export function calculateProfileCompletenessBoost(builder: {
  avatarUrl: string | null;
  bio: string | null;
  projects: unknown[];
  github: string | null;
}): number {
  let score = 0;

  if (builder.avatarUrl) score += 0.3;
  if (builder.projects && builder.projects.length > 0) score += 0.3;
  if (builder.github) score += 0.2;
  if (builder.bio && builder.bio.length > 100) score += 0.2;

  return score;
}

/**
 * Calculate final ranking score with multi-factor weighting
 */
export function calculateFinalScore(
  factors: RankingFactors,
  weights: {
    semantic?: number;
    keyword?: number;
    skillMatch?: number;
    availability?: number;
    recentActivity?: number;
    completeness?: number;
  } = {}
): number {
  const defaultWeights = {
    semantic: 0.35,
    keyword: 0.25,
    skillMatch: 0.20,
    availability: 0.10,
    recentActivity: 0.05,
    completeness: 0.05,
  };

  const w = { ...defaultWeights, ...weights };

  const score =
    factors.semanticScore * w.semantic! +
    factors.keywordScore * w.keyword! +
    factors.skillMatchScore * w.skillMatch! +
    factors.availabilityBoost * w.availability! +
    factors.recentActivityBoost * w.recentActivity! +
    factors.profileCompletenessBoost * w.completeness!;

  return Math.min(1.0, Math.max(0.0, score)); // Clamp between 0 and 1
}

/**
 * Rank search results with all factors
 */
export function rankResults(
  results: Array<{
    builder: SearchResult["builder"];
    similarityScore: number;
    keywordScore: number;
    updatedAt: Date;
  }>,
  requiredSkills: string[] = [],
  githubMap?: Array<{ id: string; github: string | null }>
): Array<SearchResult & { rankingFactors: RankingFactors }> {
  // Create a map for quick github lookup
  const githubLookup = new Map<string, string | null>();
  if (githubMap) {
    githubMap.forEach((item) => {
      githubLookup.set(item.id, item.github);
    });
  }

  return results.map((result) => {
    const skillMatchScore = calculateSkillMatchScore(
      result.builder.skills,
      requiredSkills
    );

    const availabilityBoost = calculateAvailabilityBoost(
      result.builder.availabilityStatus
    );

    const recentActivityBoost = calculateRecentActivityBoost(result.updatedAt);

    const profileCompletenessBoost = calculateProfileCompletenessBoost({
      avatarUrl: result.builder.avatarUrl,
      bio: result.builder.bio,
      projects: result.builder.projects,
      github: githubLookup.get(result.builder.id) || null,
    });

    const rankingFactors: RankingFactors = {
      semanticScore: result.similarityScore,
      keywordScore: result.keywordScore,
      skillMatchScore,
      availabilityBoost,
      recentActivityBoost,
      profileCompletenessBoost,
    };

    const finalScore = calculateFinalScore(rankingFactors);

    return {
      builder: result.builder,
      similarityScore: result.similarityScore,
      keywordScore: result.keywordScore,
      finalScore,
      rankingFactors,
    };
  });
}

/**
 * Ensure diversity in results (no more than 3 similar profiles)
 */
export function ensureDiversity(
  results: Array<SearchResult & { rankingFactors?: RankingFactors }>,
  maxSimilar: number = 3
): Array<SearchResult & { rankingFactors?: RankingFactors }> {
  const diverse: Array<SearchResult & { rankingFactors?: RankingFactors }> = [];
  const seenRoles = new Map<string, number>();

  for (const result of results) {
    const role = result.builder.role;
    const count = seenRoles.get(role) || 0;

    if (count < maxSimilar) {
      diverse.push(result);
      seenRoles.set(role, count + 1);
    }
  }

  return diverse;
}

