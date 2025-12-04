import {Hono} from 'hono'
import {prisma} from "@/lib/prisma";
import {ExtractUserIdFromCookie} from "@/server/hono/routes/utils";

const app = new Hono()
  // Get checklist for a task
  .get("/", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.json({error: "Unauthorized"}, 401)
    }

    const taskId = c.req.query('taskId')

    if (!taskId) {
      return c.json({error: "Task ID is required"}, 400)
    }

    // Verify the task exists and belongs to the user
    const task = await (prisma as any).passagePlanningTask.findUnique({
      where: { id: taskId },
    })

    if (!task || task.userId !== userId) {
      return c.json({error: "Task not found or unauthorized"}, 404)
    }

    // Get all checklist items for this task, grouped by category
    const checklistItems = await (prisma as any).checklistItem.findMany({
      where: { passagePlanningTaskId: taskId },
      orderBy: [
        { category: 'asc' },
        { sequence: 'asc' },
      ],
    })

    // Group by category
    const grouped = checklistItems.reduce((acc: any, item: any) => {
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

    // Convert to array format
    const checklist = Object.entries(grouped).map(([category, items]: [string, any]) => ({
      category,
      items: items.sort((a: any, b: any) => a.sequence - b.sequence),
    }))

    return c.json({
      success: true,
      checklist,
    })
  })

  // Create or update checklist items
  .put("/", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.json({error: "Unauthorized"}, 401)
    }

    let payload: {
      taskId: string;
      checklist: Array<{
        category: string;
        items: Array<{
          id?: string;
          label: string;
          checked?: boolean;
          sequence?: number;
        }>;
      }>;
    } = {} as any

    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({error: "Invalid payload"}, 400)
    }

    const { taskId, checklist } = payload

    if (!taskId) {
      return c.json({error: "Task ID is required"}, 400)
    }

    if (!checklist || !Array.isArray(checklist)) {
      return c.json({error: "Checklist array is required"}, 400)
    }

    // Verify the task exists and belongs to the user
    const task = await (prisma as any).passagePlanningTask.findUnique({
      where: { id: taskId },
    })

    if (!task || task.userId !== userId) {
      return c.json({error: "Task not found or unauthorized"}, 404)
    }

    // Delete existing checklist items
    await (prisma as any).checklistItem.deleteMany({
      where: { passagePlanningTaskId: taskId },
    })

    // Create new checklist items
    const itemsToCreate: any[] = []
    checklist.forEach((category) => {
      category.items.forEach((item, index) => {
        itemsToCreate.push({
          passagePlanningTaskId: taskId,
          category: category.category,
          label: item.label,
          checked: item.checked ?? false,
          sequence: item.sequence ?? index,
        })
      })
    })

    if (itemsToCreate.length > 0) {
      await (prisma as any).checklistItem.createMany({
        data: itemsToCreate,
      })
    }

    // Return updated checklist
    const updatedItems = await (prisma as any).checklistItem.findMany({
      where: { passagePlanningTaskId: taskId },
      orderBy: [
        { category: 'asc' },
        { sequence: 'asc' },
      ],
    })

    const grouped = updatedItems.reduce((acc: any, item: any) => {
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

    const updatedChecklist = Object.entries(grouped).map(([category, items]: [string, any]) => ({
      category,
      items: items.sort((a: any, b: any) => a.sequence - b.sequence),
    }))

    return c.json({
      success: true,
      checklist: updatedChecklist,
    })
  })

  // Update a single checklist item (toggle checked status)
  .patch("/", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.json({error: "Unauthorized"}, 401)
    }

    let payload: {
      itemId: string;
      checked?: boolean;
      label?: string;
    } = {} as any

    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({error: "Invalid payload"}, 400)
    }

    const { itemId, checked, label } = payload

    if (!itemId) {
      return c.json({error: "Item ID is required"}, 400)
    }

    // Find the checklist item and verify it belongs to a task owned by the user
    const item = await (prisma as any).checklistItem.findUnique({
      where: { id: itemId },
      include: {
        passagePlanningTask: true,
      },
    })

    if (!item) {
      return c.json({error: "Checklist item not found"}, 404)
    }

    if (!item.passagePlanningTask || item.passagePlanningTask.userId !== userId) {
      return c.json({error: "Unauthorized"}, 403)
    }

    // Build update data
    const updateData: any = {}
    if (checked !== undefined) updateData.checked = checked
    if (label !== undefined) updateData.label = label

    const updatedItem = await (prisma as any).checklistItem.update({
      where: { id: itemId },
      data: updateData,
    })

    return c.json({
      success: true,
      item: {
        id: updatedItem.id,
        category: updatedItem.category,
        label: updatedItem.label,
        checked: updatedItem.checked,
        sequence: updatedItem.sequence,
      },
    })
  })

export default app

