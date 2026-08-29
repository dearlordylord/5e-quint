import { Schema } from "effect";

export const AuthorizationServerOriginSchema = Schema.URL.pipe(
  Schema.check(
    Schema.makeFilter(
      (url) =>
        (url.protocol === "https:" || url.protocol === "http:") &&
        url.username === "" &&
        url.password === "" &&
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === "",
      {
        message:
          "Authorization-server origin must be an HTTP(S) origin without credentials, path, query, or fragment.",
      },
    ),
  ),
  Schema.brand("AuthorizationServerOrigin"),
);
export type AuthorizationServerOrigin =
  typeof AuthorizationServerOriginSchema.Type;

export const PublicMcpOriginSchema = AuthorizationServerOriginSchema.pipe(
  Schema.check(
    Schema.makeFilter((url) => url.protocol === "https:", {
      message: "Public MCP origin must use HTTPS.",
    }),
  ),
  Schema.brand("PublicMcpOrigin"),
);
export type PublicMcpOrigin = typeof PublicMcpOriginSchema.Type;
