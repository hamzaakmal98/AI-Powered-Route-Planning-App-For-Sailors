import {Hono} from 'hono'
import {prisma} from "@/lib/prisma";
import {ExtractUserIdFromCookie} from "@/server/hono/routes/utils";

const app = new Hono()
  .put("/", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    if (!userId) {
      return c.json({error: "Unauthorized"}, 401)
    }

    let payload: {
      waypointId?: string;
      name?: string;
      latitude?: number;
      longitude?: number;
      course?: number;
      distance?: number;
      notes?: string;
    } = {}
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({error: "Invalid payload"}, 400)
    }

    const { waypointId, name, latitude, longitude, course, distance, notes } = payload

    if (!waypointId) {
      return c.json({error: "Waypoint ID is required"}, 400)
    }

    // Find the waypoint and verify it belongs to a task owned by the user
    const waypoint = await (prisma as any).waypoint.findUnique({
      where: { id: waypointId },
      include: {
        passagePlanningTask: true,
      },
    })

    if (!waypoint) {
      return c.json({error: "Waypoint not found"}, 404)
    }

    // Check ownership - waypoint must be linked to PassagePlanningTask
    if (!waypoint.passagePlanningTask) {
      return c.json({error: "Waypoint is not linked to a valid Passage Planning task"}, 400)
    }

    if (waypoint.passagePlanningTask.userId !== userId) {
      return c.json({error: "Unauthorized"}, 403)
    }

    // Build update data object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (latitude !== undefined) updateData.latitude = latitude
    if (longitude !== undefined) updateData.longitude = longitude
    if (course !== undefined) updateData.course = course
    if (distance !== undefined) updateData.distance = distance
    if (notes !== undefined) updateData.notes = notes

    const updatedWaypoint = await (prisma as any).waypoint.update({
      where: { id: waypointId },
      data: updateData,
    })

    return c.json({
      success: true,
      waypoint: {
        id: updatedWaypoint.id,
        name: updatedWaypoint.name,
        latitude: updatedWaypoint.latitude,
        longitude: updatedWaypoint.longitude,
        sequence: updatedWaypoint.sequence,
      },
    })
  })

  .delete("/", async (c) => {
    const userId = await ExtractUserIdFromCookie(c)
    console.log("userId:", userId)
    if (!userId) {
      return c.json({error: "Unauthorized"}, 401)
    }

    const waypointId = c.req.query('waypointId')

    if (!waypointId) {
      return c.json({error: "Waypoint ID is required"}, 400)
    }

    // Find the waypoint and verify it belongs to a task owned by the user
    const waypoint = await (prisma as any).waypoint.findUnique({
      where: { id: waypointId },
      include: {
        passagePlanningTask: true,
      },
    })

    if (!waypoint) {
      return c.json({error: "Waypoint not found"}, 404)
    }

    // Check ownership - waypoint must be linked to PassagePlanningTask
    if (!waypoint.passagePlanningTask) {
      return c.json({error: "Waypoint is not linked to a valid Passage Planning task"}, 400)
    }

    if (waypoint.passagePlanningTask.userId !== userId) {
      return c.json({error: "Unauthorized"}, 403)
    }

    // Delete the waypoint
    await (prisma as any).waypoint.delete({
      where: { id: waypointId },
    })

    return c.json({ success: true })
  })

export default app

