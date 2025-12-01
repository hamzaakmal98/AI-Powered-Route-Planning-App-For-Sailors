'use server';

import {cookies} from "next/headers";
import {oauthClients} from "@/lib/oauth-client";
import {redirect} from "next/navigation";

export async function oauthRedirect(provider: string, scenario: string) {
  const client = oauthClients[provider]
  if (!client) {
    return {error: "unknown provider"}
  }
  return redirect(client.genOAuthUrlByScenario(scenario).toString());
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(process.env.JWT_COOKIE_NAME!)
}
