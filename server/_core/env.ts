const readEnv = (key: string) => typeof process === "undefined" ? "" : process.env[key] ?? "";

/** Reads values at request time so Cloudflare Worker bindings can hydrate process.env before application imports. */
export const ENV = {
  get appId() { return readEnv("VITE_APP_ID"); },
  get cookieSecret() { return readEnv("JWT_SECRET"); },
  get databaseUrl() { return readEnv("DATABASE_URL"); },
  get oAuthServerUrl() { return readEnv("OAUTH_SERVER_URL"); },
  get ownerOpenId() { return readEnv("OWNER_OPEN_ID"); },
  get ownerEmail() { return readEnv("OWNER_EMAIL"); },
  get ownerSetupToken() { return readEnv("OWNER_SETUP_TOKEN"); },
  get isProduction() { return readEnv("NODE_ENV") === "production"; },
  get forgeApiUrl() { return readEnv("BUILT_IN_FORGE_API_URL"); },
  get forgeApiKey() { return readEnv("BUILT_IN_FORGE_API_KEY"); },
};
