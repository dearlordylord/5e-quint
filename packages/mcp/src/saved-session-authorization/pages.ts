import { randomBytes } from "node:crypto";

const clientIdentityScript = `
const oauthParams = new URLSearchParams(location.search);
async function loadClientIdentity() {
  const clientId = oauthParams.get("client_id");
  if (clientId === null) throw new Error("The signed authorization request has no client identity.");
  const response = await fetch("/api/auth/oauth2/public-client-prelogin", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      oauth_query: location.search.slice(1),
    }),
  });
  const result = await response.json();
  if (!response.ok || result.client_id !== clientId || typeof result.client_name !== "string") {
    throw new Error("The requesting client's registered identity could not be verified.");
  }
  return result;
}
function clientLabel(client) {
  try {
    const url = new URL(client.client_id);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return client.client_name + " (" + url.origin + ")";
    }
  } catch {}
  return client.client_name + " (" + client.client_id + ")";
}
`;

export function savedSessionVaultPage(): Response {
  const nonce = contentSecurityPolicyNonce();
  return htmlResponse(
    `<!doctype html>
<meta charset="utf-8">
<title>Save your games</title>
<main>
  <h1>Save your games</h1>
  <p id="client">Verifying the requesting app…</p>
  <p>No account or personal email required.</p>
  <p>If you disconnect and lose this browser session, saved games may be unrecoverable. See the <a href="/privacy">privacy policy</a>.</p>
  <button id="connect" disabled>Create vault &amp; allow</button>
  <pre id="message"></pre>
</main>
<script nonce="${nonce}">
${clientIdentityScript}
const button = document.querySelector("#connect");
const message = document.querySelector("#message");
let pendingConsentUrl;
loadClientIdentity().then((client) => {
  const label = clientLabel(client);
  document.querySelector("#client").textContent = label + " can save, resume, and delete games in your private vault.";
  button.disabled = false;
}).catch((error) => { message.textContent = error.message; });
button.addEventListener("click", async () => {
  button.disabled = true;
  message.textContent = "";
  try {
    if (pendingConsentUrl === undefined) {
      const vaultResponse = await fetch("/api/auth/sign-in/anonymous", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ oauth_query: location.search.slice(1) }),
      });
      const vaultResult = await vaultResponse.json();
      if (!vaultResponse.ok || typeof vaultResult.url !== "string") {
        throw new Error(vaultResult.message ?? "The vault could not be created.");
      }
      pendingConsentUrl = new URL(vaultResult.url, location.origin);
    }
    if (pendingConsentUrl.pathname !== "/saved-session-consent") {
      location.href = pendingConsentUrl.toString();
      return;
    }
    const consentResponse = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accept: true,
        oauth_query: pendingConsentUrl.search.slice(1),
      }),
    });
    const consentResult = await consentResponse.json();
    if (!consentResponse.ok || typeof consentResult.url !== "string") {
      throw new Error(consentResult.message ?? "Authorization could not be completed.");
    }
    location.href = consentResult.url;
  } catch (error) {
    if (pendingConsentUrl === undefined) {
      location.href = "/api/auth/oauth2/authorize?" + location.search.slice(1);
      return;
    }
    message.textContent = error instanceof Error ? error.message : "Authorization could not be completed.";
    button.disabled = false;
  }
});
</script>`,
    nonce,
  );
}

export function savedSessionConsentPage(): Response {
  const nonce = contentSecurityPolicyNonce();
  return htmlResponse(
    `<!doctype html>
<meta charset="utf-8">
<title>Allow access to saved games?</title>
<main>
  <h1>Allow access to saved games?</h1>
  <p id="client">Verifying the requesting app…</p>
  <p id="scope"></p>
  <button id="accept" disabled>Allow</button>
  <button id="deny" disabled>Cancel</button>
  <pre id="message"></pre>
</main>
<script nonce="${nonce}">
${clientIdentityScript}
const params = new URLSearchParams(location.search);
document.querySelector("#scope").textContent = "Requested scopes: " + (params.get("scope") ?? "");
loadClientIdentity().then((client) => {
  const label = clientLabel(client);
  document.querySelector("#client").textContent = label + " can save, resume, and delete games in your private vault.";
  document.querySelectorAll("button").forEach((button) => { button.disabled = false; });
}).catch((error) => { document.querySelector("#message").textContent = error.message; });
async function decide(accept) {
  const buttons = document.querySelectorAll("button");
  const message = document.querySelector("#message");
  buttons.forEach((button) => { button.disabled = true; });
  message.textContent = "";
  try {
    const response = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accept, oauth_query: location.search.slice(1) }),
    });
    const result = await response.json();
    if (!response.ok || typeof result.url !== "string") {
      throw new Error(result.message ?? "Authorization could not be completed.");
    }
    location.href = result.url;
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "Authorization could not be completed.";
    buttons.forEach((button) => { button.disabled = false; });
  }
}
document.querySelector("#accept").addEventListener("click", () => decide(true));
document.querySelector("#deny").addEventListener("click", () => decide(false));
</script>`,
    nonce,
  );
}

function htmlResponse(body: string, nonce: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}

function contentSecurityPolicyNonce(): string {
  return randomBytes(18).toString("base64url");
}
