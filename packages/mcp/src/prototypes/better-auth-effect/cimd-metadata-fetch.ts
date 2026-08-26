import { isPublicRoutableHost } from "@better-auth/core/utils/host";
import type { ClientMetadataResourceFetch } from "@better-auth/oauth-provider";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";

const BODY_FORBIDDEN_RESPONSE_STATUSES = new Set([204, 205, 304]);

export const fetchClientMetadataResource: ClientMetadataResourceFetch = async (
  input,
  init,
) => {
  const webRequest = new Request(input, init);
  const url = new URL(webRequest.url);
  if (url.protocol !== "https:") {
    throw new TypeError("CIMD Node transport requires an HTTPS URL");
  }
  if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
    throw new TypeError("CIMD Node transport supports only GET and HEAD");
  }

  const addresses = await lookup(url.hostname, {
    all: true,
    verbatim: true,
  });
  if (addresses.length === 0) {
    throw new TypeError("metadata hostname returned no DNS addresses");
  }
  for (const address of addresses) {
    if (!isPublicRoutableHost(address.address)) {
      throw new TypeError(
        "metadata hostname must resolve only to public-routable addresses",
      );
    }
  }

  const pinnedAddress = addresses[0];
  const headers = Object.fromEntries(webRequest.headers.entries());
  headers.host = url.host;
  const signal =
    init?.signal ??
    (input instanceof Request ? input.signal : webRequest.signal);

  return new Promise((resolve, reject) => {
    const metadataRequest = request(
      url,
      {
        agent: false,
        headers,
        method: webRequest.method,
        servername:
          isIP(url.hostname.replace(/^\[|\]$/gu, "")) === 0
            ? url.hostname
            : undefined,
        signal,
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [pinnedAddress]);
            return;
          }
          callback(null, pinnedAddress.address, pinnedAddress.family);
        },
      },
      (response) => {
        const status = response.statusCode ?? 500;
        const body =
          webRequest.method === "HEAD" ||
          BODY_FORBIDDEN_RESPONSE_STATUSES.has(status)
            ? null
            : Readable.toWeb(response);
        const responseInit: ResponseInit = {
          headers: responseHeaders(response.headers),
          status,
        };
        if (response.statusMessage !== undefined) {
          responseInit.statusText = response.statusMessage;
        }
        resolve(new Response(body, responseInit));
      },
    );
    metadataRequest.once("error", reject);
    metadataRequest.end();
  });
};

function responseHeaders(headers: Readonly<NodeJS.Dict<string | string[]>>) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        result.append(name, item);
      }
    } else if (value !== undefined) {
      result.append(name, value);
    }
  }
  return result;
}
