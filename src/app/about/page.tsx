import { Info, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AboutPage() {

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Important Information
          </h1>
          <p className="text-muted-foreground">
            Important details about First Mate and how it works
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>AI Limitations</CardTitle>
              </div>
              <CardDescription>
                Understanding First Mate&apos;s capabilities and limitations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">First Mate Can Make Mistakes</h3>
                <p className="text-sm text-muted-foreground">
                  First Mate is an AI assistant designed to help you with task generation and sailing preparation.
                  While we strive for accuracy, please be aware that:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground ml-4">
                  <li>AI responses may contain errors or inaccuracies</li>
                  <li>Information should be verified, especially for critical safety decisions</li>
                  <li>First Mate may not have access to the most current information</li>
                  <li>Always consult official sources for navigation, weather, and safety information</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle>How First Mate Works</CardTitle>
              </div>
              <CardDescription>
                Understanding the AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Task Generation</h3>
                <p className="text-sm text-muted-foreground">
                  First Mate helps you create and organize tasks across seven key preparation domains:
                  Boat Maintenance, Weather Routing, Safety Systems, Budget Management, and Passage Planning.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Conversational Interface</h3>
                <p className="text-sm text-muted-foreground">
                  You can interact with First Mate through natural conversation. Describe what you need,
                  and First Mate will help you create structured tasks with priorities and time estimates.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Best Practices</CardTitle>
              <CardDescription>
                Tips for getting the most out of First Mate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Verify Important Information</h3>
                <p className="text-sm text-muted-foreground">
                  Always double-check critical information, especially regarding:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Weather forecasts and routing decisions</li>
                  <li>Safety equipment requirements and regulations</li>
                  <li>Budget estimates and financial planning</li>
                  <li>Timeline and scheduling information</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Use as a Starting Point</h3>
                <p className="text-sm text-muted-foreground">
                  First Mate is designed to help you organize and plan, but you should always:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Review and customize generated tasks to fit your specific situation</li>
                  <li>Consult with experienced sailors or professionals when needed</li>
                  <li>Update tasks based on your actual progress and changing circumstances</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safety Reminder</CardTitle>
              <CardDescription>
                Your safety is our priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sailing involves inherent risks. First Mate provides planning assistance, but you are
                ultimately responsible for your safety and the safety of your crew. Always prioritize
                safety over convenience, and never rely solely on AI-generated information for critical
                safety decisions. Consult official maritime authorities, weather services, and experienced
                sailors for important safety information.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

