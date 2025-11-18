'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Anchor } from "lucide-react";
import Link from "next/link";
import {oauthRedirect} from "@/server/actions/oauth";
import {OAuthProviderName, OAuthScenario} from "@/lib/oauth-client";
import { honoClient } from "@/lib/hono-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    //TODO: valid form by using signInSchema Defined in server/hono/routes/auth.ts
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    startTransition(async () => {
      try {
        // TypeScript has issues inferring nested routes with basePath, but the route exists at runtime
        const response = await honoClient.api.auth.signin.$post({
          json: data,
        });

        const result = await response.json();

        if (!response.ok || ('error' in result && result.error)) {
          setError(('error' in result ? result.error : undefined) || "Something went wrong");
        } else {
          // Redirect to dashboard on success
          router.push("/dashboard");
        }
      } catch (err) {
        setError("Failed to connect to server. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Anchor className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Knot Ready</span>
          </Link>
          <h1 className="text-2xl font-bold">
            Sign in to Knot Ready
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter your email and password to continue. An account will be created automatically if you don&apos;t have one yet.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  required
                  disabled={isPending}
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                {isPending ? "Please wait..." : "Sign in"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                oauthRedirect(OAuthProviderName.Google, OAuthScenario.SignUpLogin)
              }}
              disabled={isPending}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

