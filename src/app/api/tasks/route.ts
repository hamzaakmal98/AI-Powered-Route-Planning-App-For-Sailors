import { Experimental_Agent as Agent, tool, stepCountIs, validateUIMessages } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const maxDuration = 30;

// Factory function to create the getUserContext tool with userId access
function getUserContextToolFactory(userId: string) {
  return tool({
    description: 'Fetch the user\'s onboarding information, existing tasks, and context. Use this when you need to understand the user\'s boat, experience level, journey goals, concerns, or existing tasks to provide personalized recommendations.',
    inputSchema: z.object({}).describe('No parameters needed - fetches all user context'),
    execute: async () => {
      try {
        // Fetch user data from database
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            tasks: {
              orderBy: { priority: 'asc' },
            },
            domainProgress: true,
            executionProgress: true,
          },
        } as any) as any;

        if (!user) {
          return {
            success: false,
            message: 'User not found',
          };
        }

        const onboardingData = user.onboardingData as any;

        // Build comprehensive user context
        const context: any = {
          onboarding: {},
          tasks: user.tasks || [],
          domainProgress: user.domainProgress || [],
          executionProgress: user.executionProgress || [],
        };

        // Extract onboarding information
        if (onboardingData) {
          if (onboardingData.boatType) context.onboarding.boatType = onboardingData.boatType;
          if (onboardingData.boatLength) context.onboarding.boatLength = onboardingData.boatLength;
          if (onboardingData.boatAge) context.onboarding.boatAge = onboardingData.boatAge;
          if (onboardingData.experienceLevel) context.onboarding.experienceLevel = onboardingData.experienceLevel;
          if (onboardingData.journeyType) context.onboarding.journeyType = onboardingData.journeyType;
          if (onboardingData.timeline) context.onboarding.timeline = onboardingData.timeline;
          if (Array.isArray(onboardingData.primaryGoals) && onboardingData.primaryGoals.length > 0) {
            context.onboarding.primaryGoals = onboardingData.primaryGoals;
          }
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
          summary: `User has ${user.tasks.length} existing tasks across ${user.domainProgress.length} preparation domains.`,
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

// Factory function to create the createTask tool with userId access
function createTaskToolFactory(userId: string) {
  return tool({
    description: 'Create a new preparation task for the user and save it to the database. Use this when the user wants to add a task.',
    inputSchema: z.object({
      domain: z.enum([
        'Boat Maintenance',
        'Skill Building',
        'Weather Routing',
        'Safety Systems',
        'Budget Management',
        'Passage Planning',
        'Timeline Management'
      ]).describe('The domain this task belongs to'),
      task: z.string().describe('Clear, actionable task description'),
      priority: z.number().min(1).max(5).describe('Priority level (1 is highest)'),
      estimatedTime: z.string().describe('Estimated time to complete (e.g., "2-3 hours", "1 day")'),
    }),
    execute: async ({ domain, task, priority, estimatedTime }) => {
      try {
        // Save task directly to database
        const newTask = await (prisma as any).task.create({
          data: {
            userId: userId,
            domain,
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
            domain: newTask.domain,
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

function createTaskAgent(
  getUserContextTool: ReturnType<typeof getUserContextToolFactory>,
  createTaskTool: ReturnType<typeof createTaskToolFactory>
) {
  return new Agent({
    model: process.env.NODE_ENV === 'production' ? openai('gpt-3.5-turbo') : ollama('qwen3:8b'),
    system: `You are First Mate, Knot Ready's friendly sailing preparation assistant. You're here to help users generate and refine their preparation tasks through interactive conversation.

Your role:
- Help users create new preparation tasks based on their specific needs, boat, experience level, and journey goals.
- Refine existing tasks (though for now, focus on adding new ones).
- Suggest tasks that are personalized to the user's situation, considering their boat type, experience level, journey type, concerns, and goals.
- Be friendly, encouraging, and use sailing terminology naturally.
- When creating tasks, make them specific and actionable based on the user's context.

Available tools:
- 'getUserContext': Use this tool to fetch the user's onboarding information, existing tasks, and progress. Call this when you need to understand their boat, experience, goals, concerns, or existing tasks to provide personalized recommendations.
- 'createTask': Use this when the user wants to add a task. Before calling, ensure you have all necessary information: domain, task description, priority (1-5), and estimated time. If any information is missing, use getUserContext first or ask clarifying questions.

CRITICAL - Domain Selection First:
- When the conversation starts (first message) OR when a user expresses intent to create a task (e.g., "I want to create a task"), you MUST FIRST show the domain selector.
- ALWAYS output JSON at the end of your message when you need to show the domain selector.
- The JSON MUST be on a separate line at the very end of your message.
- Format: {"action": "showDomainSelector"}
- Example response: "Great! Let's create a new task. First, which domain would you like to focus on?
{"action": "showDomainSelector"}"
- If this is the very first message in the conversation, greet the user and immediately show the domain selector.

IMPORTANT - After Domain Selection:
- Once the user selects a domain (they will send a message like "I've selected the [Domain] domain"), you MUST FIRST call the 'getUserContext' tool to fetch their onboarding information, existing tasks, and context.
- After getting the user context, provide personalized suggestions based on:
  * Their boat type and size (affects task complexity and time estimates)
  * Their experience level (affects priority and task difficulty)
  * Their journey type and goals (helps suggest relevant tasks)
  * Their existing tasks (avoid duplication, suggest complementary tasks)
  * Their concerns and timeline (helps prioritize)
- Then IMMEDIATELY start asking specific questions to gather the required information.
- Do NOT just acknowledge their selection - provide 2-3 personalized task suggestions based on their context, then ask which one they'd like to create or if they have something else in mind.
- Ask questions naturally in conversation, one or two at a time, and wait for the user's response before asking more.
- Once you have all the information (domain, task description, priority, estimated time), use the createTask tool to create the task.

Available domains:
- Boat Maintenance
- Skill Building
- Weather Routing
- Safety Systems
- Budget Management
- Passage Planning
- Timeline Management

When creating tasks:
- Consider the user's boat type and size when estimating time and suggesting tasks
- Consider the user's experience level when setting priority and complexity
- Consider the user's journey type and goals when selecting the domain
- Consider the user's concerns and timeline when prioritizing tasks
- Check existing tasks to avoid duplication and ensure proper sequencing

After calling the 'createTask' tool, the task will be automatically saved to the database. Confirm with the user that the task has been added and offer further assistance.
Keep your messages conversational and helpful. Celebrate their progress!`,
    tools: {
      getUserContext: getUserContextTool,
      createTask: createTaskTool,
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

    // Get user's onboarding data and tasks for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tasks: {
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages } = await req.json();

    // Create the tools with userId access
    const getUserContextTool = getUserContextToolFactory(userId);
    const createTaskTool = createTaskToolFactory(userId);

    // Create a new agent instance with the tools
    const taskAgent = createTaskAgent(getUserContextTool, createTaskTool);

    // Validate messages
    const validatedMessages = await validateUIMessages({ messages });

    // Use agent.respond() to handle UI messages and return streaming response
    // The agent can now use getUserContext tool to fetch user information when needed
    return taskAgent.respond({
      messages: validatedMessages as any,
    });
  } catch (error) {
    console.error('Error in tasks API:', error);
    return new Response(JSON.stringify({ error: 'Failed to process task generation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

