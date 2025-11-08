"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Bot, Lightbulb, MapPin, ChevronDown, ChevronUp } from "lucide-react";

interface SearchResult {
  builder: {
    id: string;
    name: string;
    bio: string | null;
    role: string;
    experienceLevel: string;
    avatarUrl: string | null;
    location: string | null;
    availabilityStatus: string;
    skills: Array<{ name: string; category: string; proficiencyLevel: string }>;
    projects: Array<{ title: string; description: string; techStack: string[] }>;
  };
  score: number;
  matchScorePercentage?: number;
  matchExplanation: string;
  relevanceFactors: Array<{ factor: string; contribution: number }>;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface AgentReasoning {
  plan: {
    queryIntent: {
      primary: string;
      secondary: string[];
    };
    searchStrategy: {
      approach: string;
    };
  };
  evaluation: {
    confidenceScore: number;
    relevanceScore: number;
    diversityScore: number;
  };
  refinements: Array<{ iteration: number; reason: string }>;
  totalIterations: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [reasoning, setReasoning] = useState<AgentReasoning | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const isManualRefreshRef = useRef(false);
  const pageSize = 10;

  // Reset page and sessionId when query changes
  useEffect(() => {
    setCurrentPage(1);
    setSessionId(null);
  }, [query]);

  // Perform search function (reusable)
  const performSearch = useCallback(async (skipCache: boolean = false) => {
    if (!query) {
      router.push("/");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (skipCache) {
        setRefreshing(true);
      }
      
      const response = await fetch("/api/search/agentic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          options: {
            page: currentPage,
            pageSize,
            maxResults: 100, // Fetch enough for pagination
            includeReasoning: currentPage === 1, // Only include reasoning on first page
            skipCache,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          // Rate limit exceeded
          const message = errorData.message || `Rate limit exceeded. Please try again later.`;
          toast.error("Rate Limit Exceeded", {
            description: message,
            duration: 5000,
          });
          setError(message);
          return;
        }
        
        throw new Error(errorData.message || errorData.error || "Search failed");
      }

      const data = await response.json();
      // Store sessionId from API response
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      // Sort results by score (descending) to ensure highest scores first
      const sortedResults = [...(data.results || [])].sort((a: SearchResult, b: SearchResult) => {
        const scoreA = a.matchScorePercentage ?? a.score * 100;
        const scoreB = b.matchScorePercentage ?? b.score * 100;
        return scoreB - scoreA;
      });
      setResults(sortedResults);
      setPagination(data.pagination || null);
      if (currentPage === 1) {
        setReasoning(data.agentReasoning || null);
      }
      
      if (skipCache) {
        toast.success("Search refreshed", {
          description: "Cache cleared and new results loaded",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      if (!errorMessage.includes("Rate limit")) {
        toast.error("Search Error", {
          description: errorMessage,
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, currentPage, pageSize, router]);

  // Perform search when query or page changes
  useEffect(() => {
    // Skip automatic search if this is a manual refresh
    if (isManualRefreshRef.current) {
      isManualRefreshRef.current = false;
      return;
    }
    performSearch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentPage, pageSize]);

  // Handle refresh button click
  const handleRefresh = useCallback(async () => {
    isManualRefreshRef.current = true;
    // Reset to first page if not already there
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // Perform fresh search with cache bypass
    await performSearch(true);
  }, [performSearch, currentPage]);

  const handleFeedback = async (resultId: string, action: "click" | "contact" | "skip") => {
    if (!sessionId) {
      console.warn("Cannot send feedback: sessionId not available");
      return;
    }

    try {
      await fetch("/api/analytics/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          resultId,
          action,
        }),
      });
    } catch (err) {
      console.error("Feedback error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <div className="container mx-auto flex-1 px-4 py-8">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <div className="container mx-auto flex-1 px-4 py-8">
          <div className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-6">
            <p className="text-sm font-medium text-destructive">Error: {error}</p>
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
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            ← Back to home
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">Search Results</h1>
              <p className="mt-2 text-muted-foreground">Query: &quot;{query}&quot;</p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? "animate-spin" : ""}
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              {refreshing ? "Refreshing..." : "Refresh Cache"}
            </Button>
          </div>
        </div>

      {/* Agent Reasoning */}
      {reasoning && (
        <Collapsible open={showReasoning} onOpenChange={setShowReasoning} className="mb-8">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bot className="size-4" />
                    Agent Reasoning
                  </span>
                  {showReasoning ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Planning:</strong> Identified &quot;
                  {reasoning.plan.queryIntent.primary}&quot;
                </div>
                <div>
                  <strong>Execution:</strong> Found {results.length} candidates
                </div>
                <div>
                  <strong>Evaluation:</strong> Quality score:{" "}
                  {(reasoning.evaluation.confidenceScore * 100).toFixed(0)}%
                </div>
                {reasoning.refinements.length > 0 && (
                  <div>
                    <strong>Refinements:</strong> {reasoning.refinements.length}{" "}
                    iteration(s)
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

        {/* Results */}
        <div className="space-y-6">
          {pagination && (
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, pagination.totalResults)} of {pagination.totalResults} result{pagination.totalResults !== 1 ? "s" : ""}
            </p>
          )}

          {results.map((result) => {
            const matchScore = result.matchScorePercentage ?? Math.round(result.score * 100);
            return (
              <Card key={result.builder.id} className="border-2 transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="size-16 border-2 border-primary/20">
                      <AvatarImage src={result.builder.avatarUrl || undefined} alt={result.builder.name} />
                      <AvatarFallback className="text-xl bg-primary/10">
                        {result.builder.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{result.builder.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {result.builder.role} • {result.builder.experienceLevel}
                          </CardDescription>
                          {result.builder.location && (
                            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="size-3" />
                              {result.builder.location}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold gradient-text">
                            {matchScore}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Match Score
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.builder.bio && (
                    <p className="text-sm leading-relaxed">{result.builder.bio}</p>
                  )}

                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Lightbulb className="size-4" />
                      Why this match:
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.matchExplanation}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {result.builder.skills.slice(0, 8).map((skill, i) => (
                      <Badge key={i} variant="secondary" className="px-3 py-1">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" asChild>
                      <Link
                        href={`/profiles/${result.builder.id}`}
                        onClick={() => handleFeedback(result.builder.id, "click")}
                      >
                        View Profile
                      </Link>
                    </Button>
                    {isSignedIn && (
                      <Button
                        onClick={() => handleFeedback(result.builder.id, "contact")}
                      >
                        Contact
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

        {results.length === 0 && !loading && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No results found</EmptyTitle>
              <EmptyDescription>
                Try a different search query.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (pagination.hasPreviousPage) {
                      setCurrentPage(currentPage - 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={!pagination.hasPreviousPage ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                // Show first page, last page, current page, and pages around current
                const showPage =
                  pageNum === 1 ||
                  pageNum === pagination.totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                
                if (!showPage) {
                  // Show ellipsis
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      isActive={pageNum === currentPage}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (pagination.hasNextPage) {
                      setCurrentPage(currentPage + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={!pagination.hasNextPage ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

