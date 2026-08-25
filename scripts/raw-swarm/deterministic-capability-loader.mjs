let blockedNetworkModules = new Set();
let ownedParentPrefixes = [];
const ownedTrampolineUrls = new Set();

export function initialize(data) {
  blockedNetworkModules = new Set(data?.blockedNetworkModules ?? []);
  ownedParentPrefixes = [data?.repositoryRoot, data?.temporaryRoot].filter(
    (prefix) => typeof prefix === "string",
  );
  ownedTrampolineUrls.clear();
}

function isNodeModulesUrl(url) {
  return url.includes("/node_modules/");
}

function isOwnedUrl(url) {
  if (url.length === 0 || isNodeModulesUrl(url)) return false;
  if (ownedTrampolineUrls.has(url)) return true;
  return ownedParentPrefixes.some((prefix) => url.startsWith(`${prefix}/`));
}

export async function resolve(specifier, context, nextResolve) {
  const parentURL = context.parentURL ?? "";
  const ownedParent = isOwnedUrl(parentURL);
  if (blockedNetworkModules.has(specifier) && ownedParent) {
    throw new Error(
      `Deterministic Raw Swarm lane blocked network capability: ${specifier}`,
    );
  }
  const resolved = await nextResolve(specifier, context);
  if (
    ownedParent &&
    typeof resolved.url === "string" &&
    !resolved.url.startsWith("node:") &&
    !isNodeModulesUrl(resolved.url)
  ) {
    ownedTrampolineUrls.add(resolved.url);
  }
  return resolved;
}
