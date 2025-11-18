import {Hono} from 'hono'
import {env} from "hono/adapter";
import {getCookie} from "hono/cookie";
import {prisma} from "@/lib/prisma";
import {verifyToken} from "@/lib/jwt";

let app = new Hono()

app = app.get("/user", async (c) => {
  const {JWT_COOKIE_NAME} = env<{ JWT_COOKIE_NAME: string }>(c);
  const jwtCookie = getCookie(c, JWT_COOKIE_NAME);
  if (!jwtCookie) {
    return c.text("Unauthorized", 401)
  }

  const payload = await verifyToken(jwtCookie)
  if (!payload) {
    return c.text("Unauthorized", 401)
  }

  const user = await prisma.user.findUnique({
    where: {id: payload.userId}
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
