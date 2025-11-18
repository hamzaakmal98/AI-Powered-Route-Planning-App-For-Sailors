import {Hono} from 'hono'
import {env} from "hono/adapter";
import {getCookie} from "hono/cookie";
import {prisma} from "@/lib/prisma";
import {verifyToken} from "@/lib/jwt";
import {ExtractUserIdFromCookie} from "@/server/hono/routes/utils";

let app = new Hono()

app = app.get("/user", async (c) => {
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
  })
})

export default app
