"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Navigation } from "../../components/Navigation";
import { Footer } from "../../components/Footer";
import { MapPin, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  bio: string | null;
  role: string;
  experienceLevel: string;
  avatarUrl: string | null;
  location: string | null;
  availabilityStatus: string;
  github: string | null;
  linkedin: string | null;
  twitter: string | null;
  portfolio: string | null;
  skills: Array<{ name: string; category: string; proficiencyLevel: string }>;
  projects: Array<{
    title: string;
    description: string;
    techStack: string[];
    url: string | null;
  }>;
}

interface RelatedBuilder {
  id: string;
  name: string;
  bio: string | null;
  role: string;
  experienceLevel: string;
  avatarUrl: string | null;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [relatedBuilders, setRelatedBuilders] = useState<RelatedBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/profiles/${id}`);

        if (!response.ok) {
          throw new Error("Profile not found");
        }

        const data = await response.json();
        setProfile(data.profile);
        setRelatedBuilders(data.relatedBuilders || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        toast.error("Failed to load profile", {
          description: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id]);

  if (loading) {
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

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <div className="container mx-auto flex-1 px-4 py-8">
          <div className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-6">
            <p className="text-sm font-medium text-destructive">Error: {error || "Profile not found"}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <div className="container mx-auto flex-1 px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
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
                    {profile.role} • {profile.experienceLevel}
                  </CardDescription>
                  {profile.location && (
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3" />
                      {profile.location}
                    </div>
                  )}
                  <div className="mt-4 flex gap-4">
                    {profile.github && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={profile.github} target="_blank" rel="noopener noreferrer">
                          GitHub
                        </a>
                      </Button>
                    )}
                    {profile.linkedin && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
                          LinkedIn
                        </a>
                      </Button>
                    )}
                    {profile.portfolio && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={profile.portfolio} target="_blank" rel="noopener noreferrer">
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
                  <h2 className="text-xl font-semibold mb-2">About</h2>
                  <p className="text-sm">{profile.bio}</p>
                </div>
              )}

              <div>
                <h2 className="text-xl font-semibold mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {profile.projects.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Projects</h2>
                  <div className="space-y-4">
                    {profile.projects.map((project, i) => (
                      <Card key={i}>
                        <CardHeader>
                          <CardTitle>{project.title}</CardTitle>
                          <CardDescription>{project.description}</CardDescription>
                        </CardHeader>
                        {project.techStack.length > 0 && (
                          <CardContent>
                            <div className="flex flex-wrap gap-1">
                              {project.techStack.map((tech, j) => (
                                <Badge key={j} variant="outline">
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                            {project.url && (
                              <Button variant="link" className="mt-2" asChild>
                                <a href={project.url} target="_blank" rel="noopener noreferrer">
                                  View Project →
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
                {profile.availabilityStatus === "available" ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Available for projects</span>
                  </>
                ) : profile.availabilityStatus === "busy" ? (
                  <>
                    <Clock className="size-4" />
                    <span>Currently busy</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-4" />
                    <span>Not looking</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {relatedBuilders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Similar Builders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedBuilders.map((builder) => (
                    <Link
                      key={builder.id}
                      href={`/profiles/${builder.id}`}
                      className="block"
                    >
                      <Card className="hover:bg-accent transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-10">
                              <AvatarImage src={builder.avatarUrl || undefined} alt={builder.name} />
                              <AvatarFallback>
                                {builder.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{builder.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {builder.role}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}

