# npm distribution and releases

This document owns npm packaging and release instructions for humans and coding
agents. Run all commands from the repository root using pnpm.

## Deliverables

| Package                  | Contract                                                                                                                                | Manifest                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `@dearlordylord/dnd-sdk` | ESM runtime APIs and TypeScript declarations for character creation, sheets, character/battle composition, battles, and the SRD catalog | [SDK manifest](../../distribution/sdk/package.json) |
| `@dearlordylord/dnd-mcp` | Bundled stdio executable, `dnd-mcp`                                                                                                     | [MCP manifest](../../distribution/mcp/package.json) |

Both packages are built from this repository. Internal `@dnd/*` workspace
packages remain private. The SDK exports point at compiled versions of the
canonical runtime sources; the build rewrites internal module references to
package-relative paths. External SDK dependency versions derive from those
sources' owning manifests. The MCP bundles its existing stdio entrypoint and dependencies, except Redis,
which is installed from npm at the owning manifest's version. Bundled dependency
license texts are included in `dist/THIRD-PARTY-NOTICES.txt`. This adds no alternate rules implementation.

The distribution manifests are private publication inputs, outside the pnpm
development workspace. The build removes the private flag only in generated
package manifests. Publish only the generated and tested tarballs in `dist/npm/`.
Never publish an internal workspace package or the manifest-input directories.
Only reachable production code, declarations, bundled SRD data, package metadata,
and license notices belong in these artifacts. Do not add private Mushroom
material, PHB+ identity, tests, proofs, local references, credentials, or source
maps. The [authoring policy](../../docs/mushroom-playbook/AUTHORING.md) applies.

The SDK is the repository's rules API, with the support limits documented in
its owning runtime READMEs. It is separate from the
[opaque Oracle](../../packages/opaque-oracle/README.md) and independent Cleanroom
Target SDKs. npm MCP delivery is also separate from
[hosted HTTP deployment](../../operations/public-mcp/README.md) and
[plugin publication](../../plugins/dnd-srd-oracle/publication/README.md).

## Development and review

1. Change the canonical runtime source, then update public export declarations
   or package usage documentation if the consumer contract changes.
2. Bump both distribution manifests to the same SemVer version for a release.
   Use `alpha.N`, `beta.N`, or `rc.N` suffixes for prereleases. Document the
   consumer-visible change in [release notes](../../distribution/CHANGELOG.md).
3. Run `pnpm check:distribution`. This builds both packages, packs them, checks
   the file allowlist and notices, installs the tarballs outside the workspace,
   compiles a TypeScript consumer, imports the SDK at runtime, and initializes
   the packaged MCP through stdio and creates a Play Session.
4. Review affected RAW/provenance, domain language, architecture/connascence,
   and code quality according to the [review rules](../../.claude/review-rules.md).
   Fix findings and recheck affected behavior until no reasonable findings
   remain. Packaging changes do not authorize changes to rules semantics.
5. Run `pnpm quality:milestone` on the stable integration revision. Existing
   acceptance gates remain required. Public distribution commands acquire the
   shared broad verification lock; do not wrap them in another lock.

`pnpm build:distribution` builds without packing or running consumer checks.
Output is disposable and ignored by Git. Build and smoke prerequisites are the
root manifest's Node/pnpm versions, an installed frozen lockfile, and `tar`.
The isolated consumer check needs registry access for external dependencies.
The full CI quality lane also runs `pnpm check:distribution` after the milestone.

## Host release

From a clean, pushed `master` checkout on the operator's Mac or Linux host:

```sh
pnpm local-release
```

The command owns the release:

1. If the committed version is unpublished or partially published, release or
   resume it. If both packages already have that version published, increment
   both patch versions (or the prerelease counter), update the changelog, commit,
   and push the release version. For a minor/major release, prepare the desired
   matching manifest versions and changelog first.
2. Install this host's dependencies from the frozen lockfile.
3. Build, pack, and check the actual SDK and MCP consumers locally.
4. Check npm authentication, publish the verified tarballs with public access,
   and verify their registry integrity.

There is **no GitHub CLI requirement, CI dispatch, CI wait, or full workspace
milestone in this command**. The ordinary CI workflow remains independent.
Full rules verification belongs to development/integration; changing a release
version does not repeat it during publication. Package build and consumer checks
still run because they verify the bytes being published.

The host needs the repository's Node/pnpm versions, Git, `tar`, and npm publish
access to `@dearlordylord`. It uses host credentials, including npm's browser
authentication prompt when required. Stable versions use `latest`; prereleases
use their named channel.

For local package qualification and publication dry runs without version
changes or publication:

```sh
pnpm local-release --dry-run
```

### Retrying a release

The command stores an unfinished release receipt in Git's common directory as
`dnd-npm-release.json`. A retry resumes that version instead of incrementing it.
Successful npm publish acknowledgements include the artifact's SHA-512, so
a delayed registry read does not cause a second publish of acknowledged bytes.
Different bytes for the same acknowledged version stop the release.

A metadata 404 is also checked against npm's public tarball endpoint. An
available tarball must match the verified local archive before the package is
skipped. npm can accept a publish before its metadata becomes visible.

Both packages are published before the final visibility checks. The command
waits up to five minutes per package (plus an in-flight lookup), reports progress,
and retains the receipt if visibility or authentication fails. Rerun
`pnpm local-release` after resolving the error. A successful run marks the receipt
complete; the next normal release can increment the version.

### Shared host/container checkouts

The operator's release command intentionally installs dependencies for the
operator's host platform. Do not run it concurrently with builds in another
platform sharing that checkout.

Agents must not reinstall dependencies in a shared host/container tree. Use an
isolated checkout with platform-local dependencies for verification; do not
symlink the host's `node_modules`. Missing container npm credentials are not a
handoff blocker, and the operator does not need to authenticate in the container.

Do not claim publication from a build or dry run alone. npm publication is not
atomic across two packages; report partial publication accurately.
