"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function Navigation() {
  const { isSignedIn, user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 sm:h-16 items-center px-3 sm:px-4 relative">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold gradient-text">Quantum</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 absolute left-1/2 -translate-x-1/2">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/search"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Chat
          </Link>
          <Link
            href="/builders"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Builders
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About
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

        {/* Mobile Menu & Auth */}
        <div className="flex items-center gap-2 ml-auto md:hidden">
          {isSignedIn && (
            <UserButton afterSignOutUrl="/" />
          )}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9">
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[300px]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col space-y-1 mt-4">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-2"
                >
                  Home
                </Link>
                <Link
                  href="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-2"
                >
                  Chat
                </Link>
                <Link
                  href="/builders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-2"
                >
                  Builders
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-2"
                >
                  About
                </Link>
                {isSignedIn && (
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-2"
                  >
                    Profile
                  </Link>
                )}
                {!isSignedIn && (
                  <div className="flex flex-col gap-3 pt-4 mt-4 border-t">
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-3 sm:space-x-4 ml-auto">
          {isSignedIn ? (
            <>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

