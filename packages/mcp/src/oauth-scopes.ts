export const PLAY_SESSION_OAUTH_SCOPE = "play-sessions";

export const CHATGPT_SAVED_SESSION_OAUTH_SCOPES = [
  "openid",
  "email",
  PLAY_SESSION_OAUTH_SCOPE,
] as const;

export const SAVED_SESSION_OAUTH_SCOPES = [
  ...CHATGPT_SAVED_SESSION_OAUTH_SCOPES,
  "offline_access",
] as const;
