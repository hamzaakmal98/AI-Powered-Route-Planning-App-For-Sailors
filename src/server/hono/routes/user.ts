import {Hono} from 'hono'
import {prisma} from "@/lib/prisma";
import {ExtractUserIdFromCookie} from "@/server/hono/routes/utils";

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
        executionProgress: true,
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

    // Default execution progress if none exists
    const defaultExecutionProgress = [
      { level: 'Day Sails', status: 'ready', completed: 0, required: 5, unlocked: true },
      { level: 'Overnights', status: 'locked', completed: 0, required: 3, unlocked: false },
      { level: 'Multi-day Passages', status: 'locked', completed: 0, required: 2, unlocked: false },
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

    // Ensure execution progress exists for existing users (backfill)
    if (user.onboarded && user.executionProgress.length === 0) {
      await prisma.executionProgress.createMany({
        data: defaultExecutionProgress.map((ep) => ({
          userId: userId,
          level: ep.level,
          status: ep.status,
          completed: ep.completed,
          required: ep.required,
          unlocked: ep.unlocked,
        })),
        skipDuplicates: true,
      })
      // Reload execution progress
      const updatedUser = await prisma.user.findUnique({
        where: {id: userId},
        include: { executionProgress: true },
      })
      if (updatedUser) {
        user.executionProgress = updatedUser.executionProgress
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
      executionProgress: user.executionProgress.length > 0
        ? user.executionProgress.map((ep) => ({
            level: ep.level,
            status: ep.status,
            completed: ep.completed,
            required: ep.required,
            unlocked: ep.unlocked,
          }))
        : defaultExecutionProgress,
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
    const onboardingData = hasValidPayload ? payload.formsData : {}

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

      // Default execution progress entries
      const defaultExecutionProgress = [
        { level: 'Day Sails', status: 'ready', completed: 0, required: 5, unlocked: true },
        { level: 'Overnights', status: 'locked', completed: 0, required: 3, unlocked: false },
        { level: 'Multi-day Passages', status: 'locked', completed: 0, required: 2, unlocked: false },
      ]

      // Update user and create domainProgress/executionProgress
      const user = await prisma.user.update({
        where: {id: userId},
        data: {
          onboarded: true,
          onboardingData: onboardingData,
          domainProgress: {
            create: defaultDomains.map((name) => ({
              name,
              progress: 0,
            })),
          },
          executionProgress: {
            create: defaultExecutionProgress.map((ep) => ({
              level: ep.level,
              status: ep.status,
              completed: ep.completed,
              required: ep.required,
              unlocked: ep.unlocked,
            })),
          },
        },
        include: {
          tasks: {
            orderBy: { priority: 'asc' },
          },
          domainProgress: true,
          executionProgress: true,
        },
      })

      // Transform relational data to match the expected format
      const transformedTasksData = {
        priorities: user.tasks.map((task) => ({
          id: task.id,
          domain: task.domain,
          task: task.task,
          priority: task.priority,
          estimatedTime: task.estimatedTime,
          status: task.status,
          progress: task.progress,
        })),
        domainProgress: user.domainProgress.map((dp) => ({
          name: dp.name,
          progress: dp.progress,
        })),
        executionProgress: user.executionProgress.map((ep) => ({
          level: ep.level,
          status: ep.status,
          completed: ep.completed,
          required: ep.required,
          unlocked: ep.unlocked,
        })),
      }

      return c.json({
        success: true,
        onboarded: user.onboarded,
        onboardingData: user.onboardingData,
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
          executionProgress: true,
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
        executionProgress: user.executionProgress.map((ep) => ({
          level: ep.level,
          status: ep.status,
          completed: ep.completed,
          required: ep.required,
          unlocked: ep.unlocked,
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
