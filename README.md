# Quantum - Conversational AI Teammate Search

An intelligent conversational AI agent for finding hackathon teammates. Chat naturally with an AI that asks clarifying questions and finds the perfect matches using semantic and keyword search. Built at Devfolio Tryout.

## Features

- 💬 **Conversational AI Agent** - Chat naturally with an AI that asks clarifying questions to understand your needs
- 🔍 **Intelligent Search** - Uses RAG (semantic) search and keyword search tools to find the best matches
- 📝 **Conversation History** - All your chats are saved. Review past conversations or continue where you left off
- 🎯 **Smart Matching** - Results include match explanations showing why each builder fits your needs
- 👤 **Smart Profiles** - Import from GitHub with AI analysis or fill manually
- ⚡ **Fast Performance** - Get relevant matches in seconds
- 🔐 **Authentication** - Secure user authentication with Clerk

## Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Fill in your API keys and database URL
   ```

3. **Set up database**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

4. **Run the app**
   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 16 + TypeScript
- **AI**: OpenRouter (GPT-4o-mini) + OpenAI (embeddings)
- **Database**: PostgreSQL + pgvector
- **Auth**: Clerk
- **Cache**: Upstash Redis

## Key Features

### Profile Management
- Create and edit your profile manually
- **Import from GitHub** - Automatically fill your profile using AI analysis of your GitHub repositories
- Choose to replace all fields or fill empty ones only

### Conversational Search System
- **Chat-based interface** - Have natural conversations with an AI agent
- **Clarifying questions** - AI asks questions to better understand your needs before searching
- **Dual search tools** - Uses RAG (semantic) search for conceptual matching and keyword search for specific skills
- **Conversation history** - Sessions are saved and can be reviewed later (read-only after leaving)
- **Match explanations** - Each result includes a reason explaining why the builder matches your query
- **Session management** - Create new chats, view history, and manage conversations

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `OPENAI_API_KEY` - OpenAI API key (for embeddings)

Optional:
- `UPSTASH_REDIS_REST_URL` - Redis URL (for caching)
- `UPSTASH_REDIS_REST_TOKEN` - Redis token
- `IMAGEKIT_*` - ImageKit credentials (for image storage)

See `env.example` for all available variables.

## Database Setup

1. Create a PostgreSQL database (Neon recommended)
2. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Run migrations: `pnpm db:migrate`
4. (Optional) Seed data: `pnpm db:seed`

## Development

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start dev server
pnpm dev
```

## License

MIT
