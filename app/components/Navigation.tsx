"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";

export function Navigation() {
  const { isSignedIn, user } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 relative">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold gradient-text">Quantum</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6 absolute left-1/2 -translate-x-1/2">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          {isSignedIn && (
            <Link
              href="/profile"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Profile
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-4 ml-auto">
          {isSignedIn ? (
            <>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

