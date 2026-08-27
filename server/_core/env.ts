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
  get payrexSecretApiKey() { return readEnv("PAYREX_SECRET_API_KEY"); },
  get payrexWebhookSecret() { return readEnv("PAYREX_WEBHOOK_SECRET"); },
  get payrexEnvironment() { return readEnv("PAYREX_ENVIRONMENT") || "sandbox"; },
  get paypalClientId() { return readEnv("PAYPAL_CLIENT_ID"); },
  get paypalClientSecret() { return readEnv("PAYPAL_CLIENT_SECRET"); },
  get paypalWebhookId() { return readEnv("PAYPAL_WEBHOOK_ID"); },
  get paypalEnvironment() { return readEnv("PAYPAL_ENVIRONMENT") || "sandbox"; },
  get brevoApiKey() { return readEnv("BREVO_API_KEY"); },
  get brevoSenderEmail() { return readEnv("BREVO_SENDER_EMAIL"); },
  get brevoReplyToEmail() { return readEnv("BREVO_REPLY_TO"); },
  get publicAppOrigin() { return readEnv("PUBLIC_APP_ORIGIN") || "https://digital-junction-platform.pages.dev"; },
  get isProduction() { return readEnv("NODE_ENV") === "production"; },
  get forgeApiUrl() { return readEnv("BUILT_IN_FORGE_API_URL"); },
  get forgeApiKey() { return readEnv("BUILT_IN_FORGE_API_KEY"); },
};
