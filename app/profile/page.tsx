"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGroup, FieldLabel, Field } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";
import {
  Pencil,
  Mail,
  MapPin,
  Calendar,
  ExternalLink,
  Plus,
  X,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Github,
  Loader2,
} from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  role: string;
  experienceLevel: string;
  yearsOfExperience: number;
  location: string | null;
  timezone: string | null;
  availabilityStatus: string;
  availabilityHoursPerWeek: number | null;
  preferredWorkingHours: string | null;
  github: string | null;
  linkedin: string | null;
  twitter: string | null;
  portfolio: string | null;
  avatarUrl: string | null;
  preferencesTeamSize?: number[] | null;
  preferencesRemotePreference?: string | null;
  preferencesHackathonTypes?: string[] | null;
  preferencesCommunicationStyle?: string | null;
  preferencesInterests?: string[] | null;
  skills: Array<{
    id: string;
    name: string;
    category: string;
    proficiencyLevel: string;
    yearsOfExperience?: number | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    techStack: string[];
    url: string | null;
    role?: string | null;
    impact?: string | null;
    imageUrl?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
}

interface SkillFormData {
  id?: string;
  name: string;
  category: string;
  proficiencyLevel: string;
  yearsOfExperience?: number | null;
}

interface ProjectFormData {
  id?: string;
  title: string;
  description: string;
  techStack: string[];
  url: string | null;
  role: string;
  impact: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
}

export default function ProfilePage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [replaceMode, setReplaceMode] = useState<"all" | "empty">("empty");
  const [importing, setImporting] = useState(false);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);

  // Update replaceMode default based on whether profile exists
  useEffect(() => {
    if (profile) {
      setReplaceMode("empty");
    } else {
      setReplaceMode("all");
    }
  }, [profile]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
      return;
    }

    if (isSignedIn) {
      fetchProfile();
    }
  }, [isSignedIn, isLoaded, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/profiles");

      if (response.status === 404) {
        setProfile(null);
        setIsEditing(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data.profile);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    role: profile?.role || "fullstack",
    experienceLevel: profile?.experienceLevel || "intermediate",
    availabilityStatus: profile?.availabilityStatus || "available",
  });

  const [skills, setSkills] = useState<SkillFormData[]>([]);
  const [projects, setProjects] = useState<ProjectFormData[]>([]);
  const [newSkill, setNewSkill] = useState<SkillFormData>({
    name: "",
    category: "language",
    proficiencyLevel: "intermediate",
    yearsOfExperience: null,
  });
  const [newProject, setNewProject] = useState<ProjectFormData>({
    title: "",
    description: "",
    techStack: [],
    url: null,
    role: "",
    impact: null,
    imageUrl: null,
    startDate: new Date().toISOString().split("T")[0],
    endDate: null,
  });
  const [techStackInput, setTechStackInput] = useState("");
  const [preferences, setPreferences] = useState({
    teamSize: [] as number[],
    remotePreference: "" as string,
    hackathonTypes: [] as string[],
    communicationStyle: "",
    interests: [] as string[],
  });
  const [teamSizeInput, setTeamSizeInput] = useState("");
  const [hackathonTypeInput, setHackathonTypeInput] = useState("");
  const [interestInput, setInterestInput] = useState("");

  useEffect(() => {
    if (profile) {
      setFormData({
        role: profile.role,
        experienceLevel: profile.experienceLevel,
        availabilityStatus: profile.availabilityStatus,
      });
      setSkills(
        profile.skills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          proficiencyLevel: s.proficiencyLevel,
          yearsOfExperience: (s as any).yearsOfExperience || null,
        }))
      );
      setProjects(
        profile.projects.map((p) => {
          const project = p as any;
          const startDate = project.startDate
            ? new Date(project.startDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          const endDate = project.endDate
            ? new Date(project.endDate).toISOString().split("T")[0]
            : null;
          return {
            id: p.id,
            title: p.title,
            description: p.description,
            techStack: Array.isArray(p.techStack) ? p.techStack : [],
            url: p.url,
            role: project.role || "",
            impact: project.impact || null,
            imageUrl: project.imageUrl || null,
            startDate,
            endDate,
          };
        })
      );
      setPreferences({
        teamSize: (profile.preferencesTeamSize as number[]) || [],
        remotePreference: profile.preferencesRemotePreference || "",
        hackathonTypes: (profile.preferencesHackathonTypes as string[]) || [],
        communicationStyle: profile.preferencesCommunicationStyle || "",
        interests: (profile.preferencesInterests as string[]) || [],
      });
    } else {
      setSkills([]);
      setProjects([]);
      setPreferences({
        teamSize: [],
        remotePreference: "",
        hackathonTypes: [],
        communicationStyle: "",
        interests: [],
      });
    }
  }, [profile]);

  const addSkill = () => {
    if (!newSkill.name.trim()) {
      toast.error("Please enter a skill name");
      return;
    }
    setSkills([...skills, { ...newSkill }]);
    setNewSkill({
      name: "",
      category: "language",
      proficiencyLevel: "intermediate",
      yearsOfExperience: null,
    });
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const addProject = () => {
    if (!newProject.title.trim() || !newProject.description.trim()) {
      toast.error("Please fill in project title and description");
      return;
    }
    setProjects([...projects, { ...newProject }]);
    setNewProject({
      title: "",
      description: "",
      techStack: [],
      url: null,
      role: "",
      impact: null,
      imageUrl: null,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
    });
    setTechStackInput("");
  };

  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const addTechToProject = (projectIndex: number, tech: string) => {
    if (!tech.trim()) return;
    const updatedProjects = [...projects];
    if (!updatedProjects[projectIndex].techStack.includes(tech.trim())) {
      updatedProjects[projectIndex].techStack.push(tech.trim());
      setProjects(updatedProjects);
    }
  };

  const removeTechFromProject = (projectIndex: number, techIndex: number) => {
    const updatedProjects = [...projects];
    updatedProjects[projectIndex].techStack = updatedProjects[projectIndex].techStack.filter(
      (_, i) => i !== techIndex
    );
    setProjects(updatedProjects);
  };

  const handleGitHubImport = async () => {
    if (!githubUsername.trim()) {
      toast.error("Please enter a GitHub username");
      return;
    }

    try {
      setImporting(true);
      setError(null);

      const response = await fetch("/api/profiles/github-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: githubUsername.trim(),
          replaceMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to import from GitHub");
      }

      const result = await response.json();
      setProfile(result.profile);

      if (result.profile) {
        setFormData({
          role: result.profile.role,
          experienceLevel: result.profile.experienceLevel,
          availabilityStatus: result.profile.availabilityStatus,
        });
        setSkills(
          result.profile.skills.map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            proficiencyLevel: s.proficiencyLevel,
            yearsOfExperience: s.yearsOfExperience || null,
          }))
        );
        setProjects(
          result.profile.projects.map((p: any) => {
            const startDate = p.startDate
              ? new Date(p.startDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0];
            const endDate = p.endDate
              ? new Date(p.endDate).toISOString().split("T")[0]
              : null;
            return {
              id: p.id,
              title: p.title,
              description: p.description,
              techStack: Array.isArray(p.techStack) ? p.techStack : [],
              url: p.url,
              role: p.role || "",
              impact: p.impact || null,
              imageUrl: p.imageUrl || null,
              startDate,
              endDate,
            };
          })
        );
        setPreferences({
          teamSize: (result.profile.preferencesTeamSize as number[]) || [],
          remotePreference: result.profile.preferencesRemotePreference || "",
          hackathonTypes: (result.profile.preferencesHackathonTypes as string[]) || [],
          communicationStyle: result.profile.preferencesCommunicationStyle || "",
          interests: (result.profile.preferencesInterests as string[]) || [],
        });
      }

      toast.success(result.message || "Profile imported successfully from GitHub!");
      setGithubDialogOpen(false);
      setGithubUsername("");

      if (!isEditing) {
        await fetchProfile();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import from GitHub";
      setError(errorMessage);
      toast.error("Failed to import from GitHub", {
        description: errorMessage,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      const formDataObj = new FormData(e.currentTarget);
      const data = {
        name: formDataObj.get("name") as string,
        email: formDataObj.get("email") as string,
        bio: formDataObj.get("bio") as string || undefined,
        role: formData.role,
        experienceLevel: formData.experienceLevel,
        yearsOfExperience: parseInt(formDataObj.get("yearsOfExperience") as string) || undefined,
        location: formDataObj.get("location") as string || undefined,
        timezone: formDataObj.get("timezone") as string || undefined,
        availabilityStatus: formData.availabilityStatus,
        availabilityHoursPerWeek: formDataObj.get("availabilityHoursPerWeek")
          ? parseInt(formDataObj.get("availabilityHoursPerWeek") as string)
          : undefined,
        preferredWorkingHours: formDataObj.get("preferredWorkingHours") as string || undefined,
        github: formDataObj.get("github") as string || undefined,
        linkedin: formDataObj.get("linkedin") as string || undefined,
        twitter: formDataObj.get("twitter") as string || undefined,
        portfolio: formDataObj.get("portfolio") as string || undefined,
        avatarUrl: formDataObj.get("avatarUrl") as string || undefined,
        skills: skills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          proficiencyLevel: s.proficiencyLevel,
          yearsOfExperience: s.yearsOfExperience || undefined,
        })),
        projects: projects.map((p) => ({
          id: p.id,
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
        preferencesTeamSize: preferences.teamSize.length > 0 ? preferences.teamSize : undefined,
        preferencesRemotePreference: preferences.remotePreference || undefined,
        preferencesHackathonTypes:
          preferences.hackathonTypes.length > 0 ? preferences.hackathonTypes : undefined,
        preferencesCommunicationStyle: preferences.communicationStyle || undefined,
        preferencesInterests: preferences.interests.length > 0 ? preferences.interests : undefined,
      };

      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save profile");
      }

      const result = await response.json();
      setProfile(result.profile);
      setIsEditing(false);
      toast.success("Profile saved successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save profile";
      setError(errorMessage);
      toast.error("Failed to save profile", {
        description: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      frontend: "Frontend",
      backend: "Backend",
      fullstack: "Full Stack",
      design: "Design",
      product: "Product",
      data: "Data",
      ml: "ML",
    };
    return labels[role] || role;
  };

  const getExperienceLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      expert: "Expert",
    };
    return labels[level] || level;
  };

  const getAvailabilityLabel = (status: string) => {
    const labels: Record<string, { text: string; icon: React.ReactNode }> = {
      available: { text: "Available for projects", icon: <CheckCircle2 className="size-4" /> },
      busy: { text: "Currently busy", icon: <Clock className="size-4" /> },
      not_looking: { text: "Not looking", icon: <XCircle className="size-4" /> },
    };
    return labels[status] || { text: status, icon: null };
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <div className="container mx-auto flex-1 px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  // Show edit form if editing or no profile exists
  if (isEditing || !profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <div className="container mx-auto flex-1 px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">
                {profile ? "Edit Profile" : "Create Profile"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {profile
                  ? "Update your profile information"
                  : "Get started by creating your profile"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGithubDialogOpen(true)}>
                <Github className="mr-2 size-4" />
                Import from GitHub
              </Button>
              {profile && (
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <Dialog open={githubDialogOpen} onOpenChange={setGithubDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Import Profile from GitHub</DialogTitle>
                <DialogDescription>
                  Automatically fill your profile using AI analysis of your GitHub profile and
                  repositories
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <Field>
                  <FieldLabel>
                    GitHub Username <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    type="text"
                    placeholder="e.g., octocat"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    disabled={importing}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter your GitHub username (without @)
                  </p>
                </Field>

                {profile && (
                  <Field>
                    <FieldLabel>Import Mode</FieldLabel>
                    <RadioGroup
                      value={replaceMode}
                      onValueChange={(value) => setReplaceMode(value as "all" | "empty")}
                      disabled={importing}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="empty" id="empty" />
                        <Label htmlFor="empty" className="cursor-pointer">
                          Fill empty fields only (recommended)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all" className="cursor-pointer">
                          Replace all fields with GitHub data
                        </Label>
                      </div>
                    </RadioGroup>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {replaceMode === "empty"
                        ? "Only fields that are currently empty will be filled with GitHub data."
                        : "All profile fields will be replaced with data from your GitHub profile."}
                    </p>
                  </Field>
                )}

                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleGitHubImport}
                  disabled={importing || !githubUsername.trim()}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Importing from GitHub...
                    </>
                  ) : (
                    <>
                      <Github className="mr-2 size-4" />
                      Import from GitHub
                    </>
                  )}
                </Button>

                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-medium mb-2">What will be imported:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Bio and professional information</li>
                    <li>Skills extracted from your repositories</li>
                    <li>Projects from your top repositories</li>
                    <li>Role and experience level</li>
                    <li>Interests based on repository topics</li>
                    <li>GitHub profile URL and avatar</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>
                      Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      type="text"
                      name="name"
                      defaultValue={profile?.name || user?.fullName || ""}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel>
                      Email <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      type="email"
                      name="email"
                      defaultValue={profile?.email || user?.primaryEmailAddress?.emailAddress || ""}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel>
                      Role <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="frontend">Frontend</SelectItem>
                        <SelectItem value="backend">Backend</SelectItem>
                        <SelectItem value="fullstack">Full Stack</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="ml">ML</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="role" value={formData.role} />
                  </Field>

                  <Field>
                    <FieldLabel>
                      Experience Level <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      value={formData.experienceLevel}
                      onValueChange={(value) =>
                        setFormData({ ...formData, experienceLevel: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="experienceLevel" value={formData.experienceLevel} />
                  </Field>

                  <Field>
                    <FieldLabel>Years of Experience</FieldLabel>
                    <Input
                      type="number"
                      name="yearsOfExperience"
                      defaultValue={profile?.yearsOfExperience || 0}
                      min="0"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Location</FieldLabel>
                    <Input
                      type="text"
                      name="location"
                      defaultValue={profile?.location || ""}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Availability Status</FieldLabel>
                    <Select
                      value={formData.availabilityStatus}
                      onValueChange={(value) =>
                        setFormData({ ...formData, availabilityStatus: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="not_looking">Not Looking</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="availabilityStatus" value={formData.availabilityStatus} />
                  </Field>

                  <Field>
                    <FieldLabel>Timezone</FieldLabel>
                    <Input
                      type="text"
                      name="timezone"
                      defaultValue={profile?.timezone || ""}
                      placeholder="e.g., UTC-5, PST, EST"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Availability Hours Per Week</FieldLabel>
                    <Input
                      type="number"
                      name="availabilityHoursPerWeek"
                      defaultValue={profile?.availabilityHoursPerWeek || ""}
                      min="0"
                      max="168"
                      placeholder="e.g., 20"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Preferred Working Hours</FieldLabel>
                    <Input
                      type="text"
                      name="preferredWorkingHours"
                      defaultValue={profile?.preferredWorkingHours || ""}
                      placeholder="e.g., 9 AM - 5 PM EST"
                    />
                  </Field>
                </FieldGroup>

                <Field className="mt-4">
                  <FieldLabel>Bio</FieldLabel>
                  <Textarea
                    name="bio"
                    defaultValue={profile?.bio || ""}
                    maxLength={500}
                    rows={4}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>GitHub</FieldLabel>
                    <Input type="url" name="github" defaultValue={profile?.github || ""} />
                  </Field>

                  <Field>
                    <FieldLabel>LinkedIn</FieldLabel>
                    <Input type="url" name="linkedin" defaultValue={profile?.linkedin || ""} />
                  </Field>

                  <Field>
                    <FieldLabel>Twitter</FieldLabel>
                    <Input type="url" name="twitter" defaultValue={profile?.twitter || ""} />
                  </Field>

                  <Field>
                    <FieldLabel>Portfolio</FieldLabel>
                    <Input type="url" name="portfolio" defaultValue={profile?.portfolio || ""} />
                  </Field>

                  <Field>
                    <FieldLabel>Avatar URL</FieldLabel>
                    <Input type="url" name="avatarUrl" defaultValue={profile?.avatarUrl || ""} />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Set your preferences for team collaboration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Remote Preference</FieldLabel>
                    <Select
                      value={preferences.remotePreference}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, remotePreference: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="in_person">In Person</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel>Communication Style</FieldLabel>
                    <Input
                      type="text"
                      value={preferences.communicationStyle}
                      onChange={(e) =>
                        setPreferences({ ...preferences, communicationStyle: e.target.value })
                      }
                      placeholder="e.g., Async-first, Daily standups"
                    />
                  </Field>
                </FieldGroup>

                <Field>
                  <FieldLabel>Preferred Team Size</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={teamSizeInput}
                      onChange={(e) => setTeamSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const size = parseInt(teamSizeInput);
                          if (size && !preferences.teamSize.includes(size)) {
                            setPreferences({
                              ...preferences,
                              teamSize: [...preferences.teamSize, size],
                            });
                            setTeamSizeInput("");
                          }
                        }
                      }}
                      placeholder="Enter team size and press Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const size = parseInt(teamSizeInput);
                        if (size && !preferences.teamSize.includes(size)) {
                          setPreferences({
                            ...preferences,
                            teamSize: [...preferences.teamSize, size],
                          });
                          setTeamSizeInput("");
                        }
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  {preferences.teamSize.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {preferences.teamSize.map((size, i) => (
                        <Badge key={i} variant="outline" className="gap-1">
                          {size} people
                          <button
                            type="button"
                            onClick={() => {
                              setPreferences({
                                ...preferences,
                                teamSize: preferences.teamSize.filter((_, idx) => idx !== i),
                              });
                            }}
                            className="ml-1 rounded-full hover:bg-destructive/20"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>

                <Field>
                  <FieldLabel>Hackathon Types</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={hackathonTypeInput}
                      onChange={(e) => setHackathonTypeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (
                            hackathonTypeInput.trim() &&
                            !preferences.hackathonTypes.includes(hackathonTypeInput.trim())
                          ) {
                            setPreferences({
                              ...preferences,
                              hackathonTypes: [...preferences.hackathonTypes, hackathonTypeInput.trim()],
                            });
                            setHackathonTypeInput("");
                          }
                        }
                      }}
                      placeholder="e.g., Web3, AI/ML, Social Impact"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (
                          hackathonTypeInput.trim() &&
                          !preferences.hackathonTypes.includes(hackathonTypeInput.trim())
                        ) {
                          setPreferences({
                            ...preferences,
                            hackathonTypes: [...preferences.hackathonTypes, hackathonTypeInput.trim()],
                          });
                          setHackathonTypeInput("");
                        }
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  {preferences.hackathonTypes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {preferences.hackathonTypes.map((type, i) => (
                        <Badge key={i} variant="outline" className="gap-1">
                          {type}
                          <button
                            type="button"
                            onClick={() => {
                              setPreferences({
                                ...preferences,
                                hackathonTypes: preferences.hackathonTypes.filter((_, idx) => idx !== i),
                              });
                            }}
                            className="ml-1 rounded-full hover:bg-destructive/20"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>

                <Field>
                  <FieldLabel>Interests</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={interestInput}
                      onChange={(e) => setInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (
                            interestInput.trim() &&
                            !preferences.interests.includes(interestInput.trim())
                          ) {
                            setPreferences({
                              ...preferences,
                              interests: [...preferences.interests, interestInput.trim()],
                            });
                            setInterestInput("");
                          }
                        }
                      }}
                      placeholder="e.g., Open Source, Sustainability, Gaming"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (
                          interestInput.trim() &&
                          !preferences.interests.includes(interestInput.trim())
                        ) {
                          setPreferences({
                            ...preferences,
                            interests: [...preferences.interests, interestInput.trim()],
                          });
                          setInterestInput("");
                        }
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  {preferences.interests.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {preferences.interests.map((interest, i) => (
                        <Badge key={i} variant="outline" className="gap-1">
                          {interest}
                          <button
                            type="button"
                            onClick={() => {
                              setPreferences({
                                ...preferences,
                                interests: preferences.interests.filter((_, idx) => idx !== i),
                              });
                            }}
                            className="ml-1 rounded-full hover:bg-destructive/20"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>Add your technical skills and proficiencies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {skills.map((skill, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{skill.name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {skill.category} • {skill.proficiencyLevel}
                            {skill.yearsOfExperience && ` • ${skill.yearsOfExperience} years`}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSkill(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <FieldGroup className="grid gap-3 md:grid-cols-2">
                    <Field>
                      <FieldLabel>Skill Name</FieldLabel>
                      <Input
                        type="text"
                        value={newSkill.name}
                        onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                        placeholder="e.g., React, Python, Figma"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Category</FieldLabel>
                      <Select
                        value={newSkill.category}
                        onValueChange={(value) => setNewSkill({ ...newSkill, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="language">Language</SelectItem>
                          <SelectItem value="framework">Framework</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                          <SelectItem value="domain">Domain</SelectItem>
                          <SelectItem value="soft_skill">Soft Skill</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Proficiency Level</FieldLabel>
                      <Select
                        value={newSkill.proficiencyLevel}
                        onValueChange={(value) =>
                          setNewSkill({ ...newSkill, proficiencyLevel: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Years of Experience (optional)</FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        value={newSkill.yearsOfExperience || ""}
                        onChange={(e) =>
                          setNewSkill({
                            ...newSkill,
                            yearsOfExperience: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="e.g., 3"
                      />
                    </Field>
                  </FieldGroup>
                  <Button type="button" onClick={addSkill} variant="outline" className="w-full">
                    <Plus className="mr-2 size-4" />
                    Add Skill
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Showcase your work and projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {projects.map((project, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{project.title}</CardTitle>
                            {project.role && <CardDescription>Role: {project.role}</CardDescription>}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProject(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                        {project.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.techStack.map((tech, techIndex) => (
                              <Badge key={techIndex} variant="outline" className="gap-1">
                                {tech}
                                <button
                                  type="button"
                                  onClick={() => removeTechFromProject(index, techIndex)}
                                  className="ml-1 rounded-full hover:bg-destructive/20"
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        {project.impact && (
                          <div>
                            <p className="text-sm font-medium">Impact:</p>
                            <p className="text-sm text-muted-foreground">{project.impact}</p>
                          </div>
                        )}
                        {project.url && (
                          <div className="text-sm">
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {project.url}
                            </a>
                          </div>
                        )}
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {project.startDate && (
                            <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>
                          )}
                          {project.endDate && (
                            <span>Ended: {new Date(project.endDate).toLocaleDateString()}</span>
                          )}
                          {!project.endDate && project.startDate && <span>Ongoing</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <FieldGroup className="grid gap-3 md:grid-cols-2">
                    <Field className="md:col-span-2">
                      <FieldLabel>Project Title</FieldLabel>
                      <Input
                        type="text"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        placeholder="e.g., E-commerce Platform"
                      />
                    </Field>
                    <Field className="md:col-span-2">
                      <FieldLabel>Description</FieldLabel>
                      <Textarea
                        value={newProject.description}
                        onChange={(e) =>
                          setNewProject({ ...newProject, description: e.target.value })
                        }
                        placeholder="Describe your project..."
                        rows={3}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Your Role</FieldLabel>
                      <Input
                        type="text"
                        value={newProject.role}
                        onChange={(e) => setNewProject({ ...newProject, role: e.target.value })}
                        placeholder="e.g., Full Stack Developer"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Project URL (optional)</FieldLabel>
                      <Input
                        type="url"
                        value={newProject.url || ""}
                        onChange={(e) =>
                          setNewProject({ ...newProject, url: e.target.value || null })
                        }
                        placeholder="https://..."
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Image URL (optional)</FieldLabel>
                      <Input
                        type="url"
                        value={newProject.imageUrl || ""}
                        onChange={(e) =>
                          setNewProject({ ...newProject, imageUrl: e.target.value || null })
                        }
                        placeholder="https://..."
                      />
                    </Field>
                    <Field className="md:col-span-2">
                      <FieldLabel>Impact (optional)</FieldLabel>
                      <Textarea
                        value={newProject.impact || ""}
                        onChange={(e) =>
                          setNewProject({ ...newProject, impact: e.target.value || null })
                        }
                        placeholder="Describe the impact or results of this project..."
                        rows={2}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Start Date</FieldLabel>
                      <Input
                        type="date"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>End Date (optional)</FieldLabel>
                      <Input
                        type="date"
                        value={newProject.endDate || ""}
                        onChange={(e) =>
                          setNewProject({ ...newProject, endDate: e.target.value || null })
                        }
                      />
                    </Field>
                    <Field className="md:col-span-2">
                      <FieldLabel>Tech Stack</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={techStackInput}
                          onChange={(e) => setTechStackInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (techStackInput.trim()) {
                                const updatedProject = { ...newProject };
                                if (!updatedProject.techStack.includes(techStackInput.trim())) {
                                  updatedProject.techStack.push(techStackInput.trim());
                                  setNewProject(updatedProject);
                                }
                                setTechStackInput("");
                              }
                            }
                          }}
                          placeholder="Type and press Enter to add"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (techStackInput.trim()) {
                              const updatedProject = { ...newProject };
                              if (!updatedProject.techStack.includes(techStackInput.trim())) {
                                updatedProject.techStack.push(techStackInput.trim());
                                setNewProject(updatedProject);
                              }
                              setTechStackInput("");
                            }
                          }}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                      {newProject.techStack.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {newProject.techStack.map((tech, techIndex) => (
                            <Badge key={techIndex} variant="outline" className="gap-1">
                              {tech}
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedProject = { ...newProject };
                                  updatedProject.techStack = updatedProject.techStack.filter(
                                    (_, i) => i !== techIndex
                                  );
                                  setNewProject(updatedProject);
                                }}
                                className="ml-1 rounded-full hover:bg-destructive/20"
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Field>
                  </FieldGroup>
                  <Button type="button" onClick={addProject} variant="outline" className="w-full">
                    <Plus className="mr-2 size-4" />
                    Add Project
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              {profile && (
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : profile ? "Save Changes" : "Create Profile"}
              </Button>
            </div>
          </form>
        </div>
        <Footer />
      </div>
    );
  }

  // Show profile view when profile exists and not editing
  const availability = getAvailabilityLabel(profile.availabilityStatus);

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <div className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">My Profile</h1>
            <p className="mt-2 text-muted-foreground">Your digital resume and portfolio</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGithubDialogOpen(true)}>
              <Github className="mr-2 size-4" />
              Import from GitHub
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 size-4" />
              Edit Profile
            </Button>
          </div>
        </div>

        <Dialog open={githubDialogOpen} onOpenChange={setGithubDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Import Profile from GitHub</DialogTitle>
              <DialogDescription>
                Automatically fill your profile using AI analysis of your GitHub profile and
                repositories
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <Field>
                <FieldLabel>
                  GitHub Username <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  type="text"
                  placeholder="e.g., octocat"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  disabled={importing}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your GitHub username (without @)
                </p>
              </Field>

              {profile && (
                <Field>
                  <FieldLabel>Import Mode</FieldLabel>
                  <RadioGroup
                    value={replaceMode}
                    onValueChange={(value) => setReplaceMode(value as "all" | "empty")}
                    disabled={importing}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="empty" id="empty-view" />
                      <Label htmlFor="empty-view" className="cursor-pointer">
                        Fill empty fields only (recommended)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-view" />
                      <Label htmlFor="all-view" className="cursor-pointer">
                        Replace all fields with GitHub data
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {replaceMode === "empty"
                      ? "Only fields that are currently empty will be filled with GitHub data."
                      : "All profile fields will be replaced with data from your GitHub profile."}
                  </p>
                </Field>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleGitHubImport}
                disabled={importing || !githubUsername.trim()}
                className="w-full"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Importing from GitHub...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 size-4" />
                    Import from GitHub
                  </>
                )}
              </Button>

              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">What will be imported:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Bio and professional information</li>
                  <li>Skills extracted from your repositories</li>
                  <li>Projects from your top repositories</li>
                  <li>Role and experience level</li>
                  <li>Interests based on repository topics</li>
                  <li>GitHub profile URL and avatar</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Profile */}
          <div className="lg:col-span-2">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-start gap-6">
                  <Avatar className="size-24 border-2 border-primary/20">
                    <AvatarImage src={profile.avatarUrl || undefined} alt={profile.name} />
                    <AvatarFallback className="text-3xl bg-primary/10">
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-3xl">{profile.name}</CardTitle>
                    <CardDescription className="text-lg">
                      {getRoleLabel(profile.role)} • {getExperienceLabel(profile.experienceLevel)}
                    </CardDescription>
                    {profile.location && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="size-4" />
                        {profile.location}
                      </div>
                    )}
                    {profile.email && (
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="size-4" />
                        {profile.email}
                      </div>
                    )}
                    {profile.yearsOfExperience > 0 && (
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="size-4" />
                        {profile.yearsOfExperience}{" "}
                        {profile.yearsOfExperience === 1 ? "year" : "years"} of experience
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.github && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={profile.github} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 size-3" />
                            GitHub
                          </a>
                        </Button>
                      )}
                      {profile.linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 size-3" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                      {profile.twitter && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={profile.twitter} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 size-3" />
                            Twitter
                          </a>
                        </Button>
                      )}
                      {profile.portfolio && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={profile.portfolio} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 size-3" />
                            Portfolio
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.bio && (
                  <div>
                    <h2 className="mb-2 text-xl font-semibold">About</h2>
                    <p className="text-sm text-muted-foreground">{profile.bio}</p>
                  </div>
                )}

                {profile.skills.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-xl font-semibold">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <Badge key={skill.id} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.projects.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-xl font-semibold">Projects</h2>
                    <div className="space-y-4">
                      {profile.projects.map((project) => (
                        <Card key={project.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{project.title}</CardTitle>
                            {project.description && (
                              <CardDescription>{project.description}</CardDescription>
                            )}
                          </CardHeader>
                          {project.techStack.length > 0 && (
                            <CardContent>
                              <div className="mb-3 flex flex-wrap gap-1">
                                {project.techStack.map((tech, j) => (
                                  <Badge key={j} variant="outline">
                                    {tech}
                                  </Badge>
                                ))}
                              </div>
                              {project.url && (
                                <Button variant="link" className="p-0" asChild>
                                  <a href={project.url} target="_blank" rel="noopener noreferrer">
                                    View Project <ExternalLink className="ml-1 size-3" />
                                  </a>
                                </Button>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {availability.icon}
                  <span>{availability.text}</span>
                </div>
                {profile.availabilityHoursPerWeek && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile.availabilityHoursPerWeek} hours/week available
                  </p>
                )}
                {profile.preferredWorkingHours && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Preferred hours: {profile.preferredWorkingHours}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Link</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-muted-foreground">Share your profile:</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/profiles/${profile.id}`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/profiles/${profile.id}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Profile link copied to clipboard!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
