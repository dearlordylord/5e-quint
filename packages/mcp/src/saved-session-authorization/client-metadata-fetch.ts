import { isPublicRoutableHost } from "@better-auth/core/utils/host";
import type { ClientMetadataResourceFetch } from "@better-auth/oauth-provider";
import type { LookupAddress, LookupOptions } from "node:dns";
import { lookup } from "node:dns/promises";
import type {
  ClientRequest,
  IncomingHttpHeaders,
  IncomingMessage,
} from "node:http";
import { request } from "node:https";
import type { LookupFunction } from "node:net";
import { isIP } from "node:net";
import { Readable } from "node:stream";

type MetadataLookup = (
  hostname: string,
  options: LookupOptions & { readonly all: true },
) => Promise<LookupAddress[]>;

type MetadataRequest = (
  url: URL,
  options: ReturnType<typeof metadataRequestOptions>,
  response: (response: IncomingMessage) => void,
) => ClientRequest;

const JSON_CONTENT_TYPE = /^application\/(?:[-\w.]+\+)?json\s*(?:;|$)/iu;

export function makeClientMetadataResourceFetch(
  lookupMetadataHost: MetadataLookup = lookup,
  requestMetadataResource: MetadataRequest = request,
): ClientMetadataResourceFetch {
  return async (input, init) => {
    const webRequest = new Request(input, init);
    const url = new URL(webRequest.url);
    if (url.protocol !== "https:") {
      throw new TypeError("CIMD Node transport requires an HTTPS URL");
    }
    if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
      throw new TypeError("CIMD Node transport supports only GET and HEAD");
    }

    const signal =
      init?.signal ??
      (input instanceof Request ? input.signal : webRequest.signal);
    const pinnedAddress = await resolvePinnedAddress(
      url.hostname,
      signal,
      lookupMetadataHost,
    );
    const headers = Object.fromEntries(webRequest.headers.entries());
    headers.host = url.host;

    return new Promise((resolve, reject) => {
      const metadataRequest = requestMetadataResource(
        url,
        metadataRequestOptions(
          url,
          headers,
          webRequest.method,
          signal,
          pinnedAddress,
        ),
        (response) => {
          const status = response.statusCode ?? 500;
          const headers = responseHeaders(response.headers);
          const exposeBody = shouldExposeBody(
            webRequest.method,
            status,
            response.headers,
          );
          const body = metadataResponseBody(response, exposeBody);
          const responseInit: ResponseInit =
            response.statusMessage === undefined
              ? { headers, status }
              : { headers, status, statusText: response.statusMessage };
          resolve(new Response(body, responseInit));
        },
      );
      metadataRequest.once("error", reject);
      metadataRequest.end();
    });
  };
}

export const fetchClientMetadataResource = makeClientMetadataResourceFetch();

export async function resolvePinnedAddress(
  hostname: string,
  signal: AbortSignal,
  lookupMetadataHost: MetadataLookup = lookup,
) {
  signal.throwIfAborted();
  let rejectForAbort: (reason?: unknown) => void = () => undefined;
  const abort = new Promise<never>((_resolve, reject) => {
    rejectForAbort = reject;
  });
  const onAbort = () => rejectForAbort(signal.reason);
  signal.addEventListener("abort", onAbort, { once: true });
  const addresses = await Promise.race([
    lookupMetadataHost(hostname, { all: true, verbatim: true }),
    abort,
  ]).finally(() => signal.removeEventListener("abort", onAbort));
  signal.throwIfAborted();

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
  return addresses[0];
}

export function metadataRequestOptions(
  url: URL,
  headers: Record<string, string>,
  method: string,
  signal: AbortSignal,
  pinnedAddress: LookupAddress,
) {
  return {
    agent: false,
    headers,
    lookup: pinnedLookup(pinnedAddress),
    method,
    servername:
      isIP(url.hostname.replace(/^\[|\]$/gu, "")) === 0
        ? url.hostname
        : undefined,
    signal,
  };
}

export function pinnedLookup(pinnedAddress: LookupAddress): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [pinnedAddress]);
      return;
    }
    callback(null, pinnedAddress.address, pinnedAddress.family);
  };
}

export function shouldExposeBody(
  method: string,
  status: number,
  headers: IncomingHttpHeaders,
) {
  if (method === "HEAD" || status !== 200) {
    return false;
  }
  const contentType = headers["content-type"];
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  return value !== undefined && JSON_CONTENT_TYPE.test(value);
}

export function metadataResponseBody(response: Readable, exposeBody: boolean) {
  if (exposeBody) {
    return Readable.toWeb(response);
  }
  response.destroy();
  return null;
}

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
