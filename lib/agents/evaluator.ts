import { generateObject } from "ai";
import { z } from "zod";
import { openaiModels } from "@/lib/ai/openrouter";
import type { ExecutionResult } from "./executor";
import type { SearchPlan } from "./planner";

const EvaluationSchema = z.object({
  relevanceScore: z.number().min(0).max(1).describe("How relevant are the results to the query?"),
  diversityScore: z.number().min(0).max(1).describe("How diverse are the results?"),
  coverageScore: z.number().min(0).max(1).describe("How well do results cover all query aspects?"),
  confidenceScore: z.number().min(0).max(1).describe("Overall confidence in result quality"),
  needsRefinement: z.boolean().describe("Whether results need refinement"),
  refinementReason: z.string().nullable().describe("Reason for refinement if needed, or null if not needed"),
  refinementSuggestions: z.array(
    z.object({
      action: z.enum(["broaden", "narrow", "reweight", "filter"]),
      parameters: z.object({}), // Required object type - ensures type: object for OpenAI API compatibility
    })
  ).nullable(),
});

export type EvaluationResult = z.infer<typeof EvaluationSchema>;

const EVALUATOR_SYSTEM_PROMPT = `You are an evaluation agent for a search system. Your job is to assess the quality of search results and determine if refinement is needed.

Evaluate results across four dimensions:
1. Relevance: Do results match what the user is looking for?
2. Diversity: Are results varied enough (not too similar)?
3. Coverage: Do results address all aspects of the query?
4. Confidence: Overall quality assessment

Determine if refinement is needed:
- If relevanceScore < 0.6 → needs refinement
- If top 5 results have similarity > 0.9 → needs diversity
- If coverageScore < 0.7 → broaden search
- If results > 15 with low variance → narrow search

Suggest specific refinement actions if needed.`;

export async function evaluateResults(
  plan: SearchPlan,
  executionResult: ExecutionResult
): Promise<EvaluationResult> {
  const startTime = Date.now();

  try {
    // Calculate diversity score (check for similar roles/experience)
    const roles = executionResult.builders.map((b) => b.role);
    const uniqueRoles = new Set(roles).size;
    const diversityScore = Math.min(1.0, uniqueRoles / Math.max(1, executionResult.builders.length / 2));

    // Calculate coverage score (check if results cover query aspects)
    const queryAspects = [
      plan.queryIntent.primary,
      ...plan.queryIntent.secondary,
    ];
    let coveredAspects = 0;
    for (const aspect of queryAspects) {
      const aspectLower = aspect.toLowerCase();
      const hasMatch = executionResult.builders.some((b) => {
        const bio = (b.bio || "").toLowerCase();
        const skills = b.skills.map((s) => s.name.toLowerCase()).join(" ");
        return bio.includes(aspectLower) || skills.includes(aspectLower);
      });
      if (hasMatch) coveredAspects++;
    }
    const coverageScore = queryAspects.length > 0 ? coveredAspects / queryAspects.length : 0.5;

    // Calculate average relevance score
    const avgScore = executionResult.builders.length > 0
      ? executionResult.builders.reduce((sum, b) => sum + b.score, 0) / executionResult.builders.length
      : 0;
    const relevanceScore = Math.min(1.0, avgScore);

    // Use LLM for final evaluation and refinement suggestions
    let evaluation: EvaluationResult;
    try {
      const result = await generateObject({
        model: openaiModels["grok-code-fast-1"](),
        schema: EvaluationSchema,
        prompt: `${EVALUATOR_SYSTEM_PROMPT}

Original Query: "${plan.queryIntent.primary}"
Secondary Requirements: ${plan.queryIntent.secondary.join(", ")}

Search Results (${executionResult.builders.length} found):
${executionResult.builders.slice(0, 5).map((b, i) => 
  `${i + 1}. ${b.name} (${b.role}) - Score: ${b.score.toFixed(2)} - ${b.matchExplanation}`
).join("\n")}

Calculated Metrics:
- Relevance Score: ${relevanceScore.toFixed(2)}
- Diversity Score: ${diversityScore.toFixed(2)}
- Coverage Score: ${coverageScore.toFixed(2)}

Evaluate these results and determine if refinement is needed.`,
      });
      evaluation = result.object;
    } catch (llmError) {
      // If LLM call fails, use calculated metrics only
      console.warn("LLM evaluation failed, using calculated metrics:", llmError);
      evaluation = {
        relevanceScore,
        diversityScore,
        coverageScore,
        confidenceScore: (relevanceScore + diversityScore + coverageScore) / 3,
        needsRefinement: relevanceScore < 0.6 || diversityScore < 0.5,
        refinementReason: relevanceScore < 0.6 ? "Low relevance scores" : diversityScore < 0.5 ? "Low diversity" : null,
        refinementSuggestions: relevanceScore < 0.6
          ? [{ action: "broaden" as const, parameters: {} }]
          : diversityScore < 0.5
          ? [{ action: "reweight" as const, parameters: {} }]
          : null,
      };
    }

    const latency = Date.now() - startTime;
    console.log(`[Evaluator] Response time: ${latency}ms`);
    if (latency > 8000) {
      console.warn(`[Evaluator] Latency (${latency}ms) exceeds target (8000ms)`);
    }

    // Override with calculated scores to ensure consistency
    return {
      ...evaluation,
      relevanceScore,
      diversityScore,
      coverageScore,
      confidenceScore: (relevanceScore + diversityScore + coverageScore) / 3,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[Evaluator] Error after ${latency}ms:`, error);
    // Return default evaluation on error
    const avgScore = executionResult.builders.length > 0
      ? executionResult.builders.reduce((sum, b) => sum + b.score, 0) / executionResult.builders.length
      : 0;

    return {
      relevanceScore: avgScore,
      diversityScore: 0.5,
      coverageScore: 0.5,
      confidenceScore: avgScore,
      needsRefinement: avgScore < 0.6,
      refinementReason: avgScore < 0.6 ? "Low relevance scores" : null,
      refinementSuggestions: avgScore < 0.6
        ? [{ action: "broaden" as const, parameters: {} }]
        : null,
    };
  }
}

