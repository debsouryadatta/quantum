"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Builder {
  id: string;
  name: string;
  bio: string | null;
  role: string;
  experienceLevel: string;
  avatarUrl: string | null;
  location: string | null;
  availabilityStatus: string;
  github: string | null;
  skills: Array<{
    name: string;
    category: string;
    proficiencyLevel: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    techStack: string[];
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

function BuildersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "");
  const [experienceFilter, setExperienceFilter] = useState(
    searchParams.get("experienceLevel") || ""
  );
  const [availabilityFilter, setAvailabilityFilter] = useState(
    searchParams.get("availabilityStatus") || ""
  );
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Debounce function
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // Fetch builders
  const fetchBuilders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (experienceFilter) params.set("experienceLevel", experienceFilter);
      if (availabilityFilter) params.set("availabilityStatus", availabilityFilter);
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());

      const response = await fetch(`/api/builders?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch builders");
      }

      const data = await response.json();
      setBuilders(data.builders || []);
      setPagination(data.pagination || pagination);

      // Update URL without reloading
      const newUrl = `/builders${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      console.error("Error fetching builders:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, experienceFilter, availabilityFilter, pagination.page, pagination.limit, router]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on new search
      fetchBuilders();
    }, 500),
    [fetchBuilders]
  );

  // Initial load and when filters change
  useEffect(() => {
    fetchBuilders();
  }, [roleFilter, experienceFilter, availabilityFilter, pagination.page]);

  // Debounced search effect
  useEffect(() => {
    debouncedSearch();
  }, [searchQuery, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "busy":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "not_looking":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getAvailabilityLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Available";
      case "busy":
        return "Busy";
      case "not_looking":
        return "Not Looking";
      default:
        return status;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="size-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold">All Builders</h1>
          </div>
          <p className="text-muted-foreground">
            Discover talented builders and find your perfect teammate
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, skills, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={roleFilter || "all"} onValueChange={(value) => setRoleFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="fullstack">Full Stack</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="data">Data</SelectItem>
                <SelectItem value="ml">ML</SelectItem>
              </SelectContent>
            </Select>

            <Select value={experienceFilter || "all"} onValueChange={(value) => setExperienceFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={availabilityFilter || "all"}
              onValueChange={(value) => setAvailabilityFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="not_looking">Not Looking</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-muted-foreground">
            {pagination.total === 0
              ? "No builders found"
              : `Showing ${builders.length} of ${pagination.total} builders`}
          </div>
        )}

        {/* Builders Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-24 rounded-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : builders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No builders found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {builders.map((builder) => (
                <Card
                  key={builder.id}
                  className="hover:shadow-lg transition-shadow border-2 hover:border-primary/30"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="size-16 border-2 border-primary/20">
                        <AvatarImage
                          src={builder.avatarUrl || undefined}
                          alt={builder.name}
                        />
                        <AvatarFallback className="text-lg font-semibold bg-primary/10">
                          {builder.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">
                          {builder.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {builder.role} • {builder.experienceLevel}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getAvailabilityColor(builder.availabilityStatus)
                          )}
                        >
                          {getAvailabilityLabel(builder.availabilityStatus)}
                        </Badge>
                      </div>
                    </div>

                    {builder.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {builder.bio}
                      </p>
                    )}

                    {builder.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                        <MapPin className="size-3" />
                        <span>{builder.location}</span>
                      </div>
                    )}

                    {builder.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {builder.skills.slice(0, 5).map((skill, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                        {builder.skills.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{builder.skills.length - 5}
                          </Badge>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/profiles/${builder.id}`}>
                        View Profile
                        <ArrowRight className="size-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPreviousPage}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function BuildersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-background">
          <Navigation />
          <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Users className="size-8 text-primary" />
                <h1 className="text-3xl sm:text-4xl font-bold">All Builders</h1>
              </div>
              <p className="text-muted-foreground">
                Discover talented builders and find your perfect teammate
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-24 w-24 rounded-full mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <BuildersPageContent />
    </Suspense>
  );
}

