"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { honoClient } from "@/lib/hono-client";
import {
  Anchor,
  Compass,
  Route,
  CheckCircle2,
  ArrowRight,
  Target,
  Calendar,
  TrendingUp,
  Zap,
  Shield,
  Clock,
  Lock,
  Unlock,
  User,
  Settings,
  LogOut,
  Loader2,
  MessageSquare,
  Edit2,
  Check,
  X,
} from "lucide-react";
import {logout} from "@/server/actions/oauth";

export default function DashboardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editingProgress, setEditingProgress] = useState<number>(0);
  const [savingDomain, setSavingDomain] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'in_progress' | 'completed'>('all');
  const [tasksData, setTasksData] = useState<{
    priorities: Array<{
      id: string;
      domain: string;
      task: string;
      priority: number;
      estimatedTime: string | null;
      status: 'ready' | 'in_progress' | 'locked' | 'completed';
      progress: number;
    }>;
    domainProgress?: Array<{
      name: string;
      progress: number;
    }>;
  } | null>(null);

  const loadTasks = async () => {
    try {
      const response = await honoClient.api.user.$get();
      if (response.ok) {
        const user = await response.json();
        if (user.tasksData) {
          setTasksData(user.tasksData);
        }
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await honoClient.api.user.$get();
        if (response.ok) {
          const user = await response.json();
          if (!user.onboarded) {
            router.push("/onboarding");
            return;
          }

          // Load tasks from database
          if (user.tasksData) {
            setTasksData(user.tasksData);
          } else {
            console.warn('No tasks data found for user');
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setIsChecking(false);
        setIsLoadingTasks(false);
      }
    };

    loadDashboard();
  }, [router]);

  const handleTaskAdded = async (newTask: any) => {
    // Task is already saved to database by the tool
    // Just refresh the task list from the server
    try {
      const response = await honoClient.api.user.$get();
      if (response.ok) {
        const user = await response.json();
        if (user.tasksData) {
          setTasksData(user.tasksData);
        }
      }
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  };

  const handleEditDomain = (domainName: string, currentProgress: number) => {
    setEditingDomain(domainName);
    setEditingProgress(currentProgress);
  };

  const handleCancelEdit = () => {
    setEditingDomain(null);
    setEditingProgress(0);
  };

  const handleSaveDomainProgress = async (domainName: string) => {
    if (editingProgress < 0 || editingProgress > 100) {
      alert('Progress must be between 0 and 100');
      return;
    }

    setSavingDomain(domainName);
    try {
      const response = await honoClient.api.user['domain-progress'].$patch({
        json: {
          domainName,
          progress: editingProgress,
        },
      });

      let result: any = {};
      try {
        const text = await response.text();
        if (text) {
          result = JSON.parse(text);
        }
      } catch {
        // If parsing fails, result remains empty object
      }

      if (!response.ok || ('error' in result && result.error)) {
        const errorMessage = ('error' in result ? result.error : undefined) || 'Failed to update domain progress';
        toast.error(errorMessage);
      } else {
        // Refresh tasks data to get updated domain progress
        const userResponse = await honoClient.api.user.$get();
        if (userResponse.ok) {
          const user = await userResponse.json();
          if (user.tasksData) {
            setTasksData(user.tasksData);
          }
        }
        setEditingDomain(null);
        setEditingProgress(0);
        toast.success(`Updated ${domainName} progress to ${editingProgress}%`);
      }
    } catch (error) {
      console.error('Error saving domain progress:', error);
      toast.error('Failed to save domain progress. Please try again.');
    } finally {
      setSavingDomain(null);
    }
  };

  if (isChecking || isLoadingTasks) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Use generated tasks data or fallback to empty structure
  const allPriorities = tasksData?.priorities || [];

  // Filter tasks by status
  const priorities = statusFilter === 'all'
    ? allPriorities
    : allPriorities.filter(task => task.status === statusFilter);

  // Icon mapping for domains
  const domainIconMap: Record<string, typeof Shield> = {
    "Boat Maintenance": Shield,
    "Weather Routing": Compass,
    "Safety Systems": Zap,
    "Budget Management": Target,
    "Passage Planning": Route,
  };

  const domainProgressData = tasksData?.domainProgress || [
    {
      name: "Boat Maintenance",
      progress: 0,
    },
    { name: "Weather Routing", progress: 0 },
    { name: "Safety Systems", progress: 0 },
    { name: "Budget Management", progress: 0 },
    { name: "Passage Planning", progress: 0 },
  ];

  const domainProgress = domainProgressData.map((domain) => ({
    ...domain,
    icon: domainIconMap[domain.name] || Shield,
  }));


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
              <Button variant="ghost" size="sm" onClick={() => {
                logout().then(() => {
                  router.replace('/login');
                })
              }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome back, Captain
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your personalized preparation roadmap
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Tasks</CardDescription>
              <CardTitle className="text-3xl">{priorities.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tasks in your list
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Priorities</CardDescription>
              <CardTitle className="text-3xl">
                {
                  priorities.filter(
                    (p) => p.status === "in_progress" || p.status === "ready"
                  ).length
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tasks ready to tackle
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed Tasks</CardDescription>
              <CardTitle className="text-3xl">
                {priorities.filter((p) => p.progress === 100).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Great progress!</p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Your Tasks
              </h2>
              <p className="text-muted-foreground">
                Your preparation tasks, organized by priority
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard/generate-task")}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Generate Task
            </Button>
          </div>

          {/* Status Filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({allPriorities.length})
            </Button>
            <Button
              variant={statusFilter === 'ready' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ready')}
            >
              Ready ({allPriorities.filter(t => t.status === 'ready').length})
            </Button>
            <Button
              variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('in_progress')}
            >
              In Progress ({allPriorities.filter(t => t.status === 'in_progress').length})
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
            >
              Completed ({allPriorities.filter(t => t.status === 'completed').length})
            </Button>
          </div>
          {priorities.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No tasks yet. Click &quot;Generate Task&quot; to get started!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {priorities.map((priority) => (
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
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          priority.status === "in_progress"
                            ? "default"
                            : priority.status === "ready"
                            ? "secondary"
                            : priority.status === "completed"
                            ? "default"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        Priority {priority.priority}
                      </Badge>
                      <Badge
                        variant={
                          priority.status === "completed"
                            ? "default"
                            : priority.status === "in_progress"
                            ? "secondary"
                            : priority.status === "ready"
                            ? "outline"
                            : "outline"
                        }
                        className={`text-xs ${
                          priority.status === "completed"
                            ? "bg-slate-600 text-white"
                            : priority.status === "in_progress"
                            ? "bg-blue-500 text-white"
                            : priority.status === "locked"
                            ? "bg-gray-500 text-white"
                            : ""
                        }`}
                      >
                        {priority.status === "completed"
                          ? "Completed"
                          : priority.status === "in_progress"
                          ? "In Progress"
                          : priority.status === "ready"
                          ? "Ready"
                          : "Locked"}
                      </Badge>
                    </div>
                    {priority.status === "locked" ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : priority.status === "in_progress" ? (
                      <Unlock className="h-4 w-4 text-primary" />
                    ) : priority.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-slate-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-lg">{priority.task}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    {domainIconMap[priority.domain] && (
                      <div className="flex h-4 w-4 items-center justify-center">
                        {(() => {
                          const Icon = domainIconMap[priority.domain];
                          return <Icon className="h-3 w-3" />;
                        })()}
                      </div>
                    )}
                    {priority.domain}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {priority.estimatedTime || 'Not specified'}
                      </span>
                      {priority.status === "in_progress" && (
                        <span className="text-primary font-medium">
                          {priority.progress}%
                        </span>
                      )}
                    </div>
                    {priority.status === "in_progress" && (
                      <Progress value={priority.progress} className="h-2" />
                    )}
                    <Button
                      variant={
                        priority.status === "locked" || priority.status === "completed"
                          ? "outline"
                          : "default"
                      }
                      className="w-full"
                      disabled={priority.status === "locked" || priority.status === "completed"}
                      onClick={() => {
                        if (priority.status === "locked" || priority.status === "completed") return;
                        // Redirect to passage planning detail page for Passage Planning tasks
                        if (priority.domain === "Passage Planning") {
                          router.push(`/dashboard/passage-planning/${priority.id}`);
                        }
                        // For other domains, you can add navigation logic here if needed
                      }}
                    >
                      {priority.status === "locked"
                        ? "Locked"
                        : priority.status === "completed"
                        ? "Completed"
                        : priority.status === "in_progress"
                        ? "Continue"
                        : "Start"}
                      {priority.status !== "locked" && priority.status !== "completed" && (
                        <ArrowRight className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </section>


        {/* Domain Progress */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Preparation Domains
              </h2>
              <p className="text-muted-foreground">
                Your progress across all areas
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {domainProgress.map((domain, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {(() => {
                          const Icon = domain.icon;
                          return <Icon className="h-5 w-5 text-primary" />;
                        })()}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {domain.name}
                        </CardTitle>
                      </div>
                    </div>
                    {editingDomain === domain.name ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editingProgress}
                          onChange={(e) => setEditingProgress(Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !savingDomain) {
                              e.preventDefault();
                              handleSaveDomainProgress(domain.name);
                            }
                          }}
                          className="w-20 h-8 text-center"
                          disabled={savingDomain === domain.name}
                        />
                        <span className="text-2xl font-bold">%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleSaveDomainProgress(domain.name)}
                          disabled={savingDomain === domain.name}
                        >
                          {savingDomain === domain.name ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={handleCancelEdit}
                          disabled={savingDomain === domain.name}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {domain.progress}%
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditDomain(domain.name, domain.progress)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress
                    value={editingDomain === domain.name ? editingProgress : domain.progress}
                    className="h-2"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
