import {NextRequest} from "next/server";
import {verifyToken} from "@/lib/jwt";

/**
 * An array of routes that can be accessed whenever user want, even not logged in
 */
const publicRoutes = [
  "/terms",
  "/privacy",
];

/**
 * An array of routes that are used for authentication.
 * These routes will redirect logged-in users to dashboard page.
 */
const authRoutes = [
  "/",
  "/login",
  "/register",
  "/error",
];

/**
 * The prefix for API authentication routes
 * Routes that start with this prefix are used for API authentication.
 */
const apiAuthPrefix = "/api/auth";

async function checkLoggedIn(req: NextRequest) {
  const token = req.cookies.get(process.env.JWT_COOKIE_NAME!);
  if (!token) {
    return false;
  }
  try {
    const payload = await verifyToken(token.value);
    return !!payload
  } catch {
    return false; // Invalid token
  }
}

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const isLoggedIn = await checkLoggedIn(req);

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", nextUrl))
    }
    return;
  }

  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL("/login", nextUrl))
  }

  return;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',

    // TODO: maybe let hono handle api middleware?
    // Always run for API routes
    '/(api|trpc)(.*)',
  ]
}
