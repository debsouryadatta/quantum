import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from 'zod/v3';
import { cache, cacheKeys } from "@/lib/services/cache";
import { updateBuilderEmbeddings } from "@/lib/services/embeddings";

// Helper to transform empty strings to undefined for optional fields
const optionalString = z.string().optional();
const optionalUrl = z.union([z.string().url(), z.literal("")]).optional().transform((val) => (val === "" ? undefined : val));
const optionalStringOrEmpty = z.union([z.string(), z.literal("")]).optional().transform((val) => (val === "" ? undefined : val));

const SkillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  category: z.enum(["language", "framework", "tool", "domain", "soft_skill"]),
  proficiencyLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  yearsOfExperience: z.number().int().min(0).optional(),
});

const ProjectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  techStack: z.array(z.string()),
  url: optionalUrl,
  role: z.string().min(1),
  impact: optionalStringOrEmpty,
  imageUrl: optionalUrl,
  startDate: z.string(),
  endDate: z.string().optional(),
});

const CreateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  bio: z.union([z.string().max(500), z.literal("")]).optional().transform((val) => (val === "" ? undefined : val)),
  role: z.enum(["frontend", "backend", "fullstack", "design", "product", "data", "ml"]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  yearsOfExperience: z.number().int().min(0).optional(),
  location: optionalStringOrEmpty,
  timezone: optionalStringOrEmpty,
  availabilityStatus: z.enum(["available", "busy", "not_looking"]).optional(),
  availabilityHoursPerWeek: z.number().int().min(0).max(168).optional(),
  preferredWorkingHours: optionalStringOrEmpty,
  github: optionalUrl,
  linkedin: optionalUrl,
  twitter: optionalUrl,
  portfolio: optionalUrl,
  avatarUrl: optionalUrl,
  skills: z.array(SkillSchema).optional().default([]),
  projects: z.array(ProjectSchema).optional().default([]),
  preferencesTeamSize: z.array(z.number().int().min(1)).optional(),
  preferencesRemotePreference: z.enum(["remote", "hybrid", "in_person", "flexible"]).optional(),
  preferencesHackathonTypes: z.array(z.string()).optional(),
  preferencesCommunicationStyle: optionalStringOrEmpty,
  preferencesInterests: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.builder.findUnique({
      where: { clerkId: userId },
      include: {
        skills: true,
        projects: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateProfileSchema.parse(body);

    // Check if profile exists
    const existing = await prisma.builder.findUnique({
      where: { clerkId: userId },
      include: {
        skills: true,
        projects: true,
      },
    });

    // Use a transaction to ensure data consistency
    const profile = await prisma.$transaction(async (tx) => {
      // Create or update the builder profile
      const builder = existing
        ? await tx.builder.update({
            where: { clerkId: userId },
            data: {
              name: validated.name,
              email: validated.email,
              bio: validated.bio,
              role: validated.role,
              experienceLevel: validated.experienceLevel,
              yearsOfExperience: validated.yearsOfExperience,
              location: validated.location,
              timezone: validated.timezone,
              availabilityStatus: validated.availabilityStatus,
              availabilityHoursPerWeek: validated.availabilityHoursPerWeek,
              preferredWorkingHours: validated.preferredWorkingHours,
              github: validated.github,
              linkedin: validated.linkedin,
              twitter: validated.twitter,
              portfolio: validated.portfolio,
              avatarUrl: validated.avatarUrl,
              preferencesTeamSize: validated.preferencesTeamSize as any,
              preferencesRemotePreference: validated.preferencesRemotePreference as any,
              preferencesHackathonTypes: validated.preferencesHackathonTypes as any,
              preferencesCommunicationStyle: validated.preferencesCommunicationStyle,
              preferencesInterests: validated.preferencesInterests as any,
            },
          })
        : await tx.builder.create({
            data: {
              clerkId: userId,
              name: validated.name,
              email: validated.email,
              bio: validated.bio,
              role: validated.role,
              experienceLevel: validated.experienceLevel,
              yearsOfExperience: validated.yearsOfExperience,
              location: validated.location,
              timezone: validated.timezone,
              availabilityStatus: validated.availabilityStatus || "available",
              availabilityHoursPerWeek: validated.availabilityHoursPerWeek,
              preferredWorkingHours: validated.preferredWorkingHours,
              github: validated.github,
              linkedin: validated.linkedin,
              twitter: validated.twitter,
              portfolio: validated.portfolio,
              avatarUrl: validated.avatarUrl,
              preferencesTeamSize: validated.preferencesTeamSize as any,
              preferencesRemotePreference: validated.preferencesRemotePreference as any,
              preferencesHackathonTypes: validated.preferencesHackathonTypes as any,
              preferencesCommunicationStyle: validated.preferencesCommunicationStyle,
              preferencesInterests: validated.preferencesInterests as any,
            },
          });

      // Handle skills
      if (validated.skills !== undefined) {
        // Get existing skill IDs
        const existingSkillIds = existing?.skills.map((s) => s.id) || [];
        const incomingSkillIds = validated.skills
          .map((s) => s.id)
          .filter((id): id is string => !!id);

        // Delete skills that are not in the incoming list
        const skillsToDelete = existingSkillIds.filter(
          (id) => !incomingSkillIds.includes(id)
        );
        if (skillsToDelete.length > 0) {
          await tx.skill.deleteMany({
            where: {
              id: { in: skillsToDelete },
              builderId: builder.id,
            },
          });
        }

        // Update or create skills
        for (const skillData of validated.skills) {
          if (skillData.id && existingSkillIds.includes(skillData.id)) {
            // Update existing skill
            await tx.skill.update({
              where: { id: skillData.id },
              data: {
                name: skillData.name,
                category: skillData.category,
                proficiencyLevel: skillData.proficiencyLevel,
                yearsOfExperience: skillData.yearsOfExperience,
              },
            });
          } else {
            // Create new skill
            await tx.skill.create({
              data: {
                builderId: builder.id,
                name: skillData.name,
                category: skillData.category,
                proficiencyLevel: skillData.proficiencyLevel,
                yearsOfExperience: skillData.yearsOfExperience,
              },
            });
          }
        }
      }

      // Handle projects
      if (validated.projects !== undefined) {
        // Get existing project IDs
        const existingProjectIds = existing?.projects.map((p) => p.id) || [];
        const incomingProjectIds = validated.projects
          .map((p) => p.id)
          .filter((id): id is string => !!id);

        // Delete projects that are not in the incoming list
        const projectsToDelete = existingProjectIds.filter(
          (id) => !incomingProjectIds.includes(id)
        );
        if (projectsToDelete.length > 0) {
          await tx.project.deleteMany({
            where: {
              id: { in: projectsToDelete },
              builderId: builder.id,
            },
          });
        }

        // Update or create projects
        for (const projectData of validated.projects) {
          if (projectData.id && existingProjectIds.includes(projectData.id)) {
            // Update existing project
            await tx.project.update({
              where: { id: projectData.id },
              data: {
                title: projectData.title,
                description: projectData.description,
                techStack: projectData.techStack as any,
                url: projectData.url,
                role: projectData.role,
                impact: projectData.impact,
                imageUrl: projectData.imageUrl,
                startDate: new Date(projectData.startDate),
                endDate: projectData.endDate ? new Date(projectData.endDate) : null,
              },
            });
          } else {
            // Create new project
            await tx.project.create({
              data: {
                builderId: builder.id,
                title: projectData.title,
                description: projectData.description,
                techStack: projectData.techStack as any,
                url: projectData.url,
                role: projectData.role,
                impact: projectData.impact,
                imageUrl: projectData.imageUrl,
                startDate: new Date(projectData.startDate),
                endDate: projectData.endDate ? new Date(projectData.endDate) : null,
              },
            });
          }
        }
      }

      // Return the updated profile with relations
      return await tx.builder.findUnique({
        where: { id: builder.id },
        include: {
          skills: true,
          projects: true,
        },
      });
    });

    if (!profile) {
      throw new Error("Failed to create/update profile");
    }

    // Invalidate cache
    await cache.del(cacheKeys.profile(profile.id));

    // Update embeddings asynchronously (don't block the response)
    // The search_vector is automatically updated by the database trigger
    updateBuilderEmbeddings(profile.id, {
      bio: profile.bio,
      skills: profile.skills,
      projects: profile.projects.map((p) => ({
        title: p.title,
        description: p.description,
        techStack: Array.isArray(p.techStack) ? (p.techStack as string[]) : [],
      })),
      preferences: {
        teamSize: Array.isArray(profile.preferencesTeamSize)
          ? (profile.preferencesTeamSize as number[])
          : null,
        remotePreference: profile.preferencesRemotePreference || null,
        hackathonTypes: Array.isArray(profile.preferencesHackathonTypes)
          ? (profile.preferencesHackathonTypes as string[])
          : null,
        communicationStyle: profile.preferencesCommunicationStyle || null,
        interests: Array.isArray(profile.preferencesInterests)
          ? (profile.preferencesInterests as string[])
          : null,
      },
    }).catch((error) => {
      console.error("Failed to update embeddings after profile save:", error);
      // Non-critical error, don't fail the request
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Create/update profile error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

