import {Hono} from 'hono'
import {prisma} from "@/lib/prisma";
import {ExtractUserIdFromCookie} from "@/server/hono/routes/utils";
import {generateText} from 'ai';
import {ollama} from 'ollama-ai-provider-v2';
import {openai} from "@ai-sdk/openai";

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

/**
 * Generates estimated progress for all domains based on onboarding data using LLM
 * @param onboardingData - The user's onboarding form data
 * @returns A map of domain names to progress percentages (0-100)
 */
async function generateDomainProgressEstimates(
  onboardingData: Record<string, any>
): Promise<Record<string, number>> {
  const defaultDomains = [
    'Boat Maintenance',
    'Weather Routing',
    'Safety Systems',
    'Budget Management',
    'Passage Planning',
  ];

  const systemPrompt = `You are First Mate, Knot Ready's sailing preparation assistant. Your task is to analyze a sailor's onboarding information and estimate their current progress percentage (0-100) for each preparation domain.

Available domains:
- Boat Maintenance: Physical condition of the boat, systems, equipment readiness
- Weather Routing: Knowledge and tools for weather planning and routing
- Safety Systems: Safety equipment, emergency procedures, safety protocols
- Budget Management: Financial planning, cost estimates, budget tracking
- Passage Planning: Route planning, navigation, passage preparation

Based on the onboarding data provided, estimate the user's current progress in each domain. Consider:
- Their experience level and certifications
- Boat condition and preparation status
- Journey type and timeline
- Goals and priorities

Return ONLY a valid JSON object with domain names as keys and progress percentages (0-100 integers) as values. Example:
{
  "Boat Maintenance": 25,
  "Weather Routing": 30,
  "Safety Systems": 40,
  "Budget Management": 20,
  "Passage Planning": 15
}`;

  const userPrompt = `Analyze this onboarding data and estimate progress for each domain:

${JSON.stringify(onboardingData, null, 2)}

Return a JSON object with progress estimates (0-100) for each of these domains: ${defaultDomains.join(', ')}`;

  try {
    const result = await generateText({
      model: getModel(),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    // Parse the JSON response
    const text = result.text.trim();
    // Try to extract JSON from the response (handle cases where LLM adds extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const progressEstimates = JSON.parse(jsonMatch[0]) as Record<string, number>;

    // Validate and normalize the estimates
    const validatedEstimates: Record<string, number> = {};
    for (const domain of defaultDomains) {
      const estimate = progressEstimates[domain];
      if (typeof estimate === 'number' && estimate >= 0 && estimate <= 100) {
        validatedEstimates[domain] = Math.round(estimate);
      } else {
        // Default to 0 if invalid or missing
        validatedEstimates[domain] = 0;
      }
    }

    return validatedEstimates;
  } catch (error) {
    console.error('Error generating domain progress estimates:', error);
    // Return default estimates (all 0) if LLM call fails
    return defaultDomains.reduce((acc, domain) => {
      acc[domain] = 0;
      return acc;
    }, {} as Record<string, number>);
  }
}

const app = new Hono()
  .get("/", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.text("Unauthorized", 401)
    }

    const user = await prisma.user.findUnique({
      where: {id: userId},
      include: {
        boatMaintenanceTasks: {
          orderBy: { priority: 'asc' },
        },
        weatherRoutingTasks: {
          orderBy: { priority: 'asc' },
        },
        safetySystemsTasks: {
          orderBy: { priority: 'asc' },
        },
        budgetManagementTasks: {
          orderBy: { priority: 'asc' },
        },
        passagePlanningTasks: {
          orderBy: { priority: 'asc' },
        },
        domainProgress: true,
      }
    } as any) as any

    if (!user) {
      return c.text("Unauthorized", 401)
    }

    // Default domains if none exist
    const defaultDomains = [
      'Boat Maintenance',
      'Weather Routing',
      'Safety Systems',
      'Budget Management',
      'Passage Planning',
    ]

    // Ensure domain progress exists for existing users (backfill)
    if (user.onboarded && user.domainProgress.length === 0) {
      await prisma.domainProgress.createMany({
        data: defaultDomains.map((name) => ({
          userId: userId,
          name,
          progress: 0,
        })),
        skipDuplicates: true,
      })
      // Reload domain progress
      const updatedUser = await prisma.user.findUnique({
        where: {id: userId},
        include: { domainProgress: true },
      })
      if (updatedUser) {
        user.domainProgress = updatedUser.domainProgress
      }
    }

    // Combine all domain-specific tasks into a single array with domain field
    const allTasks = [
      ...((user as any).boatMaintenanceTasks || []).map((t: any) => ({ ...t, domain: 'Boat Maintenance' })),
      ...((user as any).weatherRoutingTasks || []).map((t: any) => ({ ...t, domain: 'Weather Routing' })),
      ...((user as any).safetySystemsTasks || []).map((t: any) => ({ ...t, domain: 'Safety Systems' })),
      ...((user as any).budgetManagementTasks || []).map((t: any) => ({ ...t, domain: 'Budget Management' })),
      ...((user as any).passagePlanningTasks || []).map((t: any) => ({ ...t, domain: 'Passage Planning' })),
    ].sort((a, b) => a.priority - b.priority);

    // Transform relational data to match the expected format
    const tasksData = {
      priorities: allTasks.map((task) => ({
        id: task.id,
        domain: task.domain,
        task: task.task,
        priority: task.priority,
        estimatedTime: task.estimatedTime,
        status: task.status,
        progress: task.progress,
      })),
      domainProgress: ((user as any).domainProgress || []).length > 0
        ? ((user as any).domainProgress || []).map((dp: any) => ({
            name: dp.name,
            progress: dp.progress,
          }))
        : defaultDomains.map((name) => ({
            name,
            progress: 0,
          })),
    }

    return c.json({
      id: user?.id,
      email: user?.email,
      name: user?.name,
      onboarded: user?.onboarded,
      onboardingData: user?.onboardingData,
      tasksData: tasksData,
    })
  })

  .post("/onboarded", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.text("Unauthorized", 401)
    }

    let payload: {formsData?: Record<string, any>} = {}
    try {
      payload = await c.req.json()
    } catch (error) {
      // Ignore empty body errors and fall back to default payload
    }

    const hasValidPayload = payload.formsData && typeof payload.formsData === "object"
    const onboardingData: Record<string, any> = hasValidPayload && payload.formsData ? payload.formsData : {}

    try {
      // Default domain progress entries
      const defaultDomains = [
        'Boat Maintenance',
        'Weather Routing',
        'Safety Systems',
        'Budget Management',
        'Passage Planning',
      ]

      // Update user first
      const user = await prisma.user.update({
        where: {id: userId},
        data: {
          onboarded: true,
          onboardingData: onboardingData,
        },
        include: {
          domainProgress: true,
        },
      })

      // Create domain progress entries separately using createMany with skipDuplicates
      // This is safer than nested create and handles race conditions
      await prisma.domainProgress.createMany({
        data: defaultDomains.map((name) => ({
          userId: userId,
          name,
          progress: 0,
        })),
        skipDuplicates: true,
      })

      // Reload user with updated domain progress
      const userWithProgress = await prisma.user.findUnique({
        where: {id: userId},
        include: {
          domainProgress: true,
        },
      })

      // Use the updated user data
      const finalUser = userWithProgress || user

      // Generate and update domain progress estimates asynchronously (non-blocking)
      // This allows onboarding to complete immediately even if LLM call is slow or fails
      generateDomainProgressEstimates(onboardingData)
        .then((progressEstimates) => {
          // Update domain progress with estimated values
          return Promise.all(
            defaultDomains.map((domain) =>
              prisma.domainProgress.updateMany({
                where: {
                  userId: userId,
                  name: domain,
                },
                data: {
                  progress: progressEstimates[domain] || 0,
                },
              })
            )
          );
        })
        .catch((error) => {
          // Log error but don't fail - user onboarding is already complete
          console.error('Error updating domain progress estimates:', error);
        });

      return c.json({
        success: true,
        onboarded: finalUser.onboarded,
        onboardingData: finalUser.onboardingData,
      })
    } catch (error) {
      console.error("Error updating onboarded status:", error)
      return c.json({error: "Failed to update onboarding status"}, 500)
    }
  })

  // .post("/tasks", async (c) => {
  //   const userId = await ExtractUserIdFromCookie(c)
  //   if (!userId) {
  //     return c.text("Unauthorized", 401)
  //   }
  //
  //   let payload: {task?: any} = {}
  //   try {
  //     payload = await c.req.json()
  //   } catch (error) {
  //     return c.json({error: "Invalid payload"}, 400)
  //   }
  //
  //   const newTask = payload.task
  //
  //   if (!newTask || typeof newTask !== 'object') {
  //     return c.json({error: "Invalid task payload"}, 400)
  //   }
  //
  //   try {
  //     // Create a new task
  //     const task = await prisma.task.create({
  //       data: {
  //         userId: userId,
  //         domain: newTask.domain,
  //         task: newTask.task,
  //         priority: newTask.priority,
  //         estimatedTime: newTask.estimatedTime,
  //         status: newTask.status || 'ready',
  //         progress: newTask.progress || 0,
  //       },
  //     })
  //
  //     // Get updated tasks list
  //     const user = await prisma.user.findUnique({
  //       where: {id: userId},
  //       include: {
  //         tasks: {
  //           orderBy: { priority: 'asc' },
  //         },
  //         domainProgress: true,
  //       },
  //     })
  //
  //     if (!user) {
  //       return c.json({error: "User not found"}, 404)
  //     }
  //
  //     // Transform relational data to match the expected format
  //     const tasksData = {
  //       priorities: user.tasks.map((t) => ({
  //         id: t.id,
  //         domain: t.domain,
  //         task: t.task,
  //         priority: t.priority,
  //         estimatedTime: t.estimatedTime,
  //         status: t.status,
  //         progress: t.progress,
  //       })),
  //       domainProgress: user.domainProgress.map((dp) => ({
  //         name: dp.name,
  //         progress: dp.progress,
  //       })),
  //     }
  //
  //     return c.json({
  //       success: true,
  //       tasksData: tasksData,
  //     })
  //   } catch (error) {
  //     console.error("Error adding task:", error)
  //     return c.json({error: "Failed to add task"}, 500)
  //   }
  // })

  .patch("/domain-progress", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.text("Unauthorized", 401)
    }

    let payload: {domainName?: string; progress?: number} = {}
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({error: "Invalid payload"}, 400)
    }

    const { domainName, progress } = payload

    if (!domainName || typeof progress !== 'number') {
      return c.json({error: "Invalid payload: domainName and progress (0-100) are required"}, 400)
    }

    if (progress < 0 || progress > 100) {
      return c.json({error: "Progress must be between 0 and 100"}, 400)
    }

    try {
      // Update domain progress using upsert to handle both create and update
      await prisma.domainProgress.upsert({
        where: {
          userId_name: {
            userId: userId,
            name: domainName,
          },
        },
        update: {
          progress: Math.round(progress),
        },
        create: {
          userId: userId,
          name: domainName,
          progress: Math.round(progress),
        },
      })

      // Get updated domain progress
      const updatedDomainProgress = await prisma.domainProgress.findUnique({
        where: {
          userId_name: {
            userId: userId,
            name: domainName,
          },
        },
      })

      return c.json({
        success: true,
        domainProgress: updatedDomainProgress ? {
          name: updatedDomainProgress.name,
          progress: updatedDomainProgress.progress,
        } : null,
      })
    } catch (error) {
      console.error("Error updating domain progress:", error)
      return c.json({error: "Failed to update domain progress"}, 500)
    }
  })

  // Get a passage planning task by ID
  .get("/passage-planning-task/:id", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.json({error: "Unauthorized"}, 401)
    }

    const taskId = c.req.param('id')

    if (!taskId) {
      return c.json({error: "Task ID is required"}, 400)
    }

    // Get the task with waypoints and checklist items
    const task = await (prisma as any).passagePlanningTask.findUnique({
      where: { id: taskId },
      include: {
        waypoints: {
          orderBy: { sequence: 'asc' },
        },
        checklistItems: {
          orderBy: [
            { category: 'asc' },
            { sequence: 'asc' },
          ],
        },
      },
    })

    if (!task) {
      return c.json({error: "Task not found"}, 404)
    }

    if (task.userId !== userId) {
      return c.json({error: "Unauthorized"}, 403)
    }

    // Group checklist items by category
    const grouped = task.checklistItems.reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push({
        id: item.id,
        label: item.label,
        checked: item.checked,
        sequence: item.sequence,
      })
      return acc
    }, {})

    const checklist = Object.entries(grouped).map(([category, items]: [string, any]) => ({
      category,
      items: items.sort((a: any, b: any) => a.sequence - b.sequence),
    }))

    return c.json({
      success: true,
      task: {
        id: task.id,
        task: task.task,
        priority: task.priority,
        estimatedTime: task.estimatedTime,
        status: task.status,
        progress: task.progress,
        routeName: task.routeName,
        departurePort: task.departurePort,
        departureLat: task.departureLat,
        departureLng: task.departureLng,
        departureDate: task.departureDate,
        destinationPort: task.destinationPort,
        destinationLat: task.destinationLat,
        destinationLng: task.destinationLng,
        totalDistance: task.totalDistance,
        routeEstimatedTime: task.routeEstimatedTime,
        routeStatus: task.routeStatus,
        waypoints: task.waypoints,
        checklist,
      },
    })
  })

  // Complete a passage planning task
  .post("/passage-planning-task/:id/complete", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.json({error: "Unauthorized"}, 401)
    }

    const taskId = c.req.param('id')

    if (!taskId) {
      return c.json({error: "Task ID is required"}, 400)
    }

    try {
      // Get the task with checklist items and waypoints
      const task = await (prisma as any).passagePlanningTask.findUnique({
        where: { id: taskId },
        include: {
          checklistItems: true,
          waypoints: true,
          user: {
            select: {
              onboardingData: true,
            },
          },
        },
      })

      if (!task) {
        return c.json({error: "Task not found"}, 404)
      }

      if (task.userId !== userId) {
        return c.json({error: "Unauthorized"}, 403)
      }

      // Check if all checklist items are completed
      const allChecked = task.checklistItems.length > 0 && task.checklistItems.every((item: any) => item.checked)

      if (!allChecked) {
        return c.json({
          error: "Cannot complete task",
          message: "Please complete all checklist items before finishing the task.",
          allChecked: false,
        }, 400)
      }

      // Mark task as completed
      const updatedTask = await (prisma as any).passagePlanningTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        },
      })

      // Get current domain progress
      const currentDomainProgress = await prisma.domainProgress.findUnique({
        where: {
          userId_name: {
            userId: userId,
            name: 'Passage Planning',
          },
        },
      })

      const currentProgress = currentDomainProgress?.progress || 0

      // Generate incremental progress increase using LLM
      const taskData = {
        task: task.task,
        departurePort: task.departurePort,
        destinationPort: task.destinationPort,
        waypointCount: task.waypoints?.length || 0,
        checklistItems: task.checklistItems.length,
        allChecklistCompleted: true,
      }

      const userContext = {
        onboardingData: task.user?.onboardingData || {},
        completedTask: taskData,
        currentDomainProgress: currentProgress,
      }

      const systemPrompt = `You are First Mate, Knot Ready's sailing preparation assistant. A user has just completed a Passage Planning task. Based on this completion, calculate a reasonable incremental increase (0-15%) to their Passage Planning domain progress.

IMPORTANT RULES:
- The increase should be incremental (typically 5-12% per task completion)
- More complex tasks (many waypoints, comprehensive checklists) can increase by 10-15%
- Simpler tasks should increase by 5-8%
- Never suggest an increase that would exceed 100% total progress
- Consider the current progress level - users closer to 100% should get smaller increases

Return ONLY a valid JSON object with the incremental increase percentage (not the total). Example:
{
  "increase": 8
}`

      const userPrompt = `The user has completed this Passage Planning task:
${JSON.stringify(taskData, null, 2)}

Current Passage Planning domain progress: ${currentProgress}%

Calculate a reasonable incremental increase (0-15%) for completing this task. Return a JSON object with the "increase" percentage.`

      let updatedProgress = currentProgress
      try {
        const result = await generateText({
          model: getModel(),
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.5, // Lower temperature for more consistent results
        })

        const text = result.text.trim()
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const progressData = JSON.parse(jsonMatch[0]) as Record<string, number>
          const increase = progressData["increase"] || progressData["increment"] || progressData["Passage Planning"]
          
          // Handle both incremental increase and absolute value (for backward compatibility)
          let calculatedProgress: number
          if (increase <= 15) {
            // Likely an incremental increase
            calculatedProgress = Math.min(100, currentProgress + Math.round(increase))
          } else {
            // Likely an absolute value, convert to incremental (cap at 15%)
            const diff = increase - currentProgress
            calculatedProgress = Math.min(100, currentProgress + Math.min(15, Math.max(0, Math.round(diff))))
          }

          // Additional safety: cap the increase at 15% maximum
          const maxIncrease = Math.min(15, 100 - currentProgress)
          calculatedProgress = Math.min(100, currentProgress + maxIncrease)
          
          if (calculatedProgress >= 0 && calculatedProgress <= 100) {
            // Update domain progress
            await prisma.domainProgress.upsert({
              where: {
                userId_name: {
                  userId: userId,
                  name: 'Passage Planning',
                },
              },
              update: {
                progress: calculatedProgress,
              },
              create: {
                userId: userId,
                name: 'Passage Planning',
                progress: calculatedProgress,
              },
            })
            updatedProgress = calculatedProgress
          }
        }
      } catch (llmError) {
        console.error('Error updating domain progress with LLM:', llmError)
        // Fallback: use a conservative default increase of 8%
        const fallbackIncrease = Math.min(8, 100 - currentProgress)
        const fallbackProgress = Math.min(100, currentProgress + fallbackIncrease)
        
        await prisma.domainProgress.upsert({
          where: {
            userId_name: {
              userId: userId,
              name: 'Passage Planning',
            },
          },
          update: {
            progress: fallbackProgress,
          },
          create: {
            userId: userId,
            name: 'Passage Planning',
            progress: fallbackProgress,
          },
        })
        updatedProgress = fallbackProgress
      }

      return c.json({
        success: true,
        message: "Task completed successfully",
        task: {
          id: updatedTask.id,
          status: updatedTask.status,
          progress: updatedTask.progress,
          completedAt: updatedTask.completedAt,
        },
        domainProgress: updatedProgress !== null ? {
          name: 'Passage Planning',
          progress: updatedProgress,
        } : null,
      })
    } catch (error) {
      console.error("Error completing task:", error)
      return c.json({error: "Failed to complete task"}, 500)
    }
  })

export default app
