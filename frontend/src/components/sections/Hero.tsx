import Link from 'next/link';
import { Search, Shield, Globe, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 py-20">
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-12">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Discover Your
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {' '}Digital Footprint
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl mb-8">
              Search across 3000+ websites to build a comprehensive profile of any username. 
              Find social media accounts, forums, and online presence with powerful OSINT capabilities.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/search">
                  <Search className="mr-2 h-5 w-5" />
                  Start Searching
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Card className="border-0 bg-background/50 backdrop-blur">
              <CardContent className="p-6">
                <Globe className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">3000+ Sites</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive coverage across social media, forums, and websites
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-background/50 backdrop-blur">
              <CardContent className="p-6">
                <Zap className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Real-time Results</h3>
                <p className="text-sm text-muted-foreground">
                  Live progress tracking and instant notifications
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-background/50 backdrop-blur">
              <CardContent className="p-6">
                <Shield className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Privacy Focused</h3>
                <p className="text-sm text-muted-foreground">
                  No API keys required, anonymous searching
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
      </div>
    </section>
  );
}
