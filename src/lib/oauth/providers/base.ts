import * as arctic from "arctic";

export class OAuthError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // Fix prototype chain
  }
}

export type Profile = {
  accountId: string;
  email: string;
  name: string;
  picture: string | undefined;
}

export type OAuthOptions = {
  redirectUrl: string;
  scopes: string[];
  searchParams?: Record<string, string>;
}

export type ScenarioConfig = OAuthOptions & {
  incremental?: boolean;
}

export type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  codeVerifier: string;
  scenarioConfigs: Record<string/*scenario*/, ScenarioConfig>;
}

export type OAuthClient = {
  createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL;
  validateAuthorizationCode(code: string, codeVerifier: string): Promise<arctic.OAuth2Tokens>;
};

export abstract class OAuthProvider {
  protected clientConfig: OAuthProviderConfig
  protected userInfoEndpoint: string = "";

  protected constructor(config: OAuthProviderConfig) {
    this.clientConfig = config
  }

  protected abstract constructClientByScenario(scenario: string): OAuthClient;

  public genOAuthUrlByScenario(scenario: string): URL {
    const scenarioConfig = this.clientConfig.scenarioConfigs[scenario];
    const client = this.constructClientByScenario(scenario);
    const url = client.createAuthorizationURL(
      arctic.generateState(),
      this.clientConfig.codeVerifier,
      scenarioConfig.scopes
    );
    if (scenarioConfig.searchParams) {
      for (const [key, value] of Object.entries(scenarioConfig.searchParams)) {
        url.searchParams.set(key, value);
      }
    }
    return url;
  }

  public async getTokenByScenario(scenario: string, code: string): Promise<arctic.OAuth2Tokens> {
    const client = this.constructClientByScenario(scenario);
    try {
      return await client.validateAuthorizationCode(code, this.clientConfig.codeVerifier);
    } catch (e) {
      console.error(e);
      throw new OAuthError("exchange token for code failed");
    }
  }

  protected async getProfileResponse(accessToken: string): Promise<Response> {
    const resp = await fetch(this.userInfoEndpoint, {
      headers: {Authorization: `Bearer ${accessToken}`},
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => null);
      throw new OAuthError(
        `Token refresh failed: ${resp.status} ${resp.statusText}` +
        (errorData ? `\nDetails: ${JSON.stringify(errorData)}` : '')
      );
    }
    return resp
  }

  public abstract getProfile(accessToken: string): Promise<Profile>;
}
