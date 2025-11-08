import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { fetchGitHubData } from "@/lib/services/github";
import { generateProfileFromGitHub } from "@/lib/services/githubProfileGenerator";
import { z } from "zod";
import { cache, cacheKeys } from "@/lib/services/cache";
import { updateBuilderEmbeddings } from "@/lib/services/embeddings";

const GitHubImportSchema = z.object({
  username: z.string().min(1).max(39),
  replaceMode: z.enum(["all", "empty"]),
});

/**
 * Merge AI-generated profile with existing profile based on replaceMode
 */
function mergeProfileData(
  existing: any,
  generated: any,
  replaceMode: "all" | "empty",
  githubUsername: string,
  githubAvatarUrl: string | null,
  githubUserData: { name: string | null; email: string | null }
) {
  const githubUrl = `https://github.com/${githubUsername}`;

  if (replaceMode === "all") {
    // Replace all fields
    return {
      name: existing?.name || githubUserData.name || githubUsername,
      email: existing?.email || githubUserData.email || "",
      bio: generated.bio,
      role: generated.role,
      experienceLevel: generated.experienceLevel,
      yearsOfExperience: generated.yearsOfExperience,
      location: generated.location,
      timezone: generated.timezone,
      skills: generated.skills,
      projects: generated.projects,
      preferencesInterests: generated.preferencesInterests,
      // Use GitHub URL and avatar
      github: githubUrl,
      linkedin: existing?.linkedin,
      twitter: existing?.twitter,
      portfolio: existing?.portfolio,
      avatarUrl: existing?.avatarUrl || githubAvatarUrl,
      // Keep existing preferences that aren't generated
      preferencesTeamSize: existing?.preferencesTeamSize,
      preferencesRemotePreference: existing?.preferencesRemotePreference,
      preferencesHackathonTypes: existing?.preferencesHackathonTypes,
      preferencesCommunicationStyle: existing?.preferencesCommunicationStyle,
    };
  } else {
    // Fill only empty fields
    return {
      name: existing?.name || githubUserData.name || githubUsername,
      email: existing?.email || githubUserData.email || "",
      bio: existing?.bio || generated.bio,
      role: existing?.role || generated.role,
      experienceLevel: existing?.experienceLevel || generated.experienceLevel,
      yearsOfExperience: existing?.yearsOfExperience ?? generated.yearsOfExperience,
      location: existing?.location || generated.location,
      timezone: existing?.timezone || generated.timezone,
      skills: existing?.skills?.length > 0 ? existing.skills : generated.skills,
      projects: existing?.projects?.length > 0 ? existing.projects : generated.projects,
      preferencesInterests:
        existing?.preferencesInterests?.length > 0
          ? existing.preferencesInterests
          : generated.preferencesInterests,
      github: existing?.github || githubUrl,
      linkedin: existing?.linkedin,
      twitter: existing?.twitter,
      portfolio: existing?.portfolio,
      avatarUrl: existing?.avatarUrl || githubAvatarUrl,
      preferencesTeamSize: existing?.preferencesTeamSize,
      preferencesRemotePreference: existing?.preferencesRemotePreference,
      preferencesHackathonTypes: existing?.preferencesHackathonTypes,
      preferencesCommunicationStyle: existing?.preferencesCommunicationStyle,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = GitHubImportSchema.parse(body);

    // Check cache first (cache GitHub data for 10 minutes)
    const cacheKey = `github:${validated.username}`;
    let githubData = await cache.get(cacheKey);

    if (!githubData) {
      // Fetch GitHub data
      githubData = await fetchGitHubData(validated.username);
      // Cache for 10 minutes
      await cache.set(cacheKey, githubData, 600);
    }

    // Generate profile using AI
    const generatedProfile = await generateProfileFromGitHub(githubData);

    // Get existing profile
    const existingProfile = await prisma.builder.findUnique({
      where: { clerkId: userId },
      include: {
        skills: true,
        projects: true,
      },
    });

    // Merge data based on replaceMode
    const mergedData = mergeProfileData(
      existingProfile,
      generatedProfile,
      validated.replaceMode,
      validated.username,
      githubData.user.avatar_url,
      {
        name: githubData.user.name,
        email: githubData.user.email,
      }
    );

    // Prepare data for profile update (matching CreateProfileSchema format)
    const profileData = {
      name: mergedData.name,
      email: mergedData.email,
      bio: mergedData.bio || undefined,
      role: mergedData.role,
      experienceLevel: mergedData.experienceLevel,
      yearsOfExperience: mergedData.yearsOfExperience ?? undefined,
      location: mergedData.location || undefined,
      timezone: mergedData.timezone || undefined,
      availabilityStatus: existingProfile?.availabilityStatus || "available",
      availabilityHoursPerWeek: existingProfile?.availabilityHoursPerWeek ?? undefined,
      preferredWorkingHours: existingProfile?.preferredWorkingHours || undefined,
      github: mergedData.github || undefined,
      linkedin: mergedData.linkedin || undefined,
      twitter: mergedData.twitter || undefined,
      portfolio: mergedData.portfolio || undefined,
      avatarUrl: mergedData.avatarUrl || undefined,
      skills: mergedData.skills.map((s: any) => ({
        id: existingProfile?.skills.find((es) => es.name === s.name)?.id,
        name: s.name,
        category: s.category,
        proficiencyLevel: s.proficiencyLevel,
        yearsOfExperience: s.yearsOfExperience ?? undefined,
      })),
      projects: mergedData.projects.map((p: any) => ({
        id: existingProfile?.projects.find((ep) => ep.title === p.title)?.id,
        title: p.title,
        description: p.description,
        techStack: p.techStack,
        url: p.url || undefined,
        role: p.role,
        impact: p.impact || undefined,
        imageUrl: p.imageUrl || undefined,
        startDate: p.startDate,
        endDate: p.endDate || undefined,
      })),
      preferencesTeamSize: mergedData.preferencesTeamSize
        ? (mergedData.preferencesTeamSize as number[])
        : undefined,
      preferencesRemotePreference: mergedData.preferencesRemotePreference || undefined,
      preferencesHackathonTypes: mergedData.preferencesHackathonTypes
        ? (mergedData.preferencesHackathonTypes as string[])
        : undefined,
      preferencesCommunicationStyle: mergedData.preferencesCommunicationStyle || undefined,
      preferencesInterests: mergedData.preferencesInterests
        ? (mergedData.preferencesInterests as string[])
        : undefined,
    };

    // Use transaction to update profile (similar to existing profile route)
    const profile = await prisma.$transaction(async (tx) => {
      const builder = existingProfile
        ? await tx.builder.update({
            where: { clerkId: userId },
            data: {
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
              avatarUrl: profileData.avatarUrl,
              preferencesTeamSize: profileData.preferencesTeamSize as any,
              preferencesRemotePreference: profileData.preferencesRemotePreference as any,
              preferencesHackathonTypes: profileData.preferencesHackathonTypes as any,
              preferencesCommunicationStyle: profileData.preferencesCommunicationStyle,
              preferencesInterests: profileData.preferencesInterests as any,
            },
          })
        : await tx.builder.create({
            data: {
              clerkId: userId,
              name: profileData.name,
              email: profileData.email,
              bio: profileData.bio,
              role: profileData.role,
              experienceLevel: profileData.experienceLevel,
              yearsOfExperience: profileData.yearsOfExperience,
              location: profileData.location,
              timezone: profileData.timezone,
              availabilityStatus: profileData.availabilityStatus || "available",
              availabilityHoursPerWeek: profileData.availabilityHoursPerWeek,
              preferredWorkingHours: profileData.preferredWorkingHours,
              github: profileData.github,
              linkedin: profileData.linkedin,
              twitter: profileData.twitter,
              portfolio: profileData.portfolio,
              avatarUrl: profileData.avatarUrl,
              preferencesTeamSize: profileData.preferencesTeamSize as any,
              preferencesRemotePreference: profileData.preferencesRemotePreference as any,
              preferencesHackathonTypes: profileData.preferencesHackathonTypes as any,
              preferencesCommunicationStyle: profileData.preferencesCommunicationStyle,
              preferencesInterests: profileData.preferencesInterests as any,
            },
          });

      // Handle skills
      if (profileData.skills !== undefined) {
        const existingSkillIds = existingProfile?.skills.map((s) => s.id) || [];
        const incomingSkillIds = profileData.skills
          .map((s) => s.id)
          .filter((id): id is string => !!id);

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

        for (const skillData of profileData.skills) {
          if (skillData.id && existingSkillIds.includes(skillData.id)) {
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
      if (profileData.projects !== undefined) {
        const existingProjectIds = existingProfile?.projects.map((p) => p.id) || [];
        const incomingProjectIds = profileData.projects
          .map((p) => p.id)
          .filter((id): id is string => !!id);

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

        for (const projectData of profileData.projects) {
          if (projectData.id && existingProjectIds.includes(projectData.id)) {
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

    // Update embeddings asynchronously
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
      console.error("Failed to update embeddings after GitHub import:", error);
    });

    return NextResponse.json({
      success: true,
      profile,
      message: `Profile ${validated.replaceMode === "all" ? "updated" : "filled"} successfully from GitHub`,
    });
  } catch (error) {
    console.error("GitHub import error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Failed to import from GitHub";

    // Handle specific GitHub API errors
    if (errorMessage.includes("not found")) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes("rate limit")) {
      return NextResponse.json({ error: errorMessage }, { status: 429 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

