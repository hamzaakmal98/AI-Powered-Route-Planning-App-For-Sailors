import {Google} from "@/lib/oauth/providers/google";
import {OAuthProvider} from "@/lib/oauth/providers/base";

const globalForOauthClient = global as unknown as {
  oauthClients: { [provider: string]: OAuthProvider }
}

export const OAuthProviderName = {
  Google: "google",
}

export const OAuthScenario = {
  SignUpLogin: "signup_login",
}

export const oauthClients = globalForOauthClient.oauthClients ?? {
  [OAuthProviderName.Google]: new Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //TODO: Use a more secure method to store and retrieve the code verifier
    codeVerifier: process.env.OAUTH_CODE_VERIFIER!,
    scenarioConfigs: {
      [OAuthScenario.SignUpLogin]: {
        scopes: ["openid", "email", "profile"],
        redirectUrl: new URL(`/api/auth/callback/google/signin`, process.env.NEXT_PUBLIC_SITE_URL!).toString(),
        searchParams: {
          "access_type": "offline",
        }
      }
    }
  })
}

if (process.env.NODE_ENV !== 'production') globalForOauthClient.oauthClients = oauthClients;
