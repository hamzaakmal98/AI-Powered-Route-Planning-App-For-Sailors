'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { honoClient } from "@/lib/hono-client";
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
  Shield,
  Clock,
  Trophy,
  ChevronRight,
  Lock,
  Unlock,
  FileText,
  Camera,
  User,
  Settings,
  LogOut,
  Loader2
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const response = await honoClient.api.user.$get();
        if (response.ok) {
          const user = await response.json();
          if (!user.onboarded) {
            router.push('/onboarding');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  // Mock data - in real app this would come from API/state
  const nextPriorities = [
    {
      id: 1,
      domain: "Boat Maintenance",
      task: "Complete engine service checklist",
      priority: 1,
      estimatedTime: "2-3 hours",
      status: "in_progress",
      progress: 60,
    },
    {
      id: 2,
      domain: "Skill Building",
      task: "Complete day sail verification",
      priority: 2,
      estimatedTime: "1 day",
      status: "ready",
      progress: 0,
    },
    {
      id: 3,
      domain: "Weather Routing",
      task: "Set up weather monitoring system",
      priority: 3,
      estimatedTime: "1 hour",
      status: "locked",
      progress: 0,
    },
    {
      id: 4,
      domain: "Safety Systems",
      task: "Review emergency procedures",
      priority: 4,
      estimatedTime: "30 min",
      status: "locked",
      progress: 0,
    },
    {
      id: 5,
      domain: "Budget Management",
      task: "Create initial budget template",
      priority: 5,
      estimatedTime: "45 min",
      status: "locked",
      progress: 0,
    },
  ];

  const domainProgress = [
    { name: "Boat Maintenance", icon: Shield, progress: 45, difficulty: "2.81/5" },
    { name: "Skill Building", icon: TrendingUp, progress: 30, difficulty: null },
    { name: "Weather Routing", icon: Compass, progress: 15, difficulty: null },
    { name: "Safety Systems", icon: Zap, progress: 20, difficulty: null },
    { name: "Budget Management", icon: Target, progress: 10, difficulty: null },
    { name: "Passage Planning", icon: Route, progress: 5, difficulty: null },
    { name: "Timeline Management", icon: Calendar, progress: 25, difficulty: null },
  ];

  const executionProgress = [
    { level: "Day Sails", status: "in_progress", completed: 3, required: 5, unlocked: true },
    { level: "Overnights", status: "locked", completed: 0, required: 3, unlocked: false },
    { level: "Multi-day Passages", status: "locked", completed: 0, required: 2, unlocked: false },
  ];

  const overallProgress = 28; // Calculated from domain progress

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Anchor className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">Knot Ready</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, Captain</h1>
          <p className="text-muted-foreground">
            Here&apos;s your personalized preparation roadmap
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Overall Progress</CardDescription>
              <CardTitle className="text-3xl">{overallProgress}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={overallProgress} className="h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Priorities</CardDescription>
              <CardTitle className="text-3xl">
                {nextPriorities.filter(p => p.status === "in_progress" || p.status === "ready").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tasks ready to tackle</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Days Until Departure</CardDescription>
              <CardTitle className="text-3xl">127</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">On track for your timeline</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed Tasks</CardDescription>
              <CardTitle className="text-3xl">12</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Great progress!</p>
            </CardContent>
          </Card>
        </div>


        {/* Next 3-5 Priorities Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Your Next Priorities</h2>
              <p className="text-muted-foreground">
                Focus on these tasks next—sequenced specifically for your journey
              </p>
            </div>
            <Button variant="outline">
              View Full Roadmap
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nextPriorities.map((priority) => (
              <Card
                key={priority.id}
                className={`border-2 ${
                  priority.status === "in_progress"
                    ? "border-primary"
                    : priority.status === "ready"
                    ? "border-primary/50"
                    : "border-muted opacity-60"
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge
                      variant={priority.status === "in_progress" ? "default" : priority.status === "ready" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      Priority {priority.priority}
                    </Badge>
                    {priority.status === "locked" ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : priority.status === "in_progress" ? (
                      <Unlock className="h-4 w-4 text-primary" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-lg">{priority.task}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Shield className="h-3 w-3" />
                    {priority.domain}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {priority.estimatedTime}
                      </span>
                      {priority.status === "in_progress" && (
                        <span className="text-primary font-medium">{priority.progress}%</span>
                      )}
                    </div>
                    {priority.status === "in_progress" && (
                      <Progress value={priority.progress} className="h-2" />
                    )}
                    <Button
                      variant={priority.status === "locked" ? "outline" : "default"}
                      className="w-full"
                      disabled={priority.status === "locked"}
                    >
                      {priority.status === "locked" ? "Locked" : priority.status === "in_progress" ? "Continue" : "Start"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Domain Progress */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Preparation Domains</h2>
                <p className="text-muted-foreground">
                  Your progress across all seven areas
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {domainProgress.map((domain, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <domain.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{domain.name}</CardTitle>
                          {domain.difficulty && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Difficulty: {domain.difficulty}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-2xl font-bold">{domain.progress}%</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={domain.progress} className="h-2" />
                    <Button variant="ghost" size="sm" className="w-full mt-3">
                      View Details
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Execution System Progress */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight mb-2">Practical Experience</h2>
              <p className="text-muted-foreground text-sm">
                Build real sailing skills with verified progress
              </p>
            </div>
            <div className="space-y-4">
              {executionProgress.map((level, index) => (
                <Card
                  key={index}
                  className={level.unlocked ? "border-2 border-primary/20" : "opacity-60"}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {level.unlocked ? (
                          <Unlock className="h-4 w-4 text-primary" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        {level.level}
                      </CardTitle>
                      <Badge variant={level.unlocked ? "default" : "outline"}>
                        {level.completed}/{level.required}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Progress
                        value={(level.completed / level.required) * 100}
                        className="h-2"
                      />
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {level.completed} of {level.required} completed
                        </span>
                        {level.unlocked && level.completed < level.required && (
                          <span className="text-primary">
                            {level.required - level.completed} remaining
                          </span>
                        )}
                      </div>
                      {level.unlocked ? (
                        <Button variant="outline" className="w-full" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View Execution Guide
                        </Button>
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          Complete previous level to unlock
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator className="my-6" />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Camera className="h-4 w-4 mr-2" />
                  Submit Verification
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Skill Tree
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Map className="h-4 w-4 mr-2" />
                  Update Journey Plan
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Recent Activity */}
        <section className="mt-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Recent Activity</h2>
            <p className="text-muted-foreground text-sm">
              Your latest progress and achievements
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[
                  { action: "Completed", task: "Engine service checklist", time: "2 hours ago", icon: CheckCircle2, color: "text-primary" },
                  { action: "Unlocked", task: "Day sail verification", time: "Yesterday", icon: Unlock, color: "text-primary" },
                  { action: "Started", task: "Weather monitoring setup", time: "3 days ago", icon: Clock, color: "text-muted-foreground" },
                  { action: "Achievement", task: "Completed 10 tasks", time: "1 week ago", icon: Trophy, color: "text-yellow-600" },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${activity.color}`}>
                      <activity.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.action}: {activity.task}</p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
