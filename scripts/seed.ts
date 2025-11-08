/**
 * Seed script to populate database with builder profiles from JSON file
 * Run with: pnpm db:seed
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { generateTextEmbedding, generateProfileEmbedding } from "../lib/services/embeddings";

const prisma = new PrismaClient();

interface BuilderProfile {
  name: string;
  email: string;
  bio: string;
  role: "frontend" | "backend" | "fullstack" | "design" | "product" | "data" | "ml";
  experienceLevel: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience: number;
  location: string;
  timezone: string;
  availabilityStatus: "available" | "busy" | "not_looking";
  availabilityHoursPerWeek: number | null;
  preferredWorkingHours: string | null;
  github: string | null;
  linkedin: string | null;
  twitter: string | null;
  portfolio: string | null;
  skills: Array<{
    name: string;
    category: "language" | "framework" | "tool" | "domain" | "soft_skill";
    proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert";
    yearsOfExperience: number | null;
  }>;
  projects: Array<{
    title: string;
    description: string;
    techStack: string[];
    role: string;
    impact: string | null;
    url: string | null;
    startDate: string;
    endDate: string | null;
  }>;
  preferences: {
    teamSize: number[];
    remotePreference: "remote" | "hybrid" | "in_person" | "flexible";
    hackathonTypes: string[];
    communicationStyle: string;
    interests: string[];
  };
}

async function loadBuildersFromJson(): Promise<BuilderProfile[]> {
  const filePath = join(process.cwd(), "scripts", "builders.json");
  const fileContent = readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent) as BuilderProfile[];
}

async function seed() {
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    console.log("🚀 Starting database seed...\n");

    // Check database connection
    await prisma.$connect();
    console.log("✅ Database connected\n");

    // Load profiles from JSON file
    console.log("📂 Loading builder profiles from JSON file...\n");
    const profiles = await loadBuildersFromJson();
    console.log(`✅ Loaded ${profiles.length} profiles from JSON\n`);

    console.log(`📊 Creating ${profiles.length} profiles in database...\n`);

    // Process profiles one by one with progress tracking
    for (let i = 0; i < profiles.length; i++) {
      const profileData = profiles[i];
      const progress = `[${i + 1}/${profiles.length}]`;

      try {
        // Generate embeddings
        console.log(`${progress} Generating embeddings for ${profileData.name}...`);
        const bioEmbedding = await generateTextEmbedding(profileData.bio);
        const profileEmbedding = await generateProfileEmbedding({
          bio: profileData.bio,
          skills: profileData.skills.map((s) => s.name),
          projects: profileData.projects.map((p) => `${p.title} ${p.description}`),
          preferences: JSON.stringify(profileData.preferences),
        });

        // Create builder first without embeddings (since they're Unsupported types)
        const builder = await prisma.builder.create({
          data: {
            clerkId: `seed_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: profileData.name,
            email: profileData.email,
            bio: profileData.bio,
            role: profileData.role,
            experienceLevel: profileData.experienceLevel,
            yearsOfExperience: profileData.yearsOfExperience,
            location: profileData.location,
            timezone: profileData.timezone,
            availabilityStatus: profileData.availabilityStatus,
            availabilityHoursPerWeek: profileData.availabilityHoursPerWeek,
            preferredWorkingHours: profileData.preferredWorkingHours,
            github: profileData.github,
            linkedin: profileData.linkedin,
            twitter: profileData.twitter,
            portfolio: profileData.portfolio,
            preferencesTeamSize: profileData.preferences.teamSize as any,
            preferencesRemotePreference: profileData.preferences.remotePreference,
            preferencesHackathonTypes: profileData.preferences.hackathonTypes as any,
            preferencesCommunicationStyle: profileData.preferences.communicationStyle,
            preferencesInterests: profileData.preferences.interests as any,
          },
        });

        // Update with embeddings using raw SQL (since they're Unsupported types)
        await prisma.$executeRaw`
          UPDATE builders 
          SET 
            bio_embedding = ${`[${bioEmbedding.embedding.join(",")}]`}::vector(1536),
            profile_embedding = ${`[${profileEmbedding.join(",")}]`}::vector(1536)
          WHERE id = ${builder.id}
        `;

        // Create skills
        for (const skillData of profileData.skills) {
          const skillEmbedding = await generateTextEmbedding(
            `${skillData.name} ${skillData.category} ${skillData.proficiencyLevel}`
          );

          const skill = await prisma.skill.create({
            data: {
              builderId: builder.id,
              name: skillData.name,
              category: skillData.category,
              proficiencyLevel: skillData.proficiencyLevel,
              yearsOfExperience: skillData.yearsOfExperience,
              endorsed: false,
            },
          });

          // Update with embedding using raw SQL
          await prisma.$executeRaw`
            UPDATE skills 
            SET embedding = ${`[${skillEmbedding.embedding.join(",")}]`}::vector(1536)
            WHERE id = ${skill.id}
          `;
        }

        // Create projects
        for (const projectData of profileData.projects) {
          const projectEmbedding = await generateTextEmbedding(
            `${projectData.title} ${projectData.description} ${projectData.techStack.join(" ")}`
          );

          const project = await prisma.project.create({
            data: {
              builderId: builder.id,
              title: projectData.title,
              description: projectData.description,
              techStack: projectData.techStack as any,
              role: projectData.role,
              impact: projectData.impact,
              url: projectData.url,
              startDate: new Date(projectData.startDate),
              endDate: projectData.endDate ? new Date(projectData.endDate) : null,
            },
          });

          // Update with embedding using raw SQL
          await prisma.$executeRaw`
            UPDATE projects 
            SET embedding = ${`[${projectEmbedding.embedding.join(",")}]`}::vector(1536)
            WHERE id = ${project.id}
          `;
        }

        successCount++;
        console.log(`✅ ${progress} Created profile: ${profileData.name} (${profileData.role}, ${profileData.experienceLevel})\n`);
      } catch (error) {
        errorCount++;
        console.error(`❌ ${progress} Error creating profile ${profileData.name}:`, error);
        // Continue with next profile
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(60));
    console.log("✨ Seed completed!");
    console.log(`✅ Successfully created: ${successCount} profiles`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} profiles`);
    }
    console.log(`⏱️  Duration: ${duration}s`);
    console.log("=".repeat(60) + "\n");

    // Create vector indexes after seeding (as recommended in migration)
    console.log("📊 Creating vector indexes for optimal search performance...");
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_builders_profile_embedding 
        ON builders USING ivfflat (profile_embedding vector_cosine_ops) 
        WITH (lists = 100);
      `;
      console.log("✅ Created profile_embedding index");

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_builders_bio_embedding 
        ON builders USING ivfflat (bio_embedding vector_cosine_ops) 
        WITH (lists = 50);
      `;
      console.log("✅ Created bio_embedding index");

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_skills_embedding 
        ON skills USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 50);
      `;
      console.log("✅ Created skills embedding index");

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_projects_embedding 
        ON projects USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 50);
      `;
      console.log("✅ Created projects embedding index\n");
    } catch (indexError) {
      console.warn("⚠️  Warning: Could not create some indexes (they may already exist):", indexError);
    }

    console.log("🎉 Database seeding complete! You can now use the search functionality.\n");
  } catch (error) {
    console.error("\n❌ Seed error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
seed().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
