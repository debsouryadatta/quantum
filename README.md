# Quantum - AI-Powered Teammate Search

An intelligent teammate matching system for hackathon builders. Find your perfect teammates using AI-powered semantic search. Built at Devfolio Tryout.

## Features

- 🤖 **AI-Powered Search** - Multi-agent system that understands intent and finds the best matches
- 🔍 **Hybrid Search** - Combines semantic and keyword search for accurate results
- 👤 **Smart Profiles** - Import from GitHub with AI analysis or fill manually
- ⚡ **Fast Performance** - Sub-3 second search results
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

### Search System
- Multi-agent orchestration (Planner, Executor, Evaluator)
- Semantic search with vector embeddings
- Smart ranking and filtering
- Real-time search results

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
