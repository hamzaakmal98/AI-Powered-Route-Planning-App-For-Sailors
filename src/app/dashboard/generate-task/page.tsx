"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TaskChat } from "@/components/task-chat";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function GenerateTaskPage() {
  const router = useRouter();

  // Disable body scroll to prevent external scrollbar
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleTaskAdded = async () => {
    // After task is added, redirect back to dashboard
    router.push("/dashboard");
  };

  const handleClose = () => {
    router.push("/dashboard");
  };

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <TaskChat onClose={handleClose} onTaskAdded={handleTaskAdded} fullPage={true} />
      </div>
    </div>
  );
}

