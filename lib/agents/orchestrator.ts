import { planSearch, type SearchPlan } from "./planner";
import { executeSearch, type ExecutionResult } from "./executor";
import { evaluateResults, type EvaluationResult } from "./evaluator";
import { prisma, executeWithRetry } from "@/lib/db";
import { randomUUID } from "crypto";

export interface OrchestrationState {
  sessionId: string;
  phase: "planning" | "executing" | "evaluating" | "refining" | "complete";
  plan?: SearchPlan;
  executionResult?: ExecutionResult;
  evaluation?: EvaluationResult;
  refinementCount: number;
  totalIterations: number;
}

export interface OrchestrationResult {
  sessionId: string;
  query: string;
  agentReasoning: {
    plan: SearchPlan;
    executionSteps: ExecutionResult["steps"];
    evaluation: EvaluationResult;
    refinements: Array<{
      iteration: number;
      reason: string;
      plan: SearchPlan;
    }>;
    totalIterations: number;
  };
  results: ExecutionResult["builders"];
  metadata: {
    totalResults: number;
    latencyMs: number;
    llmCallsCount: number;
    searchStrategy: string;
    agentTimings?: {
      plannerMs: number;
      executorMs: number;
      evaluatorMs: number;
      totalEvaluatorMs: number; // Sum of all evaluator calls (including refinements)
    };
  };
}

const MAX_REFINEMENT_ITERATIONS = 2;
const QUALITY_THRESHOLD = 0.7;
const EARLY_TERMINATION_THRESHOLD = 0.85;

/**
 * Orchestrate the complete agent search flow
 */
export async function orchestrateSearch(
  query: string,
  options: {
    maxResults?: number;
    filters?: {
      roles?: string[];
      experienceLevels?: string[];
      availability?: string[];
    };
    userId?: string;
  } = {}
): Promise<OrchestrationResult> {
  const sessionId = randomUUID();
  const startTime = Date.now();
  let llmCallsCount = 0;
  const refinements: Array<{ iteration: number; reason: string; plan: SearchPlan }> = [];
  
  // Track agent timings
  let plannerTime = 0;
  let executorTime = 0;
  let totalEvaluatorTime = 0;

  let state: OrchestrationState = {
    sessionId,
    phase: "planning",
    refinementCount: 0,
    totalIterations: 0,
  };

  try {
    // Phase 1: Planning
    state.phase = "planning";
    await updateAgentState(state);
    const plannerStart = Date.now();
    const plan = await planSearch(query);
    plannerTime = Date.now() - plannerStart;
    llmCallsCount++;
    state.plan = plan;
    state.totalIterations++;

    // Apply user-provided filters to plan
    if (options.filters) {
      if (options.filters.roles) {
        plan.searchStrategy.filters.roles = options.filters.roles;
      }
      if (options.filters.experienceLevels) {
        plan.searchStrategy.filters.experienceLevels = options.filters.experienceLevels;
      }
      if (options.filters.availability) {
        plan.searchStrategy.filters.availability = options.filters.availability;
      }
    }

    // Phase 2: Execution
    state.phase = "executing";
    await updateAgentState(state);
    const executorStart = Date.now();
    let executionResult = await executeSearch(plan, options.maxResults || 20);
    executorTime = Date.now() - executorStart;

    // Phase 3: Evaluation
    state.phase = "evaluating";
    await updateAgentState(state);
    const evaluatorStart = Date.now();
    let evaluation = await evaluateResults(plan, executionResult);
    const evaluatorTime = Date.now() - evaluatorStart;
    totalEvaluatorTime += evaluatorTime;
    llmCallsCount++;

    // Early termination check
    if (
      evaluation.confidenceScore >= EARLY_TERMINATION_THRESHOLD &&
      executionResult.builders.length >= (options.maxResults || 20)
    ) {
      state.phase = "complete";
      await updateAgentState(state);
      const totalLatency = Date.now() - startTime;
      console.log(`[Orchestrator] Total time: ${totalLatency}ms | Planner: ${plannerTime}ms | Executor: ${executorTime}ms | Evaluator: ${totalEvaluatorTime}ms`);
      return buildResult(sessionId, query, plan, executionResult, evaluation, refinements, {
        latencyMs: totalLatency,
        llmCallsCount,
        agentTimings: {
          plannerMs: plannerTime,
          executorMs: executorTime,
          evaluatorMs: evaluatorTime,
          totalEvaluatorMs: totalEvaluatorTime,
        },
      });
    }

    // Phase 4: Refinement Loop (max 2 iterations)
    while (
      evaluation.needsRefinement &&
      state.refinementCount < MAX_REFINEMENT_ITERATIONS &&
      evaluation.confidenceScore < QUALITY_THRESHOLD
    ) {
      state.phase = "refining";
      state.refinementCount++;
      await updateAgentState(state);

      // Apply refinement suggestions
      const refinedPlan = applyRefinement(plan, evaluation, executionResult);
      refinements.push({
        iteration: state.refinementCount,
        reason: evaluation.refinementReason || "Low quality scores",
        plan: refinedPlan,
      });

      // Re-execute with refined plan
      state.phase = "executing";
      await updateAgentState(state);
      const refinementExecutorStart = Date.now();
      executionResult = await executeSearch(refinedPlan, options.maxResults || 20);
      executorTime += Date.now() - refinementExecutorStart;

      // Re-evaluate
      state.phase = "evaluating";
      await updateAgentState(state);
      const refinementEvaluatorStart = Date.now();
      evaluation = await evaluateResults(refinedPlan, executionResult);
      const refinementEvaluatorTime = Date.now() - refinementEvaluatorStart;
      totalEvaluatorTime += refinementEvaluatorTime;
      llmCallsCount++;
      state.totalIterations++;

      // Check if we've improved enough
      if (evaluation.confidenceScore >= QUALITY_THRESHOLD) {
        break;
      }
    }

    state.phase = "complete";
    await updateAgentState(state);

    const totalLatency = Date.now() - startTime;
    console.log(`[Orchestrator] Total time: ${totalLatency}ms | Planner: ${plannerTime}ms | Executor: ${executorTime}ms | Evaluator: ${totalEvaluatorTime}ms`);
    
    return buildResult(sessionId, query, plan, executionResult, evaluation, refinements, {
      latencyMs: totalLatency,
      llmCallsCount,
      agentTimings: {
        plannerMs: plannerTime,
        executorMs: executorTime,
        evaluatorMs: totalEvaluatorTime / (refinements.length + 1), // Average evaluator time
        totalEvaluatorMs: totalEvaluatorTime,
      },
    });
  } catch (error) {
    console.error("Orchestration error:", error);
    state.phase = "complete";
    await updateAgentState(state);
    throw error;
  }
}

/**
 * Apply refinement suggestions to search plan
 */
function applyRefinement(
  plan: SearchPlan,
  evaluation: EvaluationResult,
  executionResult: ExecutionResult
): SearchPlan {
  const refinedPlan = { ...plan };

  if (!evaluation.refinementSuggestions || evaluation.refinementSuggestions.length === 0) {
    return refinedPlan;
  }

  for (const suggestion of evaluation.refinementSuggestions) {
    switch (suggestion.action) {
      case "broaden":
        // Remove strict filters
        if (refinedPlan.searchStrategy.filters.experienceLevels) {
          refinedPlan.searchStrategy.filters.experienceLevels = null;
        }
        // Lower similarity threshold by adjusting approach
        if (refinedPlan.searchStrategy.approach === "semantic") {
          refinedPlan.searchStrategy.approach = "hybrid";
        }
        break;

      case "narrow":
        // Add more specific filters based on top results
        if (executionResult.builders.length > 0) {
          const topRoles = new Set(
            executionResult.builders.slice(0, 5).map((b) => b.role)
          );
          refinedPlan.searchStrategy.filters.roles = Array.from(topRoles);
        }
        break;

      case "reweight":
        // Adjust ranking criteria weights
        if (suggestion.parameters.weights) {
          refinedPlan.searchStrategy.rankingCriteria = Object.entries(
            suggestion.parameters.weights
          ).map(([factor, weight]) => ({
            factor,
            weight: weight as number,
          }));
        }
        break;

      case "filter":
        // Apply additional filters
        if (suggestion.parameters.filters) {
          Object.assign(refinedPlan.searchStrategy.filters, suggestion.parameters.filters);
        }
        break;
    }
  }

  return refinedPlan;
}

/**
 * Build final result object
 */
function buildResult(
  sessionId: string,
  query: string,
  plan: SearchPlan,
  executionResult: ExecutionResult,
  evaluation: EvaluationResult,
  refinements: Array<{ iteration: number; reason: string; plan: SearchPlan }>,
  metadata: { latencyMs: number; llmCallsCount: number; agentTimings?: OrchestrationResult["metadata"]["agentTimings"] }
): OrchestrationResult {
  return {
    sessionId,
    query,
    agentReasoning: {
      plan,
      executionSteps: executionResult.steps,
      evaluation,
      refinements,
      totalIterations: refinements.length + 1,
    },
    results: executionResult.builders,
    metadata: {
      totalResults: executionResult.builders.length,
      latencyMs: metadata.latencyMs,
      llmCallsCount: metadata.llmCallsCount,
      searchStrategy: plan.searchStrategy.approach,
      agentTimings: metadata.agentTimings,
    },
  };
}

/**
 * Update agent state in database
 */
async function updateAgentState(state: OrchestrationState): Promise<void> {
  try {
    await executeWithRetry(async () => {
      await prisma.agentState.upsert({
        where: { id: state.sessionId },
        create: {
          id: state.sessionId,
          sessionId: state.sessionId,
          currentPhase: state.phase,
          state: state as any,
        },
        update: {
          currentPhase: state.phase,
          state: state as any,
        },
      });
    });
  } catch (error) {
    // Don't fail the search if state update fails
    console.error("Failed to update agent state:", error);
  }
}

