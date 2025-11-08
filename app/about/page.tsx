"use client";

import Link from "next/link";
import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, ExternalLink, Code2, Sparkles, Users2, Zap, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden px-6 pt-20 pb-16 sm:px-8 sm:pt-24 sm:pb-20">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-accent/20 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              About Quantum
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto">
              A side project built to solve a real problem: finding the right teammates for hackathons shouldn't be this hard.
            </p>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <h2 className="text-3xl font-bold mb-6">The Story</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Quantum was born out of frustration. After participating in multiple hackathons, I realized how difficult it was to find teammates who not only had the right skills but also matched your working style and project vision.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Traditional search methods fall short because they rely on keywords. But finding a teammate isn't about matching keywords—it's about understanding what you're building, what skills you need, and who would be a good fit.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                So I built Quantum: an AI-powered search system that understands context, not just keywords. It uses multi-agent orchestration to analyze queries, search semantically, and rank results by actual relevance.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
                What Makes Quantum Different
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Understanding</h3>
                  <p className="text-muted-foreground">
                    Our multi-agent system understands what you're building, not just what you're searching for.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Code2 className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">GitHub Integration</h3>
                  <p className="text-muted-foreground">
                    Import your profile from GitHub with AI analysis. Let the AI understand your work and fill your profile automatically.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Fast & Accurate</h3>
                  <p className="text-muted-foreground">
                    Get relevant matches in seconds. Semantic search with vector embeddings ensures quality results.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users2 className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Real Profiles</h3>
                  <p className="text-muted-foreground">
                    Every profile shows real projects, skills, and experience. No fake data, no spam.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 sm:col-span-2 lg:col-span-1">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Heart className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Built for Builders</h3>
                  <p className="text-muted-foreground">
                    Made by someone who's been there. Built at Devfolio Tryout, for the hackathon community.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-8 text-center">Built With</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                "Next.js 16",
                "TypeScript",
                "PostgreSQL",
                "pgvector",
                "OpenRouter",
                "OpenAI",
                "Clerk",
                "Prisma",
                "Upstash",
              ].map((tech) => (
                <div
                  key={tech}
                  className="rounded-lg border border-border/50 bg-card p-4 text-center text-sm font-medium"
                >
                  {tech}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Open Source & Free</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Quantum is open source and free to use. Check out the code, contribute, or fork it for your own needs.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-xl">
                <a
                  href="https://github.com/debsouryadatta/quantum"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 size-4" />
                  View on GitHub
                  <ExternalLink className="ml-2 size-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl">
                <a
                  href="https://github.com/debsouryadatta"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Built by @debsouryadatta
                  <ExternalLink className="ml-2 size-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

