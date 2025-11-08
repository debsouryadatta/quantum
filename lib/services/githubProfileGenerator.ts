/**
 * AI Profile Generator Service
 * Analyzes GitHub data and generates profile fields using AI
 */

import { openaiModels } from "@/lib/ai/openrouter";
import { generateObject } from "ai";
import { z } from 'zod/v3';
import type { GitHubData } from "./github";

const ProfileGenerationSchema = z.object({
  bio: z.string().max(500).nullable(),
  role: z.enum(["frontend", "backend", "fullstack", "design", "product", "data", "ml"]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  yearsOfExperience: z.number().int().min(0).nullable(),
  location: z.string().nullable(),
  timezone: z.string().nullable(),
  skills: z.array(
    z.object({
      name: z.string(),
      category: z.enum(["language", "framework", "tool", "domain", "soft_skill"]),
      proficiencyLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
      yearsOfExperience: z.number().int().min(0).nullable(),
    })
  ),
  projects: z.array(
    z.object({
      title: z.string(),
      description: z.string().max(1000),
      techStack: z.array(z.string()),
      url: z.string().nullable(),
      role: z.string(),
      impact: z.string().nullable(),
      imageUrl: z.string().nullable(),
      startDate: z.string(), // ISO date string
      endDate: z.string().nullable(), // ISO date string or null
    })
  ),
  preferencesInterests: z.array(z.string()).nullable(),
});

type GeneratedProfile = z.infer<typeof ProfileGenerationSchema>;

/**
 * Extract languages and technologies from repositories
 */
function extractTechnologies(data: GitHubData): {
  languages: Map<string, number>;
  frameworks: string[];
  tools: string[];
} {
  const languages = new Map<string, number>();
  const frameworks = new Set<string>();
  const tools = new Set<string>();

  // Collect languages from all repos
  data.repoLanguages.forEach((repoLangs) => {
    Object.entries(repoLangs).forEach(([lang, bytes]) => {
      const current = languages.get(lang) || 0;
      languages.set(lang, current + bytes);
    });
  });

  // Extract frameworks and tools from repo names, descriptions, and topics
  data.repositories.forEach((repo) => {
    // Common framework patterns
    const frameworkPatterns = [
      /react/i,
      /vue/i,
      /angular/i,
      /next/i,
      /nuxt/i,
      /express/i,
      /django/i,
      /flask/i,
      /rails/i,
      /spring/i,
      /laravel/i,
      /fastapi/i,
      /nest/i,
      /svelte/i,
    ];

    // Common tool patterns
    const toolPatterns = [
      /docker/i,
      /kubernetes/i,
      /aws/i,
      /gcp/i,
      /azure/i,
      /terraform/i,
      /jenkins/i,
      /github actions/i,
      /gitlab/i,
      /vercel/i,
      /netlify/i,
    ];

    const textToCheck = `${repo.name} ${repo.description || ""} ${repo.topics.join(" ")}`.toLowerCase();

    frameworkPatterns.forEach((pattern) => {
      if (pattern.test(textToCheck)) {
        const match = textToCheck.match(pattern);
        if (match) {
          frameworks.add(match[0]);
        }
      }
    });

    toolPatterns.forEach((pattern) => {
      if (pattern.test(textToCheck)) {
        const match = textToCheck.match(pattern);
        if (match) {
          tools.add(match[0]);
        }
      }
    });

    // Add topics that look like frameworks/tools
    repo.topics.forEach((topic) => {
      if (topic.includes("-") || topic.includes(".")) {
        frameworks.add(topic);
      }
    });
  });

  return {
    languages,
    frameworks: Array.from(frameworks),
    tools: Array.from(tools),
  };
}

/**
 * Calculate years of experience based on account creation date
 */
function calculateYearsOfExperience(createdAt: string): number {
  const accountDate = new Date(createdAt);
  const now = new Date();
  const years = (now.getTime() - accountDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  return Math.max(0, Math.floor(years));
}

/**
 * Determine role based on technologies and repositories
 */
function inferRole(
  languages: Map<string, number>,
  frameworks: string[],
  repos: GitHubData["repositories"]
): "frontend" | "backend" | "fullstack" | "design" | "product" | "data" | "ml" {
  const frontendTechs = ["javascript", "typescript", "html", "css", "react", "vue", "angular", "svelte"];
  const backendTechs = ["python", "java", "go", "rust", "php", "ruby", "c++", "c#", "node"];
  const dataTechs = ["python", "r", "sql", "jupyter", "pandas", "numpy", "tensorflow", "pytorch"];
  const mlTechs = ["python", "tensorflow", "pytorch", "scikit-learn", "keras", "jupyter"];

  const allLangs = Array.from(languages.keys()).map((l) => l.toLowerCase());
  const allFrameworks = frameworks.map((f) => f.toLowerCase());
  const allTechs = [...allLangs, ...allFrameworks];

  // Check for ML/Data
  const hasML = mlTechs.some((tech) => allTechs.some((t) => t.includes(tech)));
  const hasData = dataTechs.some((tech) => allTechs.some((t) => t.includes(tech)));
  if (hasML) return "ml";
  if (hasData && repos.some((r) => r.description?.toLowerCase().includes("data"))) return "data";

  // Check for design
  if (repos.some((r) => r.topics.some((t) => t.includes("design") || t.includes("ui") || t.includes("ux")))) {
    return "design";
  }

  // Check frontend vs backend
  const frontendCount = frontendTechs.filter((tech) => allTechs.some((t) => t.includes(tech))).length;
  const backendCount = backendTechs.filter((tech) => allTechs.some((t) => t.includes(tech))).length;

  if (frontendCount > 0 && backendCount > 0) return "fullstack";
  if (frontendCount > backendCount) return "frontend";
  if (backendCount > frontendCount) return "backend";

  return "fullstack"; // Default
}

/**
 * Determine experience level based on years and repository activity
 */
function inferExperienceLevel(
  years: number,
  repoCount: number,
  totalStars: number
): "beginner" | "intermediate" | "advanced" | "expert" {
  if (years >= 8 || (repoCount > 50 && totalStars > 500)) return "expert";
  if (years >= 5 || (repoCount > 20 && totalStars > 100)) return "advanced";
  if (years >= 2 || repoCount > 5) return "intermediate";
  return "beginner";
}

/**
 * Generate profile using AI
 */
export async function generateProfileFromGitHub(
  githubData: GitHubData
): Promise<GeneratedProfile> {
  const { user, repositories, repoLanguages } = githubData;

  // Extract technologies
  const { languages, frameworks, tools } = extractTechnologies(githubData);

  // Calculate metrics
  const yearsOfExperience = calculateYearsOfExperience(user.created_at);
  const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const role = inferRole(languages, frameworks, repositories);
  const experienceLevel = inferExperienceLevel(yearsOfExperience, repositories.length, totalStars);

  // Prepare context for AI
  const topRepos = repositories
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 10);

  const repoDetails = topRepos.map((repo) => {
    const langs = repoLanguages.get(repo.full_name) || {};
    return {
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      languages: Object.keys(langs),
      stars: repo.stargazers_count,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      topics: repo.topics,
    };
  });

  const context = {
    user: {
      name: user.name || user.login,
      bio: user.bio,
      location: user.location,
      company: user.company,
      publicRepos: user.public_repos,
      followers: user.followers,
      accountCreatedAt: user.created_at,
    },
    technologies: {
      languages: Array.from(languages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([lang]) => lang),
      frameworks: frameworks.slice(0, 10),
      tools: tools.slice(0, 10),
    },
    topRepositories: repoDetails,
    metrics: {
      yearsOfExperience,
      totalRepos: repositories.length,
      totalStars,
    },
  };

  // Generate profile using AI
  const { object } = await generateObject({
    model: openaiModels["grok-code-fast-1"](),
    schema: ProfileGenerationSchema,
    prompt: `Analyze this GitHub profile data and generate a comprehensive developer profile.

User Information:
- Name: ${context.user.name}
- Bio: ${context.user.bio || "No bio provided"}
- Location: ${context.user.location || "Not specified"}
- Company: ${context.user.company || "Not specified"}
- Account created: ${new Date(context.user.accountCreatedAt).getFullYear()}
- Public repositories: ${context.user.publicRepos}
- Followers: ${context.user.followers}

Technologies Used:
- Languages: ${context.technologies.languages.join(", ")}
- Frameworks: ${context.technologies.frameworks.join(", ") || "None detected"}
- Tools: ${context.technologies.tools.join(", ") || "None detected"}

Top Repositories:
${repoDetails.map((repo, i) => `${i + 1}. ${repo.name} - ${repo.description || "No description"}
   Languages: ${repo.languages.join(", ") || "None"}
   Stars: ${repo.stars}
   Topics: ${repo.topics.join(", ") || "None"}`).join("\n")}

Metrics:
- Years of experience (based on account age): ${context.metrics.yearsOfExperience}
- Total repositories: ${context.metrics.totalRepos}
- Total stars: ${context.metrics.totalStars}

Please generate:
1. A professional bio (max 500 chars) that summarizes their expertise and interests
2. Skills array with appropriate categories (language/framework/tool/domain/soft_skill) and proficiency levels based on usage
3. Projects array (up to 10) from their top repositories with descriptions, tech stack, and impact
4. Interests array based on repository topics and descriptions

Guidelines:
- Infer role as: ${role}
- Infer experience level as: ${experienceLevel}
- For skills, use yearsOfExperience based on when they likely started using that technology
- For projects, use actual repository data and make realistic impact descriptions
- Extract interests from repository topics, descriptions, and technologies
- Use ISO date strings for project dates (startDate from repo createdAt, endDate null if recently updated)
- Keep descriptions concise and professional`,
  });

  // Enhance the generated profile with additional data
  const enhancedProfile: GeneratedProfile = {
    ...object,
    location: object.location || user.location || null,
    yearsOfExperience: object.yearsOfExperience ?? yearsOfExperience,
    role,
    experienceLevel,
  };

  return enhancedProfile;
}

