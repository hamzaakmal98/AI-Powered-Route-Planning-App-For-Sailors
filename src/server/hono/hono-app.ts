import {Hono} from "hono";
import {logger} from "hono/logger";

import userRoutes from "./routes/user";
import authRoutes from "./routes/auth";
import waypointRoutes from "./routes/waypoints";
import checklistRoutes from "./routes/checklists";

// it's better to chain the methods to keep the type information
const app = new Hono()
  .basePath("api")
  .use(logger())
  .get('/ping', (c) => {
    return c.text("pong")
  })
  .route("/user", userRoutes)
  .route("/auth", authRoutes)
  .route("/waypoints", waypointRoutes)
  .route("/checklists", checklistRoutes)

export default app;
