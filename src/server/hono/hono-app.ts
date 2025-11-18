import {Hono} from "hono";
import {logger} from "hono/logger";

import userRoutes from "./routes/user";
import authRoutes from "./routes/auth";

// it's better to chain the methods to keep the type information
const app = new Hono()
  .basePath("api")
  .use(logger())
  .get('/ping', (c) => {
    return c.text("pong")
  })
  .route("/users", userRoutes)
  .route("/auth", authRoutes)

export default app;
