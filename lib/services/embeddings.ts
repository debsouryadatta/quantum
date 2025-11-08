import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { cache, cacheKeys } from "./cache";
import { createHash } from "crypto";

export interface EmbeddingResult {
  embedding: number[];
  cached: boolean;
}

/**
 * Generate embedding for a text string with caching
 */
export async function generateTextEmbedding(text: string): Promise<EmbeddingResult> {
  const textHash = createHash("sha256").update(text).digest("hex");
  const cacheKey = cacheKeys.embedding(textHash);

  // Check cache first
  const cached = await cache.get<number[]>(cacheKey);
  if (cached) {
    return { embedding: cached, cached: true };
  }

  // Generate embedding
  const { embedding } = await embed({
    model: openai.textEmbeddingModel("text-embedding-ada-002"),
    value: text,
  });

  // Cache for 1 hour
  await cache.set(cacheKey, embedding, 3600);

  return { embedding, cached: false };
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  const textsToGenerate: { text: string; index: number }[] = [];

  // Check cache for all texts
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const textHash = createHash("sha256").update(text).digest("hex");
    const cacheKey = cacheKeys.embedding(textHash);

    const cached = await cache.get<number[]>(cacheKey);
    if (cached) {
      results[i] = { embedding: cached, cached: true };
    } else {
      textsToGenerate.push({ text, index: i });
      results[i] = { embedding: [], cached: false }; // Placeholder
    }
  }

  // Generate embeddings for uncached texts
  if (textsToGenerate.length > 0) {
    const { embeddings } = await embedMany({
      model: openai.textEmbeddingModel("text-embedding-ada-002"),
      values: textsToGenerate.map(({ text }) => text),
    });

    // Store results and cache
    for (let i = 0; i < textsToGenerate.length; i++) {
      const { text, index } = textsToGenerate[i];
      const embedding = embeddings[i];
      const textHash = createHash("sha256").update(text).digest("hex");
      const cacheKey = cacheKeys.embedding(textHash);

      results[index] = { embedding, cached: false };
      await cache.set(cacheKey, embedding, 3600);
    }
  }

  return results;
}

/**
 * Generate composite profile embedding
 * Weighted combination of bio (40%), skills (30%), projects (20%), preferences (10%)
 */
export async function generateProfileEmbedding(profile: {
  bio?: string | null;
  skills?: string[];
  projects?: string[];
  preferences?: string;
}): Promise<number[]> {
  const embeddings: number[][] = [];
  const weights: number[] = [];

  // Bio embedding (40%)
  if (profile.bio) {
    const bioEmbedding = await generateTextEmbedding(profile.bio);
    embeddings.push(bioEmbedding.embedding);
    weights.push(0.4);
  }

  // Skills embedding (30%)
  if (profile.skills && profile.skills.length > 0) {
    const skillsText = profile.skills.join(", ");
    const skillsEmbedding = await generateTextEmbedding(skillsText);
    embeddings.push(skillsEmbedding.embedding);
    weights.push(0.3);
  }

  // Projects embedding (20%)
  if (profile.projects && profile.projects.length > 0) {
    const projectsText = profile.projects.join(" ");
    const projectsEmbedding = await generateTextEmbedding(projectsText);
    embeddings.push(projectsEmbedding.embedding);
    weights.push(0.2);
  }

  // Preferences embedding (10%)
  if (profile.preferences) {
    const preferencesEmbedding = await generateTextEmbedding(profile.preferences);
    embeddings.push(preferencesEmbedding.embedding);
    weights.push(0.1);
  }

  if (embeddings.length === 0) {
    throw new Error("Cannot generate profile embedding: no profile data provided");
  }

  // Normalize weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map((w) => w / totalWeight);

  // Weighted average of embeddings
  const dimension = embeddings[0].length;
  const compositeEmbedding = new Array(dimension).fill(0);

  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    const weight = normalizedWeights[i];
    for (let j = 0; j < dimension; j++) {
      compositeEmbedding[j] += embedding[j] * weight;
    }
  }

  // Normalize the composite embedding
  const magnitude = Math.sqrt(
    compositeEmbedding.reduce((sum, val) => sum + val * val, 0)
  );
  return compositeEmbedding.map((val) => val / magnitude);
}

/**
 * Convert embedding array to PostgreSQL vector string format
 */
export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Update embeddings for a builder profile
 * This should be called whenever a profile is created or updated
 */
export async function updateBuilderEmbeddings(
  builderId: string,
  profileData: {
    bio?: string | null;
    skills?: Array<{ name: string }>;
    projects?: Array<{ title: string; description: string; techStack: string[] }>;
    preferences?: {
      teamSize?: number[] | null;
      remotePreference?: string | null;
      hackathonTypes?: string[] | null;
      communicationStyle?: string | null;
      interests?: string[] | null;
    };
  }
): Promise<void> {
  const { prisma } = await import("@/lib/db");

  try {
    // Prepare data for embedding generation
    const skillsText = profileData.skills?.map((s) => s.name).join(", ") || "";
    const projectsText =
      profileData.projects
        ?.map(
          (p) =>
            `${p.title} ${p.description} ${p.techStack?.join(" ") || ""}`
        )
        .join(" ") || "";

    const preferencesText = profileData.preferences
      ? [
          profileData.preferences.teamSize?.join(", ") || "",
          profileData.preferences.remotePreference || "",
          profileData.preferences.hackathonTypes?.join(", ") || "",
          profileData.preferences.communicationStyle || "",
          profileData.preferences.interests?.join(", ") || "",
        ]
          .filter(Boolean)
          .join(" ")
      : "";

    // Generate bio embedding if bio exists
    let bioEmbedding: number[] | null = null;
    if (profileData.bio) {
      const bioResult = await generateTextEmbedding(profileData.bio);
      bioEmbedding = bioResult.embedding;
    }

    // Generate profile embedding (composite)
    const profileEmbedding = await generateProfileEmbedding({
      bio: profileData.bio || undefined,
      skills: skillsText ? [skillsText] : undefined,
      projects: projectsText ? [projectsText] : undefined,
      preferences: preferencesText || undefined,
    });

    // Update embeddings in database using raw SQL (since they're Unsupported types)
    // Build vector strings and use Prisma's tagged template (matching seed.ts pattern)
    const profileVectorString = `[${profileEmbedding.join(",")}]`;
    
    if (bioEmbedding) {
      const bioVectorString = `[${bioEmbedding.join(",")}]`;
      // Use template literal with string interpolation for vectors (safe - generated from our data)
      // and Prisma parameter binding for builderId
      await prisma.$executeRaw`
        UPDATE builders 
        SET 
          bio_embedding = ${`[${bioEmbedding.join(",")}]`}::vector(1536),
          profile_embedding = ${`[${profileEmbedding.join(",")}]`}::vector(1536)
        WHERE id = ${builderId}
      `;
    } else {
      // If no bio, only update profile embedding
      await prisma.$executeRaw`
        UPDATE builders 
        SET 
          profile_embedding = ${`[${profileEmbedding.join(",")}]`}::vector(1536)
        WHERE id = ${builderId}
      `;
    }
  } catch (error) {
    console.error(`Failed to update embeddings for builder ${builderId}:`, error);
    // Don't throw - embedding updates are non-critical
    // The search_vector trigger will still update the full-text search vector
  }
}

