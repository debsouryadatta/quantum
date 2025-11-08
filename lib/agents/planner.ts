import { generateObject } from "ai";
import { z } from "zod";
import { openaiModels } from "@/lib/ai/openrouter";

const SearchPlanSchema = z.object({
  queryIntent: z.object({
    primary: z.string().describe("Primary search intent"),
    secondary: z.array(z.string()).describe("Secondary requirements"),
    implicit: z.array(z.string()).describe("Implicit needs (e.g., communication style, team fit)"),
  }),
  searchStrategy: z.object({
    approach: z.enum(["semantic", "keyword", "hybrid"]).describe("Search approach to use"),
    filters: z.object({
      roles: z.array(z.string()).nullable(),
      experienceLevels: z.array(z.string()).nullable(),
      skills: z.array(z.string()).nullable(),
      availability: z.array(z.string()).nullable(),
    }),
    rankingCriteria: z.array(
      z.object({
        factor: z.string(),
        weight: z.number().min(0).max(1),
      })
    ),
  }),
  expectedResultCount: z.number().int().min(1).max(50),
  confidenceScore: z.number().min(0).max(1),
});

export type SearchPlan = z.infer<typeof SearchPlanSchema>;

const PLANNER_SYSTEM_PROMPT = `You are a search planning agent for a teammate matching system. Your job is to analyze user queries and create structured search plans.

Analyze the query to extract:
1. Primary intent: What is the main thing they're looking for?
2. Secondary requirements: Additional skills or attributes mentioned
3. Implicit needs: Things not explicitly stated but likely important (e.g., communication style, team fit, work style)

Determine the best search approach:
- "semantic": For conceptual queries (e.g., "creative problem solver")
- "keyword": For specific tech stack queries (e.g., "React developer")
- "hybrid": For complex queries with both semantic and keyword elements

Extract filters from the query:
- Roles: frontend, backend, fullstack, design, product, data, ml
- Experience levels: beginner, intermediate, advanced, expert
- Skills: Specific technologies or skills mentioned
- Availability: available, busy, not_looking

Set ranking criteria based on what matters most for this query.`;

const FEW_SHOT_EXAMPLES = [
  {
    query: "React developer with design skills",
    plan: {
      queryIntent: {
        primary: "Find frontend developer with React experience",
        secondary: ["React", "design skills", "UI/UX"],
        implicit: ["creative", "detail-oriented", "collaborative"],
      },
      searchStrategy: {
        approach: "hybrid",
        filters: {
          roles: ["frontend", "fullstack"],
          skills: ["React"],
        },
        rankingCriteria: [
          { factor: "React experience", weight: 0.4 },
          { factor: "Design skills", weight: 0.3 },
          { factor: "Profile completeness", weight: 0.1 },
          { factor: "Availability", weight: 0.2 },
        ],
      },
      expectedResultCount: 10,
      confidenceScore: 0.85,
    },
  },
  {
    query: "Backend engineer experienced in Python and ML",
    plan: {
      queryIntent: {
        primary: "Find backend developer with Python and ML expertise",
        secondary: ["Python", "Machine Learning", "Backend"],
        implicit: ["analytical", "data-driven", "problem-solving"],
      },
      searchStrategy: {
        approach: "hybrid",
        filters: {
          roles: ["backend", "data", "ml"],
          skills: ["Python"],
        },
        rankingCriteria: [
          { factor: "Python experience", weight: 0.3 },
          { factor: "ML expertise", weight: 0.4 },
          { factor: "Backend experience", weight: 0.2 },
          { factor: "Availability", weight: 0.1 },
        ],
      },
      expectedResultCount: 12,
      confidenceScore: 0.9,
    },
  },
];

export async function planSearch(
  query: string,
  context?: { previousQueries?: string[]; userProfile?: unknown }
): Promise<SearchPlan> {
  const startTime = Date.now();

  try {
    const { object: plan } = await generateObject({
      model: openaiModels["grok-code-fast-1"](),
      schema: SearchPlanSchema,
      prompt: `${PLANNER_SYSTEM_PROMPT}

Examples:
${JSON.stringify(FEW_SHOT_EXAMPLES, null, 2)}

User Query: "${query}"
${context?.previousQueries ? `Previous queries: ${context.previousQueries.join(", ")}` : ""}

Generate a search plan for this query.`,
    });

    const latency = Date.now() - startTime;
    console.log(`[Planner] Response time: ${latency}ms`);
    if (latency > 8000) {
      console.warn(`[Planner] Latency (${latency}ms) exceeds target (8000ms)`);
    }

    return plan;
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[Planner] Error after ${latency}ms:`, error);
    // Return a default plan on error
    return {
      queryIntent: {
        primary: query,
        secondary: [],
        implicit: [],
      },
      searchStrategy: {
        approach: "hybrid",
        filters: {
          roles: null,
          experienceLevels: null,
          skills: null,
          availability: null,
        },
        rankingCriteria: [
          { factor: "relevance", weight: 1.0 },
        ],
      },
      expectedResultCount: 10,
      confidenceScore: 0.5,
    };
  }
}

