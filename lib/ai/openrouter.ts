import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "@/lib/env";

export const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

// OpenAI models through OpenRouter
export const openaiModels = {
  // Chat models
  "gpt-4o-mini": () => openrouter.chat("openai/gpt-4o-mini"),
  "gpt-4.1-mini": () => openrouter.chat("openai/gpt-4.1-mini"),
  "grok-code-fast-1": () => openrouter.chat("x-ai/grok-code-fast-1"),
};


