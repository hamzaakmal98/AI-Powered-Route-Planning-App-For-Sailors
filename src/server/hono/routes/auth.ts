import {Hono} from "hono";
import {zValidator} from "@hono/zod-validator";
import {z} from "zod";
import {setCookie} from "hono/cookie";
import {prisma} from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {createToken} from "@/lib/jwt";
import {oauthClients, OAuthScenario} from "@/lib/oauth-client";
import type {OAuthProvider} from "@/lib/oauth/providers/base";
import {AccountProvider} from "@/generated/prisma/enums";
import {env} from 'hono/adapter'

export const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const app = new Hono()
  .post("/signin", zValidator("json", signInSchema),
    async (c) => {
      try {
        const {email, password} = c.req.valid("json");

        // Find user
        let user = await prisma.user.findUnique({
          where: {email},
        });

        if (!user) {
          // User doesn't exist, create new account
          const hashedPassword = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
            },
          });
        } else {
          // User exists, verify password
          // TODO: check if user has OAuth account only
          if (!user.password) {
            return c.json({error: "This account was created with OAuth. Please use Google sign in."}, 401);
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return c.json({error: "Invalid email or password"}, 401);
          }
        }

        // Create JWT token and set cookie
        const token = await createToken(user.id);
        const {JWT_COOKIE_NAME} = env<{ JWT_COOKIE_NAME: string }>(c);

        setCookie(c, JWT_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Lax",
        });

        return c.json({success: true, userId: user.id});
      } catch (error) {
        console.error("Sign in error:", error);
        return c.json({error: "Failed to sign in. Please try again."}, 500);
      }
    }
  )

  // callback for google oauth
  .get("/callback/google/:action", async (c) => {
    const client = oauthClients.google as OAuthProvider | undefined;
    if (!client) {
      return c.json({error: "Google OAuth not configured"}, 500);
    }

    const code = c.req.query("code");
    if (!code) {
      return c.json({error: "Missing code parameter"}, 400);
    }

    const token = await client.getTokenByScenario(OAuthScenario.SignUpLogin, code);
    if (!token) {
      return c.json({error: "Failed to obtain access token from Google"}, 500);
    }

    const userProfile = await client.getProfile(token.accessToken());
    if (!userProfile) {
      return c.json({error: "Failed to obtain user profile from Google"}, 500);
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: {email: userProfile.email},
    });

    // If user exists, redirect to the dashboard
    if (user) {
      return c.redirect("/dashboard");
    }

    // If user doesn't exist, create new user
    try {
      await prisma.$transaction(async (tx: any) => {
        user = await tx.user.create({
          data: {
            email: userProfile.email,
            name: userProfile.name,
          },
        });

        if (!user) {
          throw new Error("User creation failed");
        }

        // TODO: setup logger with pino https://github.com/pinojs/pino/blob/main/docs/web.md#hono
        console.log("User creation completed");

        const account = await tx.account.create({
          data: {
            userId: user.id,
            provider: AccountProvider.Google,
            providerId: userProfile.accountId,
            email: userProfile.email,
          }
        })

        if (!account) {
          throw new Error("Account creation failed");
        }

        console.log("Account creation completed");
      })
    } catch (error) {
      //TODO: redirect to an error page
      console.error("Failed to create user account, err: ", error);
      return c.redirect("/login");
    }

    // Create JWT token and set cookie
    const jwtToken = await createToken(user!.id);
    const {JWT_COOKIE_NAME} = env<{ JWT_COOKIE_NAME: string }>(c);

    setCookie(c, JWT_COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });

    return c.redirect("/dashboard");
  });

export default app;

