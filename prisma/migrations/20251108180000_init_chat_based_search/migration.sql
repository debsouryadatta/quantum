-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "public"."AvailabilityStatus" AS ENUM ('available', 'busy', 'not_looking');

-- CreateEnum
CREATE TYPE "public"."ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "public"."ProficiencyLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "public"."RemotePreference" AS ENUM ('remote', 'hybrid', 'in_person', 'flexible');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('frontend', 'backend', 'fullstack', 'design', 'product', 'data', 'ml');

-- CreateEnum
CREATE TYPE "public"."SkillCategory" AS ENUM ('language', 'framework', 'tool', 'domain', 'soft_skill');

-- CreateEnum
CREATE TYPE "public"."ToolType" AS ENUM ('ragSearch', 'keywordSearch');

-- CreateTable
CREATE TABLE "public"."builders" (
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
    "role" "public"."Role" NOT NULL DEFAULT 'fullstack',
    "experience_level" "public"."ExperienceLevel" NOT NULL DEFAULT 'intermediate',
    "years_of_experience" INTEGER NOT NULL DEFAULT 0,
    "availability_status" "public"."AvailabilityStatus" NOT NULL DEFAULT 'available',
    "availability_hours_per_week" INTEGER,
    "preferred_working_hours" TEXT,
    "preferences_team_size" JSONB,
    "preferences_remote_preference" "public"."RemotePreference",
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
CREATE TABLE "public"."chat_sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,
    "user_ip" TEXT,
    "messages" JSONB NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_query" TEXT,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
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
CREATE TABLE "public"."search_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT NOT NULL,
    "query_embedding" vector(1536),
    "tool_calls" JSONB,
    "tools_used" JSONB,
    "conversation_history" JSONB,
    "results" JSONB,
    "top_result_ids" JSONB,
    "result_count" INTEGER,
    "clicked_results" JSONB,
    "feedback_score" DOUBLE PRECISION,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "llm_calls_count" INTEGER NOT NULL DEFAULT 0,
    "builder_id" TEXT,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skills" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" "public"."SkillCategory" NOT NULL DEFAULT 'language',
    "proficiency_level" "public"."ProficiencyLevel" NOT NULL DEFAULT 'intermediate',
    "years_of_experience" INTEGER,
    "endorsed" BOOLEAN NOT NULL DEFAULT false,
    "embedding" vector(1536),

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "builders_availability_status_idx" ON "public"."builders"("availability_status" ASC);

-- CreateIndex
CREATE INDEX "builders_clerk_id_idx" ON "public"."builders"("clerk_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "builders_clerk_id_key" ON "public"."builders"("clerk_id" ASC);

-- CreateIndex
CREATE INDEX "builders_role_experience_level_availability_status_idx" ON "public"."builders"("role" ASC, "experience_level" ASC, "availability_status" ASC);

-- CreateIndex
CREATE INDEX "chat_sessions_created_at_idx" ON "public"."chat_sessions"("created_at" ASC);

-- CreateIndex
CREATE INDEX "chat_sessions_session_id_idx" ON "public"."chat_sessions"("session_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_session_id_key" ON "public"."chat_sessions"("session_id" ASC);

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "public"."chat_sessions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "projects_builder_id_idx" ON "public"."projects"("builder_id" ASC);

-- CreateIndex
CREATE INDEX "projects_start_date_idx" ON "public"."projects"("start_date" ASC);

-- CreateIndex
CREATE INDEX "search_logs_builder_id_idx" ON "public"."search_logs"("builder_id" ASC);

-- CreateIndex
CREATE INDEX "search_logs_created_at_idx" ON "public"."search_logs"("created_at" ASC);

-- CreateIndex
CREATE INDEX "search_logs_session_id_idx" ON "public"."search_logs"("session_id" ASC);

-- CreateIndex
CREATE INDEX "skills_builder_id_idx" ON "public"."skills"("builder_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "skills_builder_id_name_key" ON "public"."skills"("builder_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "public"."skills"("category" ASC);

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."search_logs" ADD CONSTRAINT "search_logs_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skills" ADD CONSTRAINT "skills_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

