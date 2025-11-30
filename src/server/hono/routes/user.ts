import {Hono} from 'hono'
import {prisma} from "@/lib/prisma";
import {ExtractUserIdFromCookie} from "@/server/hono/routes/utils";
import {generateText} from 'ai';
import {ollama} from 'ollama-ai-provider-v2';
import {openai} from "@ai-sdk/openai";

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
    'Skill Building',
    'Weather Routing',
    'Safety Systems',
    'Budget Management',
    'Passage Planning',
    'Timeline Management',
  ];

  const systemPrompt = `You are First Mate, Knot Ready's sailing preparation assistant. Your task is to analyze a sailor's onboarding information and estimate their current progress percentage (0-100) for each preparation domain.

Available domains:
- Boat Maintenance: Physical condition of the boat, systems, equipment readiness
- Skill Building: Sailing skills, certifications, experience level
- Weather Routing: Knowledge and tools for weather planning and routing
- Safety Systems: Safety equipment, emergency procedures, safety protocols
- Budget Management: Financial planning, cost estimates, budget tracking
- Passage Planning: Route planning, navigation, passage preparation
- Timeline Management: Preparation timeline, scheduling, readiness timeline

Based on the onboarding data provided, estimate the user's current progress in each domain. Consider:
- Their experience level and certifications
- Boat condition and preparation status
- Journey type and timeline
- Goals and priorities

Return ONLY a valid JSON object with domain names as keys and progress percentages (0-100 integers) as values. Example:
{
  "Boat Maintenance": 25,
  "Skill Building": 60,
  "Weather Routing": 30,
  "Safety Systems": 40,
  "Budget Management": 20,
  "Passage Planning": 15,
  "Timeline Management": 35
}`;

  const userPrompt = `Analyze this onboarding data and estimate progress for each domain:

${JSON.stringify(onboardingData, null, 2)}

Return a JSON object with progress estimates (0-100) for each of these domains: ${defaultDomains.join(', ')}`;

  try {
    const result = await generateText({
      model: process.env.NODE_ENV === 'production' 
        ? openai('gpt-3.5-turbo') 
        : ollama('qwen3:8b'),
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
        tasks: {
          orderBy: { priority: 'asc' },
        },
        domainProgress: true,
      }
    })

    if (!user) {
      return c.text("Unauthorized", 401)
    }

    // Default domains if none exist
    const defaultDomains = [
      'Boat Maintenance',
      'Skill Building',
      'Weather Routing',
      'Safety Systems',
      'Budget Management',
      'Passage Planning',
      'Timeline Management',
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

    // Transform relational data to match the expected format
    const tasksData = {
      priorities: user.tasks.map((task) => ({
        id: task.id,
        domain: task.domain,
        task: task.task,
        priority: task.priority,
        estimatedTime: task.estimatedTime,
        status: task.status,
        progress: task.progress,
      })),
      domainProgress: user.domainProgress.length > 0
        ? user.domainProgress.map((dp) => ({
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
        'Skill Building',
        'Weather Routing',
        'Safety Systems',
        'Budget Management',
        'Passage Planning',
        'Timeline Management',
      ]

      // Update user first
      const user = await prisma.user.update({
        where: {id: userId},
        data: {
          onboarded: true,
          onboardingData: onboardingData,
        },
        include: {
          tasks: {
            orderBy: { priority: 'asc' },
          },
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
          tasks: {
            orderBy: { priority: 'asc' },
          },
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

      // Transform relational data to match the expected format
      const transformedTasksData = {
        priorities: finalUser.tasks.map((task) => ({
          id: task.id,
          domain: task.domain,
          task: task.task,
          priority: task.priority,
          estimatedTime: task.estimatedTime,
          status: task.status,
          progress: task.progress,
        })),
        domainProgress: finalUser.domainProgress.map((dp) => ({
          name: dp.name,
          progress: dp.progress,
        })),
      }

      return c.json({
        success: true,
        onboarded: finalUser.onboarded,
        onboardingData: finalUser.onboardingData,
        tasksData: transformedTasksData,
      })
    } catch (error) {
      console.error("Error updating onboarded status:", error)
      return c.json({error: "Failed to update onboarding status"}, 500)
    }
  })

  .post("/tasks", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.text("Unauthorized", 401)
    }

    let payload: {task?: any} = {}
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({error: "Invalid payload"}, 400)
    }

    const newTask = payload.task

    if (!newTask || typeof newTask !== 'object') {
      return c.json({error: "Invalid task payload"}, 400)
    }

    try {
      // Create a new task
      const task = await prisma.task.create({
        data: {
          userId: userId,
          domain: newTask.domain,
          task: newTask.task,
          priority: newTask.priority,
          estimatedTime: newTask.estimatedTime,
          status: newTask.status || 'ready',
          progress: newTask.progress || 0,
        },
      })

      // Get updated tasks list
      const user = await prisma.user.findUnique({
        where: {id: userId},
        include: {
          tasks: {
            orderBy: { priority: 'asc' },
          },
          domainProgress: true,
        },
      })

      if (!user) {
        return c.json({error: "User not found"}, 404)
      }

      // Transform relational data to match the expected format
      const tasksData = {
        priorities: user.tasks.map((t) => ({
          id: t.id,
          domain: t.domain,
          task: t.task,
          priority: t.priority,
          estimatedTime: t.estimatedTime,
          status: t.status,
          progress: t.progress,
        })),
        domainProgress: user.domainProgress.map((dp) => ({
          name: dp.name,
          progress: dp.progress,
        })),
      }

      return c.json({
        success: true,
        tasksData: tasksData,
      })
    } catch (error) {
      console.error("Error adding task:", error)
      return c.json({error: "Failed to add task"}, 500)
    }
  })

export default app
