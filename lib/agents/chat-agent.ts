import { tool } from "ai";
import { openaiModels } from "@/lib/ai/openrouter";
import { ragSearchTool, ragSearchSchema, type RagSearchParams } from "./tools/rag-search";
import { keywordSearchTool, keywordSearchSchema, type KeywordSearchParams } from "./tools/keyword-search";
import { combineAndScoreResults, ScoredResult } from "./tools/scoring";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SearchResponse {
  type: "search_results";
  results: Array<{
    builderId: string;
    name: string;
    role: string;
    score: number;
    matchReason: string;
    skills: string[];
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
  }>;
  message: string;
}

const SYSTEM_PROMPT = `You are a helpful search assistant for finding teammates and collaborators. Your job is to help users find the right people for their projects.

⚠️ CRITICAL RULE: ASK QUESTIONS FIRST, SEARCH LATER ⚠️
Your PRIMARY job is to ask clarifying questions BEFORE searching. Most queries are vague and need clarification. Only search when you have ALL the necessary details.

CRITICAL: DEFAULT BEHAVIOR - ASK CLARIFYING QUESTIONS FIRST
Your DEFAULT behavior should be to ask 1-2 clarifying questions BEFORE performing any search. 

ONLY skip asking questions if the user's query is EXTREMELY SPECIFIC and contains ALL THREE of the following:
1. Specific role type explicitly mentioned (frontend developer, backend developer, fullstack, designer, product manager, data scientist, ML engineer)
2. Specific skills or technologies mentioned (e.g., "React", "Python", "AWS", "Figma")
3. Clear project context or requirements (e.g., "for a fintech startup", "for a SaaS product", "for building a mobile app")

If ANY of these three elements is missing or vague, you MUST ask clarifying questions first.

Examples of queries that NEED clarifying questions:
- "I need a developer" → Too vague, ask about role and skills
- "Find me someone good at React" → Ask about role type, experience level, project type
- "Looking for a teammate" → Ask about role, skills, project type
- "Need help with my project" → Ask about what kind of project, what skills needed, role type
- "Find a designer" → Ask about design specialization, project type, experience level

Examples of queries that are SPECIFIC ENOUGH to search directly:
- "Find me a senior fullstack developer with React and Node.js experience for a fintech startup"
- "Looking for a frontend developer with 5+ years React and TypeScript experience for a SaaS product"
- "Need an expert Python backend developer with AWS experience for a data platform"

CLARIFYING QUESTIONS TO ASK (choose 1-2 most relevant):
1. **Role/Type**: "What type of role are you looking for? (frontend developer, backend developer, fullstack, designer, product manager, data scientist, ML engineer)"
2. **Skills**: "What specific technical skills or technologies are required? (e.g., React, Python, AWS, Figma)"
3. **Experience Level**: "What level of experience do you need? (beginner, intermediate, advanced, expert/senior)"
4. **Project Type**: "What kind of project or work are you collaborating on? (e.g., web app, mobile app, SaaS product, startup, open source)"
5. **Availability**: "Do you need someone who is currently available or open to new opportunities?"
6. **Location/Timezone**: "Is location or timezone important for collaboration?"

WHEN TO SEARCH:
Only proceed to search when:
- The user has answered your clarifying questions, OR
- The original query contains role type + specific skills + project context

SEARCH TOOLS:
When you have enough information, use the available tools:
1. ragSearch - for semantic/semantic similarity searches (best for conceptual queries like "creative problem solver" or "experienced team player")
2. keywordSearch - for searching by specific keywords, names, skills, GitHub usernames, etc.

You can use both tools if appropriate - ragSearch for conceptual matching and keywordSearch for specific skill/name matching.

AFTER GETTING RESULTS:
1. Transform the tool results into the required schema format:
   - Use similarityScore (from ragSearch) or keywordScore (from keywordSearch) as the score (ensure it's between 0-1)
   - Generate a matchReason explaining why each builder matches the query based on their skills, bio, role, or projects
   - Map all fields correctly (builderId, name, role, skills, avatarUrl, bio, location)
2. Provide a conversational response explaining what you found
3. Include a friendly summary message

RESPONSE SCHEMA:
For each result in your response:
- builderId: The unique identifier from the tool result
- name: Builder's name
- role: Their role (frontend, backend, fullstack, design, product, data, ml)
- score: Normalized relevance score (0-1) from similarityScore or keywordScore
- matchReason: A clear, specific explanation of why this builder matches the query (e.g., "Matches because they have React and TypeScript skills and experience in frontend development")
- skills: Array of skill names (extract from the skills array in tool results)
- avatarUrl: Profile picture URL (or null)
- bio: Builder's bio (or null)
- location: Builder's location (or null)

CRITICAL INSTRUCTION: When asking clarifying questions:
- Set results to an empty array: []
- Put your questions in the response field (be conversational and friendly)
- Set message to a brief summary like "I'd like to ask a few questions to find the best matches for you."
- DO NOT call any search tools until you have the necessary information`;

/**
 * Create a chat agent with search tools
 */
export async function createChatAgent() {
  const model = openaiModels["grok-code-fast-1"]();

  // Define tools
  const tools = {
    ragSearch: tool({
      description: "Perform semantic/RAG search using embeddings. Best for conceptual queries like 'creative problem solver' or 'experienced team player'.",
      inputSchema: ragSearchSchema,
      execute: async (params: RagSearchParams) => {
        const results = await ragSearchTool(params);
        return {
          success: true,
          results: results.map((r) => ({
            builderId: r.builderId,
            name: r.name,
            role: r.role,
            bio: r.bio,
            avatarUrl: r.avatarUrl,
            location: r.location,
            availabilityStatus: r.availabilityStatus,
            similarityScore: r.similarityScore,
            skills: r.skills.map((s) => s.name),
            projects: r.projects.map((p) => p.title),
          })),
          count: results.length,
        };
      },
    }),

    keywordSearch: tool({
      description: "Search by keywords across names, GitHub usernames, skills, projects, bio, and other fields. Best for specific searches like 'React developer' or 'John Doe'.",
      inputSchema: keywordSearchSchema,
      execute: async (params: KeywordSearchParams) => {
        const results = await keywordSearchTool(params);
        return {
          success: true,
          results: results.map((r) => ({
            builderId: r.builderId,
            name: r.name,
            role: r.role,
            bio: r.bio,
            avatarUrl: r.avatarUrl,
            location: r.location,
            availabilityStatus: r.availabilityStatus,
            keywordScore: r.keywordScore,
            skills: r.skills.map((s) => s.name),
            github: r.github,
            projects: r.projects.map((p) => p.title),
          })),
          count: results.length,
        };
      },
    }),
  };

  return { model, tools, systemPrompt: SYSTEM_PROMPT };
}

/**
 * Process a search query and return scored results
 */
export async function processSearchQuery(
  query: string,
  conversationHistory: ChatMessage[] = []
): Promise<SearchResponse> {
  // Determine which tools to use based on query
  const shouldUseRAG = !isSpecificKeywordQuery(query);
  const shouldUseKeyword = true; // Always try keyword search

  let ragResults: Awaited<ReturnType<typeof ragSearchTool>> = [];
  let keywordResults: Awaited<ReturnType<typeof keywordSearchTool>> = [];

  // Execute searches in parallel
  const searchPromises: Promise<void>[] = [];

  if (shouldUseRAG) {
    searchPromises.push(
      ragSearchTool({ query, limit: 20, similarityThreshold: 0.6 })
        .then((results) => {
          ragResults = results;
        })
        .catch((error) => {
          console.error("RAG search error:", error);
        })
    );
  }

  if (shouldUseKeyword) {
    searchPromises.push(
      keywordSearchTool({ keywords: query, limit: 20 })
        .then((results) => {
          keywordResults = results;
        })
        .catch((error) => {
          console.error("Keyword search error:", error);
        })
    );
  }

  await Promise.all(searchPromises);

  // Combine and score results
  const scoredResults = combineAndScoreResults(ragResults, keywordResults, query);

  // Format response
  const topResults = scoredResults.slice(0, 10).map((result) => ({
    builderId: result.builderId,
    name: result.name,
    role: result.role,
    score: result.score,
    matchReason: result.matchReason,
    skills: result.skills.map((s) => s.name),
    avatarUrl: result.avatarUrl,
    bio: result.bio,
    location: result.location,
  }));

  const message =
    topResults.length > 0
      ? `I found ${scoredResults.length} potential match${scoredResults.length !== 1 ? "es" : ""}. Here are the top ${topResults.length} results:`
      : "I couldn't find any matches for your query. Try refining your search terms or being more specific.";

  return {
    type: "search_results",
    results: topResults,
    message,
  };
}

/**
 * Check if query is a specific keyword query (name, GitHub username, etc.)
 */
function isSpecificKeywordQuery(query: string): boolean {
  // Simple heuristic: if query is short and looks like a name/username
  const trimmed = query.trim();
  if (trimmed.length < 20 && /^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
    return true;
  }
  return false;
}

