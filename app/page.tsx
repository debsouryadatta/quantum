"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import { Search, Code2, Users2, Target, ArrowRight, CheckCircle2, Sparkles, Zap, Shield } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const exampleQueries = [
    "React developer with design skills",
    "Backend engineer experienced in Python and ML",
    "Full-stack developer who loves hackathons",
    "Designer with frontend experience",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden px-6 pt-20 pb-16 sm:px-8 sm:pt-24 sm:pb-20">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-accent/20 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>
          
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Stop searching.
                <br />
                <span className="text-primary">Start building.</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto">
                Find the right teammate for your hackathon project. Search by skills, experience, and what you're actually building—not just keywords.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                A side project built at <span className="font-medium text-foreground">Devfolio Tryout</span>
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="mt-10">
                <div className="mx-auto max-w-2xl">
                  <div className="flex gap-3 rounded-2xl bg-card border border-border/50 p-2 shadow-lg ring-1 ring-border/20">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., React developer who can design"
                        className="pl-12 h-14 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <Button type="submit" size="lg" className="h-14 px-8 rounded-xl">
                      Search
                    </Button>
                  </div>
                </div>
              </form>

              {/* Example Queries */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="text-muted-foreground">Try:</span>
                {exampleQueries.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(example);
                      router.push(`/search?q=${encodeURIComponent(example)}`);
                    }}
                    className="group relative rounded-full border border-border bg-card px-4 py-1.5 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:bg-primary/5"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
            <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-accent/20 to-primary/20 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
          </div>
        </section>

        {/* How It Works */}
        <section className="py-32 sm:py-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-20">
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary mb-4">
                How it works
              </span>
              <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
                Find teammates in three steps
              </h2>
              <p className="text-lg text-muted-foreground">
                Simple, fast, and effective. Get from idea to team in minutes.
              </p>
            </div>
            
            <div className="relative">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8">
                {/* Step 1 */}
                <div className="relative group">
                  <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Search className="size-7 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
                        1
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      Search naturally
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto lg:mx-0">
                      Describe what you need in plain language. Our search understands context, not just keywords.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative group">
                  <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Target className="size-7 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
                        2
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      Get matched
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto lg:mx-0">
                      See profiles ranked by relevance. Skills, experience, and project fit—all factored in.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative group">
                  <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Users2 className="size-7 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
                        3
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      Connect & build
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto lg:mx-0">
                      Reach out directly. Start collaborating on your hackathon project right away.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-32 sm:py-40 bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
                    <Sparkles className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Smart matching
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our search engine understands what you're building, not just what you're searching for.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
                    <Shield className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Real profiles
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Every profile is verified. See actual projects, skills, and what people have built.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:col-span-2 lg:col-span-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
                    <Zap className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Fast results
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Get relevant matches in seconds. No waiting, no filtering through irrelevant results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!isSignedIn && (
          <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Ready to find your team?
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                  Join builders who are already using Quantum to find their perfect hackathon teammates.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Button size="lg" asChild className="rounded-xl">
                    <a href="/sign-up">
                      Get started
                      <ArrowRight className="ml-2 size-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="rounded-xl">
                    <a href="/sign-in">Sign in</a>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
