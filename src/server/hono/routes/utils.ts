import {Context} from "hono";
import {getCookie, setCookie} from "hono/cookie";
import {createToken, verifyToken} from "@/lib/jwt";
import { env } from "hono/adapter";

export async function SetAuthCookie(c: Context, userId: string) {
  // Create JWT token and set cookie
  const jwtToken = await createToken(userId);
  const {JWT_COOKIE_NAME} = env<{ JWT_COOKIE_NAME: string }>(c);

  setCookie(c, JWT_COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });
}


export async function ExtractUserIdFromCookie(c: Context): Promise<string | null> {
  const {JWT_COOKIE_NAME} = env<{ JWT_COOKIE_NAME: string }>(c);
  const jwtCookie = getCookie(c, JWT_COOKIE_NAME);
  if (!jwtCookie) {
    return null;
  }

  const payload = await verifyToken(jwtCookie);
  if (!payload) {
    return null;
  }

  return payload.userId;
}
