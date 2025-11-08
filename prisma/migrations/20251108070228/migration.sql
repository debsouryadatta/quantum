-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('frontend', 'backend', 'fullstack', 'design', 'product', 'data', 'ml');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'busy', 'not_looking');

-- CreateEnum
CREATE TYPE "RemotePreference" AS ENUM ('remote', 'hybrid', 'in_person', 'flexible');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('language', 'framework', 'tool', 'domain', 'soft_skill');

-- CreateEnum
CREATE TYPE "ProficiencyLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "AgentPhase" AS ENUM ('planning', 'executing', 'evaluating', 'refining', 'complete');

-- CreateTable
CREATE TABLE "builders" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" VARCHAR(500),
    "avatar_url" TEXT,
    "location" TEXT,
    "timezone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'fullstack',
    "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'intermediate',
    "years_of_experience" INTEGER NOT NULL DEFAULT 0,
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'available',
    "availability_hours_per_week" INTEGER,
    "preferred_working_hours" TEXT,
    "preferences_team_size" JSONB,
    "preferences_remote_preference" "RemotePreference",
    "preferences_hackathon_types" JSONB,
    "preferences_communication_style" TEXT,
    "preferences_interests" JSONB,
    "github" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "portfolio" TEXT,
    "profile_embedding" vector(1536),
    "bio_embedding" vector(1536),
    "search_vector" tsvector,
    "search_appearances" INTEGER NOT NULL DEFAULT 0,
    "profile_views" INTEGER NOT NULL DEFAULT 0,
    "team_ups" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "builders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" "SkillCategory" NOT NULL DEFAULT 'language',
    "proficiency_level" "ProficiencyLevel" NOT NULL DEFAULT 'intermediate',
    "years_of_experience" INTEGER,
    "endorsed" BOOLEAN NOT NULL DEFAULT false,
    "embedding" vector(1536),

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "tech_stack" JSONB NOT NULL,
    "role" TEXT NOT NULL,
    "impact" TEXT,
    "url" TEXT,
    "image_url" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "embedding" vector(1536),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT NOT NULL,
    "query_embedding" vector(1536),
    "planner_thought" JSONB,
    "execution_steps" JSONB,
    "evaluation_score" DOUBLE PRECISION,
    "refinement_count" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB,
    "top_result_ids" JSONB,
    "clicked_results" JSONB,
    "feedback_score" DOUBLE PRECISION,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "llm_calls_count" INTEGER NOT NULL DEFAULT 0,
    "builder_id" TEXT,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_states" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "current_phase" "AgentPhase" NOT NULL DEFAULT 'planning',
    "state" JSONB NOT NULL,

    CONSTRAINT "agent_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "builders_clerk_id_key" ON "builders"("clerk_id");

-- CreateIndex
CREATE INDEX "builders_clerk_id_idx" ON "builders"("clerk_id");

-- CreateIndex
CREATE INDEX "builders_role_experience_level_availability_status_idx" ON "builders"("role", "experience_level", "availability_status");

-- CreateIndex
CREATE INDEX "builders_availability_status_idx" ON "builders"("availability_status");

-- CreateIndex
CREATE INDEX "skills_builder_id_idx" ON "skills"("builder_id");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE UNIQUE INDEX "skills_builder_id_name_key" ON "skills"("builder_id", "name");

-- CreateIndex
CREATE INDEX "projects_builder_id_idx" ON "projects"("builder_id");

-- CreateIndex
CREATE INDEX "projects_start_date_idx" ON "projects"("start_date");

-- CreateIndex
CREATE INDEX "search_logs_session_id_idx" ON "search_logs"("session_id");

-- CreateIndex
CREATE INDEX "search_logs_created_at_idx" ON "search_logs"("created_at");

-- CreateIndex
CREATE INDEX "search_logs_builder_id_idx" ON "search_logs"("builder_id");

-- CreateIndex
CREATE INDEX "agent_states_session_id_idx" ON "agent_states"("session_id");

-- CreateIndex
CREATE INDEX "agent_states_current_phase_idx" ON "agent_states"("current_phase");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
