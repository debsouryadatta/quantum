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
        <section className="relative isolate overflow-hidden px-4 pt-16 pb-12 sm:px-6 sm:pt-20 sm:pb-16 md:px-8 md:pt-24 md:pb-20">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-accent/20 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>
          
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                Stop searching.
                <br />
                <span className="text-primary">Start building.</span>
              </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl leading-7 sm:leading-8 text-muted-foreground max-w-2xl mx-auto px-4">
                Chat with Quantum to find your perfect hackathon teammate.
              </p>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                A side project built at <span className="font-medium text-foreground">Devfolio Tryout</span>
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="mt-8 sm:mt-10">
                <div className="mx-auto max-w-2xl px-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-card border border-border/50 p-2 shadow-lg ring-1 ring-border/20">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 sm:left-4 top-1/2 size-4 sm:size-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., I need a React developer who can design"
                        className="pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <Button type="submit" size="lg" className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl w-full sm:w-auto">
                      Start Chat
                    </Button>
                  </div>
                </div>
              </form>

              {/* Example Queries */}
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm px-4">
                <span className="text-muted-foreground w-full sm:w-auto text-center sm:text-left">Try:</span>
                {exampleQueries.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(example);
                      router.push(`/search?q=${encodeURIComponent(example)}`);
                    }}
                    className="group relative rounded-full border border-border bg-card px-3 sm:px-4 py-1 sm:py-1.5 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:bg-primary/5 text-xs sm:text-sm"
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
        <section className="py-16 sm:py-24 md:py-32 lg:py-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16 md:mb-20">
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary mb-3 sm:mb-4">
                How it works
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-3 sm:mb-4 px-4">
                Find teammates in three steps
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground px-4">
                Simple, fast, and effective. Get from idea to team in minutes.
              </p>
            </div>
            
            <div className="relative">
              <div className="grid grid-cols-1 gap-12 sm:gap-16 md:gap-20 lg:grid-cols-3 lg:gap-8">
                {/* Step 1 */}
                <div className="relative group">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                        <Search className="size-8 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        1
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      Chat with AI
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-xs">
                      Start a conversation. Our AI asks questions to understand what you need.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative group">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                        <Target className="size-8 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        2
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      Get matched
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-xs">
                      Get ranked results with explanations of why each builder matches your needs.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative group">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                        <Users2 className="size-8 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        3
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      Connect & build
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-xs">
                      Reach out and start building together.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!isSignedIn && (
          <section className="py-16 sm:py-24 md:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground px-4">
                  Ready to find your team?
                </h2>
                <p className="mx-auto mt-4 sm:mt-6 max-w-xl text-base sm:text-lg leading-7 sm:leading-8 text-muted-foreground px-4">
                  Join builders who are already using Quantum to find their perfect hackathon teammates.
                </p>
                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-x-6 px-4">
                  <Button size="lg" asChild className="rounded-xl w-full sm:w-auto">
                    <a href="/sign-up" className="flex items-center justify-center">
                      Get started
                      <ArrowRight className="ml-2 size-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="rounded-xl w-full sm:w-auto">
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
