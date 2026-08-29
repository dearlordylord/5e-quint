import { readFile } from "node:fs/promises";

import { Result } from "effect";

export const PUBLIC_PLUGIN_DEMO_PATH = "/plugin-demo.mp4";

const pluginDemoUrl = new URL("../assets/plugin-demo.mp4", import.meta.url);

export async function publicPluginDemoResponse(
  pathname: string,
  method: string | undefined,
): Promise<Response | undefined> {
  if (pathname !== PUBLIC_PLUGIN_DEMO_PATH) return undefined;
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  const video = await loadPluginDemo();
  if (Result.isFailure(video)) {
    return new Response("Plugin demo is unavailable", { status: 503 });
  }

  return new Response(
    method === "HEAD" ? null : new Uint8Array(video.success),
    {
      headers: {
        "cache-control": "public, max-age=300",
        "content-disposition": 'inline; filename="5.5e-SRD-Oracle-demo.mp4"',
        "content-length": String(video.success.byteLength),
        "content-type": "video/mp4",
        "x-content-type-options": "nosniff",
      },
    },
  );
}

async function loadPluginDemo(): Promise<
  Result.Result<Uint8Array, { readonly tag: "pluginDemoUnavailable" }>
> {
  return readFile(pluginDemoUrl).then(
    (video) => Result.succeed(video),
    () => Result.fail({ tag: "pluginDemoUnavailable" }),
  );
}
