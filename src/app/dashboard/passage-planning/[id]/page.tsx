"use client";

import {
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import { honoClient } from "@/lib/hono-client";
import { toast } from "sonner";
import { Checklist, ChecklistCategory } from "@/components/task-chat/checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarineMap, MapLocation } from "@/components/task-chat/marine-map";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  course?: number | null;
  distance?: number | null;
  notes?: string | null;
}

interface PassagePlanningTask {
  id: string;
  task: string;
  status?: 'locked' | 'ready' | 'in_progress' | 'completed';
  progress?: number;
  departurePort?: string | null;
  departureLat?: number | null;
  departureLng?: number | null;
  destinationPort?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  totalDistance?: number | null;
  routeEstimatedTime?: string | null;
  waypoints: Waypoint[];
  checklist: ChecklistCategory[];
}

export default function PassagePlanningPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<PassagePlanningTask | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [isSavingWaypoint, setIsSavingWaypoint] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [waypointToDelete, setWaypointToDelete] = useState<{ index: number; id: string; name: string } | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  // Fetch task data
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        setLoading(true);
        const response = await honoClient.api.user["passage-planning-task"][":id"].$get({
          param: { id: taskId },
        });

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Task not found");
            router.push("/dashboard");
            return;
          }
          throw new Error("Failed to fetch task");
        }

        const result = await response.json();
        if (result.success && result.task) {
          setTask(result.task);
          setWaypoints(result.task.waypoints || []);
          setChecklist(result.task.checklist || []);
        }
      } catch (error) {
        console.error("Error fetching task:", error);
        toast.error("Failed to load passage planning task");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, router]);

  // Refresh waypoints
  const refreshWaypoints = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const response = await honoClient.api.waypoints.$get({
        query: { taskId },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWaypoints(result.waypoints || []);
        }
      }
    } catch (error) {
      console.error("Error refreshing waypoints:", error);
    }
  }, [taskId]);

  // Convert database waypoint to MapLocation
  const waypointToMapLocation = (wp: Waypoint): MapLocation => ({
    id: wp.id,
    name: wp.name,
    lat: wp.latitude,
    lng: wp.longitude,
  });

  // Get departure and destination as MapLocation
  const departure: MapLocation | undefined = task?.departureLat && task?.departureLng
    ? {
        name: task.departurePort || "Departure",
        lat: task.departureLat,
        lng: task.departureLng,
      }
    : undefined;

  const destination: MapLocation | undefined = task?.destinationLat && task?.destinationLng
    ? {
        name: task.destinationPort || "Destination",
        lat: task.destinationLat,
        lng: task.destinationLng,
      }
    : undefined;

  // Map waypoints to MapLocation format
  const mapWaypoints: MapLocation[] = waypoints.map(waypointToMapLocation);

  // Handle waypoint add from map
  const handleWaypointAdd = useCallback(async (location: MapLocation) => {
    if (!taskId) return;

    const name = location.name.trim() || `Waypoint ${waypoints.length + 1}`;
    
    setIsSavingWaypoint(true);
    try {
      const response = await honoClient.api.waypoints.$post({
        json: {
          taskId,
          name,
          latitude: location.lat,
          longitude: location.lng,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add waypoint");
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`Waypoint "${name}" added successfully`);
        await refreshWaypoints();
      }
    } catch (error) {
      console.error("Error adding waypoint:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add waypoint");
    } finally {
      setIsSavingWaypoint(false);
    }
  }, [taskId, waypoints.length, refreshWaypoints]);

  // Handle waypoint update (drag) from map
  const handleWaypointUpdate = useCallback(async (index: number, location: MapLocation) => {
    if (!taskId || !waypoints[index]?.id) return;

    const waypointId = waypoints[index].id;
    
    setIsSavingWaypoint(true);
    try {
      const response = await honoClient.api.waypoints.$put({
        json: {
          waypointId,
          latitude: location.lat,
          longitude: location.lng,
          name: location.name,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update waypoint");
      }

      await refreshWaypoints();
    } catch (error) {
      console.error("Error updating waypoint:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update waypoint");
      // Refresh to revert the change
      await refreshWaypoints();
    } finally {
      setIsSavingWaypoint(false);
    }
  }, [taskId, waypoints, refreshWaypoints]);

  // Handle waypoint delete request from map (opens dialog)
  const handleWaypointDelete = useCallback((index: number) => {
    if (!waypoints[index]?.id) return;
    
    setWaypointToDelete({
      index,
      id: waypoints[index].id,
      name: waypoints[index].name,
    });
    setDeleteDialogOpen(true);
  }, [waypoints]);

  // Confirm waypoint deletion
  const confirmDeleteWaypoint = useCallback(async () => {
    if (!taskId || !waypointToDelete) return;

    try {
      const response = await honoClient.api.waypoints.$delete({
        query: { waypointId: waypointToDelete.id },
      });

      if (!response.ok) {
        throw new Error("Failed to delete waypoint");
      }

      toast.success("Waypoint deleted successfully");
      setDeleteDialogOpen(false);
      setWaypointToDelete(null);
      await refreshWaypoints();
    } catch (error) {
      console.error("Error deleting waypoint:", error);
      toast.error("Failed to delete waypoint");
    }
  }, [taskId, waypointToDelete, refreshWaypoints]);

  // Calculate checklist completion
  const checklistProgress = useMemo(() => {
    const totalItems = checklist.reduce((sum, cat) => sum + cat.items.length, 0);
    const checkedItems = checklist.reduce(
      (sum, cat) => sum + cat.items.filter((item) => item.checked).length,
      0
    );
    return {
      total: totalItems,
      checked: checkedItems,
      percentage: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
      allCompleted: totalItems > 0 && checkedItems === totalItems,
    };
  }, [checklist]);

  // Handle task completion
  const handleCompleteTask = useCallback(async () => {
    if (!taskId) return;

    if (!checklistProgress.allCompleted) {
      toast.error("Please complete all checklist items before finishing the task.");
      return;
    }

    setIsCompletingTask(true);
    try {
      const response = await honoClient.api.user["passage-planning-task"][":id"]["complete"].$post({
        param: { id: taskId },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to complete task");
      }

      const result = await response.json();
      if (result.success) {
        toast.success("Task completed successfully! 🎉");
        if (result.domainProgress) {
          toast.info(`Passage Planning domain progress updated to ${result.domainProgress.progress}%`);
        }
        // Refresh task data
        const taskResponse = await honoClient.api.user["passage-planning-task"][":id"].$get({
          param: { id: taskId },
        });
        if (taskResponse.ok) {
          const taskResult = await taskResponse.json();
          if (taskResult.success && taskResult.task) {
            setTask((prev) => prev ? { ...prev, ...taskResult.task } : null);
          }
        }
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete task");
    } finally {
      setIsCompletingTask(false);
    }
  }, [taskId, checklistProgress.allCompleted, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading passage planning task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {task.departurePort || "Unknown"} to {task.destinationPort || "Unknown"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {task.totalDistance ? `Total Distance: ${task.totalDistance.toFixed(0)} NM` : ""}
            {task.routeEstimatedTime ? ` • Estimated Duration: ${task.routeEstimatedTime}` : ""}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Waypoints Map */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Route & Waypoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSavingWaypoint && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving waypoint...
                  </div>
                )}
                <MarineMap
                  mode="edit"
                  editable={true}
                  height="600px"
                  departure={departure}
                  destination={destination}
                  waypoints={mapWaypoints}
                  onWaypointAdd={handleWaypointAdd}
                  onWaypointUpdate={handleWaypointUpdate}
                  onWaypointDelete={handleWaypointDelete}
                />
                {waypoints.length === 0 && (
                  <p className="text-center text-slate-500 py-4 text-sm">
                    Click on the map to add waypoints to your route
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Checklist */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <Checklist
                  taskId={taskId}
                  initialChecklist={checklist}
                  onUpdate={(updatedChecklist) => {
                    setChecklist(updatedChecklist);
                  }}
                />
              </CardContent>
            </Card>

            {/* Finish Task Button */}
            {task?.status !== 'completed' && (
              <Card>
                <CardHeader>
                  <CardTitle>Complete Task</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {checklistProgress.allCompleted ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        All checklist items completed! You can finish the task.
                      </div>
                    ) : (
                      <div>
                        Complete all checklist items to finish the task.{" "}
                        <span className="font-medium">
                          {checklistProgress.checked} of {checklistProgress.total} items completed
                        </span>
                        {" "}({checklistProgress.percentage}%)
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleCompleteTask}
                    disabled={!checklistProgress.allCompleted || isCompletingTask}
                    className="w-full"
                    size="lg"
                  >
                    {isCompletingTask ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Completing Task...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Finish Task
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Task Completed Message */}
            {task?.status === 'completed' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-green-700">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                      <div className="font-semibold">Task Completed!</div>
                      <div className="text-sm text-green-600 mt-1">
                        This passage planning task has been successfully completed.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <Button
          variant="outline"
          className="mt-8"
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          Back to Dashboard
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Delete Waypoint Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Waypoint</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete waypoint &quot;{waypointToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setWaypointToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteWaypoint}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

