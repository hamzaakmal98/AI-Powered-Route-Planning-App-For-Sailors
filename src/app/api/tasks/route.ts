import { Experimental_Agent as Agent, tool, stepCountIs, validateUIMessages } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const maxDuration = 30;

// Get GPT model name from environment variable, default to gpt-4o-mini
const GPT_MODEL = process.env.GPT_MODEL || 'gpt-4o-mini';
// Get Ollama model name from environment variable, default to llama2
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';
// Determine which LLM provider to use: 'ollama' or 'openai' (default: 'openai')
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

// Helper function to get the appropriate model based on LLM_PROVIDER env var
function getModel() {
  if (LLM_PROVIDER === 'ollama') {
    return ollama(OLLAMA_MODEL);
  }
  return openai(GPT_MODEL);
}

// Factory function to create the getUserContext tool with userId access
function getUserContextToolFactory(userId: string) {
  return tool({
    description: 'Fetch the user\'s onboarding information and context. Use this when you need to understand the user\'s boat, experience level, journey goals, concerns, and domain progress to provide personalized recommendations. This tool does NOT include existing tasks - use getRouteData for route-specific information if needed.',
    inputSchema: z.object({}).describe('No parameters needed - fetches all user context'),
    execute: async () => {
      try {
        // Fetch user data from database (only onboarding data and domain progress, no tasks)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            domainProgress: true,
          },
        } as any) as any;

        if (!user) {
          return {
            success: false,
            message: 'User not found',
          };
        }

        const onboardingData = user.onboardingData as any;

        // Build comprehensive user context (without tasks information)
        const context: any = {
          onboarding: {},
          domainProgress: user.domainProgress || [],
        };

        // Extract onboarding information comprehensively
        if (onboardingData && typeof onboardingData === 'object') {
          // Boat information
          if (onboardingData.boatType) context.onboarding.boatType = onboardingData.boatType;
          if (onboardingData.boatLength) context.onboarding.boatLength = onboardingData.boatLength;
          if (onboardingData.boatName) context.onboarding.boatName = onboardingData.boatName;
          if (onboardingData.boatAge) context.onboarding.boatAge = onboardingData.boatAge;
          
          // Sailing experience
          if (onboardingData.experienceLevel) context.onboarding.experienceLevel = onboardingData.experienceLevel;
          if (Array.isArray(onboardingData.certifications) && onboardingData.certifications.length > 0) {
            context.onboarding.certifications = onboardingData.certifications;
          }
          if (onboardingData.mechanicalSkills) context.onboarding.mechanicalSkills = onboardingData.mechanicalSkills;
          if (onboardingData.longestPassage) context.onboarding.longestPassage = onboardingData.longestPassage;
          
          // Journey planning
          if (onboardingData.journeyType) context.onboarding.journeyType = onboardingData.journeyType;
          if (onboardingData.primaryDestination) context.onboarding.primaryDestination = onboardingData.primaryDestination;
          if (onboardingData.journeyDuration) context.onboarding.journeyDuration = onboardingData.journeyDuration;
          
          // Timeline
          if (onboardingData.departureDate) context.onboarding.departureDate = onboardingData.departureDate;
          if (onboardingData.preparationTimeline) context.onboarding.preparationTimeline = onboardingData.preparationTimeline;
          if (onboardingData.currentPreparationStatus) context.onboarding.currentPreparationStatus = onboardingData.currentPreparationStatus;
          // Legacy support for 'timeline' field
          if (onboardingData.timeline && !context.onboarding.preparationTimeline) {
            context.onboarding.preparationTimeline = onboardingData.timeline;
          }
          
          // Goals and priorities
          if (Array.isArray(onboardingData.primaryGoals) && onboardingData.primaryGoals.length > 0) {
            context.onboarding.primaryGoals = onboardingData.primaryGoals;
          }
          
          // Concerns (legacy support)
          if (Array.isArray(onboardingData.mainConcerns) && onboardingData.mainConcerns.length > 0) {
            context.onboarding.mainConcerns = onboardingData.mainConcerns;
          }
          if (onboardingData.additionalConcerns) {
            context.onboarding.additionalConcerns = onboardingData.additionalConcerns;
          }
        }

        return {
          success: true,
          context: context,
          summary: `User onboarding information retrieved. Domain progress available for ${user.domainProgress.length} preparation domains.`,
        };
      } catch (error) {
        console.error('Error fetching user context:', error);
        return {
          success: false,
          message: 'Failed to fetch user context',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
}

// Helper function to get the correct Prisma model for a domain
function getTaskModelForDomain(domain: string) {
  const domainModelMap: Record<string, string> = {
    'Boat Maintenance': 'boatMaintenanceTask',
    'Weather Routing': 'weatherRoutingTask',
    'Safety Systems': 'safetySystemsTask',
    'Budget Management': 'budgetManagementTask',
    'Passage Planning': 'passagePlanningTask',
  };
  return domainModelMap[domain] || null;
}

// Factory function to create the createTask tool with userId access
function createTaskToolFactory(userId: string) {
  return tool({
    description: 'Create a new preparation task for the user and save it to the database. For Passage Planning domain, this will also create a route if departure and destination are provided.',
    inputSchema: z.object({
      domain: z.enum([
        'Boat Maintenance',
        'Weather Routing',
        'Safety Systems',
        'Budget Management',
        'Passage Planning',
      ]).describe('The domain this task belongs to'),
      task: z.string().describe('Clear, actionable task description'),
      priority: z.number().min(1).max(5).describe('Priority level (1 is highest)'),
      estimatedTime: z.string().describe('Estimated time to complete (e.g., "2-3 hours", "1 day")'),
      // Route parameters (only used for Passage Planning)
      departurePort: z.string().optional().describe('Name of the departure port (required for Passage Planning)'),
      departureLat: z.number().optional().describe('Latitude of departure port (required for Passage Planning)'),
      departureLng: z.number().optional().describe('Longitude of departure port (required for Passage Planning)'),
      destinationPort: z.string().optional().describe('Name of the destination port (required for Passage Planning)'),
      destinationLat: z.number().optional().describe('Latitude of destination port (required for Passage Planning)'),
      destinationLng: z.number().optional().describe('Longitude of destination port (required for Passage Planning)'),
      routeName: z.string().optional().describe('Optional name for the route (for Passage Planning)'),
      departureDate: z.string().optional().describe('Departure date in ISO format (yyyy-MM-dd) for Passage Planning'),
    }),
    execute: async ({ domain, task, priority, estimatedTime, departurePort, departureLat, departureLng, destinationPort, destinationLat, destinationLng, routeName, departureDate }) => {
      try {
        const modelName = getTaskModelForDomain(domain);
        if (!modelName) {
          return {
            success: false,
            message: `Unknown domain: ${domain}`,
          };
        }

        // For Passage Planning, require route information
        if (domain === 'Passage Planning') {
          if (!departurePort || departureLat === undefined || departureLng === undefined ||
              !destinationPort || destinationLat === undefined || destinationLng === undefined) {
            return {
              success: false,
              message: 'For Passage Planning tasks, departure and destination locations are required. Please provide departurePort, departureLat, departureLng, destinationPort, destinationLat, and destinationLng.',
            };
          }

          // Check if user already has a Passage Planning task
          const existingTask = await (prisma as any).passagePlanningTask.findFirst({
            where: {
              userId: userId,
              status: { in: ['ready', 'in_progress'] },
              routeStatus: 'planning',
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

            // If there's an existing task, update it with new route information
          if (existingTask) {
            const updateData: any = {
              departurePort,
              departureLat,
              departureLng,
              destinationPort,
              destinationLat,
              destinationLng,
              routeName: routeName || existingTask.routeName,
            };
            if (departureDate !== undefined) {
              updateData.departureDate = departureDate;
            }
            const updatedTask = await (prisma as any).passagePlanningTask.update({
              where: { id: existingTask.id },
              data: updateData,
            });

            return {
              success: true,
              message: `Passage Planning task updated and route from ${departurePort} to ${destinationPort} has been updated.`,
              task: {
                id: updatedTask.id,
                domain: domain,
                task: updatedTask.task,
                priority: updatedTask.priority,
                estimatedTime: updatedTask.estimatedTime,
                status: updatedTask.status,
                progress: updatedTask.progress,
              },
              route: {
                id: updatedTask.id, // Same ID as task since they're merged
                departurePort: updatedTask.departurePort,
                destinationPort: updatedTask.destinationPort,
                name: updatedTask.routeName,
                departureLat: updatedTask.departureLat,
                departureLng: updatedTask.departureLng,
                destinationLat: updatedTask.destinationLat,
                destinationLng: updatedTask.destinationLng,
              },
            };
          }

          // Create task with route information merged into one record
          const newTask = await (prisma as any).passagePlanningTask.create({
            data: {
              userId: userId,
              task,
              priority,
              estimatedTime,
              status: 'ready' as const,
              progress: 0,
              // Route information merged into the same record
              routeName: routeName,
              departurePort,
              departureLat,
              departureLng,
              departureDate: departureDate || null,
              destinationPort,
              destinationLat,
              destinationLng,
              routeStatus: 'planning',
            },
          });

          const result = { task: newTask };

          return {
            success: true,
            message: `Passage Planning task "${task}" and route from ${departurePort} to ${destinationPort} have been created successfully.`,
            task: {
              id: result.task.id,
              domain: domain,
              task: result.task.task,
              priority: result.task.priority,
              estimatedTime: result.task.estimatedTime,
              status: result.task.status,
              progress: result.task.progress,
            },
            route: {
              id: result.task.id, // Same ID as task since they're merged
              departurePort: result.task.departurePort,
              destinationPort: result.task.destinationPort,
              name: result.task.routeName,
              departureLat: result.task.departureLat,
              departureLng: result.task.departureLng,
              destinationLat: result.task.destinationLat,
              destinationLng: result.task.destinationLng,
            },
          };
        }

        // For other domains, create task normally
        const newTask = await (prisma as any)[modelName].create({
          data: {
            userId: userId,
            task,
            priority,
            estimatedTime,
            status: 'ready' as const,
            progress: 0,
          },
        });

        return {
          success: true,
          message: `Task "${task}" has been created successfully in the ${domain} domain.`,
          task: {
            id: newTask.id,
            domain: domain,
            task: newTask.task,
            priority: newTask.priority,
            estimatedTime: newTask.estimatedTime,
            status: newTask.status,
            progress: newTask.progress,
          },
        };
      } catch (error) {
        console.error('Error creating task in database:', error);
        return {
          success: false,
          message: 'Failed to save task to database. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
}

// Factory function to create the saveRoute tool for route planning
// Note: For Passage Planning, routes are now merged into PassagePlanningTask, so this tool updates the task directly
function saveRouteToolFactory(userId: string) {
  return tool({
    description: 'Update a Passage Planning task with route information. Use this when the user has selected both departure and destination locations. Note: For Passage Planning, the route is stored in the task itself.',
    inputSchema: z.object({
      departurePort: z.string().describe('Name of the departure port'),
      departureLat: z.number().describe('Latitude of departure port'),
      departureLng: z.number().describe('Longitude of departure port'),
      destinationPort: z.string().describe('Name of the destination port'),
      destinationLat: z.number().describe('Latitude of destination port'),
      destinationLng: z.number().describe('Longitude of destination port'),
      routeName: z.string().optional().describe('Optional name for this route'),
      totalDistance: z.number().optional().describe('Total distance in nautical miles'),
      estimatedTime: z.string().optional().describe('Estimated passage time (e.g., "21 days")'),
      departureDate: z.string().optional().describe('Departure date in ISO format (yyyy-MM-dd)'),
      passagePlanningTaskId: z.string().describe('ID of the Passage Planning task to update'),
    }),
    execute: async ({ departurePort, departureLat, departureLng, destinationPort, destinationLat, destinationLng, routeName, totalDistance, estimatedTime, departureDate, passagePlanningTaskId }) => {
      try {
        // Verify the task exists and belongs to the user
        const task = await (prisma as any).passagePlanningTask.findUnique({
          where: { id: passagePlanningTaskId },
        });
        if (!task || task.userId !== userId) {
          return {
            success: false,
            message: 'Invalid Passage Planning task ID.',
          };
        }

        // Update the task with route information (merged table)
        const updateData: any = {
          departurePort,
          departureLat,
          departureLng,
          destinationPort,
          destinationLat,
          destinationLng,
          routeName: routeName || task.routeName,
          totalDistance: totalDistance || task.totalDistance,
          routeEstimatedTime: estimatedTime || task.routeEstimatedTime,
        };
        if (departureDate !== undefined) {
          updateData.departureDate = departureDate;
        }
        const updatedTask = await (prisma as any).passagePlanningTask.update({
          where: { id: passagePlanningTaskId },
          data: updateData,
        });

        return {
          success: true,
          message: `Route from ${departurePort} to ${destinationPort} has been saved.`,
          route: {
            id: updatedTask.id, // Same ID as task since they're merged
            departurePort: updatedTask.departurePort,
            destinationPort: updatedTask.destinationPort,
            name: updatedTask.routeName,
            departureLat: updatedTask.departureLat,
            departureLng: updatedTask.departureLng,
            destinationLat: updatedTask.destinationLat,
            destinationLng: updatedTask.destinationLng,
          },
        };
      } catch (error) {
        console.error('Error saving route:', error);
        return {
          success: false,
          message: 'Failed to save route. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
}

// Factory function to add waypoints to a route
function addWaypointToolFactory(userId: string) {
  return tool({
    description: 'Add a waypoint to the current route. Use this when the user wants to add intermediate waypoints along their route.',
    inputSchema: z.object({
      name: z.string().describe('Name of the waypoint'),
      latitude: z.number().describe('Latitude of the waypoint'),
      longitude: z.number().describe('Longitude of the waypoint'),
      course: z.number().optional().describe('Course to next waypoint in degrees'),
      distance: z.number().optional().describe('Distance to next waypoint in nautical miles'),
      notes: z.string().optional().describe('Additional notes about this waypoint'),
      passagePlanningTaskId: z.string().describe('ID of the Passage Planning task (the route is merged into this task)'),
    }),
    execute: async ({ name, latitude, longitude, course, distance, notes, passagePlanningTaskId }) => {
      try {
        // Verify the task exists and belongs to the user
        const task = await (prisma as any).passagePlanningTask.findUnique({
          where: { id: passagePlanningTaskId },
          include: {
            waypoints: {
              orderBy: {
                sequence: 'desc',
              },
            },
          },
        });

        if (!task || task.userId !== userId) {
          return {
            success: false,
            message: 'Invalid Passage Planning task ID.',
          };
        }

        // Get the next sequence number
        const nextSequence = task.waypoints.length > 0
          ? task.waypoints[0].sequence + 1
          : 1;

        const waypoint = await (prisma as any).waypoint.create({
          data: {
            passagePlanningTaskId: task.id,
            name,
            latitude,
            longitude,
            sequence: nextSequence,
            course: course || null,
            distance: distance || null,
            notes: notes || null,
          },
        });

        return {
          success: true,
          message: `Waypoint "${name}" has been added to your route.`,
          waypoint: {
            id: waypoint.id,
            name: waypoint.name,
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
            sequence: waypoint.sequence,
            course: waypoint.course,
            distance: waypoint.distance,
            notes: waypoint.notes,
          },
        };
      } catch (error) {
        console.error('Error adding waypoint:', error);
        return {
          success: false,
          message: 'Failed to add waypoint. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
}

// Factory function to generate route using Wavve routing API
function generateRouteToolFactory(userId: string) {
  return tool({
    description: 'Generate an automatic route between two points using marine routing API. Use this when the user has selected both departure and destination locations and wants an automatically generated route with waypoints. This will calculate the optimal route considering water depth and navigation constraints.',
    inputSchema: z.object({
      startLat: z.number().describe('Latitude of the starting point'),
      startLng: z.number().describe('Longitude of the starting point'),
      endLat: z.number().describe('Latitude of the destination point'),
      endLng: z.number().describe('Longitude of the destination point'),
      draftMinusWaterLevel: z.number().optional().describe('Boat draft minus water level in feet (default: 3). This is the clearance needed under the keel.'),
    }),
    execute: async ({ startLat, startLng, endLat, endLng, draftMinusWaterLevel = 3 }) => {
      try {
        const accessToken = 'xuqath3x8yocchartviewer';
        const url = new URL('https://backend.wavve.ca/routing');
        url.searchParams.set('accessToken', accessToken);
        url.searchParams.set('startLat', startLat.toString());
        url.searchParams.set('startLng', startLng.toString());
        url.searchParams.set('endLat', endLat.toString());
        url.searchParams.set('endLng', endLng.toString());
        url.searchParams.set('draftMinusWaterLevel', draftMinusWaterLevel.toString());

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
            'origin': 'https://chartviewer.wavveboating.com',
            'referer': 'https://chartviewer.wavveboating.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) {
          return {
            success: false,
            message: `Route generation failed: ${response.status} ${response.statusText}`,
            error: 'API request failed',
          };
        }

        const routeData = await response.json();

        // Parse the route data to extract waypoints
        // Wavve API returns: { routePoints: [{ lat, lng, timestamp }], warningLines: [] }
        // We need to intelligently extract key waypoints, not use all route points
        let waypoints: Array<{ lat: number; lng: number; name?: string }> = [];

        if (routeData.routePoints && Array.isArray(routeData.routePoints)) {
          // Primary format: routePoints array from Wavve API
          // Extract only lat/lng, ignoring timestamp
          const allPoints = routeData.routePoints.map((point: any) => ({
            lat: typeof point.lat === 'number' ? point.lat : parseFloat(point.lat),
            lng: typeof point.lng === 'number' ? point.lng : parseFloat(point.lng),
          }));

          // Intelligently extract waypoints: start, end, and significant turning points
          if (allPoints.length === 0) {
            waypoints = [];
          } else if (allPoints.length <= 2) {
            // If only 1-2 points, use them all
            waypoints = allPoints.map((point: { lat: number; lng: number }, index: number) => ({
              lat: point.lat,
              lng: point.lng,
              name: index === 0 ? 'Start' : index === allPoints.length - 1 ? 'Destination' : `Waypoint ${index + 1}`,
            }));
          } else {
            // Extract key waypoints: start, end, and significant turning points
            const extractedWaypoints: Array<{ lat: number; lng: number; name: string }> = [];

            // Always include the start point
            extractedWaypoints.push({
              lat: allPoints[0].lat,
              lng: allPoints[0].lng,
              name: 'Start',
            });

            // Calculate bearing changes to find significant turning points
            const minDistanceForWaypoint = 0.5; // Minimum distance in nautical miles between waypoints
            const minBearingChange = 15; // Minimum bearing change in degrees to consider a waypoint

            let lastWaypointIndex = 0;
            let lastBearing: number | null = null;

            for (let i = 1; i < allPoints.length - 1; i++) {
              const prevPoint = allPoints[i - 1];
              const currPoint = allPoints[i];
              const nextPoint = allPoints[i + 1];

              // Calculate distance from last waypoint
              const R = 3440; // Earth radius in nautical miles
              const dLat = (currPoint.lat - allPoints[lastWaypointIndex].lat) * Math.PI / 180;
              const dLng = (currPoint.lng - allPoints[lastWaypointIndex].lng) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(allPoints[lastWaypointIndex].lat * Math.PI / 180) * Math.cos(currPoint.lat * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distance = R * c;

              // Calculate bearing change
              const bearing1 = Math.atan2(
                Math.sin((nextPoint.lng - currPoint.lng) * Math.PI / 180) * Math.cos(nextPoint.lat * Math.PI / 180),
                Math.cos(currPoint.lat * Math.PI / 180) * Math.sin(nextPoint.lat * Math.PI / 180) -
                Math.sin(currPoint.lat * Math.PI / 180) * Math.cos(nextPoint.lat * Math.PI / 180) *
                Math.cos((nextPoint.lng - currPoint.lng) * Math.PI / 180)
              ) * 180 / Math.PI;

              const bearing2 = lastBearing !== null ? lastBearing : Math.atan2(
                Math.sin((currPoint.lng - prevPoint.lng) * Math.PI / 180) * Math.cos(currPoint.lat * Math.PI / 180),
                Math.cos(prevPoint.lat * Math.PI / 180) * Math.sin(currPoint.lat * Math.PI / 180) -
                Math.sin(prevPoint.lat * Math.PI / 180) * Math.cos(currPoint.lat * Math.PI / 180) *
                Math.cos((currPoint.lng - prevPoint.lng) * Math.PI / 180)
              ) * 180 / Math.PI;

              const bearingChange = Math.abs(bearing1 - bearing2);
              const normalizedBearingChange = bearingChange > 180 ? 360 - bearingChange : bearingChange;

              // Add waypoint if: significant distance from last waypoint OR significant bearing change
              if (distance >= minDistanceForWaypoint || (lastBearing !== null && normalizedBearingChange >= minBearingChange)) {
                extractedWaypoints.push({
                  lat: currPoint.lat,
                  lng: currPoint.lng,
                  name: `Waypoint ${extractedWaypoints.length}`,
                });
                lastWaypointIndex = i;
                lastBearing = bearing1;
              } else if (lastBearing === null) {
                lastBearing = bearing1;
              }

              // Limit to maximum 20 waypoints (excluding start and end)
              if (extractedWaypoints.length >= 20) {
                break;
              }
            }

            // Always include the destination point
            const lastPoint = allPoints[allPoints.length - 1];
            extractedWaypoints.push({
              lat: lastPoint.lat,
              lng: lastPoint.lng,
              name: 'Destination',
            });

            waypoints = extractedWaypoints;
          }
        } else if (Array.isArray(routeData)) {
          // If response is an array of coordinates
          waypoints = (routeData as any[]).map((point: any, index: number) => ({
            lat: typeof point.lat === 'number' ? point.lat : parseFloat(point.lat || point[1] || point.y),
            lng: typeof point.lng === 'number' ? point.lng : parseFloat(point.lng || point[0] || point.x),
            name: point.name || `Waypoint ${index + 1}`,
          }));
        } else if (routeData.waypoints || routeData.route || routeData.coordinates) {
          // If response has waypoints, route, or coordinates property
          const points = routeData.waypoints || routeData.route || routeData.coordinates || [];
          waypoints = points.map((point: any, index: number) => ({
            lat: typeof point.lat === 'number' ? point.lat : parseFloat(point.lat || point[1] || point.y),
            lng: typeof point.lng === 'number' ? point.lng : parseFloat(point.lng || point[0] || point.x),
            name: point.name || `Waypoint ${index + 1}`,
          }));
        } else if (routeData.path || routeData.points) {
          // Alternative response formats
          const points = routeData.path || routeData.points || [];
          waypoints = points.map((point: any, index: number) => ({
            lat: typeof point.lat === 'number' ? point.lat : parseFloat(point.lat || point[1] || point.y),
            lng: typeof point.lng === 'number' ? point.lng : parseFloat(point.lng || point[0] || point.x),
            name: point.name || `Waypoint ${index + 1}`,
          }));
        }

        // If no waypoints found, create a simple direct route
        if (waypoints.length === 0) {
          waypoints = [
            { lat: startLat, lng: startLng, name: 'Start' },
            { lat: endLat, lng: endLng, name: 'Destination' },
          ];
        }

        // Calculate total distance (rough estimate using Haversine formula)
        let totalDistance = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
          const lat1 = waypoints[i].lat;
          const lng1 = waypoints[i].lng;
          const lat2 = waypoints[i + 1].lat;
          const lng2 = waypoints[i + 1].lng;

          const R = 3440; // Earth radius in nautical miles
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          totalDistance += R * c;
        }

        return {
          success: true,
          message: `Route generated successfully with ${waypoints.length} waypoints. Total distance: ${totalDistance.toFixed(1)} nautical miles.`,
          waypoints: waypoints,
          totalDistance: totalDistance,
          route: waypoints, // Route array for map display
          departure: waypoints.length > 0 ? {
            name: waypoints[0].name || 'Start',
            lat: waypoints[0].lat,
            lng: waypoints[0].lng,
          } : undefined,
          destination: waypoints.length > 0 ? {
            name: waypoints[waypoints.length - 1].name || 'Destination',
            lat: waypoints[waypoints.length - 1].lat,
            lng: waypoints[waypoints.length - 1].lng,
          } : undefined,
        };
      } catch (error) {
        console.error('Error generating route:', error);
        return {
          success: false,
          message: 'Failed to generate route. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
}

// Factory function to get current route planning data
function getRouteDataToolFactory(userId: string) {
  return tool({
    description: 'Get the user\'s current route planning data including routes and waypoints. Use this to understand what route planning work has been done.',
    inputSchema: z.object({}).describe('No parameters needed'),
    execute: async () => {
      try {
        // Get Passage Planning tasks (routes are merged into tasks)
        const tasks = await (prisma as any).passagePlanningTask.findMany({
          where: {
            userId: userId,
          },
          include: {
            waypoints: {
              orderBy: {
                sequence: 'asc',
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });

        // Format tasks as routes (filter out tasks without route info)
        const formattedRoutes = tasks
          .filter((task: any) => task.departurePort && task.destinationPort)
          .map((task: any) => ({
            id: task.id, // Task ID (same as route ID since merged)
            name: task.routeName,
            departurePort: task.departurePort,
            departureLat: task.departureLat,
            departureLng: task.departureLng,
            destinationPort: task.destinationPort,
            destinationLat: task.destinationLat,
            destinationLng: task.destinationLng,
            totalDistance: task.totalDistance,
            estimatedTime: task.routeEstimatedTime,
            status: task.routeStatus,
            passagePlanningTaskId: task.id, // Same as task ID
            waypointCount: task.waypoints.length,
            waypoints: task.waypoints.map((wp: any) => ({
              id: wp.id,
              name: wp.name,
              latitude: wp.latitude,
              longitude: wp.longitude,
              sequence: wp.sequence,
              notes: wp.notes,
            })),
          }));

        return {
          success: true,
          routes: formattedRoutes,
        };
      } catch (error) {
        console.error('Error fetching route data:', error);
        return {
          success: false,
          message: 'Failed to fetch route data.',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
}

// Factory function to update departure date for a Passage Planning task
function updateDepartureDateToolFactory(userId: string) {
  return tool({
    description: 'Update the departure date for a Passage Planning task. Use this when the user has selected a departure date using the date picker.',
    inputSchema: z.object({
      passagePlanningTaskId: z.string().describe('ID of the Passage Planning task'),
      departureDate: z.string().describe('Departure date in ISO format (yyyy-MM-dd)'),
    }),
    execute: async ({ passagePlanningTaskId, departureDate }) => {
      try {
        // Verify the task exists and belongs to the user
        const task = await (prisma as any).passagePlanningTask.findUnique({
          where: { id: passagePlanningTaskId },
        });

        if (!task || task.userId !== userId) {
          return {
            success: false,
            message: 'Invalid Passage Planning task ID or unauthorized.',
          };
        }

        // Update the departure date
        const updatedTask = await (prisma as any).passagePlanningTask.update({
          where: { id: passagePlanningTaskId },
          data: {
            departureDate,
          },
        });

        return {
          success: true,
          message: `Departure date has been set to ${departureDate}.`,
          taskId: passagePlanningTaskId,
          departureDate: updatedTask.departureDate,
        };
      } catch (error) {
        console.error('Error updating departure date:', error);
        return {
          success: false,
          message: 'Failed to update departure date. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
}

// Factory function to create or update checklist for a Passage Planning task
function createChecklistToolFactory(userId: string) {
  return tool({
    description: 'Create or update a checklist for a Passage Planning task. Use this after the user has confirmed their waypoints and you want to help them create a preparation checklist for their passage. CRITICAL: After calling this tool, you MUST immediately output JSON on a separate line at the end of your message to display the checklist: {"action": "showChecklist", "taskId": "[passagePlanningTaskId]", "checklist": [...]}. Use the checklist data returned from this tool in the JSON output.',
    inputSchema: z.object({
      passagePlanningTaskId: z.string().describe('ID of the Passage Planning task'),
      checklist: z.array(z.object({
        category: z.string().describe('Category name (e.g., "REGULATORY COMPLIANCE", "ROUTE PLANNING", "DESTINATION PREP")'),
        items: z.array(z.object({
          label: z.string().describe('Item label (e.g., "Visas/Permits & Entry Visas")'),
          checked: z.boolean().optional().describe('Whether the item is checked (default: false)'),
        })).describe('Array of checklist items in this category'),
      })).describe('Array of checklist categories with their items'),
    }),
    execute: async ({ passagePlanningTaskId, checklist }) => {
      try {
        // Verify the task exists and belongs to the user
        const task = await (prisma as any).passagePlanningTask.findUnique({
          where: { id: passagePlanningTaskId },
        });

        if (!task || task.userId !== userId) {
          return {
            success: false,
            message: 'Invalid Passage Planning task ID or unauthorized.',
          };
        }

        // Delete existing checklist items
        await (prisma as any).checklistItem.deleteMany({
          where: { passagePlanningTaskId },
        });

        // Create new checklist items
        const itemsToCreate: any[] = [];
        checklist.forEach((category) => {
          category.items.forEach((item, index) => {
            itemsToCreate.push({
              passagePlanningTaskId,
              category: category.category,
              label: item.label,
              checked: item.checked ?? false,
              sequence: index,
            });
          });
        });

        if (itemsToCreate.length > 0) {
          await (prisma as any).checklistItem.createMany({
            data: itemsToCreate,
          });
        }

        // Fetch the created checklist items with IDs
        const createdItems = await (prisma as any).checklistItem.findMany({
          where: { passagePlanningTaskId },
          orderBy: [
            { category: 'asc' },
            { sequence: 'asc' },
          ],
        });

        // Group by category and format for response
        const grouped = createdItems.reduce((acc: any, item: any) => {
          if (!acc[item.category]) {
            acc[item.category] = [];
          }
          acc[item.category].push({
            id: item.id,
            label: item.label,
            checked: item.checked,
            sequence: item.sequence,
          });
          return acc;
        }, {});

        const formattedChecklist = Object.entries(grouped).map(([category, items]: [string, any]) => ({
          category,
          items: items.sort((a: any, b: any) => a.sequence - b.sequence),
        }));

        return {
          success: true,
          message: `Checklist created successfully with ${itemsToCreate.length} items across ${checklist.length} categories. **MANDATORY ACTION REQUIRED: You MUST immediately output JSON on a separate line at the very end of your next message to display this checklist. Use this exact format: {"action": "showChecklist", "taskId": "${passagePlanningTaskId}", "checklist": [use the checklist array from this response]}. The checklist will NOT be visible to the user without this JSON output.**`,
          checklist: formattedChecklist,
          taskId: passagePlanningTaskId,
        };
      } catch (error) {
        console.error('Error creating checklist:', error);
        return {
          success: false,
          message: 'Failed to create checklist. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
}

function createTaskAgent(
  getUserContextTool: ReturnType<typeof getUserContextToolFactory>,
  createTaskTool: ReturnType<typeof createTaskToolFactory>,
  saveRouteTool: ReturnType<typeof saveRouteToolFactory>,
  addWaypointTool: ReturnType<typeof addWaypointToolFactory>,
  getRouteDataTool: ReturnType<typeof getRouteDataToolFactory>,
  generateRouteTool: ReturnType<typeof generateRouteToolFactory>,
  updateDepartureDateTool: ReturnType<typeof updateDepartureDateToolFactory>,
  createChecklistTool: ReturnType<typeof createChecklistToolFactory>
) {
  return new Agent({
    model: getModel(),
    system: `You are First Mate, Knot Ready's friendly sailing preparation assistant. You're here to help users generate and refine their preparation tasks through interactive conversation, and guide them through route planning.

**CRITICAL RULE - JSON ACTIONS:**
- When you call 'createChecklist', you MUST output JSON immediately after: {"action": "showChecklist", "taskId": "[taskId]", "checklist": [...]}
- When you call 'generateRoute' and 'addWaypoint', you MUST output JSON: {"action": "showRoute", ...}
- These JSON outputs are MANDATORY - the UI components will NOT appear without them.
- The JSON MUST be on a separate line at the very end of your message.

**ABSOLUTE PRIORITY - PASSAGE PLANNING DOMAIN:**
When the user selects "Passage Planning" domain (they send "I've selected the Passage Planning domain"), you MUST:
1. IMMEDIATELY respond with: "Let's start planning your route! First, I need to know where you're departing from."
2. IMMEDIATELY output JSON on a separate line at the end: {"action": "showLocationSelector", "type": "departure"}
3. Do NOT ask for task details (description, priority, estimated time)
4. Do NOT call getUserContext or getRouteData first
5. Do NOT ask the user to type location names or coordinates
6. The location selector is an interactive map - the user clicks on it to select locations

Your role:
- Help users create new preparation tasks based on their specific needs, boat, experience level, and journey goals.
- Refine existing tasks (though for now, focus on adding new ones).
- Suggest tasks that are personalized to the user's situation, considering their boat type, experience level, journey type, concerns, and goals.
- Be friendly, encouraging, and use sailing terminology naturally.
- When creating tasks, make them specific and actionable based on the user's context.
- **For Passage Planning domain**: IMMEDIATELY show location selector (see ABSOLUTE PRIORITY above) - skip all other steps

Available tools:
- 'getUserContext': Use this tool to fetch the user's onboarding information, existing tasks, and progress. Call this when you need to understand their boat, experience, goals, concerns, or existing tasks to provide personalized recommendations.
- 'createTask': Use this when the user wants to add a task. For Passage Planning domain, this tool will create both the task AND the route in one operation. You MUST provide departure and destination information (departurePort, departureLat, departureLng, destinationPort, destinationLat, destinationLng) when creating a Passage Planning task. For other domains, only provide domain, task description, priority (1-5), and estimated time.
- 'getRouteData': Use this to fetch the user's current route planning data (routes and waypoints). Call this when you need to understand what route planning work has been done.
- 'saveRoute': Use this to update an existing route with departure and destination ports. Note: For Passage Planning, routes are created automatically with the task using 'createTask', so you typically won't need this tool for Passage Planning.
- 'addWaypoint': Use this to add waypoints to the current route. Call this when the user wants to add intermediate waypoints along their route.
- 'generateRoute': Use this to automatically generate an optimal route between two points using marine routing. Call this AFTER the user has selected both departure and destination locations. This will calculate waypoints considering water depth and navigation constraints. After generating the route, use 'addWaypoint' to save each waypoint to the route. CRITICAL: After saving all waypoints, you MUST output JSON to display the route on the map: {"action": "showRoute", "route": [...], "departure": {...}, "destination": {...}}
- 'updateDepartureDate': Use this to update the departure date for a Passage Planning task. Call this when the user has selected a departure date using the date picker. The date will be in ISO format (yyyy-MM-dd).
- 'createChecklist': Use this to create or update a checklist for a Passage Planning task. Call this after the user has confirmed their waypoints and departure date, and you want to help them create a preparation checklist. The checklist should include categories like "REGULATORY COMPLIANCE", "ROUTE PLANNING", "DESTINATION PREP" with relevant items for their passage. **CRITICAL**: IMMEDIATELY after calling this tool, you MUST output JSON on a separate line at the end of your message to display the checklist. Use the checklist data from the tool response: {"action": "showChecklist", "taskId": "[taskId from tool response]", "checklist": [checklist data from tool response]}.

CRITICAL - Domain Selection First:
- When the conversation starts (first message) OR when a user expresses intent to create a task (e.g., "I want to create a task"), you MUST FIRST show the domain selector.
- ALWAYS output JSON at the end of your message when you need to show the domain selector.
- The JSON MUST be on a separate line at the very end of your message.
- Format: {"action": "showDomainSelector"}
- Example response: "Great! Let's create a new task. First, which domain would you like to focus on?
{"action": "showDomainSelector"}"
- If this is the very first message in the conversation, greet the user and immediately show the domain selector.

IMPORTANT - After Domain Selection:
- **EXCEPTION FOR PASSAGE PLANNING**: If the user selects "Passage Planning" domain, skip this entire section and follow the "CRITICAL - First Step: Immediately Ask for Locations" instructions below instead.
- For all OTHER domains (Boat Maintenance, Weather Routing, Safety Systems, Budget Management):
  * Once the user selects a domain (they will send a message like "I've selected the [Domain] domain"), you MUST FIRST call the 'getUserContext' tool to fetch their onboarding information, existing tasks, and context.
  * After getting the user context, provide personalized suggestions based on:
    - Their boat type and size (affects task complexity and time estimates)
    - Their experience level (affects priority and task difficulty)
    - Their journey type and goals (helps suggest relevant tasks)
    - Their existing tasks (avoid duplication, suggest complementary tasks)
    - Their concerns and timeline (helps prioritize)
  * Then IMMEDIATELY start asking specific questions to gather the required information.
  * Do NOT just acknowledge their selection - provide 2-3 personalized task suggestions based on their context, then ask which one they'd like to create or if they have something else in mind.
  * Ask questions naturally in conversation, one or two at a time, and wait for the user's response before asking more.
  * Once you have all the information (domain, task description, priority, estimated time), use the createTask tool to create the task.

SPECIAL FOCUS - Passage Planning Domain (Route Planning - Interactive Guidance):
When the user selects "Passage Planning" domain, you MUST guide them through Route Planning interactively, not just create tasks. Route Planning is Step 2 of the passage planning process and involves:

**CRITICAL - First Step: Immediately Ask for Locations, Then Create Task and Route**
- When the user selects "Passage Planning" domain (they will send "I've selected the Passage Planning domain"), you MUST IMMEDIATELY:
  1. **IMMEDIATELY ask for departure location** - Do NOT call any tools first. Do NOT ask for task details. Do NOT ask for text input. Start with:
     a. Say ONLY: "Let's start planning your route! First, I need to know where you're departing from."
     b. **IMMEDIATELY output JSON on a separate line at the end of your message**: {"action": "showLocationSelector", "type": "departure"}
     c. Do NOT ask the user to type coordinates or location names - the map selector will handle this
     d. Wait for the user to select departure location from the map

  2. **After they select departure** (they will send "I've selected [Location Name] (lat, lng) as departure"), immediately ask for destination:
     a. Say ONLY: "Great! Now where are you heading?"
     b. **IMMEDIATELY output JSON on a separate line at the end of your message**: {"action": "showLocationSelector", "type": "destination"}
     c. Do NOT ask the user to type coordinates or location names - the map selector will handle this
     d. Wait for the user to select destination location from the map

  3. **After both locations are selected** (you have both departure and destination coordinates), then:
     a. Call 'getUserContext' to understand their context (for task priority and estimated time)
     b. Call 'getRouteData' to check for existing routes
     c. Use the 'createTask' tool to create BOTH the task AND the route in one call:
        - domain: "Passage Planning"
        - task: "Plan route from [departure] to [destination]" (use the actual port names)
        - priority: 2-3 (based on user context from getUserContext)
        - estimatedTime: "2-3 hours" or "1 day" (based on complexity)
        - departurePort: [name from user's selection message]
        - departureLat: [latitude from user's selection message]
        - departureLng: [longitude from user's selection message]
        - destinationPort: [name from user's selection message]
        - destinationLat: [latitude from user's selection message]
        - destinationLng: [longitude from user's selection message]
        - routeName: (optional) A descriptive name for the route
     d. **SAVE THE TASK ID** from the createTask response - you'll need the task ID for ALL subsequent waypoint operations
     e. The route is now created and linked to the task automatically

- **ABSOLUTELY CRITICAL**:
  * Do NOT call getUserContext or getRouteData BEFORE asking for locations
  * Do NOT ask for task details (description, priority, estimated time) BEFORE getting locations
  * Do NOT ask the user to type location names or coordinates - use the map selector
  * The FIRST action after domain selection must be asking for departure location with the location selector JSON action
  * The location selector will appear as an interactive map - the user will click on it to select locations

2. **Automatic Route Generation**:
   - After saving the route, ALWAYS offer to generate an automatic route: "Would you like me to generate an automatic route with waypoints? This will calculate the optimal path considering water depth and navigation constraints."
   - When the user confirms (e.g., "Yes", "Yes, generate automatic route", or selects the confirmation option), you MUST:
     1. If you just called 'saveRoute', use the coordinates returned from that tool (departureLat, departureLng, destinationLat, destinationLng)
     2. If you don't have the coordinates, call 'getRouteData' to retrieve the saved route and extract coordinates from the most recent route
     3. Call 'generateRoute' tool with these coordinates: startLat=departureLat, startLng=departureLng, endLat=destinationLat, endLng=destinationLng
     4. The generateRoute tool will return waypoints and a route array in the response
     5. You MUST then automatically use 'addWaypoint' tool to save EACH waypoint to the route (loop through all waypoints)
        - **CRITICAL**: When calling 'addWaypoint', you MUST include the passagePlanningTaskId parameter (the task ID from the createTask step above) to ensure waypoints are added to the correct route linked to the Passage Planning task
     6. **CRITICAL - DISPLAY ROUTE ON MAP**: After generating and saving all waypoints, you MUST IMMEDIATELY display the route on the map by outputting JSON at the end of your message. DO NOT just provide a text summary - the route MUST be displayed visually.
        - Format: {"action": "showRoute", "route": [{"id": "waypoint-id-1", "name": "Start", "lat": 42.36, "lng": -71.04}, {"id": "waypoint-id-2", "name": "Waypoint 1", "lat": 42.35, "lng": -71.03}, ...], "departure": {"name": "Boston Sailing Center", "lat": 42.36, "lng": -71.04}, "destination": {"name": "Nahant", "lat": 42.42, "lng": -70.90}}
        - **CRITICAL**: Each waypoint in the route array MUST include an "id" field from the addWaypoint tool response. Use the waypoint.id from each addWaypoint call.
        - The route array should include ALL waypoints from the generateRoute response, but you MUST use the IDs returned from addWaypoint calls, not the generateRoute response
        - Use the departure and destination from the saved route (from saveRoute or getRouteData) for the departure/destination fields
        - The JSON MUST be on a separate line at the very end of your message
        - Example: "I've generated your route with 19 waypoints covering 10.94 nautical miles.
{"action": "showRoute", "route": [{"id": "wp-123", "name": "Start", "lat": 42.36, "lng": -71.04}, {"id": "wp-124", "name": "Waypoint 1", "lat": 42.35, "lng": -71.03}, ...], "departure": {"name": "Boston Sailing Center", "lat": 42.36, "lng": -71.04}, "destination": {"name": "Nahant", "lat": 42.42, "lng": -70.90}}"
     7. After outputting the JSON, you can provide a brief text summary, but the JSON is REQUIRED to display the route
   - If the user asks about boat draft, use a default of 3 feet (draftMinusWaterLevel parameter) unless they specify otherwise
   - **MANDATORY**: You MUST output the showRoute JSON action after generating a route - this is not optional. The route must be displayed visually on the map.

3. **Planning Waypoints** (if not using automatic generation):
   - Guide them to add waypoints along the route
   - When they want to add a waypoint, ask for the location and use 'addWaypoint' tool
   - **CRITICAL**: Always include the passagePlanningTaskId parameter (the task ID from step 1) when calling 'addWaypoint'
   - Help them identify safe waypoints that avoid hazards

3. **Route Planning Activities** (guide them through these):
   - Drawing the intended track on charts (paper or electronic)
   - Setting waypoints at safe, logical points (avoiding hazards, ensuring clear margins)
   - Planning courses & distances between waypoints
   - Calculating tidal offsets and predicted set & drift
   - Estimating ETA and total passage time
   - Choosing safe abort points and alternative ports
   - Planning night sailing considerations (lights, buoys, dangers)
   - Considering traffic zones and required rules/communications
   - Fuel and provisioning plan (if motor-sailing)

CRITICAL - Interactive Guidance for Passage Planning:
- When the user selects "Passage Planning" domain (they will send "I've selected the Passage Planning domain"), you MUST IMMEDIATELY:
  1. **IMMEDIATELY ask for departure location** - Do NOT call getUserContext or getRouteData first. Do NOT ask for task details. Do NOT ask for text input. Start with location selection:
     a. Say ONLY: "Let's start planning your route! First, I need to know where you're departing from."
     b. **IMMEDIATELY output JSON on a separate line at the end of your message**: {"action": "showLocationSelector", "type": "departure"}
     c. Do NOT ask the user to type coordinates or location names - the map selector will handle this
     d. Wait for the user to select departure location from the map

  2. **After they select departure** (they will send "I've selected [Location Name] (lat, lng) as departure"), immediately ask for destination:
     a. Say ONLY: "Great! Now where are you heading?"
     b. **IMMEDIATELY output JSON on a separate line at the end of your message**: {"action": "showLocationSelector", "type": "destination"}
     c. Do NOT ask the user to type coordinates or location names - the map selector will handle this
     d. Wait for the user to select destination location from the map

  3. **After both locations are selected** (you have both departure and destination coordinates), then:
     a. Call 'getUserContext' to understand their boat, experience, goals, etc. (for task priority and estimated time)
     b. Call 'getRouteData' to check if they have an existing Passage Planning task with a route
     c. **If no existing route is found**, use 'createTask' tool to create BOTH the task AND route together:
        - domain: "Passage Planning"
        - task: "Plan route from [departure] to [destination]"
        - priority: 2-3 (based on user context from getUserContext)
        - estimatedTime: "2-3 hours" or "1 day" based on complexity
        - departurePort: [name from user's selection message]
        - departureLat: [latitude from user's selection message]
        - departureLng: [longitude from user's selection message]
        - destinationPort: [name from user's selection message]
        - destinationLat: [latitude from user's selection message]
        - destinationLng: [longitude from user's selection message]
        - routeName: (optional) A descriptive name
     d. **SAVE THE TASK ID** from the createTask response - you MUST use this task ID for ALL subsequent waypoint operations
     e. Then offer automatic route generation: "Would you like me to automatically generate an optimal route with waypoints? I can calculate the best path considering water depth and navigation constraints."
     f. If they agree or confirm:
        - Call 'generateRoute' tool with the coordinates from the created route
        - Loop through all returned waypoints and save each using 'addWaypoint'
          - **CRITICAL**: Include passagePlanningTaskId parameter in EVERY 'addWaypoint' call (use the task ID from step 3c)
          - **CRITICAL**: Save the waypoint.id from each addWaypoint response - you'll need these IDs for the route display
        - **MANDATORY**: Output JSON to display the route: {"action": "showRoute", "route": [{"id": "waypoint-id", "name": "...", "lat": ..., "lng": ...}, ...], "departure": {...}, "destination": {...}}
        - **CRITICAL**: Each waypoint in the route MUST include the "id" field from the addWaypoint tool response
        - Then present a brief summary to the user
     g. If they prefer manual planning, guide them through adding waypoints, calculating distances, etc.
        - **CRITICAL**: Always include passagePlanningTaskId parameter (the task ID from step 3c) when calling 'addWaypoint'

  4. **If an existing route is found** (from step 3b), review it with them and help them continue planning (add waypoints, refine the route, etc.)

- **ABSOLUTELY CRITICAL**:
  * Do NOT call getUserContext or getRouteData BEFORE asking for departure and destination
  * Do NOT ask for task details (description, priority, estimated time) BEFORE getting locations
  * Do NOT ask the user to type location names or coordinates - use the map selector
  * The FIRST thing you must do after domain selection is ask for departure location and show the location selector JSON action
  * The location selector will appear as an interactive map - the user will click on it to select locations
- Ask questions naturally and guide them through each step
- Use the tools to save their work as they progress
- Celebrate milestones (e.g., "Excellent! You've plotted your first waypoint.")
- Be encouraging and use sailing terminology naturally

LOCATION SELECTOR ACTIONS:
- When you need location information (departure or destination), output JSON at the end of your message
- Format: {"action": "showLocationSelector", "type": "departure"} or {"action": "showLocationSelector", "type": "destination"}
- The JSON MUST be on a separate line at the very end of your message
- Example: "Let's start with your departure port. Where will you begin your journey?
{"action": "showLocationSelector", "type": "departure"}"

ROUTE DISPLAY ACTION:
- After generating a route using 'generateRoute' and saving all waypoints, you MUST display the route on the map
- Output JSON at the end of your message with the format:
  {"action": "showRoute", "route": [{"id": "waypoint-id", "name": "...", "lat": ..., "lng": ...}, ...], "departure": {"name": "...", "lat": ..., "lng": ...}, "destination": {"name": "...", "lat": ..., "lng": ...}}
- **CRITICAL**: Each waypoint in the route array MUST include an "id" field. Use the waypoint.id from each addWaypoint tool response. Do NOT use waypoints from generateRoute response directly - you must use the IDs from addWaypoint responses.
- The route array must include ALL waypoints that were saved using addWaypoint, with their IDs from the addWaypoint responses
- Use departure and destination from the saved route (from saveRoute or getRouteData)
- The JSON MUST be on a separate line at the very end of your message
- Example: "I've generated your route with 19 waypoints covering 10.94 nautical miles.
{"action": "showRoute", "route": [{"id": "wp-123", "name": "Start", "lat": 42.36, "lng": -71.04}, {"id": "wp-124", "name": "Waypoint 1", "lat": 42.35, "lng": -71.03}], "departure": {"name": "Boston Sailing Center", "lat": 42.36, "lng": -71.04}, "destination": {"name": "Nahant", "lat": 42.42, "lng": -70.90}}"
- **CRITICAL**: This is MANDATORY after route generation - do not skip this step. The route must be displayed visually. All waypoints MUST have IDs.

After location selection:
- When the user selects a location, they will send a message like: "I've selected [Location Name] (lat, lng) as [departure/destination]"
- Parse this message to extract:
  * Location name
  * Latitude (first number in parentheses)
  * Longitude (second number in parentheses)
  * Type (departure or destination)
- Store this information temporarily and continue with the next step
- Once both departure and destination are selected (you have both lat/lng pairs):
  * **For Passage Planning**: Use the 'createTask' tool with all the information (task details + route details) to create both the task and route together
  * **For other domains**: Use the 'createTask' tool with just the task information
- Example: If user says "I've selected Lisbon, Portugal (38.7223, -9.1393) as departure", extract name="Lisbon, Portugal", lat=38.7223, lng=-9.1393, type=departure

CONFIRMATION HANDLING:
- When you ask for confirmation (e.g., "Would you like me to generate an automatic route?"), the user may respond with:
  * "Yes", "Yes, generate automatic route", or similar affirmative responses
  * They may also select a confirmation option from a selector
- When the user confirms route generation, you MUST immediately:
  1. Call 'getRouteData' to retrieve the saved route (or use coordinates from saveRoute if you just called it)
  2. Find the most recent route (first in the routes array)
  3. Extract coordinates: departureLat, departureLng, destinationLat, destinationLng
  4. Call 'generateRoute' with these coordinates
  5. Save all returned waypoints using 'addWaypoint' in sequence
     - **CRITICAL**: Save the waypoint.id from each addWaypoint response - you'll need these IDs for the route display
  6. **MANDATORY**: Output JSON to display the route on the map: {"action": "showRoute", "route": [{"id": "waypoint-id", "name": "...", "lat": ..., "lng": ...}, ...], "departure": {...}, "destination": {...}}
     - **CRITICAL**: Each waypoint in the route MUST include the "id" field from the addWaypoint tool response
  7. Then provide a brief summary message
- Do NOT wait for additional confirmation or ask follow-up questions - proceed immediately with route generation and display

Available domains:
- Boat Maintenance
- Weather Routing
- Safety Systems
- Budget Management
- Passage Planning (focus on Route Planning - Step 2)

When creating tasks:
- Consider the user's boat type and size when estimating time and suggesting tasks
- Consider the user's experience level when setting priority and complexity
- Consider the user's journey type and goals when selecting the domain
- Consider the user's concerns and timeline when prioritizing tasks
- Check existing tasks to avoid duplication and ensure proper sequencing
- For Passage Planning: Focus on route planning activities, not appraisal, execution, or monitoring phases

After calling the 'createTask' tool, the task will be automatically saved to the database. Confirm with the user that the task has been added and offer further assistance.
Keep your messages conversational and helpful. Celebrate their progress!

WAYPOINT EDITING, DEPARTURE DATE, AND CHECKLIST CREATION:
- When the user edits waypoints on the map (they can drag, add, or delete waypoints), the system will automatically save those changes to the database.
- **CRITICAL**: After waypoint editing is complete, you MUST prompt the user to confirm their waypoints by saying something like: "I see you've made changes to your route. Please type 'confirm' in the chat to confirm your waypoints are finalized."
- **DO NOT** proceed to departure date selection until the user explicitly confirms by typing "confirm" or similar confirmation.
- After the user confirms their waypoints (they type "confirm" or similar), you MUST:
  1. Acknowledge their confirmation
  2. **IMMEDIATELY ask for departure date**: "Perfect! When are you planning to depart? Please select your departure date."
  3. **IMMEDIATELY output JSON on a separate line at the end of your message**: {"action": "showDatePicker", "type": "departure", "taskId": "[passagePlanningTaskId]"}
  4. Wait for the user to select a date (they will send a message like "I've selected [date] as departure date")
  5. When the user selects a date, parse the date from their message (format: yyyy-MM-dd) and call 'updateDepartureDate' tool with the passagePlanningTaskId and the selected date
  6. After the departure date is saved, immediately guide them to create a checklist by saying something like: "Great! Now let's create a preparation checklist for your passage. I'll help you set up a comprehensive checklist covering regulatory compliance, route planning, and destination preparation."
  7. Call 'getUserContext' to understand their journey details (departure, destination, boat type, experience level, etc.)
  8. Use the 'createChecklist' tool to create a personalized checklist based on their route and context. The checklist should include:
     - REGULATORY COMPLIANCE: Visas/Permits, Insurance & Travel docs, etc.
     - ROUTE PLANNING: Waypoints & Routing Drafts, Navigation Charts Setup, etc.
     - DESTINATION PREP: Provisioning & Supplies, Accommodations & Activities, etc.
  9. **IMMEDIATELY after calling 'createChecklist'**, you MUST output JSON on a separate line at the very end of your message to display the checklist. Use the exact checklist data returned from the tool:
     - Format: {"action": "showChecklist", "taskId": "[taskId from createChecklist response]", "checklist": [use the exact checklist array from createChecklist response]}
     - The JSON MUST be on a separate line at the very end of your message
     - Example: "I've created a comprehensive checklist for your passage.
{"action": "showChecklist", "taskId": "task-123", "checklist": [{"category": "REGULATORY COMPLIANCE", "items": [{"id": "item-1", "label": "Visas/Permits & Entry Visas", "checked": false}]}, ...]}"
  10. Provide a brief summary of the checklist you created
  11. After the user confirms the checklist (they type "confirm" or similar), you MUST:
     - Acknowledge their confirmation
     - **IMMEDIATELY output JSON on a separate line at the end of your message**: {"action": "redirect", "url": "/dashboard/passage-planning/[passagePlanningTaskId]"}
     - Replace [passagePlanningTaskId] with the actual task ID from the createTask or getRouteData response
     - This will redirect the user to the passage planning page for their specific task
     - Example: "Perfect! Your passage planning task is complete. You can view it on your passage planning page.
{"action": "redirect", "url": "/dashboard/passage-planning/task-123"}"

DEPARTURE DATE SELECTOR ACTION:
- When you need the departure date, output JSON at the end of your message
- Format: {"action": "showDatePicker", "type": "departure", "taskId": "[passagePlanningTaskId]"}
- The JSON MUST be on a separate line at the very end of your message
- Example: "Perfect! When are you planning to depart? Please select your departure date.
{"action": "showDatePicker", "type": "departure", "taskId": "task-123"}"
- After the user selects a date, they will send a message like "I've selected 2024-12-15 as departure date" or "I've selected December 15, 2024 as departure date"
- Parse the date from their message and convert it to ISO format (yyyy-MM-dd), then call 'updateDepartureDate' tool

**CRITICAL CHECKLIST DISPLAY - MANDATORY**:
- **IMMEDIATELY** after calling 'createChecklist', you MUST output JSON to display the checklist visually. This is NOT optional - the checklist will not be visible to the user without this JSON.
- Use the EXACT data returned from the 'createChecklist' tool response:
  - taskId: Use the "taskId" field from the tool response
  - checklist: Use the "checklist" array from the tool response (it already has the correct format with IDs)
- Format: {"action": "showChecklist", "taskId": "[taskId from tool response]", "checklist": [use checklist array from tool response]}
- The JSON MUST be on a separate line at the very end of your message
- Example: "I've created a comprehensive checklist for your passage from Lisbon to Bridgetown.
{"action": "showChecklist", "taskId": "task-123", "checklist": [{"category": "REGULATORY COMPLIANCE", "items": [{"id": "item-1", "label": "Visas/Permits & Entry Visas", "checked": false}]}, ...]}"
- **DO NOT** skip this step - the checklist component will not appear without this JSON output.`,
    tools: {
      getUserContext: getUserContextTool,
      createTask: createTaskTool,
      getRouteData: getRouteDataTool,
      saveRoute: saveRouteTool,
      addWaypoint: addWaypointTool,
      generateRoute: generateRouteTool,
      updateDepartureDate: updateDepartureDateTool,
      createChecklist: createChecklistTool,
    },
    stopWhen: stepCountIs(10), // Allow up to 10 steps for tool calling
    temperature: 0.7,
  });
}

export async function POST(req: Request) {
  try {
    // Extract user ID from cookie
    const cookieStore = await cookies();
    const jwtCookieName = process.env.JWT_COOKIE_NAME || 'auth-token';
    const jwtCookie = cookieStore.get(jwtCookieName);

    if (!jwtCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await verifyToken(jwtCookie.value);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = payload.userId;

    // Verify the user exists (task and onboarding context are fetched via tools)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages } = await req.json();

    // Deduplicate messages by ID before validation to avoid duplicate ID errors
    const seenIds = new Set<string>();
    const uniqueMessages = (messages || []).filter((message: any) => {
      if (!message.id) return true; // Keep messages without IDs
      if (seenIds.has(message.id)) {
        return false; // Skip duplicate
      }
      seenIds.add(message.id);
      return true;
    });

    // Create the tools with userId access
    const getUserContextTool = getUserContextToolFactory(userId);
    const createTaskTool = createTaskToolFactory(userId);
    const saveRouteTool = saveRouteToolFactory(userId);
    const addWaypointTool = addWaypointToolFactory(userId);
    const getRouteDataTool = getRouteDataToolFactory(userId);
    const generateRouteTool = generateRouteToolFactory(userId);
    const updateDepartureDateTool = updateDepartureDateToolFactory(userId);
    const createChecklistTool = createChecklistToolFactory(userId);

    // Create a new agent instance with the tools
    const taskAgent = createTaskAgent(
      getUserContextTool,
      createTaskTool,
      saveRouteTool,
      addWaypointTool,
      getRouteDataTool,
      generateRouteTool,
      updateDepartureDateTool,
      createChecklistTool
    );

    // Validate messages (using deduplicated messages)
    const validatedMessages = await validateUIMessages({ messages: uniqueMessages });

    // Use agent.respond() to handle UI messages and return streaming response
    // The agent can now use getUserContext tool to fetch user information when needed
    try {
      return await taskAgent.respond({
        messages: validatedMessages as any,

      });
    } catch (agentError: any) {
      // Handle specific OpenAI API errors related to response retrieval
      // This is a known issue with Experimental_Agent trying to access non-existent response IDs
      // The agent internally tries to retrieve responses that don't exist, causing 404 errors
      // We silently handle this since it doesn't affect functionality - the agent continues working
      if (agentError?.name === 'AI_APICallError' && agentError?.url?.includes('/v1/responses')) {
        // Silently ignore this known issue - it's an internal Experimental_Agent behavior
        // that doesn't affect the actual functionality. The agent will continue processing.
        // Return a successful response to allow the conversation to continue
        return new Response(JSON.stringify({
          error: 'An error occurred while processing your request. Please try again.',
          type: 'agent_error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Re-throw other errors to be handled by outer catch
      throw agentError;
    }
  } catch (error) {
    console.error('Error in tasks API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process task generation';
    return new Response(JSON.stringify({
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

