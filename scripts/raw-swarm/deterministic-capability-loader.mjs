let blockedNetworkModules = new Set();
let ownedParentPrefixes = [];

export function initialize(data) {
  blockedNetworkModules = new Set(data?.blockedNetworkModules ?? []);
  ownedParentPrefixes = [data?.repositoryRoot, data?.temporaryRoot].filter(
    (prefix) => typeof prefix === "string",
  );
}

export async function resolve(specifier, context, nextResolve) {
  const parentURL = context.parentURL ?? "";
  const repositoryOwnedParent =
    !parentURL.includes("/node_modules/") &&
    ownedParentPrefixes.some((prefix) => parentURL.startsWith(`${prefix}/`));
  if (blockedNetworkModules.has(specifier) && repositoryOwnedParent) {
    throw new Error(
      `Deterministic Raw Swarm lane blocked network capability: ${specifier}`,
    );
  }
  return nextResolve(specifier, context);
}
