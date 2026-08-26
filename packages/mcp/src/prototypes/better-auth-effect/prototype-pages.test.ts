import { describe, expect, it } from "vitest";

import {
  prototypeConsentPage,
  prototypeStatusPage,
  prototypeVaultPage,
} from "./prototype-pages.ts";

describe("credential-free saved-session vault pages", () => {
  it("creates and authorizes a pseudonymous vault with one explicit action", async () => {
    const html = await prototypeVaultPage().text();

    expect(html).toContain("Save your games");
    expect(html).toContain(
      "can save, resume, and delete games in your private vault",
    );
    expect(html).toContain("No account or personal email required");
    expect(html).toContain("saved games may be unrecoverable");
    expect(html).toContain("/api/auth/sign-in/anonymous");
    expect(html).toContain("/api/auth/oauth2/consent");
    expect(html).toContain("/api/auth/oauth2/public-client-prelogin");
    expect(html).toContain("result.client_id !== clientId");
    expect(html).toContain('client.client_name + " (" + url.origin + ")"');
    expect(html).toContain(
      'client.client_name + " (" + client.client_id + ")"',
    );
    expect(html).toContain("Create vault &amp; allow");
    expect(html).toContain("pendingConsentUrl === undefined");
    expect(html).toContain('location.href = "/api/auth/oauth2/authorize?"');
    expect(html).toContain('href="/privacy"');
    expect(html).not.toContain('name="email"');
    expect(html).not.toContain('name="password"');
    expect(html).not.toContain("sign-up/email");
  });

  it("keeps consent explicit for an existing vault session", async () => {
    const html = await prototypeConsentPage().text();

    expect(html).toContain("Allow access to saved games?");
    expect(html).toContain("private vault");
    expect(html).toContain(">Allow</button>");
    expect(html).toContain(">Cancel</button>");
    expect(html).toContain("/api/auth/oauth2/public-client-prelogin");
    expect(html).toContain(
      "can save, resume, and delete games in your private vault",
    );
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
