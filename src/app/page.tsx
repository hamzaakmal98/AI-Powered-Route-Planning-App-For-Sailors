'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Anchor,
  Compass,
  Map,
  Route,
  CheckCircle2,
  ArrowRight,
  Target,
  BookOpen,
  Calendar,
  TrendingUp,
  Zap,
  Shield
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Anchor className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">Knot Ready</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => scrollToSection("features")}>Features</Button>
              <Button variant="ghost" onClick={() => scrollToSection("how-it-works")}>How it Works</Button>
              <Button asChild>
                <Link href="/login">Get Start</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/20 py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Compass className="mr-1 h-3 w-3" />
              Smart Sailing Preparation
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Stop Feeling Overwhelmed
              <br />
              <span className="text-primary">Start Sailing Confidently</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Sailing preparation is complex—we get it. Knot Ready cuts through the noise with
              personalized, sequenced guidance. No more fragmented advice. No more wondering what to do next.
              Just your next 3-5 priorities, tailored to your boat, experience, and journey.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-base" asChild>
                <Link href="/login">
                Get Start Now
                <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base" onClick={() => scrollToSection("how-it-works")}>
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                The Real Problem Isn&apos;t Lack of Information
              </h2>
              <p className="text-lg text-muted-foreground">
                Our research with sailors revealed the truth about preparation challenges
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3 mb-12">
              <Card className="border-2 border-foreground/20">
                <CardHeader>
                  <div className="text-4xl font-bold text-foreground mb-2">44%</div>
                  <CardTitle>Can&apos;t Find Situation-Specific Info</CardTitle>
                  <CardDescription>
                    Generic advice doesn&apos;t help when you need guidance for your specific boat type,
                    experience level, or journey plan.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-2 border-foreground/20">
                <CardHeader>
                  <div className="text-4xl font-bold text-foreground mb-2">31%</div>
                  <CardTitle>No Systematic Organization</CardTitle>
                  <CardDescription>
                    Information is scattered across forums, books, and YouTube. There&apos;s no single
                    place to track what you&apos;ve learned and what&apos;s next.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-2 border-foreground/20">
                <CardHeader>
                  <div className="text-4xl font-bold text-foreground mb-2">25%</div>
                  <CardTitle>Don&apos;t Know Task Order</CardTitle>
                  <CardDescription>
                    Even when you know what needs doing, you&apos;re paralyzed by not knowing what to
                    tackle first or in what sequence.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-center text-lg">
                  <strong>The core problem:</strong> Overwhelming, fragmented guidance without clear
                  sequencing or personalization. That&apos;s what Knot Ready solves.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution: Key Features */}
      <section id="features" className="py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Two Powerful Solutions
            </h2>
            <p className="text-lg text-muted-foreground">
              Built directly from sailor feedback to solve your real preparation challenges
            </p>
          </div>
          <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-2">
            <Card className="border-2">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Map className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Progressive Skill Tree Framework</CardTitle>
                <CardDescription className="text-base">
                  Your adaptive roadmap across all five preparation domains
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Not a flat checklist</strong>—an intelligent roadmap that adapts to your situation
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Reveals your <strong>next 3-5 priorities</strong> based on boat type, experience, journey plan, and timeline
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Covers all domains: boat maintenance, budget management, weather routing, skill-building, and more
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Eliminates analysis paralysis</strong> by showing exactly what to focus on now
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Deep-Dive Execution System</CardTitle>
                <CardDescription className="text-base">
                  Master practical sailing experience with structured, verified progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Rich execution documents</strong> with breakdown templates for each skill level
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Verification mechanisms</strong>—submit photos/videos to prove readiness
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Progressive unlocking:</strong> Day sails → Overnights → Multi-day passages
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Clear readiness gates</strong> so you know when you&apos;re truly prepared for the next level
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Five Domains */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              All Five Preparation Domains
            </h2>
            <p className="text-lg text-muted-foreground">
              Sailing preparation spans multiple complex areas. We map them all.
            </p>
          </div>
          <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Shield, title: "Boat Maintenance", difficulty: "2.81/5", description: "Keep your vessel seaworthy and reliable" },
              { icon: Target, title: "Budget Management", description: "Plan and track expenses for your journey" },
              { icon: Compass, title: "Weather Routing", description: "Navigate safely with weather intelligence" },
              { icon: Route, title: "Passage Planning", description: "Plan routes, waypoints, and navigation" },
              { icon: Zap, title: "Safety Systems", description: "Emergency procedures and safety equipment" },
            ].map((domain, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <domain.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{domain.title}</CardTitle>
                  {domain.difficulty && (
                    <Badge variant="outline" className="w-fit mt-2">
                      Difficulty: {domain.difficulty}
                    </Badge>
                  )}
                  <CardDescription className="text-sm">
                    {domain.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get your personalized sailing preparation roadmap in three simple steps
            </p>
          </div>
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  1
                </div>
                <h3 className="mb-3 text-xl font-semibold">Tell Us About Your Journey</h3>
                <p className="text-muted-foreground">
                  Share your boat type, experience level, journey plan, and timeline.
                  We use this to personalize everything.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  2
                </div>
                <h3 className="mb-3 text-xl font-semibold">Get Your Next 3-5 Priorities</h3>
                <p className="text-muted-foreground">
                  Our skill tree framework analyzes all five domains and reveals exactly
                  what you should focus on next—no overwhelm, no guesswork.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  3
                </div>
                <h3 className="mb-3 text-xl font-semibold">Execute & Verify Progress</h3>
                <p className="text-muted-foreground">
                  Follow detailed execution guides, submit verification (photos/videos),
                  and unlock the next level when you&apos;re ready.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Card className="border-2 bg-primary/5">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl mb-4">Ready to Stop Feeling Overwhelmed?</CardTitle>
                <CardDescription className="text-base">
                  Join sailors who are finally getting organized, knowing what to do next,
                  and preparing with confidence.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button size="lg" className="text-base" asChild>
                    <Link href="/login">
                      Get Your Personalized Roadmap
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-base">
                    See a Demo
                  </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  No credit card required • Start preparing today
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Anchor className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">Knot Ready</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Knot Ready. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
