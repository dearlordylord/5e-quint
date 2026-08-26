import { describe, expect, it } from "vitest";

import {
  prototypeConsentPage,
  prototypeStatusPage,
  prototypeVaultPage,
} from "./prototype-pages.ts";

describe("credential-free saved-session vault pages", () => {
  it("creates and authorizes a pseudonymous vault with one explicit action", async () => {
    const html = await prototypeVaultPage().text();

    expect(html).toContain("You do not enter an email, password");
    expect(html).toContain("randomly generated vault identity");
    expect(html).toContain("no ChatGPT account identity or personal email");
    expect(html).toContain("requesting client does not share your account");
    expect(html).toContain("clients you authorize from that session share");
    expect(html).toContain("/api/auth/sign-in/anonymous");
    expect(html).toContain("/api/auth/oauth2/consent");
    expect(html).toContain("/api/auth/oauth2/public-client-prelogin");
    expect(html).toContain("Registered client:");
    expect(html).toContain("result.client_id !== clientId");
    expect(html).toContain("Create vault and allow this client");
    expect(html).toContain("pendingConsentUrl === undefined");
    expect(html).toContain('location.href = "/api/auth/oauth2/authorize?"');
    expect(html).toContain('href="/privacy"');
    expect(html).not.toContain('name="email"');
    expect(html).not.toContain('name="password"');
    expect(html).not.toContain("sign-up/email");
  });

  it("keeps consent explicit for an existing vault session", async () => {
    const html = await prototypeConsentPage().text();

    expect(html).toContain("Allow saved sessions");
    expect(html).toContain("Keep guest-only");
    expect(html).toContain("pseudonymous vault");
    expect(html).toContain("requesting client does not share your account");
    expect(html).toContain("not your ChatGPT identity or personal email");
    expect(html).toContain("/api/auth/oauth2/public-client-prelogin");
    expect(html).toContain("Registered client:");
    expect(html).toContain('typeof result.url !== "string"');
    expect(html).toContain("button.disabled = true");
  });

  it("describes the credential-free authorization boundary", async () => {
    const html = await prototypeStatusPage().text();

    expect(html).toContain(
      "creates a pseudonymous vault without email or password credentials",
    );
  });
});
