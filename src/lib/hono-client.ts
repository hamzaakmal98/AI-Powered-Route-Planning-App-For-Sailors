import { hc } from 'hono/client';
import type app from "@/server/hono/hono-app";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// Create client - the basePath "api" is part of the app type, so routes are accessed via .api
export const honoClient = hc<typeof app>(baseUrl);
