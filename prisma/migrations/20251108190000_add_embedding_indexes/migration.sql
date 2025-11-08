-- Add indexes on embedding columns for vector similarity search performance
-- These indexes help optimize vector similarity queries using pgvector ivfflat algorithm

-- Index on builders.profile_embedding (lists = 100 for better performance on larger dataset)
CREATE INDEX IF NOT EXISTS "idx_builders_profile_embedding" ON "public"."builders" USING ivfflat ("profile_embedding" vector_cosine_ops) WITH (lists = 100);

-- Index on builders.bio_embedding (lists = 50)
CREATE INDEX IF NOT EXISTS "idx_builders_bio_embedding" ON "public"."builders" USING ivfflat ("bio_embedding" vector_cosine_ops) WITH (lists = 50);

-- Index on skills.embedding (lists = 50)
CREATE INDEX IF NOT EXISTS "idx_skills_embedding" ON "public"."skills" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 50);

-- Index on projects.embedding (lists = 50)
CREATE INDEX IF NOT EXISTS "idx_projects_embedding" ON "public"."projects" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 50);
