"use client";
import Link from 'next/link';
import { Search, Settings, BarChart3, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-full bg-primary"></div>
            <span className="font-bold">
              Maigret OSINT
            </span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <nav className="flex items-center space-x-4 text-sm font-medium">
            <Link
              href="/search"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              <Search className="h-4 w-4 mr-1 inline" />
              Search
            </Link>
            {/* Results link removed to avoid prefetching non-existent /results index route */}
            <Link
              href="/settings"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              <Settings className="h-4 w-4 mr-1 inline" />
              Settings
            </Link>
          </nav>
          
          <ModeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link href="https://github.com/simkjels/maigret-ui" target="_blank">
              <Github className="h-4 w-4 mr-1" />
              GitHub
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
