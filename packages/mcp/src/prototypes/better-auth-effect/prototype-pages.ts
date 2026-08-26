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
  const details = [result.client_name, result.client_id];
  if (typeof result.client_uri === "string") details.push(result.client_uri);
  document.querySelector("#client").textContent = "Registered client: " + details.join(" — ");
  return result.client_name;
}
`;

export function prototypeVaultPage(): Response {
  return htmlResponse(`<!doctype html>
<meta charset="utf-8">
<title>Connect a private saved-session vault</title>
<main>
  <h1>Connect a private saved-session vault</h1>
  <p>Guest play remains anonymous. No email, password, or account/profile details are requested.</p>
  <p>The requesting client does not share your account identity with this service. This private pseudonymous vault belongs to the anonymous authorization session in this browser; clients you authorize from that session share the vault.</p>
  <p>Until optional recovery is available, losing both the browser session and client authorization may make saved sessions unrecoverable. See the <a href="/privacy">privacy and retention policy</a>.</p>
  <p id="client">Verifying the registered client…</p>
  <button id="connect" disabled>Create vault and allow this client to manage saved sessions</button>
  <pre id="message"></pre>
</main>
<script>
${clientIdentityScript}
const button = document.querySelector("#connect");
const message = document.querySelector("#message");
let pendingConsentUrl;
loadClientIdentity().then((clientName) => {
  button.textContent = "Create vault and allow " + clientName + " to manage saved sessions";
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
    if (pendingConsentUrl.pathname !== "/prototype/consent") {
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
</script>`);
}

export function prototypeConsentPage(): Response {
  return htmlResponse(`<!doctype html>
<meta charset="utf-8">
<title>Allow saved sessions</title>
<main>
  <h1>Connect your private saved-session vault?</h1>
  <p>Allow the requesting client to save, list, resume, and delete Play Sessions in your pseudonymous vault.</p>
  <p>No email, password, or account/profile details are requested. The requesting client does not share your account identity with this service.</p>
  <p>This vault belongs to the anonymous authorization session in this browser. See the <a href="/privacy">privacy and retention policy</a>.</p>
  <p id="client">Verifying the registered client…</p>
  <p id="scope"></p>
  <button id="accept" disabled>Allow saved sessions</button>
  <button id="deny" disabled>Keep guest-only</button>
  <pre id="message"></pre>
</main>
<script>
${clientIdentityScript}
const params = new URLSearchParams(location.search);
document.querySelector("#scope").textContent = "Requested scopes: " + (params.get("scope") ?? "");
loadClientIdentity().then((clientName) => {
  document.querySelector("#accept").textContent = "Allow " + clientName + " to manage saved sessions";
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
</script>`);
}

export function prototypeStatusPage(): Response {
  return htmlResponse(`<!doctype html>
<meta charset="utf-8">
<title>Better Auth prototype</title>
<h1>Better Auth prototype</h1>
<p>Guest MCP: <code>/mcp</code></p>
<p>Authorization issuer: <code>/api/auth</code></p>
<p>Saved-session authorization creates a pseudonymous vault without email or password credentials.</p>`);
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
