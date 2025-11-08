-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create full-text search vector column and index
ALTER TABLE builders ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION builders_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', NEW.role::text), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector
DROP TRIGGER IF EXISTS builders_search_vector_trigger ON builders;
CREATE TRIGGER builders_search_vector_trigger
  BEFORE INSERT OR UPDATE ON builders
  FOR EACH ROW
  EXECUTE FUNCTION builders_search_vector_update();

-- Update existing rows
UPDATE builders SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(bio, '')), 'B') ||
  setweight(to_tsvector('english', role::text), 'C')
WHERE search_vector IS NULL;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_builders_search_vector ON builders USING GIN(search_vector);

-- Create vector indexes (IVFFlat for approximate nearest neighbor search)
-- Note: These need to be created after data is loaded for optimal performance
-- Run these after seeding data:
-- CREATE INDEX idx_builders_profile_embedding ON builders USING ivfflat (profile_embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_builders_bio_embedding ON builders USING ivfflat (bio_embedding vector_cosine_ops) WITH (lists = 50);
-- CREATE INDEX idx_skills_embedding ON skills USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
-- CREATE INDEX idx_projects_embedding ON projects USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

