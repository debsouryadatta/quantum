"use client";

import Link from "next/link";
import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, ExternalLink, Code2, Sparkles, Users2, Zap, Heart, MessageSquare } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden px-4 pt-16 pb-12 sm:px-6 sm:pt-20 sm:pb-16 md:px-8 md:pt-24 md:pb-20">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-accent/20 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl px-4">
              About Quantum
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl leading-7 sm:leading-8 text-muted-foreground max-w-2xl mx-auto px-4">
              A conversational AI agent that helps you find the right teammates for hackathons through natural dialogue and intelligent matching.
            </p>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-12 sm:py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">The Story</h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6">
                Quantum was born out of frustration. After participating in multiple hackathons, I realized how difficult it was to find teammates who not only had the right skills but also matched your working style and project vision.
              </p>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6">
                Traditional search methods fall short because they rely on keywords. But finding a teammate isn't about matching keywords—it's about understanding what you're building, what skills you need, and who would be a good fit.
              </p>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6">
                So I built Quantum: a conversational AI agent that helps you find teammates through natural dialogue. Instead of typing keywords, you chat with an AI that asks clarifying questions, understands context, and uses intelligent search tools to find the best matches.
              </p>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                The system uses a chat-based interface where you can have back-and-forth conversations. The AI agent uses RAG (semantic) search and keyword search tools to find builders, then explains why each match is relevant to your needs.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 sm:mb-4 px-4">
                What Makes Quantum Different
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Conversational AI Agent</h3>
                  <p className="text-muted-foreground">
                    Chat naturally with an AI agent that asks clarifying questions and understands context through conversation, not just keywords.
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
                  <h3 className="text-xl font-semibold mb-2">Intelligent Search Tools</h3>
                  <p className="text-muted-foreground">
                    Uses RAG (semantic) search for conceptual matching and keyword search for specific skills. Results are ranked and explained with match reasons.
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

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Conversation History</h3>
                  <p className="text-muted-foreground">
                    All your conversations are saved. Review past searches, continue conversations, or start fresh. Old conversations become read-only for reference.
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
        <section className="py-12 sm:py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center px-4">Built With</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
              {[
                "Next.js 16",
                "TypeScript",
                "PostgreSQL",
                "pgvector",
                "Vercel AI SDK",
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
        <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 px-4">Open Source & Free</h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 px-4">
              Quantum is open source and free to use. Check out the code, contribute, or fork it for your own needs.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 px-4">
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

