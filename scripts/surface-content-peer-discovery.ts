import { readdirSync } from "node:fs";

export type CanonicalSurfaceContentPeer = {
  readonly sourceName: string;
  readonly peerName: string;
};

export function discoverCanonicalSurfaceContentPeers(
  contentDirectory: string,
): readonly CanonicalSurfaceContentPeer[] {
  return readdirSync(contentDirectory)
    .filter((name) => name.endsWith(".dhall") && !name.startsWith("_"))
    .sort()
    .map((sourceName) => ({
      sourceName,
      peerName: sourceName.replace(/\.dhall$/, ".json"),
    }));
}
