"use client";

import Link from "next/link";
import { Github, ExternalLink, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
          <div className="space-y-3 sm:space-y-4 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold">Quantum</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm sm:max-w-none mx-auto sm:mx-0">
              Find your perfect hackathon teammate with AI-powered search. Built at Devfolio Tryout.
            </p>
          </div>
          
          <div className="space-y-3 sm:space-y-4 text-center sm:text-left">
            <h4 className="text-sm font-semibold">Links</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/search" className="hover:text-foreground transition-colors">
                  Chat
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-foreground transition-colors">
                  Your Profile
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="space-y-3 sm:space-y-4 text-center sm:text-left sm:col-span-2 md:col-span-1">
            <h4 className="text-sm font-semibold">Open Source</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a 
                  href="https://github.com/debsouryadatta/quantum" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <Github className="size-3 sm:size-3.5" />
                  View on GitHub
                  <ExternalLink className="size-3 sm:size-3.5" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/debsouryadatta" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  Built by @debsouryadatta
                  <ExternalLink className="size-3 sm:size-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border/40">
          <p className="text-xs sm:text-sm text-muted-foreground text-center flex flex-wrap items-center justify-center gap-1.5 px-4">
            © {new Date().getFullYear()} Quantum. A side project built with <Heart className="size-3 sm:size-3.5 fill-destructive text-destructive" /> for the hackathon community.
          </p>
        </div>
      </div>
    </footer>
  );
}

