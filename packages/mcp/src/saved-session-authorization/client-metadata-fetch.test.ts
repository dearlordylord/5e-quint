import type { LookupAddress } from "node:dns";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import {
  metadataRequestOptions,
  metadataResponseBody,
  makeClientMetadataResourceFetch,
  pinnedLookup,
  resolvePinnedAddress,
  shouldExposeBody,
  type MetadataResponse,
} from "./client-metadata-fetch.ts";

const PUBLIC_IPV4: LookupAddress = { address: "93.184.216.34", family: 4 };
const PUBLIC_IPV6: LookupAddress = {
  address: "2606:2800:220:1:248:1893:25c8:1946",
  family: 6,
};

describe("CIMD metadata transport", () => {
  it("fetches metadata through the validated pinned transport", async () => {
    const response = Object.assign(
      Readable.from([Buffer.from('{"client_name":"Oracle"}')]),
      {
        statusCode: 200,
        statusMessage: "OK",
        headers: {
          "content-type": "application/json",
          "set-cookie": ["first=1", "second=2"],
        },
      },
    );
    let respond: ((response: MetadataResponse) => void) | undefined;
    const metadataRequest = Object.assign(new EventEmitter(), {
      end: vi.fn(() => {
        if (respond === undefined) throw new Error("Missing response callback");
        respond(response);
        return metadataRequest;
      }),
    });
    const requestMetadataResource = vi.fn(
      (
        _url: URL,
        _options: ReturnType<typeof metadataRequestOptions>,
        onResponse: (response: MetadataResponse) => void,
      ) => {
        respond = onResponse;
        return metadataRequest;
      },
    );
    const fetchMetadata = makeClientMetadataResourceFetch(
      vi.fn(async () => [PUBLIC_IPV4]),
      requestMetadataResource,
    );

    const result = await fetchMetadata(
      new Request("https://metadata.example/client.json", {
        headers: { accept: "application/json" },
      }),
    );

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.headers.get("set-cookie")).toContain("first=1");
    await expect(result.json()).resolves.toEqual({ client_name: "Oracle" });
    expect(requestMetadataResource).toHaveBeenCalledOnce();
  });

  it("rejects unsupported URLs and methods before transport", async () => {
    const fetchMetadata = makeClientMetadataResourceFetch();

    await expect(
      fetchMetadata("http://metadata.example/client.json"),
    ).rejects.toThrow("requires an HTTPS URL");
    await expect(
      fetchMetadata("https://metadata.example/client.json", { method: "POST" }),
    ).rejects.toThrow("supports only GET and HEAD");
  });

  it("propagates pinned transport failures", async () => {
    const metadataRequest = Object.assign(new EventEmitter(), {
      end: vi.fn(() => {
        metadataRequest.emit("error", new Error("transport failed"));
        return metadataRequest;
      }),
    });
    const fetchMetadata = makeClientMetadataResourceFetch(
      vi.fn(async () => [PUBLIC_IPV4]),
      vi.fn(() => metadataRequest),
    );

    await expect(
      fetchMetadata("https://metadata.example/client.json"),
    ).rejects.toThrow("transport failed");
  });

  it("resolves once, validates every answer, and pins the first public address", async () => {
    const lookup = vi.fn(async () => [PUBLIC_IPV4, PUBLIC_IPV6]);
    const pinned = await resolvePinnedAddress(
      "metadata.example",
      new AbortController().signal,
      lookup,
    );

    expect(lookup).toHaveBeenCalledOnce();
    expect(lookup).toHaveBeenCalledWith("metadata.example", {
      all: true,
      verbatim: true,
    });
    expect(pinned).toEqual(PUBLIC_IPV4);
  });

  it("rejects the complete DNS answer set when one answer is private", async () => {
    const lookup = vi.fn(async () => [
      PUBLIC_IPV4,
      { address: "127.0.0.1", family: 4 },
    ]);

    await expect(
      resolvePinnedAddress(
        "metadata.example",
        new AbortController().signal,
        lookup,
      ),
    ).rejects.toThrow("must resolve only to public-routable addresses");
    expect(lookup).toHaveBeenCalledOnce();
  });

  it("settles a stalled DNS lookup when the request is aborted", async () => {
    const controller = new AbortController();
    const lookup = vi.fn(() => new Promise<LookupAddress[]>(() => undefined));
    const resolution = resolvePinnedAddress(
      "metadata.example",
      controller.signal,
      lookup,
    );

    controller.abort(new Error("metadata lookup cancelled"));

    await expect(resolution).rejects.toThrow("metadata lookup cancelled");
  });

  it("returns the pinned address in Node's single and all-address callback shapes", () => {
    const lookup = pinnedLookup(PUBLIC_IPV4);
    const singleCallback = vi.fn();
    const allCallback = vi.fn();

    lookup("metadata.example", { all: false }, singleCallback);
    lookup("metadata.example", { all: true }, allCallback);

    expect(singleCallback).toHaveBeenCalledWith(null, PUBLIC_IPV4.address, 4);
    expect(allCallback).toHaveBeenCalledWith(null, [PUBLIC_IPV4]);
  });

  it("pins the connection while retaining the original Host and TLS identity", () => {
    const controller = new AbortController();
    const url = new URL("https://metadata.example:8443/client.json");
    const options = metadataRequestOptions(
      url,
      { host: url.host },
      "GET",
      controller.signal,
      PUBLIC_IPV4,
    );
    const callback = vi.fn();

    options.lookup("metadata.example", { all: true }, callback);

    expect(options.headers.host).toBe("metadata.example:8443");
    expect(options.servername).toBe("metadata.example");
    expect(options.signal).toBe(controller.signal);
    expect(callback).toHaveBeenCalledWith(null, [PUBLIC_IPV4]);
  });

  it("exposes only JSON success bodies and disposes every rejected response shape", () => {
    expect(
      shouldExposeBody("GET", 200, {
        "content-type": "application/json; charset=utf-8",
      }),
    ).toBe(true);
    expect(
      shouldExposeBody("GET", 200, {
        "content-type": "application/oauth-client-metadata+json",
      }),
    ).toBe(true);
    expect(shouldExposeBody("GET", 200, { "content-type": "text/plain" })).toBe(
      false,
    );
    expect(
      shouldExposeBody("GET", 200, {
        "content-type": "application/json-seq",
      }),
    ).toBe(false);
    expect(
      shouldExposeBody("GET", 302, { location: "https://elsewhere.example" }),
    ).toBe(false);
    expect(
      shouldExposeBody("HEAD", 200, { "content-type": "application/json" }),
    ).toBe(false);

    const rejectedResponse = Readable.from(["ignored"]);
    const destroy = vi.spyOn(rejectedResponse, "destroy");
    expect(metadataResponseBody(rejectedResponse, false)).toBeNull();
    expect(destroy).toHaveBeenCalledOnce();
  });
});
