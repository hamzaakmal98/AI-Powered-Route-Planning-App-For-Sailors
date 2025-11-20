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
      where: {id: userId}
    })

    if (!user) {
      return c.text("Unauthorized", 401)
    }

    return c.json({
      id: user?.id,
      email: user?.email,
      name: user?.name,
      onboarded: user?.onboarded,
      onboardingData: user?.onboardingData,
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

    try {
      const user = await prisma.user.update({
        where: {id: userId},
        data: {
          onboarded: true,
          onboardingData: hasValidPayload ? payload.formsData : {},
        },
      })

      return c.json({
        success: true,
        onboarded: user.onboarded,
        onboardingData: user.onboardingData,
      })
    } catch (error) {
      console.error("Error updating onboarded status:", error)
      return c.json({error: "Failed to update onboarding status"}, 500)
    }
  })

export default app
