import * as arctic from "arctic";
import {
  OAuthClient,
  OAuthProvider,
  Profile,
  OAuthProviderConfig
} from "@/lib/oauth/providers/base";

export class Google extends OAuthProvider {
  constructor(config: OAuthProviderConfig) {
    super(config);
    this.userInfoEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo";
  }

  protected override constructClientByScenario(scenario: string): OAuthClient {
    return new arctic.Google(
      this.clientConfig.clientId,
      this.clientConfig.clientSecret,
      this.clientConfig.scenarioConfigs[scenario].redirectUrl
    )
  };

  public override genOAuthUrlByScenario(scenario: string): URL {
    const url = super.genOAuthUrlByScenario(scenario);
    if (this.clientConfig.scenarioConfigs[scenario].incremental) {
      url.searchParams.set("include_granted_scopes", "true");
    }
    return url
  }

  public override async getProfile(accessToken: string): Promise<Profile> {
    const resp = await this.getProfileResponse(accessToken);

    const respJson = await resp.json();
    return {
      accountId: respJson.sub,
      email: respJson.email,
      name: respJson.name,
      picture: respJson.picture,
    }
  }
}
