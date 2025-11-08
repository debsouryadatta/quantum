"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGroup, FieldLabel, Field } from "@/components/ui/field";

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
  skills: Array<{ id: string; name: string; category: string; proficiencyLevel: string }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    techStack: string[];
    url: string | null;
  }>;
}

export default function ProfilePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch("/api/profiles");

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data.profile);
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

  useEffect(() => {
    if (profile) {
      setFormData({
        role: profile.role,
        experienceLevel: profile.experienceLevel,
        availabilityStatus: profile.availabilityStatus,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      const formDataObj = new FormData(e.currentTarget);
      const data = {
        name: formDataObj.get("name") as string,
        email: formDataObj.get("email") as string,
        bio: formDataObj.get("bio") as string,
        role: formData.role,
        experienceLevel: formData.experienceLevel,
        yearsOfExperience: parseInt(formDataObj.get("yearsOfExperience") as string) || 0,
        location: formDataObj.get("location") as string,
        timezone: formDataObj.get("timezone") as string,
        availabilityStatus: formData.availabilityStatus,
        availabilityHoursPerWeek: parseInt(formDataObj.get("availabilityHoursPerWeek") as string) || null,
        preferredWorkingHours: formDataObj.get("preferredWorkingHours") as string,
        github: formDataObj.get("github") as string,
        linkedin: formDataObj.get("linkedin") as string,
        twitter: formDataObj.get("twitter") as string,
        portfolio: formDataObj.get("portfolio") as string,
        avatarUrl: formDataObj.get("avatarUrl") as string,
      };

      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      const result = await response.json();
      setProfile(result.profile);
      alert("Profile saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Edit Profile</h1>

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
                  defaultValue={profile?.name || ""}
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
                  defaultValue={profile?.email || ""}
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
                <Input
                  type="url"
                  name="github"
                  defaultValue={profile?.github || ""}
                />
              </Field>

              <Field>
                <FieldLabel>LinkedIn</FieldLabel>
                <Input
                  type="url"
                  name="linkedin"
                  defaultValue={profile?.linkedin || ""}
                />
              </Field>

              <Field>
                <FieldLabel>Twitter</FieldLabel>
                <Input
                  type="url"
                  name="twitter"
                  defaultValue={profile?.twitter || ""}
                />
              </Field>

              <Field>
                <FieldLabel>Portfolio</FieldLabel>
                <Input
                  type="url"
                  name="portfolio"
                  defaultValue={profile?.portfolio || ""}
                />
              </Field>

              <Field>
                <FieldLabel>Avatar URL</FieldLabel>
                <Input
                  type="url"
                  name="avatarUrl"
                  defaultValue={profile?.avatarUrl || ""}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}

